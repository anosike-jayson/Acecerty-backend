import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AttemptStatus } from '../../common/enums';
import { ExamAttemptItem } from './exam-attempt-item.entity';

@Entity('exam_attempts')
@Index(['userId', 'examId', 'status'])
export class ExamAttempt extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @Column({ name: 'exam_product_id', type: 'uuid' })
  examProductId: string;

  @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'total_questions', type: 'int', default: 0 })
  totalQuestions: number;

  @Column({ name: 'correct_count', type: 'int', default: 0 })
  correctCount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ type: 'boolean', default: false })
  passed: boolean;

  @Column({ name: 'time_spent_seconds', type: 'int', default: 0 })
  timeSpentSeconds: number;

  @OneToMany(() => ExamAttemptItem, (item) => item.attempt, { cascade: true })
  items: ExamAttemptItem[];
}
