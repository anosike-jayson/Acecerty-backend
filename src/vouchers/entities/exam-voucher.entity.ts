import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * Official vendor exam voucher (CompTIA/Cisco/ISC2/…). A third sellable item
 * type alongside courses and exam products. Purchasing one grants a perpetual
 * entitlement; the actual voucher code is issued by admin out-of-band in
 * Iteration 1 (see `code` inventory field, reserved for later automation).
 */
@Entity('exam_vouchers')
export class ExamVoucher extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  vendor: string;

  @Column({ name: 'exam_name', type: 'varchar', length: 160 })
  examName: string;

  @Column({ name: 'exam_code', type: 'varchar', length: 80 })
  examCode: string;

  @Column({ name: 'price_minor', type: 'bigint', default: 0 })
  priceMinor: number;

  @Column({ name: 'original_price_minor', type: 'bigint', nullable: true })
  originalPriceMinor: number | null;

  @Column({ type: 'varchar', length: 8, default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  badge: string | null;

  @Column({ type: 'boolean', default: false })
  popular: boolean;

  @Column({ type: 'varchar', length: 16, nullable: true })
  color: string | null;

  @Index()
  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;
}
