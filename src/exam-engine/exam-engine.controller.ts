import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ExamEngineService } from './exam-engine.service';
import { AnswerItemDto } from './dto/answer-item.dto';
import { EntitlementGuard } from '../entitlements/entitlement.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Exam Engine')
@Controller()
export class ExamEngineController {
  constructor(private readonly engine: ExamEngineService) {}

  // Start — entitlement-gated (free demos bypass inside the guard).
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(EntitlementGuard)
  @Post('exams/:examId/attempts')
  start(
    @Param('examId', ParseUUIDPipe) _examId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request & { exam: Exam },
  ) {
    // EntitlementGuard memoized the resolved exam on the request.
    return this.engine.start(user.id, req.exam);
  }

  @Get('attempts/:id')
  getAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.engine.getAttempt(id, user.id);
  }

  @Patch('attempts/:id/items/:questionId')
  answer(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AnswerItemDto,
  ) {
    return this.engine.answer(id, questionId, user.id, dto);
  }

  @Post('attempts/:id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.engine.submit(id, user.id);
  }

  @Get('attempts/:id/results')
  results(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.engine.results(id, user.id);
  }

  @Get('attempts/:id/review')
  review(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.engine.review(id, user.id);
  }

  @Get('me/attempts')
  history(@CurrentUser() user: AuthUser, @Query() pagination: PaginationDto) {
    return this.engine.listMine(user.id, pagination);
  }
}
