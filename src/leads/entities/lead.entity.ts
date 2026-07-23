import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { LeadStatus, LeadType } from '../../common/enums';

/**
 * Captures inbound leads: host-a-course instructor applications, newsletter
 * sign-ups, and generic contact submissions. Common fields are typed; the full
 * application payload is kept in `payload` (jsonb) so the form can evolve
 * without a migration.
 */
@Entity('leads')
export class Lead extends BaseEntity {
  @Index()
  @Column({ type: 'enum', enum: LeadType })
  type: LeadType;

  @Index()
  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  source: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;
}
