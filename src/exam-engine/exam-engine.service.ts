import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { ExamAttemptItem } from './entities/exam-attempt-item.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Question } from '../questions/entities/question.entity';
import { Topic } from '../exam-catalog/entities/topic.entity';
import { AnswerItemDto } from './dto/answer-item.dto';
import { AttemptStatus } from '../common/enums';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';

/** Fisher–Yates shuffle (per-attempt option ordering — light anti-cheat). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class ExamEngineService {
  constructor(
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptItem)
    private readonly items: Repository<ExamAttemptItem>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Topic) private readonly topics: Repository<Topic>,
  ) {}

  // ── Start ─────────────────────────────────────────
  async start(userId: string, exam: Exam) {
    // One active attempt per exam. If a stale in-progress attempt is overdue,
    // expire+grade it first, otherwise block a duplicate start.
    const existing = await this.attempts.findOne({
      where: { userId, examId: exam.id, status: AttemptStatus.IN_PROGRESS },
    });
    if (existing) {
      if (existing.expiresAt.getTime() < Date.now()) {
        await this.expireAndGrade(existing);
      } else {
        throw new BadRequestException(
          'You already have an in-progress attempt for this exam.',
        );
      }
    }

    const bankQuestions = await this.questions.find({
      where: { examId: exam.id, isActive: true },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    if (bankQuestions.length === 0) {
      throw new BadRequestException('This exam has no questions yet.');
    }

    const now = new Date();
    const attempt = this.attempts.create({
      userId,
      examId: exam.id,
      examProductId: exam.examProductId,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: now,
      expiresAt: new Date(now.getTime() + exam.durationMinutes * 60 * 1000),
      totalQuestions: bankQuestions.length,
      items: bankQuestions.map((q, idx) =>
        this.items.create({
          questionId: q.id,
          orderIndex: idx,
          optionOrder: shuffle(q.options.map((o) => o.id)),
          flagged: false,
        }),
      ),
    });
    const saved = await this.attempts.save(attempt);
    return this.buildInProgressPayload(saved.id, userId);
  }

  // ── Resume ────────────────────────────────────────
  async getAttempt(attemptId: string, userId: string) {
    const attempt = await this.loadOwned(attemptId, userId);
    await this.maybeExpire(attempt);
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      return this.buildInProgressPayload(attempt.id, userId);
    }
    // Terminal — return the results summary shape.
    return this.results(attemptId, userId);
  }

  // ── Answer / flag ─────────────────────────────────
  async answer(
    attemptId: string,
    questionId: string,
    userId: string,
    dto: AnswerItemDto,
  ) {
    const attempt = await this.loadOwned(attemptId, userId);
    await this.maybeExpire(attempt);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is no longer in progress.');
    }
    if (attempt.expiresAt.getTime() < Date.now()) {
      await this.expireAndGrade(attempt);
      throw new BadRequestException('Time is up — the attempt has expired.');
    }

    const item = await this.items.findOne({
      where: { attemptId, questionId },
    });
    if (!item) throw new NotFoundException('Question not part of this attempt.');

    if (dto.selectedOptionId !== undefined) {
      if (dto.selectedOptionId !== null && !item.optionOrder.includes(dto.selectedOptionId)) {
        throw new BadRequestException('Selected option is not valid for this question.');
      }
      item.selectedOptionId = dto.selectedOptionId;
      item.answeredAt = dto.selectedOptionId ? new Date() : null;
    }
    if (dto.flagged !== undefined) item.flagged = dto.flagged;

    await this.items.save(item);
    return {
      questionId,
      selectedOptionId: item.selectedOptionId,
      flagged: item.flagged,
    };
  }

  // ── Submit ────────────────────────────────────────
  async submit(attemptId: string, userId: string) {
    const attempt = await this.loadOwned(attemptId, userId);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt has already been submitted.');
    }
    await this.grade(attempt, AttemptStatus.SUBMITTED);
    return this.results(attemptId, userId);
  }

  // ── Results ───────────────────────────────────────
  async results(attemptId: string, userId: string) {
    const attempt = await this.loadOwned(attemptId, userId);
    await this.maybeExpire(attempt);
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is still in progress.');
    }
    const exam = await this.exams.findOne({ where: { id: attempt.examId } });
    const breakdown = await this.topicBreakdown(attempt);
    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examProductId: attempt.examProductId,
      status: attempt.status,
      totalQuestions: attempt.totalQuestions,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.totalQuestions - attempt.correctCount,
      percentage: Number(attempt.percentage),
      passMark: exam?.passMark ?? 70,
      passed: attempt.passed,
      timeSpentSeconds: attempt.timeSpentSeconds,
      submittedAt: attempt.submittedAt,
      domainBreakdown: breakdown,
    };
  }

  // ── Review (terminal only) ────────────────────────
  async review(attemptId: string, userId: string) {
    const attempt = await this.loadOwned(attemptId, userId);
    await this.maybeExpire(attempt);
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('Review is only available after submission.');
    }
    const items = await this.items.find({
      where: { attemptId },
      order: { orderIndex: 'ASC' },
    });
    const questionMap = await this.loadQuestions(items.map((i) => i.questionId));

    return items.map((item) => {
      const q = questionMap.get(item.questionId);
      const correctOption = q?.options.find((o) => o.isCorrect) ?? null;
      return {
        questionId: item.questionId,
        orderIndex: item.orderIndex,
        topic: q?.topic?.name ?? null,
        text: q?.text,
        explanation: q?.explanation ?? null,
        options: this.orderedOptions(item, q).map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
        selectedOptionId: item.selectedOptionId,
        correctOptionId: correctOption?.id ?? null,
        isCorrect: item.isCorrect ?? false,
        flagged: item.flagged,
      };
    });
  }

  // ── History ───────────────────────────────────────
  async listMine(userId: string, pagination: PaginationDto) {
    const [data, total] = await this.attempts.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(
      data.map((a) => ({
        id: a.id,
        examId: a.examId,
        examProductId: a.examProductId,
        status: a.status,
        totalQuestions: a.totalQuestions,
        correctCount: a.correctCount,
        percentage: Number(a.percentage),
        passed: a.passed,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
      })),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  // ── Auto-expiry sweep (called by cron) ────────────
  async expireOverdueAttempts(): Promise<number> {
    const overdue = await this.attempts.find({
      where: { status: AttemptStatus.IN_PROGRESS },
    });
    let count = 0;
    for (const attempt of overdue) {
      if (attempt.expiresAt.getTime() < Date.now()) {
        await this.expireAndGrade(attempt);
        count++;
      }
    }
    return count;
  }

  // ══ Internals ═════════════════════════════════════
  private async loadOwned(attemptId: string, userId: string): Promise<ExamAttempt> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not own this attempt.');
    }
    return attempt;
  }

  private async maybeExpire(attempt: ExamAttempt) {
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt.getTime() < Date.now()
    ) {
      await this.expireAndGrade(attempt);
    }
  }

  private async expireAndGrade(attempt: ExamAttempt) {
    await this.grade(attempt, AttemptStatus.EXPIRED);
  }

  /** Server-side grading by comparing selected option to the correct option. */
  private async grade(attempt: ExamAttempt, finalStatus: AttemptStatus) {
    const items = await this.items.find({ where: { attemptId: attempt.id } });
    const questionMap = await this.loadQuestions(items.map((i) => i.questionId));

    let correct = 0;
    for (const item of items) {
      const q = questionMap.get(item.questionId);
      const correctOption = q?.options.find((o) => o.isCorrect);
      const isCorrect =
        !!item.selectedOptionId &&
        !!correctOption &&
        item.selectedOptionId === correctOption.id;
      item.isCorrect = isCorrect;
      if (isCorrect) correct++;
    }
    await this.items.save(items);

    const exam = await this.exams.findOne({ where: { id: attempt.examId } });
    const passMark = exam?.passMark ?? 70;
    const total = attempt.totalQuestions || items.length || 1;
    const percentage = Math.round((correct / total) * 10000) / 100;

    attempt.correctCount = correct;
    attempt.percentage = percentage;
    attempt.passed = percentage >= passMark;
    attempt.status = finalStatus;
    attempt.submittedAt = new Date();
    attempt.timeSpentSeconds = Math.max(
      0,
      Math.round(
        (Math.min(Date.now(), attempt.expiresAt.getTime()) -
          attempt.startedAt.getTime()) /
          1000,
      ),
    );
    await this.attempts.save(attempt);
  }

  private async topicBreakdown(attempt: ExamAttempt) {
    const items = await this.items.find({ where: { attemptId: attempt.id } });
    const questionMap = await this.loadQuestions(items.map((i) => i.questionId));
    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const item of items) {
      const q = questionMap.get(item.questionId);
      const name = q?.topic?.name ?? 'General';
      const entry = byTopic.get(name) ?? { correct: 0, total: 0 };
      entry.total++;
      if (item.isCorrect) entry.correct++;
      byTopic.set(name, entry);
    }
    return Array.from(byTopic.entries()).map(([topic, v]) => ({
      topic,
      correct: v.correct,
      total: v.total,
      percentage: Math.round((v.correct / v.total) * 10000) / 100,
    }));
  }

  private async loadQuestions(ids: string[]): Promise<Map<string, Question>> {
    if (ids.length === 0) return new Map();
    const questions = await this.questions.find({
      where: { id: In(ids) },
      relations: { topic: true }, // options are eager
      withDeleted: true, // snapshot integrity — grade even if later soft-deleted
    });
    return new Map(questions.map((q) => [q.id, q]));
  }

  private orderedOptions(item: ExamAttemptItem, q?: Question) {
    if (!q) return [];
    const byId = new Map(q.options.map((o) => [o.id, o]));
    const ordered = item.optionOrder
      .map((id) => byId.get(id))
      .filter((o): o is NonNullable<typeof o> => !!o);
    // Include any options not captured in the snapshot (defensive).
    for (const o of q.options) if (!item.optionOrder.includes(o.id)) ordered.push(o);
    return ordered;
  }

  /** Builds the in-progress payload — NEVER includes is_correct/explanation. */
  private async buildInProgressPayload(attemptId: string, userId: string) {
    const attempt = await this.loadOwned(attemptId, userId);
    const items = await this.items.find({
      where: { attemptId },
      order: { orderIndex: 'ASC' },
    });
    const questionMap = await this.loadQuestions(items.map((i) => i.questionId));
    const exam = await this.exams.findOne({ where: { id: attempt.examId } });

    return {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        examProductId: attempt.examProductId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        serverTime: new Date(),
        totalQuestions: attempt.totalQuestions,
        durationMinutes: exam?.durationMinutes ?? null,
        passMark: exam?.passMark ?? 70,
      },
      questions: items.map((item) => {
        const q = questionMap.get(item.questionId);
        return {
          questionId: item.questionId,
          orderIndex: item.orderIndex,
          topic: q?.topic?.name ?? null,
          text: q?.text,
          type: q?.type,
          selectedOptionId: item.selectedOptionId,
          flagged: item.flagged,
          options: this.orderedOptions(item, q).map((o) => ({
            id: o.id,
            text: o.text, // NOTE: no isCorrect exposed pre-submit
          })),
        };
      }),
    };
  }
}
