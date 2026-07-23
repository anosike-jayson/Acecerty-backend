import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamVoucher } from './entities/exam-voucher.entity';
import {
  CreateExamVoucherDto,
  ListExamVouchersDto,
  UpdateExamVoucherDto,
} from './dto/exam-voucher.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(ExamVoucher)
    private readonly repo: Repository<ExamVoucher>,
  ) {}

  async listPublic(query: ListExamVouchersDto) {
    const qb = this.repo.createQueryBuilder('v').where('v.is_published = true');
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('v.popular', 'DESC')
      .addOrderBy('v.vendor', 'ASC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async getBySlug(slug: string): Promise<ExamVoucher> {
    const voucher = await this.repo.findOne({
      where: { slug, isPublished: true },
    });
    if (!voucher) throw new NotFoundException('Exam voucher not found');
    return voucher;
  }

  // ── Admin ─────────────────────────────────────────
  async adminList(query: ListExamVouchersDto) {
    const qb = this.repo.createQueryBuilder('v');
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('v.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async adminGet(id: string): Promise<ExamVoucher> {
    const voucher = await this.repo.findOne({ where: { id } });
    if (!voucher) throw new NotFoundException('Exam voucher not found');
    return voucher;
  }

  async create(dto: CreateExamVoucherDto): Promise<ExamVoucher> {
    const exists = await this.repo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug already in use');
    return this.repo.save(this.repo.create(dto as Partial<ExamVoucher>));
  }

  async update(id: string, dto: UpdateExamVoucherDto): Promise<ExamVoucher> {
    const voucher = await this.adminGet(id);
    if (dto.slug && dto.slug !== voucher.slug) {
      const clash = await this.repo.findOne({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('Slug already in use');
    }
    Object.assign(voucher, dto);
    return this.repo.save(voucher);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const voucher = await this.adminGet(id);
    await this.repo.softRemove(voucher);
    return { success: true };
  }

  async setPublished(id: string, isPublished: boolean): Promise<ExamVoucher> {
    const voucher = await this.adminGet(id);
    voucher.isPublished = isPublished;
    return this.repo.save(voucher);
  }

  private applyFilters(qb: any, query: ListExamVouchersDto) {
    if (query.vendor) qb.andWhere('v.vendor = :vendor', { vendor: query.vendor });
    if (query.search)
      qb.andWhere('(v.exam_name ILIKE :s OR v.exam_code ILIKE :s OR v.vendor ILIKE :s)', {
        s: `%${query.search}%`,
      });
  }
}
