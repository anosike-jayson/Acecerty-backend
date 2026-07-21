import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { ExamAttemptItem } from './entities/exam-attempt-item.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Question } from '../questions/entities/question.entity';
import { Topic } from '../exam-catalog/entities/topic.entity';
import { ExamEngineService } from './exam-engine.service';
import { ExamEngineController } from './exam-engine.controller';
import { AttemptExpiryScheduler } from './attempt-expiry.scheduler';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamAttempt, ExamAttemptItem, Exam, Question, Topic]),
    EntitlementsModule,
  ],
  providers: [ExamEngineService, AttemptExpiryScheduler],
  controllers: [ExamEngineController],
  exports: [ExamEngineService],
})
export class ExamEngineModule {}
