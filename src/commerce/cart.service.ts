import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto, SetCartDto } from './dto/commerce.dto';
import { PricingService } from './pricing.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly items: Repository<CartItem>,
    private readonly pricing: PricingService,
  ) {}

  private async getOrCreate(userId: string): Promise<Cart> {
    let cart = await this.carts.findOne({
      where: { userId },
      relations: { items: true },
    });
    if (!cart) {
      cart = await this.carts.save(this.carts.create({ userId }));
      cart.items = [];
    }
    return cart;
  }

  async view(userId: string) {
    const cart = await this.getOrCreate(userId);
    const lines = await Promise.all(
      (cart.items || []).map(async (i) => {
        const resolved = await this.pricing.resolve(i.itemType, i.itemId);
        return {
          id: i.id,
          itemType: i.itemType,
          itemId: i.itemId,
          quantity: i.quantity,
          title: resolved.title,
          unitPriceMinor: resolved.unitPriceMinor,
          lineTotalMinor: resolved.unitPriceMinor * i.quantity,
        };
      }),
    );
    const subtotalMinor = lines.reduce((s, l) => s + l.lineTotalMinor, 0);
    return { cartId: cart.id, items: lines, subtotalMinor };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    await this.pricing.resolve(dto.itemType, dto.itemId); // validate existence
    const cart = await this.getOrCreate(userId);
    const existing = (cart.items || []).find(
      (i) => i.itemType === dto.itemType && i.itemId === dto.itemId,
    );
    if (existing) {
      // Digital goods — keep a single line (quantity stays 1).
      return this.view(userId);
    }
    await this.items.save(
      this.items.create({
        cartId: cart.id,
        itemType: dto.itemType,
        itemId: dto.itemId,
        quantity: 1,
      }),
    );
    return this.view(userId);
  }

  async replaceAll(userId: string, dto: SetCartDto) {
    const cart = await this.getOrCreate(userId);
    await this.items.delete({ cartId: cart.id });
    const seen = new Set<string>();
    for (const item of dto.items) {
      const key = `${item.itemType}:${item.itemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await this.pricing.resolve(item.itemType, item.itemId);
      await this.items.save(
        this.items.create({
          cartId: cart.id,
          itemType: item.itemType,
          itemId: item.itemId,
          quantity: 1,
        }),
      );
    }
    return this.view(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreate(userId);
    const item = await this.items.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.items.delete({ id: item.id });
    return this.view(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.items.delete({ cartId: cart.id });
    return this.view(userId);
  }
}
