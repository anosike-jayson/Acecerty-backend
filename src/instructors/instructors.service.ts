import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './entities/instructor.entity';
import {
  CreateInstructorDto,
  ListInstructorsDto,
  UpdateInstructorDto,
} from './dto/instructor.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class InstructorsService {
  constructor(
    @InjectRepository(Instructor)
    private readonly repo: Repository<Instructor>,
  ) {}

  async list(query: ListInstructorsDto) {
    const qb = this.repo.createQueryBuilder('i');
    if (query.search) {
      qb.where('i.name ILIKE :s', { s: `%${query.search}%` });
    }
    const [data, total] = await qb
      .orderBy('i.name', 'ASC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<Instructor> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Instructor not found');
    return found;
  }

  create(dto: CreateInstructorDto): Promise<Instructor> {
    const instructor = this.repo.create({ certs: [], ...dto });
    return this.repo.save(instructor);
  }

  async update(id: string, dto: UpdateInstructorDto): Promise<Instructor> {
    const instructor = await this.findOne(id);
    Object.assign(instructor, dto);
    return this.repo.save(instructor);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const instructor = await this.findOne(id);
    await this.repo.softRemove(instructor);
    return { success: true };
  }
}
