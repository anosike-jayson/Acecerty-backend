import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Course } from '../courses/entities/course.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { CartService } from './cart.service';
import { OrdersService } from './orders.service';
import { PricingService } from './pricing.service';
import { CommerceController } from './commerce.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Order,
      OrderItem,
      Course,
      ExamProduct,
    ]),
    PaymentsModule,
  ],
  providers: [CartService, OrdersService, PricingService],
  controllers: [CommerceController],
  exports: [OrdersService, TypeOrmModule],
})
export class CommerceModule {}
