import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { CertificateStatus } from '../../common/enums';

/**
 * Course-completion certificate. In Iteration 1 an admin issues these
 * manually; Iteration 2 auto-generates them on course completion + renders a
 * downloadable file (`fileUrl`).
 */
@Entity('certificates')
export class Certificate extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Index({ unique: true })
  @Column({ name: 'credential_id', type: 'varchar', length: 80 })
  credentialId: string;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({ type: 'enum', enum: CertificateStatus, default: CertificateStatus.ISSUED })
  status: CertificateStatus;
}
