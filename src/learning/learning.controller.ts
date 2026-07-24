import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { UpdateLessonProgressDto, IssueCertificateDto } from './dto/learning.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';

@ApiTags('Learning')
@Controller()
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.learning.dashboard(user.id);
  }

  @Get('me/certificates')
  myCertificates(@CurrentUser() user: AuthUser) {
    return this.learning.listCertificates(user.id);
  }

  @Get('me/courses/:courseId/progress')
  courseProgress(
    @CurrentUser() user: AuthUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.learning.courseProgress(user.id, courseId);
  }

  @Patch('me/lessons/:lessonId/progress')
  updateProgress(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    return this.learning.updateProgress(user.id, lessonId, dto);
  }

  @Post('admin/certificates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  issueCertificate(@Body() dto: IssueCertificateDto) {
    return this.learning.issueCertificate(dto);
  }
}
