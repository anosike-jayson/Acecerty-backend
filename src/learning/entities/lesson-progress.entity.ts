import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { LessonProgressStatus } from '../../common/enums';

/**
 * Per-user, per-lesson progress. Provisioned for Iteration 2 but usable now
 * (a lesson can be marked complete even before video content exists).
 */
@Entity('lesson_progress')
@Unique(['userId', 'lessonId'])
export class LessonProgress extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({
    type: 'enum',
    enum: LessonProgressStatus,
    default: LessonProgressStatus.NOT_STARTED,
  })
  status: LessonProgressStatus;

  @Column({ name: 'watched_seconds', type: 'int', default: 0 })
  watchedSeconds: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
