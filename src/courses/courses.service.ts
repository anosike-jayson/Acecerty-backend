import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseModule } from './entities/course-module.entity';
import { CourseLesson } from './entities/course-lesson.entity';
import {
  CreateCourseDto,
  ListCoursesDto,
  UpdateCourseDto,
} from './dto/course.dto';
import {
  CreateLessonDto,
  CreateModuleDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/module-lesson.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseModule)
    private readonly modules: Repository<CourseModule>,
    @InjectRepository(CourseLesson)
    private readonly lessons: Repository<CourseLesson>,
  ) {}

  // ── Public read ───────────────────────────────────
  async listPublic(query: ListCoursesDto) {
    const qb = this.courses
      .createQueryBuilder('c')
      .where('c.is_published = true');
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('c.is_featured', 'DESC')
      .addOrderBy('c.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async getBySlug(slug: string): Promise<Course> {
    const course = await this.courses.findOne({
      where: { slug, isPublished: true },
      relations: { instructor: true, modules: { lessons: true } },
      order: { modules: { position: 'ASC', lessons: { position: 'ASC' } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // ── Admin ─────────────────────────────────────────
  async adminList(query: ListCoursesDto) {
    const qb = this.courses.createQueryBuilder('c');
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async adminGet(id: string): Promise<Course> {
    const course = await this.courses.findOne({
      where: { id },
      relations: { instructor: true, modules: { lessons: true } },
      order: { modules: { position: 'ASC', lessons: { position: 'ASC' } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    const exists = await this.courses.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug already in use');
    const course = this.courses.create(dto as Partial<Course>);
    return this.courses.save(course);
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.adminGet(id);
    if (dto.slug && dto.slug !== course.slug) {
      const clash = await this.courses.findOne({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('Slug already in use');
    }
    Object.assign(course, dto);
    return this.courses.save(course);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const course = await this.adminGet(id);
    await this.courses.softRemove(course);
    return { success: true };
  }

  async setPublished(id: string, isPublished: boolean): Promise<Course> {
    const course = await this.adminGet(id);
    course.isPublished = isPublished;
    return this.courses.save(course);
  }

  // ── Modules ───────────────────────────────────────
  async addModule(courseId: string, dto: CreateModuleDto): Promise<CourseModule> {
    await this.adminGet(courseId);
    const mod = this.modules.create({ courseId, ...dto });
    return this.modules.save(mod);
  }

  async updateModule(id: string, dto: UpdateModuleDto): Promise<CourseModule> {
    const mod = await this.modules.findOne({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');
    Object.assign(mod, dto);
    return this.modules.save(mod);
  }

  async removeModule(id: string): Promise<{ success: boolean }> {
    const mod = await this.modules.findOne({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');
    await this.modules.softRemove(mod);
    return { success: true };
  }

  // ── Lessons ───────────────────────────────────────
  async addLesson(moduleId: string, dto: CreateLessonDto): Promise<CourseLesson> {
    const mod = await this.modules.findOne({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');
    const lesson = this.lessons.create({ moduleId, ...dto });
    return this.lessons.save(lesson);
  }

  async updateLesson(id: string, dto: UpdateLessonDto): Promise<CourseLesson> {
    const lesson = await this.lessons.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    Object.assign(lesson, dto);
    return this.lessons.save(lesson);
  }

  async removeLesson(id: string): Promise<{ success: boolean }> {
    const lesson = await this.lessons.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.lessons.softRemove(lesson);
    return { success: true };
  }

  private applyFilters(qb: any, query: ListCoursesDto) {
    if (query.category) qb.andWhere('c.category = :category', { category: query.category });
    if (query.type) qb.andWhere('c.type = :type', { type: query.type });
    if (query.level) qb.andWhere('c.level = :level', { level: query.level });
    if (query.featured !== undefined)
      qb.andWhere('c.is_featured = :featured', { featured: query.featured });
    if (query.search)
      qb.andWhere('(c.title ILIKE :s OR c.short_title ILIKE :s)', {
        s: `%${query.search}%`,
      });
  }
}
