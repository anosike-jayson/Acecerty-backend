import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateExamVoucherDto {
  @IsString() @IsNotEmpty() @MaxLength(160) slug: string;
  @IsString() @MaxLength(80) vendor: string;
  @IsString() @MaxLength(160) examName: string;
  @IsString() @MaxLength(80) examCode: string;

  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @IsInt() @Min(0) originalPriceMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsBoolean() popular?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateExamVoucherDto extends PartialType(CreateExamVoucherDto) {}

export class ListExamVouchersDto extends PaginationDto {
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() search?: string;
}
