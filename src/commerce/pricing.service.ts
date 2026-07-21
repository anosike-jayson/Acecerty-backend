import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { ItemType } from '../common/enums';

export interface ResolvedItem {
  itemType: ItemType;
  itemId: string;
  title: string;
  unitPriceMinor: number;
  currency: string;
  accessDurationDays: number | null;
}

/** Resolves a sellable item's authoritative price + title (server-side). */
@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(ExamProduct)
    private readonly products: Repository<ExamProduct>,
  ) {}

  async resolve(itemType: ItemType, itemId: string): Promise<ResolvedItem> {
    if (itemType === ItemType.EXAM_PRODUCT) {
      const p = await this.products.findOne({ where: { id: itemId } });
      if (!p) throw new BadRequestException(`Exam product ${itemId} not found`);
      return {
        itemType,
        itemId,
        title: `${p.certName} Practice Exam Bundle`,
        unitPriceMinor: Number(p.priceMinor),
        currency: p.currency,
        accessDurationDays: p.accessDurationDays,
      };
    }
    const c = await this.courses.findOne({ where: { id: itemId } });
    if (!c) throw new BadRequestException(`Course ${itemId} not found`);
    return {
      itemType,
      itemId,
      title: c.title,
      unitPriceMinor: Number(c.priceMinor),
      currency: c.currency,
      // Courses grant perpetual access in Iteration 1 (LMS consumes in Iter 2).
      accessDurationDays: null,
    };
  }
}
