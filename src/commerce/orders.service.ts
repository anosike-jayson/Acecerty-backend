import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto, OrderLineDto, PayOrderDto } from './dto/commerce.dto';
import { PricingService } from './pricing.service';
import { CartService } from './cart.service';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus } from '../common/enums';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    private readonly pricing: PricingService,
    private readonly cart: CartService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  // ── Create (snapshots prices → pending) ───────────
  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    let lines: OrderLineDto[] = dto.items ?? [];
    if (lines.length === 0) {
      const cart = await this.cart.view(userId);
      lines = cart.items.map((i) => ({
        itemType: i.itemType,
        itemId: i.itemId,
        quantity: 1,
      }));
    }
    if (lines.length === 0) {
      throw new BadRequestException('Cannot create an order with no items.');
    }

    // Dedupe digital goods.
    const seen = new Set<string>();
    const orderItems: OrderItem[] = [];
    let subtotal = 0;
    let currency = this.config.get<string>('currency') || 'NGN';

    for (const line of lines) {
      const key = `${line.itemType}:${line.itemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const resolved = await this.pricing.resolve(line.itemType, line.itemId);
      currency = resolved.currency;
      const qty = 1;
      const lineTotal = resolved.unitPriceMinor * qty;
      subtotal += lineTotal;
      orderItems.push(
        this.orderItems.create({
          itemType: resolved.itemType,
          itemId: resolved.itemId,
          titleSnapshot: resolved.title,
          unitPriceMinor: resolved.unitPriceMinor,
          quantity: qty,
          lineTotalMinor: lineTotal,
        }),
      );
    }

    const order = this.orders.create({
      userId,
      status: OrderStatus.PENDING,
      currency,
      subtotalMinor: subtotal,
      discountMinor: 0,
      totalMinor: subtotal,
      items: orderItems,
    });
    return this.orders.save(order);
  }

  // ── Pay (init provider checkout) ──────────────────
  async pay(userId: string, orderId: string, dto: PayOrderDto) {
    const order = await this.getOwned(orderId, userId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order is already ${order.status}.`);
    }
    const email = await this.payments.getUserEmail(userId);
    return this.payments.initialize(order, dto.provider, email);
  }

  // ── Reads ─────────────────────────────────────────
  async getOwned(orderId: string, userId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not own this order.');
    }
    return order;
  }

  async listMine(userId: string, pagination: PaginationDto) {
    const [data, total] = await this.orders.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(data, total, pagination.page, pagination.limit);
  }
}
