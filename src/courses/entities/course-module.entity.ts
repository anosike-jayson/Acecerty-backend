import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Course } from './course.entity';
import { CourseLesson } from './course-lesson.entity';

@Entity('course_modules')
export class CourseModule extends BaseEntity {
  @Index()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (c) => c.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'duration_label', type: 'varchar', length: 60, nullable: true })
  durationLabel: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => CourseLesson, (l) => l.module, { cascade: true })
  lessons: CourseLesson[];
}
