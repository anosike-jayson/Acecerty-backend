import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { typeOrmOptionsFromConfig } from './database/typeorm.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditLogInterceptor } from './admin/audit-log.interceptor';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstructorsModule } from './instructors/instructors.module';
import { CoursesModule } from './courses/courses.module';
import { ExamCatalogModule } from './exam-catalog/exam-catalog.module';
import { QuestionsModule } from './questions/questions.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { ExamEngineModule } from './exam-engine/exam-engine.module';
import { PaymentsModule } from './payments/payments.module';
import { CommerceModule } from './commerce/commerce.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './common/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => typeOrmOptionsFromConfig(config),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    AuthModule,
    UsersModule,
    InstructorsModule,
    CoursesModule,
    ExamCatalogModule,
    QuestionsModule,
    EntitlementsModule,
    ExamEngineModule,
    PaymentsModule,
    CommerceModule,
    AdminModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
