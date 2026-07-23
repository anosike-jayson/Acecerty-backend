import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { LessonContentType } from '../../common/enums';
import { CourseModule } from './course-module.entity';

/**
 * Iteration 1 uses only titles + ordering. The content columns below are
 * provisioned now (all nullable) so the LMS in Iteration 2 can attach video /
 * article / quiz content without a breaking migration.
 */
@Entity('course_lessons')
export class CourseLesson extends BaseEntity {
  @Index()
  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => CourseModule, (m) => m.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: CourseModule;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  // ── Iteration 2 (LMS) — provisioned, nullable ─────
  @Column({ name: 'content_type', type: 'enum', enum: LessonContentType, nullable: true })
  contentType: LessonContentType | null;

  @Column({ name: 'video_url', type: 'varchar', length: 500, nullable: true })
  videoUrl: string | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'is_preview', type: 'boolean', default: false })
  isPreview: boolean;

  @Column({ type: 'text', nullable: true })
  body: string | null;
}
