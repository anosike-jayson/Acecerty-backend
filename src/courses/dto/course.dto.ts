import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  CourseCategory,
  CourseLevel,
  CourseType,
} from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CourseHighlightDto {
  @IsString() icon: string;
  @IsString() label: string;
  @IsString() value: string;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  shortTitle: string;

  @IsEnum(CourseCategory)
  category: CourseCategory;

  @IsEnum(CourseType)
  type: CourseType;

  @IsEnum(CourseLevel)
  level: CourseLevel;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  originalPriceMinor?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional() @IsString() durationLabel?: string;
  @IsOptional() @IsString() deliveryLabel?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() imageUrl?: string;

  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() nextCohortDate?: string;

  @IsOptional() @IsInt() videosCount?: number;
  @IsOptional() @IsInt() questionsCount?: number;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsBoolean() hasCertificate?: boolean;

  @IsOptional() @IsArray() @IsString({ each: true }) outcomes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) requirements?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) audience?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseHighlightDto)
  highlights?: CourseHighlightDto[];

  @IsOptional() @IsInt() @Min(0) ratingCount?: number;
  @IsOptional() @IsInt() @Min(0) studentsCount?: number;

  @IsOptional() @IsString() instructorId?: string;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @IsOptional()
  ratingAvg?: number;
}

export class ListCoursesDto extends PaginationDto {
  @IsOptional() @IsEnum(CourseCategory) category?: CourseCategory;
  @IsOptional() @IsEnum(CourseType) type?: CourseType;
  @IsOptional() @IsEnum(CourseLevel) level?: CourseLevel;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsString() search?: string;
}
