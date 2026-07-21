import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ExamProduct } from './exam-product.entity';
import { Question } from '../../questions/entities/question.entity';

/** A single form/version within a product (a product has exams_count of these). */
@Entity('exams')
export class Exam extends BaseEntity {
  @Index()
  @Column({ name: 'exam_product_id', type: 'uuid' })
  examProductId: string;

  @ManyToOne(() => ExamProduct, (p) => p.exams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_product_id' })
  examProduct: ExamProduct;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'duration_minutes', type: 'int', default: 90 })
  durationMinutes: number;

  @Column({ name: 'pass_mark', type: 'int', default: 70 })
  passMark: number;

  @Column({ name: 'is_free_demo', type: 'boolean', default: false })
  isFreeDemo: boolean;

  @Index()
  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @OneToMany(() => Question, (q) => q.exam, { cascade: true })
  questions: Question[];
}
