import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import {
  CourseCategory,
  CourseLevel,
  CourseType,
} from '../../common/enums';
import { Instructor } from '../../instructors/entities/instructor.entity';
import { CourseModule } from './course-module.entity';

export interface CourseHighlight {
  icon: string;
  label: string;
  value: string;
}

@Entity('courses')
export class Course extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'short_title', type: 'varchar', length: 120 })
  shortTitle: string;

  @Index()
  @Column({ type: 'enum', enum: CourseCategory })
  category: CourseCategory;

  @Index()
  @Column({ type: 'enum', enum: CourseType })
  type: CourseType;

  @Column({ type: 'enum', enum: CourseLevel })
  level: CourseLevel;

  // Money as integer minor units (kobo). PRD §3 conventions.
  @Column({ name: 'price_minor', type: 'bigint', default: 0 })
  priceMinor: number;

  @Column({ name: 'original_price_minor', type: 'bigint', nullable: true })
  originalPriceMinor: number | null;

  @Column({ type: 'varchar', length: 8, default: 'NGN' })
  currency: string;

  @Column({ name: 'duration_label', type: 'varchar', length: 80, nullable: true })
  durationLabel: string | null;

  @Column({ name: 'delivery_label', type: 'varchar', length: 120, nullable: true })
  deliveryLabel: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  tagline: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Index()
  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'next_cohort_date', type: 'varchar', length: 60, nullable: true })
  nextCohortDate: string | null;

  @Column({ name: 'videos_count', type: 'int', nullable: true })
  videosCount: number | null;

  @Column({ name: 'questions_count', type: 'int', nullable: true })
  questionsCount: number | null;

  @Column({ type: 'varchar', length: 40, default: 'English' })
  language: string;

  @Column({ name: 'has_certificate', type: 'boolean', default: true })
  hasCertificate: boolean;

  // List-of-strings / object blocks stored as jsonb (PRD §3.2).
  @Column({ type: 'jsonb', default: () => "'[]'" })
  outcomes: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  requirements: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  audience: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  highlights: CourseHighlight[];

  // Admin-editable rating aggregates (student reviews deferred to Iteration 2).
  @Column({ name: 'rating_avg', type: 'numeric', precision: 3, scale: 2, default: 0 })
  ratingAvg: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  @Column({ name: 'students_count', type: 'int', default: 0 })
  studentsCount: number;

  @Index()
  @Column({ name: 'instructor_id', type: 'uuid', nullable: true })
  instructorId: string | null;

  @ManyToOne(() => Instructor, (i) => i.courses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'instructor_id' })
  instructor: Instructor | null;

  @OneToMany(() => CourseModule, (m) => m.course, { cascade: true })
  modules: CourseModule[];
}
