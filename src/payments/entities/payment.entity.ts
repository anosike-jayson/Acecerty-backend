import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PaymentProvider, PaymentStatus } from '../../common/enums';

/** One row per provider transaction attempt. */
@Entity('payments')
export class Payment extends BaseEntity {
  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  // Unique constraint drives webhook idempotency (PRD §8).
  @Index({ unique: true })
  @Column({ name: 'provider_reference', type: 'varchar', length: 120 })
  providerReference: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor: number;

  @Column({ type: 'varchar', length: 8, default: 'NGN' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIALIZED })
  status: PaymentStatus;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, any> | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;
}
