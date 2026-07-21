import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../commerce/entities/order.entity';
import { OrderItem } from '../commerce/entities/order-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { ExamAttempt } from '../exam-engine/entities/exam-attempt.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      OrderItem,
      Payment,
      ExamAttempt,
      AuditLog,
    ]),
  ],
  providers: [AdminService, AuditLogService],
  controllers: [AdminController],
  exports: [AuditLogService],
})
export class AdminModule {}
