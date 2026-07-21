import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Bulk import payload. Supports either:
 *  - format=json + rows: array of raw question objects, or
 *  - format=csv  + content: a CSV string.
 *
 * CSV columns (header row required):
 *   text, explanation, topic, difficulty,
 *   optionA, optionB, optionC, optionD, correct
 * where `correct` is the letter (A-D) or 1-based index of the correct option.
 */
export class ImportQuestionsDto {
  @IsIn(['json', 'csv'])
  format: 'json' | 'csv';

  @ValidateIf((o) => o.format === 'csv')
  @IsString()
  content?: string;

  @ValidateIf((o) => o.format === 'json')
  @IsArray()
  rows?: any[];

  @IsOptional()
  @IsString()
  defaultTopicId?: string;
}
