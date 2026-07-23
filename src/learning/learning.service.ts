import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { LessonProgress } from './entities/lesson-progress.entity';
import { Certificate } from './entities/certificate.entity';
import { CourseLesson } from '../courses/entities/course-lesson.entity';
import { CourseModule } from '../courses/entities/course-module.entity';
import { Course } from '../courses/entities/course.entity';
import { ExamAttempt } from '../exam-engine/entities/exam-attempt.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Order } from '../commerce/entities/order.entity';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { UpdateLessonProgressDto, IssueCertificateDto } from './dto/learning.dto';
import {
  AttemptStatus,
  CertificateStatus,
  EntitlementStatus,
  ItemType,
  LessonProgressStatus,
} from '../common/enums';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly progress: Repository<LessonProgress>,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    @InjectRepository(CourseLesson)
    private readonly lessons: Repository<CourseLesson>,
    @InjectRepository(CourseModule)
    private readonly modules: Repository<CourseModule>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ── Lesson progress (Iteration 2 provisioning) ────
  async updateProgress(
    userId: string,
    lessonId: string,
    dto: UpdateLessonProgressDto,
  ): Promise<LessonProgress> {
    const lesson = await this.lessons.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const mod = await this.modules.findOne({ where: { id: lesson.moduleId } });
    if (!mod) throw new BadRequestException('Lesson has no parent module');

    let row = await this.progress.findOne({ where: { userId, lessonId } });
    if (!row) {
      row = this.progress.create({
        userId,
        lessonId,
        courseId: mod.courseId,
        status: LessonProgressStatus.NOT_STARTED,
        watchedSeconds: 0,
      });
    }
    if (dto.watchedSeconds !== undefined) row.watchedSeconds = dto.watchedSeconds;
    if (dto.status !== undefined) {
      row.status = dto.status;
      row.completedAt =
        dto.status === LessonProgressStatus.COMPLETED ? new Date() : null;
    }
    return this.progress.save(row);
  }

  async courseProgress(userId: string, courseId: string) {
    const total = await this.lessons
      .createQueryBuilder('l')
      .innerJoin('l.module', 'm')
      .where('m.course_id = :courseId', { courseId })
      .getCount();
    const completed = await this.progress.count({
      where: { userId, courseId, status: LessonProgressStatus.COMPLETED },
    });
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { courseId, totalLessons: total, completedLessons: completed, percentage };
  }

  // ── Certificates ──────────────────────────────────
  listCertificates(userId: string) {
    return this.certificates.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
    });
  }

  async issueCertificate(dto: IssueCertificateDto): Promise<Certificate> {
    const credentialId = `ACE-${new Date().getFullYear()}-${randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
    return this.certificates.save(
      this.certificates.create({
        userId: dto.userId,
        courseId: dto.courseId ?? null,
        title: dto.title,
        credentialId,
        issuedAt: new Date(),
        fileUrl: dto.fileUrl ?? null,
        status: CertificateStatus.ISSUED,
      }),
    );
  }

  // ── Student dashboard aggregate ───────────────────
  /**
   * Mirrors StudentDashboardPage. Live data is used where it exists (exam
   * scores, active course entitlements, certificates); LMS-pending figures
   * (lesson progress) come from lesson_progress and read 0 until content ships.
   */
  async dashboard(userId: string) {
    const entitlements = await this.entitlements.listForUser(userId);
    const courseEntitlements = entitlements.filter(
      (e) => e.itemType === ItemType.COURSE && e.status === EntitlementStatus.ACTIVE,
    );

    // Active courses + progress.
    const courseIds = courseEntitlements.map((e) => e.itemId);
    const courseMap = new Map<string, Course>();
    if (courseIds.length) {
      const courses = await this.courses.find({ where: { id: In(courseIds) } });
      courses.forEach((c) => courseMap.set(c.id, c));
    }
    const activeCourses = await Promise.all(
      courseEntitlements.map(async (e) => {
        const course = courseMap.get(e.itemId);
        const prog = await this.courseProgress(userId, e.itemId);
        return {
          courseId: e.itemId,
          title: course?.title ?? 'Course',
          shortTitle: course?.shortTitle ?? null,
          imageUrl: course?.imageUrl ?? null,
          progress: prog.percentage,
          completedLessons: prog.completedLessons,
          totalLessons: prog.totalLessons,
          expiresAt: e.expiresAt,
        };
      }),
    );

    // Exam score history (live).
    const attempts = await this.attempts.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    const graded = attempts.filter(
      (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.EXPIRED,
    );
    const examIds = Array.from(new Set(graded.map((a) => a.examId)));
    const examTitles = new Map<string, string>();
    if (examIds.length) {
      const exams = await this.exams.find({ where: { id: In(examIds) } });
      exams.forEach((e) => examTitles.set(e.id, e.title));
    }
    const examScores = graded.map((a) => ({
      attemptId: a.id,
      exam: examTitles.get(a.examId) ?? 'Practice Exam',
      score: Number(a.percentage),
      passed: a.passed,
      date: a.submittedAt,
    }));

    const certificates = await this.listCertificates(userId);

    const avgProgress =
      activeCourses.length > 0
        ? Math.round(
            activeCourses.reduce((s, c) => s + c.progress, 0) / activeCourses.length,
          )
        : 0;

    return {
      stats: {
        activeCourses: activeCourses.length,
        certificatesEarned: certificates.length,
        avgProgress,
        lastPracticeScore: examScores[0]?.score ?? null,
        learningStreakDays: this.computeStreak(graded.map((a) => a.submittedAt)),
      },
      activeCourses,
      examScores,
      certificates,
      recentActivity: await this.recentActivity(userId, graded),
    };
  }

  /** Consecutive-day streak based on activity dates (UTC day granularity). */
  private computeStreak(dates: (Date | null)[]): number {
    const days = new Set(
      dates
        .filter((d): d is Date => !!d)
        .map((d) => new Date(d).toISOString().slice(0, 10)),
    );
    if (days.size === 0) return 0;
    let streak = 0;
    const cursor = new Date();
    // Allow the streak to count from today or yesterday.
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (days.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }

  private async recentActivity(userId: string, gradedAttempts: ExamAttempt[]) {
    const activity: { label: string; type: string; at: Date | null }[] = [];
    for (const a of gradedAttempts.slice(0, 5)) {
      activity.push({
        label: `Practice exam scored ${Number(a.percentage)}%`,
        type: 'exam',
        at: a.submittedAt,
      });
    }
    const recentOrders = await this.orders.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 3,
    });
    for (const o of recentOrders) {
      activity.push({
        label: `Order ${o.status} — ${o.items?.length ?? 0} item(s)`,
        type: 'order',
        at: o.createdAt,
      });
    }
    return activity
      .filter((x) => x.at)
      .sort((a, b) => (b.at!.getTime() - a.at!.getTime()))
      .slice(0, 6);
  }
}
