import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExamEngineService } from './exam-engine.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

/**
 * Auto-expiry: flips overdue in-progress attempts to `expired` (grading what
 * was answered) and expires overdue entitlements (PRD §6.3 / §10.7).
 */
@Injectable()
export class AttemptExpiryScheduler {
  private readonly logger = new Logger('AttemptExpiry');

  constructor(
    private readonly engine: ExamEngineService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    const expiredAttempts = await this.engine.expireOverdueAttempts();
    const expiredEntitlements = await this.entitlements.expireOverdue();
    if (expiredAttempts || expiredEntitlements) {
      this.logger.log(
        `Swept ${expiredAttempts} attempt(s), ${expiredEntitlements} entitlement(s).`,
      );
    }
  }
}
