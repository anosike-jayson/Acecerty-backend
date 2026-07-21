import { IsBoolean, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AnswerItemDto {
  // null clears the selection; a UUID sets it.
  @IsOptional()
  @ValidateIf((o) => o.selectedOptionId !== null)
  @IsUUID()
  selectedOptionId?: string | null;

  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}
