import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamVoucher } from './entities/exam-voucher.entity';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExamVoucher])],
  providers: [VouchersService],
  controllers: [VouchersController],
  exports: [VouchersService, TypeOrmModule],
})
export class VouchersModule {}
