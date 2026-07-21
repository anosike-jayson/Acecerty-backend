import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { Question } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Topic } from '../exam-catalog/entities/topic.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { ImportQuestionsDto } from './dto/import-questions.dto';
import { QuestionType } from '../common/enums';

export interface ImportRowResult {
  row: number;
  success: boolean;
  questionId?: string;
  error?: string;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly options: Repository<QuestionOption>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Topic) private readonly topics: Repository<Topic>,
    @InjectRepository(ExamProduct)
    private readonly products: Repository<ExamProduct>,
    private readonly dataSource: DataSource,
  ) {}

  async listByExam(examId: string): Promise<Question[]> {
    await this.getExamOrFail(examId);
    return this.questions.find({
      where: { examId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Question> {
    const q = await this.questions.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  async create(dto: CreateQuestionDto): Promise<Question> {
    await this.getExamOrFail(dto.examId);
    this.validateOptions(dto.options.map((o) => o.isCorrect), dto.type);
    const question = this.questions.create({
      examId: dto.examId,
      topicId: dto.topicId ?? null,
      text: dto.text,
      explanation: dto.explanation ?? null,
      type: dto.type ?? QuestionType.SINGLE_CHOICE,
      difficulty: dto.difficulty ?? null,
      isActive: dto.isActive ?? true,
      position: dto.position ?? 0,
      options: dto.options.map((o, i) =>
        this.options.create({
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex ?? i,
        }),
      ),
    });
    const saved = await this.questions.save(question);
    await this.refreshQuestionsCount(dto.examId);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findOne(id);
    if (dto.options) {
      this.validateOptions(dto.options.map((o) => o.isCorrect), dto.type ?? question.type);
      // Replace the option set wholesale.
      await this.options.delete({ questionId: id });
      question.options = dto.options.map((o, i) =>
        this.options.create({
          questionId: id,
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex ?? i,
        }),
      );
    }
    const { options, examId, ...rest } = dto;
    Object.assign(question, rest);
    await this.questions.save(question);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const question = await this.findOne(id);
    await this.questions.softRemove(question);
    await this.refreshQuestionsCount(question.examId);
    return { success: true };
  }

  // ── Bulk import ───────────────────────────────────
  async import(
    examId: string,
    dto: ImportQuestionsDto,
  ): Promise<{ imported: number; failed: number; results: ImportRowResult[] }> {
    await this.getExamOrFail(examId);

    const rawRows =
      dto.format === 'csv'
        ? this.parseCsv(dto.content || '')
        : dto.rows || [];

    const results: ImportRowResult[] = [];
    let imported = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      try {
        const normalized = this.normalizeRow(rawRows[i], dto.defaultTopicId);
        const question = await this.create({ examId, ...normalized });
        results.push({ row: rowNum, success: true, questionId: question.id });
        imported++;
      } catch (err: any) {
        results.push({
          row: rowNum,
          success: false,
          error: err?.message ?? 'Unknown error',
        });
      }
    }

    return { imported, failed: results.length - imported, results };
  }

  // ── Helpers ───────────────────────────────────────
  private parseCsv(content: string): any[] {
    if (!content.trim()) throw new BadRequestException('CSV content is empty');
    try {
      return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`CSV parse error: ${err.message}`);
    }
  }

  /** Normalizes a raw import row (flat CSV shape OR nested JSON shape). */
  private normalizeRow(
    raw: any,
    defaultTopicId?: string,
  ): Omit<CreateQuestionDto, 'examId'> {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Row is not an object');
    }

    // Nested shape: options already provided.
    if (Array.isArray(raw.options)) {
      const options = raw.options.map((o: any, idx: number) => ({
        text: String(o.text ?? '').trim(),
        isCorrect: Boolean(o.isCorrect),
        orderIndex: o.orderIndex ?? idx,
      }));
      return {
        text: this.requireText(raw.text),
        explanation: raw.explanation,
        topicId: raw.topicId ?? defaultTopicId,
        difficulty: raw.difficulty,
        options,
      };
    }

    // Flat shape: optionA..optionN + correct.
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const options: { text: string; isCorrect: boolean; orderIndex: number }[] = [];
    letters.forEach((letter, idx) => {
      const val = raw[`option${letter}`] ?? raw[`option_${letter.toLowerCase()}`];
      if (val !== undefined && String(val).trim() !== '') {
        options.push({ text: String(val).trim(), isCorrect: false, orderIndex: idx });
      }
    });
    if (options.length < 2) {
      throw new Error('At least 2 non-empty options required');
    }

    const correctIdx = this.resolveCorrectIndex(raw.correct, options.length);
    options[correctIdx].isCorrect = true;

    return {
      text: this.requireText(raw.text),
      explanation: raw.explanation,
      topicId: raw.topicId ?? defaultTopicId,
      difficulty: raw.difficulty,
      options,
    };
  }

  private requireText(text: any): string {
    const t = String(text ?? '').trim();
    if (!t) throw new Error('Question text is required');
    return t;
  }

  /** Accepts a letter (A-F) or a 1-based numeric index. */
  private resolveCorrectIndex(correct: any, optionCount: number): number {
    if (correct === undefined || correct === null || correct === '') {
      throw new Error('Missing "correct" answer indicator');
    }
    const raw = String(correct).trim().toUpperCase();
    const letterIdx = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(raw);
    let idx: number;
    if (letterIdx >= 0) {
      idx = letterIdx;
    } else if (/^\d+$/.test(raw)) {
      idx = parseInt(raw, 10) - 1; // 1-based
    } else {
      throw new Error(`Unrecognized correct answer: "${correct}"`);
    }
    if (idx < 0 || idx >= optionCount) {
      throw new Error('Correct answer index out of range');
    }
    return idx;
  }

  private validateOptions(flags: boolean[], type?: QuestionType) {
    const correctCount = flags.filter(Boolean).length;
    if (correctCount === 0) throw new BadRequestException('At least one option must be correct');
    if (
      (type ?? QuestionType.SINGLE_CHOICE) === QuestionType.SINGLE_CHOICE &&
      correctCount > 1
    ) {
      throw new BadRequestException('Single-choice questions must have exactly one correct option');
    }
  }

  private async getExamOrFail(examId: string): Promise<Exam> {
    const exam = await this.exams.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  private async refreshQuestionsCount(examId: string) {
    const exam = await this.exams.findOne({ where: { id: examId } });
    if (!exam) return;
    // Roll up the product's total question count across its exams.
    const total = await this.questions
      .createQueryBuilder('q')
      .innerJoin('q.exam', 'e')
      .where('e.exam_product_id = :pid', { pid: exam.examProductId })
      .getCount();
    await this.products.update(
      { id: exam.examProductId },
      { questionsCount: total },
    );
  }
}
