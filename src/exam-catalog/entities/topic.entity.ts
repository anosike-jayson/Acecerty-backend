import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ExamProduct } from './exam-product.entity';

/** A "domain" a question belongs to — drives the per-domain results breakdown. */
@Entity('topics')
export class Topic extends BaseEntity {
  @Index()
  @Column({ name: 'exam_product_id', type: 'uuid' })
  examProductId: string;

  @ManyToOne(() => ExamProduct, (p) => p.topics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_product_id' })
  examProduct: ExamProduct;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'int', default: 0 })
  position: number;
}
