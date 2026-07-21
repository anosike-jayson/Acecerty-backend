import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Difficulty, QuestionType } from '../../common/enums';
import { Exam } from '../../exam-catalog/entities/exam.entity';
import { Topic } from '../../exam-catalog/entities/topic.entity';
import { QuestionOption } from './question-option.entity';

/** Fixed-form binding: each question belongs to a specific Exam (PRD §3.3). */
@Entity('questions')
export class Question extends BaseEntity {
  @Index()
  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @ManyToOne(() => Exam, (e) => e.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ name: 'topic_id', type: 'uuid', nullable: true })
  topicId: string | null;

  @ManyToOne(() => Topic, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.SINGLE_CHOICE })
  type: QuestionType;

  @Column({ type: 'enum', enum: Difficulty, nullable: true })
  difficulty: Difficulty | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => QuestionOption, (o) => o.question, {
    cascade: true,
    eager: true,
  })
  options: QuestionOption[];
}
