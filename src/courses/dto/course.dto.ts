import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CourseCategory,
  CourseLevel,
  CourseType,
} from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { booleanTransform, jsonArrayTransform } from '../../common/transforms';

export class CourseHighlightDto {
  @IsString() icon: string;
  @IsString() label: string;
  @IsString() value: string;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
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
  // Set automatically from the uploaded thumbnail when using multipart; may
  // also be passed directly if the image was uploaded separately.
  @IsOptional() @IsString() imageUrl?: string;

  @IsOptional() @Transform(booleanTransform) @IsBoolean() isFeatured?: boolean;
  @IsOptional() @Transform(booleanTransform) @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() nextCohortDate?: string;

  @IsOptional() @IsInt() videosCount?: number;
  @IsOptional() @IsInt() questionsCount?: number;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @Transform(booleanTransform) @IsBoolean() hasCertificate?: boolean;

  // Arrays accept either a native JSON array or a JSON-encoded string (multipart).
  @IsOptional() @Transform(jsonArrayTransform) @IsArray() @IsString({ each: true }) outcomes?: string[];
  @IsOptional() @Transform(jsonArrayTransform) @IsArray() @IsString({ each: true }) requirements?: string[];
  @IsOptional() @Transform(jsonArrayTransform) @IsArray() @IsString({ each: true }) audience?: string[];

  // Accepts a native array (JSON) or a JSON-encoded string (multipart) and
  // normalizes each entry to a clean { icon, label, value } object. Bad input
  // (unparseable string / non-array) falls through to @IsArray → 400.
  @IsOptional()
  @Transform(({ value }) => {
    let arr: any = value;
    if (typeof value === 'string') {
      const t = value.trim();
      if (t === '') return undefined;
      try {
        arr = JSON.parse(t);
      } catch {
        return value;
      }
    }
    if (!Array.isArray(arr)) return arr;
    return arr.map((el) => ({
      icon: String(el?.icon ?? ''),
      label: String(el?.label ?? ''),
      value: String(el?.value ?? ''),
    }));
  })
  @IsArray()
  highlights?: CourseHighlightDto[];

  @IsOptional() @IsInt() @Min(0) ratingCount?: number;
  @IsOptional() @IsInt() @Min(0) studentsCount?: number;

  @IsOptional() @IsString() instructorId?: string;

  // Swagger-only: renders a file picker for multipart create/update. The file
  // is handled by the FileInterceptor, not by body validation.
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Course thumbnail image (png/jpg/webp, max 5 MB)',
  })
  thumbnail?: any;
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
