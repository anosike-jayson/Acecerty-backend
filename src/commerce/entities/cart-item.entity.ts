import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ItemType } from '../../common/enums';
import { Cart } from './cart.entity';

@Entity('cart_items')
export class CartItem extends BaseEntity {
  @Index()
  @Column({ name: 'cart_id', type: 'uuid' })
  cartId: string;

  @ManyToOne(() => Cart, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ name: 'item_type', type: 'enum', enum: ItemType })
  itemType: ItemType;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
