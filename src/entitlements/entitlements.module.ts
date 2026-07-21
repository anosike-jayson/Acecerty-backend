import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entitlement } from './entities/entitlement.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementGuard } from './entitlement.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Entitlement, Exam])],
  providers: [EntitlementsService, EntitlementGuard],
  controllers: [EntitlementsController],
  exports: [EntitlementsService, EntitlementGuard, TypeOrmModule],
})
export class EntitlementsModule {}
