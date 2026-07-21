import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EntitlementStatus, ItemType } from '../../common/enums';

/**
 * Grants + gates access. Created when an order is paid.
 * Starting a paid exam requires an ACTIVE entitlement covering its
 * exam_product_id (PRD §3.5).
 */
@Entity('entitlements')
@Index(['userId', 'itemType', 'itemId'])
export class Entitlement extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'item_type', type: 'enum', enum: ItemType })
  itemType: ItemType;

  @Index()
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'enum', enum: EntitlementStatus, default: EntitlementStatus.ACTIVE })
  status: EntitlementStatus;

  @Column({ name: 'granted_at', type: 'timestamptz' })
  grantedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
