import { IsBoolean } from 'class-validator';

export class PublishDto {
  @IsBoolean()
  isPublished: boolean;
}
