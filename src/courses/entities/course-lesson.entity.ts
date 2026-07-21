import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { CourseModule } from './course-module.entity';

/**
 * Iteration 1 stores only lesson titles + ordering. Iteration 2 adds
 * content_type, video_url, duration_seconds, is_preview, body.
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
}
