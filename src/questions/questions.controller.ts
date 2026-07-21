import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { ImportQuestionsDto } from './dto/import-questions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';

@ApiTags('Questions')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get('exams/:examId/questions')
  listByExam(@Param('examId', ParseUUIDPipe) examId: string) {
    return this.service.listByExam(examId);
  }

  @Post('questions')
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  @Patch('questions/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionDto) {
    return this.service.update(id, dto);
  }

  @Delete('questions/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post('exams/:examId/questions/import')
  import(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: ImportQuestionsDto,
  ) {
    return this.service.import(examId, dto);
  }
}
