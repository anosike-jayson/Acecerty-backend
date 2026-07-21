import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../commerce/entities/order.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';
import { PaystackAdapter } from './providers/paystack.adapter';
import { FlutterwaveAdapter } from './providers/flutterwave.adapter';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, ExamProduct]),
    EntitlementsModule,
    UsersModule,
  ],
  providers: [PaymentsService, PaystackAdapter, FlutterwaveAdapter],
  controllers: [WebhooksController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
