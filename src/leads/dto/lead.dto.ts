import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LeadStatus, LeadType } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** Host-a-course instructor application (mirrors HostACoursePage form). */
export class InstructorApplicationDto {
  @IsString() @MaxLength(160) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) company?: string;
  @IsOptional() @IsString() certifications?: string;
  @IsOptional() @IsString() @MaxLength(200) courseTitle?: string;
  @IsOptional() @IsString() @MaxLength(80) courseFormat?: string;
  @IsOptional() @IsString() experience?: string;
  @IsOptional() @IsString() message?: string;
}

export class NewsletterSignupDto {
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(120) source?: string;
}

export class ContactDto {
  @IsString() @MaxLength(160) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsString() message: string;
}

export class ListLeadsDto extends PaginationDto {
  @IsOptional() @IsEnum(LeadType) type?: LeadType;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsString() search?: string;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus) status: LeadStatus;
}
