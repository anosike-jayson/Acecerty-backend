import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { LessonProgressStatus } from '../../common/enums';

export class UpdateLessonProgressDto {
  @IsOptional()
  @IsEnum(LessonProgressStatus)
  status?: LessonProgressStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  watchedSeconds?: number;
}

export class IssueCertificateDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;
}
