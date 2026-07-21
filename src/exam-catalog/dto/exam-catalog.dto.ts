import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { Difficulty } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

// ── Exam product ──────────────────────────────────────
export class CreateExamProductDto {
  @IsString() @IsNotEmpty() slug: string;
  @IsString() certName: string;
  @IsString() certCode: string;
  @IsString() domain: string;

  @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) questionsCount?: number;
  @IsOptional() @IsInt() @Min(0) examsCount?: number;
  @IsOptional() @IsInt() @Min(1) perExamDurationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) passMark?: number;
  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @IsInt() @Min(0) originalPriceMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsInt() @Min(1) accessDurationDays?: number;
  @IsOptional() @IsBoolean() hasFreeDemo?: boolean;
  @IsOptional() @IsString() updatedLabel?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsInt() @Min(0) ratingCount?: number;
}

export class UpdateExamProductDto extends PartialType(CreateExamProductDto) {
  @IsOptional() ratingAvg?: number;
}

export class ListExamProductsDto extends PaginationDto {
  @IsOptional() @IsString() domain?: string;
  @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @IsOptional() @IsString() search?: string;
}

// ── Exam (form) ───────────────────────────────────────
export class CreateExamDto {
  @IsString() title: string;
  @IsOptional() @IsInt() @Min(0) orderIndex?: number;
  @IsOptional() @IsInt() @Min(1) durationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) passMark?: number;
  @IsOptional() @IsBoolean() isFreeDemo?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

// ── Topic ─────────────────────────────────────────────
export class CreateTopicDto {
  @IsString() name: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateTopicDto extends PartialType(CreateTopicDto) {}
