import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { OrderStatus, PaymentProvider } from '../../common/enums';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 8, default: 'NGN' })
  currency: string;

  @Column({ name: 'subtotal_minor', type: 'bigint', default: 0 })
  subtotalMinor: number;

  @Column({ name: 'discount_minor', type: 'bigint', default: 0 })
  discountMinor: number;

  @Column({ name: 'total_minor', type: 'bigint', default: 0 })
  totalMinor: number;

  @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
  provider: PaymentProvider | null;

  @Index()
  @Column({ name: 'provider_reference', type: 'varchar', length: 120, nullable: true })
  providerReference: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true, eager: true })
  items: OrderItem[];
}
