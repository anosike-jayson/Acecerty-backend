import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ExamAttempt } from './exam-attempt.entity';

/**
 * Snapshot of an assembled question for an attempt (so results stay
 * reproducible even if the bank is later edited) + the student's response.
 * Snapshotting question/option order at start makes grading deterministic.
 */
@Entity('exam_attempt_items')
export class ExamAttemptItem extends BaseEntity {
  @Index()
  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, (a) => a.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  // Snapshot of option ordering presented to the student (option ids in order).
  @Column({ name: 'option_order', type: 'jsonb', default: () => "'[]'" })
  optionOrder: string[];

  @Column({ name: 'selected_option_id', type: 'uuid', nullable: true })
  selectedOptionId: string | null;

  @Column({ type: 'boolean', default: false })
  flagged: boolean;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date | null;
}
