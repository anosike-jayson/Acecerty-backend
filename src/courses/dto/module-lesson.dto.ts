import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateModuleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  durationLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
