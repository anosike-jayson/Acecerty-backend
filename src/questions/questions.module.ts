import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Topic } from '../exam-catalog/entities/topic.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionOption, Exam, Topic, ExamProduct]),
  ],
  providers: [QuestionsService],
  controllers: [QuestionsController],
  exports: [QuestionsService, TypeOrmModule],
})
export class QuestionsModule {}
