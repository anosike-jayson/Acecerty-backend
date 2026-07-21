import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ItemType } from '../../common/enums';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'item_type', type: 'enum', enum: ItemType })
  itemType: ItemType;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  // Price + title snapshotted at order time (PRD §8 data integrity).
  @Column({ name: 'title_snapshot', type: 'varchar', length: 255 })
  titleSnapshot: string;

  @Column({ name: 'unit_price_minor', type: 'bigint' })
  unitPriceMinor: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'line_total_minor', type: 'bigint' })
  lineTotalMinor: number;
}
