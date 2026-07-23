import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import {
  ContactDto,
  InstructorApplicationDto,
  ListLeadsDto,
  NewsletterSignupDto,
  UpdateLeadStatusDto,
} from './dto/lead.dto';
import { LeadType } from '../common/enums';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private readonly repo: Repository<Lead>,
  ) {}

  async createInstructorApplication(dto: InstructorApplicationDto): Promise<Lead> {
    const { name, email, phone, message, ...rest } = dto;
    return this.repo.save(
      this.repo.create({
        type: LeadType.INSTRUCTOR_APPLICATION,
        name,
        email: email.toLowerCase().trim(),
        phone: phone ?? null,
        message: message ?? null,
        source: 'host-a-course',
        payload: rest,
      }),
    );
  }

  async createNewsletterSignup(dto: NewsletterSignupDto): Promise<Lead> {
    return this.repo.save(
      this.repo.create({
        type: LeadType.NEWSLETTER,
        name: dto.name ?? null,
        email: dto.email.toLowerCase().trim(),
        source: dto.source ?? 'newsletter',
      }),
    );
  }

  async createContact(dto: ContactDto): Promise<Lead> {
    return this.repo.save(
      this.repo.create({
        type: LeadType.CONTACT,
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone ?? null,
        message: dto.message,
        source: 'contact',
      }),
    );
  }

  // ── Admin ─────────────────────────────────────────
  async list(query: ListLeadsDto) {
    const qb = this.repo.createQueryBuilder('l');
    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    if (query.status) qb.andWhere('l.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('l.email ILIKE :s', { s: `%${query.search}%` }).orWhere(
            'l.name ILIKE :s',
            { s: `%${query.search}%` },
          );
        }),
      );
    }
    const [data, total] = await qb
      .orderBy('l.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto): Promise<Lead> {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    lead.status = dto.status;
    return this.repo.save(lead);
  }
}
