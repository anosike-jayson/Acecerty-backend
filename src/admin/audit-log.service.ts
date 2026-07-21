import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  async record(entry: {
    actorUserId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<void> {
    await this.repo.save(this.repo.create(entry));
  }

  async list(pagination: PaginationDto) {
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(data, total, pagination.page, pagination.limit);
  }
}
