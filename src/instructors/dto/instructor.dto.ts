import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateInstructorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  credentials?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certs?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  experienceLabel?: string;
}

export class UpdateInstructorDto extends PartialType(CreateInstructorDto) {}

export class ListInstructorsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
