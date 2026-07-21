import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('instructors')
export class Instructor extends BaseEntity {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  credentials: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  certs: string[];

  @Column({ name: 'experience_label', type: 'varchar', length: 60, nullable: true })
  experienceLabel: string | null;

  @OneToMany(() => Course, (c) => c.instructor)
  courses: Course[];
}
