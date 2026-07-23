import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { Certificate } from './entities/certificate.entity';
import { CourseLesson } from '../courses/entities/course-lesson.entity';
import { CourseModule as CourseModuleEntity } from '../courses/entities/course-module.entity';
import { Course } from '../courses/entities/course.entity';
import { ExamAttempt } from '../exam-engine/entities/exam-attempt.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Order } from '../commerce/entities/order.entity';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonProgress,
      Certificate,
      CourseLesson,
      CourseModuleEntity,
      Course,
      ExamAttempt,
      Exam,
      Order,
    ]),
    EntitlementsModule,
  ],
  providers: [LearningService],
  controllers: [LearningController],
  exports: [LearningService],
})
export class LearningModule {}
