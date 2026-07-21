import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Difficulty } from '../../common/enums';
import { Course } from '../../courses/entities/course.entity';
import { Exam } from './exam.entity';
import { Topic } from './topic.entity';

/** The sellable practice-exam bundle — one per certification. */
@Entity('exam_products')
export class ExamProduct extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ name: 'cert_name', type: 'varchar', length: 160 })
  certName: string;

  @Column({ name: 'cert_code', type: 'varchar', length: 80 })
  certCode: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  domain: string;

  @Column({ type: 'enum', enum: Difficulty, default: Difficulty.INTERMEDIATE })
  difficulty: Difficulty;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'questions_count', type: 'int', default: 0 })
  questionsCount: number;

  @Column({ name: 'exams_count', type: 'int', default: 0 })
  examsCount: number;

  @Column({ name: 'per_exam_duration_minutes', type: 'int', default: 90 })
  perExamDurationMinutes: number;

  @Column({ name: 'pass_mark', type: 'int', default: 70 })
  passMark: number;

  @Column({ name: 'price_minor', type: 'bigint', default: 0 })
  priceMinor: number;

  @Column({ name: 'original_price_minor', type: 'bigint', nullable: true })
  originalPriceMinor: number | null;

  @Column({ type: 'varchar', length: 8, default: 'NGN' })
  currency: string;

  @Column({ name: 'access_duration_days', type: 'int', default: 90 })
  accessDurationDays: number;

  @Column({ name: 'has_free_demo', type: 'boolean', default: false })
  hasFreeDemo: boolean;

  @Column({ name: 'rating_avg', type: 'numeric', precision: 3, scale: 2, default: 0 })
  ratingAvg: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  @Column({ name: 'updated_label', type: 'varchar', length: 40, nullable: true })
  updatedLabel: string | null;

  @Index()
  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course: Course | null;

  @OneToMany(() => Exam, (e) => e.examProduct, { cascade: true })
  exams: Exam[];

  @OneToMany(() => Topic, (t) => t.examProduct, { cascade: true })
  topics: Topic[];
}
