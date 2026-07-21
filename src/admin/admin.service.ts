import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../commerce/entities/order.entity';
import { OrderItem } from '../commerce/entities/order-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { ExamAttempt } from '../exam-engine/entities/exam-attempt.entity';
import {
  AttemptStatus,
  ItemType,
  OrderStatus,
} from '../common/enums';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
  ) {}

  async dashboardStats() {
    const [
      totalUsers,
      studentsCount,
      totalOrders,
      paidRevenue,
      ordersByStatus,
      totalAttempts,
      submittedAttempts,
      passedAttempts,
      topProducts,
      revenueOverTime,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { role: 'student' as any } }),
      this.orders.count(),
      this.orders
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total_minor),0)', 'sum')
        .where('o.status = :status', { status: OrderStatus.PAID })
        .getRawOne<{ sum: string }>(),
      this.orders
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('o.status')
        .getRawMany<{ status: string; count: string }>(),
      this.attempts.count(),
      this.attempts.count({
        where: [
          { status: AttemptStatus.SUBMITTED },
          { status: AttemptStatus.EXPIRED },
        ],
      }),
      this.attempts.count({ where: { passed: true } }),
      this.topProducts(),
      this.revenueByMonth(),
    ]);

    const revenueMinor = Number(paidRevenue?.sum ?? 0);
    const passRate =
      submittedAttempts > 0
        ? Math.round((passedAttempts / submittedAttempts) * 10000) / 100
        : 0;

    return {
      users: { total: totalUsers, students: studentsCount },
      revenue: { totalMinor: revenueMinor, currency: 'NGN' },
      orders: {
        total: totalOrders,
        byStatus: ordersByStatus.reduce(
          (acc, r) => ({ ...acc, [r.status]: Number(r.count) }),
          {} as Record<string, number>,
        ),
      },
      attempts: {
        total: totalAttempts,
        graded: submittedAttempts,
        passed: passedAttempts,
        passRate,
      },
      topProducts,
      revenueOverTime,
    };
  }

  private async topProducts() {
    return this.orderItems
      .createQueryBuilder('oi')
      .innerJoin('orders', 'o', 'o.id = oi.order_id AND o.status = :status', {
        status: OrderStatus.PAID,
      })
      .select('oi.item_id', 'itemId')
      .addSelect('oi.item_type', 'itemType')
      .addSelect('MAX(oi.title_snapshot)', 'title')
      .addSelect('COUNT(*)', 'sales')
      .addSelect('COALESCE(SUM(oi.line_total_minor),0)', 'revenueMinor')
      .where('oi.item_type = :t', { t: ItemType.EXAM_PRODUCT })
      .groupBy('oi.item_id')
      .addGroupBy('oi.item_type')
      .orderBy('sales', 'DESC')
      .limit(5)
      .getRawMany();
  }

  private async revenueByMonth() {
    const rows = await this.orders
      .createQueryBuilder('o')
      .select("to_char(date_trunc('month', o.paid_at), 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(o.total_minor),0)', 'revenueMinor')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.paid_at IS NOT NULL')
      .groupBy("date_trunc('month', o.paid_at)")
      .orderBy("date_trunc('month', o.paid_at)", 'ASC')
      .getRawMany<{ month: string; revenueMinor: string }>();
    return rows.map((r) => ({
      month: r.month,
      revenueMinor: Number(r.revenueMinor),
    }));
  }

  // ── Listings ──────────────────────────────────────
  async listOrders(pagination: PaginationDto) {
    const [data, total] = await this.orders.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(data, total, pagination.page, pagination.limit);
  }

  async listPayments(pagination: PaginationDto) {
    const [data, total] = await this.payments.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(data, total, pagination.page, pagination.limit);
  }

  async listAttempts(pagination: PaginationDto) {
    const [data, total] = await this.attempts.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(data, total, pagination.page, pagination.limit);
  }
}
