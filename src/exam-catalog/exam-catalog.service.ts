import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamProduct } from './entities/exam-product.entity';
import { Exam } from './entities/exam.entity';
import { Topic } from './entities/topic.entity';
import {
  CreateExamDto,
  CreateExamProductDto,
  CreateTopicDto,
  ListExamProductsDto,
  UpdateExamDto,
  UpdateExamProductDto,
  UpdateTopicDto,
} from './dto/exam-catalog.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class ExamCatalogService {
  constructor(
    @InjectRepository(ExamProduct)
    private readonly products: Repository<ExamProduct>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Topic) private readonly topics: Repository<Topic>,
  ) {}

  // ── Public read ───────────────────────────────────
  async listPublic(query: ListExamProductsDto) {
    const qb = this.products
      .createQueryBuilder('p')
      .where('p.is_published = true');
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async getBySlug(slug: string): Promise<ExamProduct> {
    const product = await this.products.findOne({
      where: { slug, isPublished: true },
      relations: { exams: true, topics: true },
      order: { exams: { orderIndex: 'ASC' }, topics: { position: 'ASC' } },
    });
    if (!product) throw new NotFoundException('Exam product not found');
    // Only expose published exam forms to the public.
    product.exams = (product.exams || []).filter((e) => e.isPublished);
    return product;
  }

  // ── Admin: products ───────────────────────────────
  async adminList(query: ListExamProductsDto) {
    const qb = this.products.createQueryBuilder('p');
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async adminGet(id: string): Promise<ExamProduct> {
    const product = await this.products.findOne({
      where: { id },
      relations: { exams: true, topics: true },
      order: { exams: { orderIndex: 'ASC' }, topics: { position: 'ASC' } },
    });
    if (!product) throw new NotFoundException('Exam product not found');
    return product;
  }

  async createProduct(dto: CreateExamProductDto): Promise<ExamProduct> {
    const exists = await this.products.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug already in use');
    return this.products.save(this.products.create(dto as Partial<ExamProduct>));
  }

  async updateProduct(id: string, dto: UpdateExamProductDto): Promise<ExamProduct> {
    const product = await this.adminGet(id);
    if (dto.slug && dto.slug !== product.slug) {
      const clash = await this.products.findOne({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('Slug already in use');
    }
    Object.assign(product, dto);
    return this.products.save(product);
  }

  async removeProduct(id: string): Promise<{ success: boolean }> {
    const product = await this.adminGet(id);
    await this.products.softRemove(product);
    return { success: true };
  }

  async setProductPublished(id: string, isPublished: boolean): Promise<ExamProduct> {
    const product = await this.adminGet(id);
    product.isPublished = isPublished;
    return this.products.save(product);
  }

  // ── Admin: exams ──────────────────────────────────
  async addExam(productId: string, dto: CreateExamDto): Promise<Exam> {
    await this.adminGet(productId);
    const exam = this.exams.create({ examProductId: productId, ...dto });
    const saved = await this.exams.save(exam);
    await this.refreshExamsCount(productId);
    return saved;
  }

  async getExam(id: string): Promise<Exam> {
    const exam = await this.exams.findOne({
      where: { id },
      relations: { examProduct: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async updateExam(id: string, dto: UpdateExamDto): Promise<Exam> {
    const exam = await this.getExam(id);
    Object.assign(exam, dto);
    return this.exams.save(exam);
  }

  async removeExam(id: string): Promise<{ success: boolean }> {
    const exam = await this.getExam(id);
    await this.exams.softRemove(exam);
    await this.refreshExamsCount(exam.examProductId);
    return { success: true };
  }

  async setExamPublished(id: string, isPublished: boolean): Promise<Exam> {
    const exam = await this.getExam(id);
    exam.isPublished = isPublished;
    return this.exams.save(exam);
  }

  // ── Admin: topics ─────────────────────────────────
  async addTopic(productId: string, dto: CreateTopicDto): Promise<Topic> {
    await this.adminGet(productId);
    const topic = this.topics.create({ examProductId: productId, ...dto });
    return this.topics.save(topic);
  }

  async updateTopic(id: string, dto: UpdateTopicDto): Promise<Topic> {
    const topic = await this.topics.findOne({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');
    Object.assign(topic, dto);
    return this.topics.save(topic);
  }

  async removeTopic(id: string): Promise<{ success: boolean }> {
    const topic = await this.topics.findOne({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');
    await this.topics.softRemove(topic);
    return { success: true };
  }

  private async refreshExamsCount(productId: string) {
    const count = await this.exams.count({ where: { examProductId: productId } });
    await this.products.update({ id: productId }, { examsCount: count });
  }

  private applyFilters(qb: any, query: ListExamProductsDto) {
    if (query.domain) qb.andWhere('p.domain = :domain', { domain: query.domain });
    if (query.difficulty)
      qb.andWhere('p.difficulty = :difficulty', { difficulty: query.difficulty });
    if (query.search)
      qb.andWhere('(p.cert_name ILIKE :s OR p.cert_code ILIKE :s)', {
        s: `%${query.search}%`,
      });
  }
}
