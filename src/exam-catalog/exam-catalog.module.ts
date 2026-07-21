import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamProduct } from './entities/exam-product.entity';
import { Exam } from './entities/exam.entity';
import { Topic } from './entities/topic.entity';
import { ExamCatalogService } from './exam-catalog.service';
import { ExamCatalogController } from './exam-catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExamProduct, Exam, Topic])],
  providers: [ExamCatalogService],
  controllers: [ExamCatalogController],
  exports: [ExamCatalogService, TypeOrmModule],
})
export class ExamCatalogModule {}
