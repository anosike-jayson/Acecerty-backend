import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entitlement } from './entities/entitlement.entity';
import { EntitlementStatus, ItemType } from '../common/enums';

@Injectable()
export class EntitlementsService {
  constructor(
    @InjectRepository(Entitlement)
    private readonly repo: Repository<Entitlement>,
  ) {}

  /** Grants access to an item; expiry = now + durationDays (null = perpetual). */
  async grant(params: {
    userId: string;
    itemType: ItemType;
    itemId: string;
    orderId?: string | null;
    durationDays?: number | null;
  }): Promise<Entitlement> {
    const now = new Date();
    const expiresAt =
      params.durationDays && params.durationDays > 0
        ? new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
        : null;
    const entitlement = this.repo.create({
      userId: params.userId,
      itemType: params.itemType,
      itemId: params.itemId,
      orderId: params.orderId ?? null,
      status: EntitlementStatus.ACTIVE,
      grantedAt: now,
      expiresAt,
    });
    return this.repo.save(entitlement);
  }

  /** True if the user holds an active, unexpired entitlement for the item. */
  async hasActiveEntitlement(
    userId: string,
    itemType: ItemType,
    itemId: string,
  ): Promise<boolean> {
    const now = new Date();
    const found = await this.repo.findOne({
      where: {
        userId,
        itemType,
        itemId,
        status: EntitlementStatus.ACTIVE,
      },
    });
    if (!found) return false;
    if (found.expiresAt && found.expiresAt.getTime() < now.getTime()) {
      found.status = EntitlementStatus.EXPIRED;
      await this.repo.save(found);
      return false;
    }
    return true;
  }

  async listForUser(userId: string): Promise<Entitlement[]> {
    await this.expireOverdue(userId);
    return this.repo.find({
      where: { userId },
      order: { grantedAt: 'DESC' },
    });
  }

  async revoke(id: string): Promise<Entitlement> {
    const ent = await this.repo.findOne({ where: { id } });
    if (!ent) throw new NotFoundException('Entitlement not found');
    ent.status = EntitlementStatus.REVOKED;
    return this.repo.save(ent);
  }

  /** Flips active-but-overdue entitlements to expired. */
  async expireOverdue(userId?: string): Promise<number> {
    const qb = this.repo
      .createQueryBuilder()
      .update(Entitlement)
      .set({ status: EntitlementStatus.EXPIRED })
      .where('status = :status', { status: EntitlementStatus.ACTIVE })
      .andWhere('expires_at IS NOT NULL')
      .andWhere('expires_at < :now', { now: new Date() });
    if (userId) qb.andWhere('user_id = :userId', { userId });
    const res = await qb.execute();
    return res.affected ?? 0;
  }
}
