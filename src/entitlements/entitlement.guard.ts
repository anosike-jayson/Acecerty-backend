import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntitlementsService } from './entitlements.service';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ItemType } from '../common/enums';

/**
 * Guards exam-start: requires an active entitlement covering the exam's
 * exam_product_id — unless the exam is a free demo, which bypasses the gate
 * (PRD §5.5 / §6.1). Caches the resolved exam on the request for reuse.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly entitlements: EntitlementsService,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    const examId = request.params.examId;

    const exam = await this.exams.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    request.exam = exam; // memoize for the handler

    if (exam.isFreeDemo) return true;

    const ok = await this.entitlements.hasActiveEntitlement(
      user.id,
      ItemType.EXAM_PRODUCT,
      exam.examProductId,
    );
    if (!ok) {
      throw new ForbiddenException(
        'An active entitlement is required to start this exam. Purchase the exam bundle to continue.',
      );
    }
    return true;
  }
}
