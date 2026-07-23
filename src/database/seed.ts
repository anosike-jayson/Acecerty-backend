import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import { User } from '../users/entities/user.entity';
import { Instructor } from '../instructors/entities/instructor.entity';
import { Course } from '../courses/entities/course.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { Exam } from '../exam-catalog/entities/exam.entity';
import { Topic } from '../exam-catalog/entities/topic.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionOption } from '../questions/entities/question-option.entity';
import { ExamVoucher } from '../vouchers/entities/exam-voucher.entity';
import { hashPassword } from '../common/password.util';
import {
  CourseCategory,
  CourseLevel,
  CourseType,
  Difficulty,
  QuestionType,
  UserRole,
} from '../common/enums';

dotenv.config();

const NGN = (naira: number) => naira * 100; // → kobo (minor units)

// CISSP demo questions (mirrors the frontend ExamInterfacePage sample bank).
const DEMO_QUESTIONS = [
  {
    domain: 'Security & Risk Management',
    text: 'Which of the following BEST describes the principle of least privilege?',
    options: [
      'Users should have access to all resources needed to perform any task',
      'Users are granted only the minimum permissions required to perform their job functions',
      'All users share the same access level to ensure consistency',
      'Privileged accounts are shared among administrators for efficiency',
    ],
    correct: 1,
    explanation:
      'The principle of least privilege states that a user, process, or system should be granted only the minimum level of access rights necessary to perform their functions.',
  },
  {
    domain: 'Cryptography & PKI',
    text: 'Which asymmetric encryption algorithm is commonly used for digital signatures and key exchange in SSL/TLS?',
    options: ['AES-256', 'RSA', '3DES', 'SHA-256'],
    correct: 1,
    explanation:
      'RSA is the most widely used asymmetric algorithm for digital signatures and key exchange. SHA-256 is a hash; AES/3DES are symmetric ciphers.',
  },
  {
    domain: 'Network Security',
    text: 'A stateful firewall differs from a packet-filtering firewall in that it:',
    options: [
      'Filters packets only at Layer 3 based on IP addresses',
      'Tracks the state of active connections and allows return traffic automatically',
      'Inspects application-layer content for malicious payloads',
      'Requires manual rules for every inbound and outbound connection',
    ],
    correct: 1,
    explanation:
      'A stateful firewall maintains a connection state table and automatically permits return traffic for established connections.',
  },
  {
    domain: 'Identity & Access Management',
    text: 'Which authentication factor category does a fingerprint scan belong to?',
    options: ['Something you know', 'Something you have', 'Something you are', 'Somewhere you are'],
    correct: 2,
    explanation:
      'Biometric factors such as fingerprints fall under "something you are" — the inherence factor.',
  },
  {
    domain: 'Incident Response',
    text: 'During which phase of the incident response lifecycle is eradication of malware performed?',
    options: ['Identification', 'Containment', 'Eradication', 'Lessons Learned'],
    correct: 2,
    explanation:
      'The Eradication phase removes malware and closes vulnerabilities after containment, per the NIST lifecycle.',
  },
  {
    domain: 'Security Architecture',
    text: 'Which security model enforces mandatory access control by preventing subjects from writing to objects at a lower security level?',
    options: ['Bell-LaPadula Model', 'Biba Integrity Model', 'Clark-Wilson Model', 'Brewer-Nash Model'],
    correct: 0,
    explanation:
      'Bell-LaPadula focuses on confidentiality and enforces "no write-down" and "no read-up" rules.',
  },
  {
    domain: 'Asset Security',
    text: 'Which data destruction method provides the HIGHEST assurance that data cannot be recovered from a hard drive?',
    options: ['Overwriting with zeros', 'Degaussing', 'Physical destruction / shredding', 'Quick format'],
    correct: 2,
    explanation:
      'Physical destruction renders the media completely unusable, providing the highest assurance.',
  },
  {
    domain: 'Software Security',
    text: 'Which of the following BEST prevents SQL injection attacks?',
    options: [
      'Encrypting the database at rest',
      'Using parameterised queries and prepared statements',
      'Implementing a web application firewall only',
      'Hashing all user inputs before processing',
    ],
    correct: 1,
    explanation:
      'Parameterised queries separate code from data and are the most effective defence against SQL injection.',
  },
  {
    domain: 'Cloud Security',
    text: "In the shared responsibility model for IaaS, which of the following is the cloud customer's responsibility?",
    options: [
      'Physical security of the data centre',
      'Hypervisor and virtualisation layer security',
      'Operating system patching and application security',
      'Network hardware maintenance',
    ],
    correct: 2,
    explanation:
      'In IaaS the customer is responsible for OS patching, application security, data security, and IAM configuration.',
  },
  {
    domain: 'Governance & Compliance',
    text: 'An organisation processes personal data of EU residents. Which regulation primarily governs their data protection obligations?',
    options: ['HIPAA', 'GDPR', 'PCI DSS', 'SOX'],
    correct: 1,
    explanation:
      'GDPR governs processing of personal data of EU residents regardless of where the processing organisation is located.',
  },
];

async function run() {
  await AppDataSource.initialize();
  console.log('DataSource initialized. Seeding…');

  const userRepo = AppDataSource.getRepository(User);
  const instructorRepo = AppDataSource.getRepository(Instructor);
  const courseRepo = AppDataSource.getRepository(Course);
  const productRepo = AppDataSource.getRepository(ExamProduct);
  const examRepo = AppDataSource.getRepository(Exam);
  const topicRepo = AppDataSource.getRepository(Topic);
  const questionRepo = AppDataSource.getRepository(Question);
  const voucherRepo = AppDataSource.getRepository(ExamVoucher);

  // ── Admin ─────────────────────────────────────────
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@acecerty.com').toLowerCase();
  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        email: adminEmail,
        passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin123!'),
        fullName: 'Acecerty Admin',
        role: UserRole.ADMIN,
        emailVerified: true,
      }),
    );
    console.log(`✓ Admin created: ${adminEmail}`);
  } else {
    console.log(`• Admin already exists: ${adminEmail}`);
  }

  // ── Instructors ───────────────────────────────────
  const instructorSeed = [
    {
      name: 'Emmanuel Okafor',
      credentials: 'CISSP, CISM, CEH, PMP',
      bio: 'Seasoned cybersecurity professional with 18+ years across finance, government, and telecom.',
      certs: ['CISSP', 'CISM', 'CEH', 'PMP', 'CISA'],
      experienceLabel: '18+ years',
    },
    {
      name: 'Adaeze Nwosu',
      credentials: 'AWS-SAA, AZ-104, CCSP, CCNA',
      bio: 'Cloud architect with 12 years designing enterprise infrastructure on AWS and Azure.',
      certs: ['AWS-SAA', 'AWS-SCS', 'AZ-104', 'CCSP'],
      experienceLabel: '12+ years',
    },
  ];
  const instructors: Instructor[] = [];
  for (const seed of instructorSeed) {
    let found = await instructorRepo.findOne({ where: { name: seed.name } });
    if (!found) found = await instructorRepo.save(instructorRepo.create(seed));
    instructors.push(found);
  }
  console.log(`✓ Instructors: ${instructors.length}`);

  // ── Courses ───────────────────────────────────────
  const courseSeed: Partial<Course>[] = [
    {
      slug: 'cissp-bootcamp',
      title: 'Certified Information Systems Security Professional',
      shortTitle: 'CISSP',
      category: CourseCategory.CYBERSECURITY,
      type: CourseType.BOOTCAMP,
      level: CourseLevel.ADVANCED,
      priceMinor: NGN(60000),
      originalPriceMinor: NGN(99000),
      durationLabel: '6 days',
      deliveryLabel: 'Live online or in-person',
      description:
        'The gold standard in cybersecurity. Cover all 8 CISSP domains with expert instructors.',
      tagline: 'Fully exam-ready in 6 days.',
      isFeatured: true,
      isPublished: true,
      nextCohortDate: 'Aug 11, 2026',
      instructorId: instructors[0].id,
      outcomes: [
        'Master all 8 CISSP domains',
        'Apply security concepts to enterprise architecture',
        'Pass the CAT exam with confidence',
      ],
      requirements: ['5+ years experience in 2+ CISSP domains'],
      audience: ['Security managers', 'IT directors and CISOs'],
      ratingAvg: 4.9,
      ratingCount: 812,
      studentsCount: 3240,
    },
    {
      slug: 'comptia-security-plus-bootcamp',
      title: 'CompTIA Security+ Certification',
      shortTitle: 'Security+',
      category: CourseCategory.CYBERSECURITY,
      type: CourseType.BOOTCAMP,
      level: CourseLevel.BEGINNER,
      priceMinor: NGN(60000),
      durationLabel: '5 days',
      deliveryLabel: 'Hybrid delivery',
      description: 'The most popular entry-level cybersecurity certification. Pass SY0-701.',
      isFeatured: true,
      isPublished: true,
      nextCohortDate: 'Jul 28, 2026',
      instructorId: instructors[0].id,
      ratingAvg: 4.8,
      ratingCount: 1540,
      studentsCount: 5800,
    },
    {
      slug: 'aws-solutions-architect-associate-bootcamp',
      title: 'AWS Solutions Architect Associate',
      shortTitle: 'AWS SAA',
      category: CourseCategory.CLOUD,
      type: CourseType.BOOTCAMP,
      level: CourseLevel.INTERMEDIATE,
      priceMinor: NGN(60000),
      durationLabel: '5 days',
      deliveryLabel: 'AWS lab environment',
      description: 'Design and deploy scalable systems on AWS. Pass SAA-C03.',
      isPublished: true,
      nextCohortDate: 'Jul 14, 2026',
      instructorId: instructors[1].id,
      ratingAvg: 4.8,
      ratingCount: 940,
      studentsCount: 2890,
    },
    {
      slug: 'comptia-a-plus-online',
      title: 'CompTIA A+ 220-1001 Core 1 and 220-1002 Core 2',
      shortTitle: 'CompTIA A+',
      category: CourseCategory.NETWORKING,
      type: CourseType.ONLINE,
      level: CourseLevel.BEGINNER,
      priceMinor: NGN(60000),
      durationLabel: '37h 20m',
      deliveryLabel: 'Self-paced online',
      description: 'Foundation IT certification. Hardware, OS, networking, security, troubleshooting.',
      isPublished: true,
      videosCount: 121,
      questionsCount: 331,
      instructorId: instructors[1].id,
    },
  ];
  for (const seed of courseSeed) {
    const exists = await courseRepo.findOne({ where: { slug: seed.slug } });
    if (!exists) await courseRepo.save(courseRepo.create(seed));
  }
  console.log(`✓ Courses: ${courseSeed.length}`);

  // ── Exam products (from PracticeExamsPage) ────────
  const productSeed = [
    { slug: 'cissp', certName: 'CISSP', certCode: 'CISSP', domain: 'Cybersecurity', difficulty: Difficulty.ADVANCED, questions: 250, exams: 4, duration: 180, price: 60000, original: 79000, rating: 4.9, reviews: 1240, updated: 'May 2026', demo: true },
    { slug: 'security-plus', certName: 'CompTIA Security+', certCode: 'SY0-701', domain: 'Cybersecurity', difficulty: Difficulty.INTERMEDIATE, questions: 180, exams: 3, duration: 90, price: 60000, original: 49000, rating: 4.8, reviews: 2890, updated: 'Jun 2026', demo: false },
    { slug: 'aws-saa', certName: 'AWS Solutions Architect', certCode: 'SAA-C03', domain: 'Cloud', difficulty: Difficulty.INTERMEDIATE, questions: 130, exams: 2, duration: 90, price: 60000, original: 54000, rating: 4.8, reviews: 1870, updated: 'Jun 2026', demo: false },
    { slug: 'ccna', certName: 'CCNA', certCode: '200-301', domain: 'Networking', difficulty: Difficulty.INTERMEDIATE, questions: 120, exams: 2, duration: 120, price: 60000, original: 49000, rating: 4.8, reviews: 1560, updated: 'May 2026', demo: false },
    { slug: 'pmp', certName: 'PMP', certCode: 'PMP', domain: 'Management', difficulty: Difficulty.ADVANCED, questions: 180, exams: 3, duration: 230, price: 60000, original: 69000, rating: 4.8, reviews: 2140, updated: 'Apr 2026', demo: false },
  ];

  for (const p of productSeed) {
    let product = await productRepo.findOne({ where: { slug: p.slug } });
    if (!product) {
      product = await productRepo.save(
        productRepo.create({
          slug: p.slug,
          certName: p.certName,
          certCode: p.certCode,
          domain: p.domain,
          difficulty: p.difficulty,
          description: `${p.questions} questions across ${p.exams} full-length practice exams for ${p.certName}.`,
          questionsCount: p.questions,
          examsCount: p.exams,
          perExamDurationMinutes: p.duration,
          passMark: 70,
          priceMinor: NGN(p.price),
          originalPriceMinor: NGN(p.original),
          accessDurationDays: 90,
          hasFreeDemo: p.demo,
          ratingAvg: p.rating,
          ratingCount: p.reviews,
          updatedLabel: p.updated,
          isPublished: true,
        }),
      );
      console.log(`  • Exam product: ${p.certName}`);
    }

    // Seed topics + a free-demo exam with questions for CISSP.
    if (p.demo) {
      const existingExam = await examRepo.findOne({
        where: { examProductId: product.id, isFreeDemo: true },
      });
      if (!existingExam) {
        // Topics from demo question domains.
        const topicNames = Array.from(new Set(DEMO_QUESTIONS.map((q) => q.domain)));
        const topics: Record<string, Topic> = {};
        for (let i = 0; i < topicNames.length; i++) {
          topics[topicNames[i]] = await topicRepo.save(
            topicRepo.create({
              examProductId: product.id,
              name: topicNames[i],
              position: i,
            }),
          );
        }

        const demoExam = await examRepo.save(
          examRepo.create({
            examProductId: product.id,
            title: `${p.certName} — Free Demo`,
            orderIndex: 0,
            durationMinutes: 90,
            passMark: 70,
            isFreeDemo: true,
            isPublished: true,
          }),
        );

        for (let i = 0; i < DEMO_QUESTIONS.length; i++) {
          const dq = DEMO_QUESTIONS[i];
          const question = questionRepo.create({
            examId: demoExam.id,
            topicId: topics[dq.domain]?.id ?? null,
            text: dq.text,
            explanation: dq.explanation,
            type: QuestionType.SINGLE_CHOICE,
            isActive: true,
            position: i,
            options: dq.options.map((opt, idx) =>
              Object.assign(new QuestionOption(), {
                text: opt,
                isCorrect: idx === dq.correct,
                orderIndex: idx,
              }),
            ),
          });
          await questionRepo.save(question);
        }
        console.log(`  • Free demo exam + ${DEMO_QUESTIONS.length} questions for ${p.certName}`);
      }
    }
  }

  // ── Exam vouchers (from ExamVouchersPage) ─────────
  const voucherSeed = [
    { slug: 'comptia-security-plus-voucher', vendor: 'CompTIA', examName: 'Security+', examCode: 'SY0-701', price: 370, original: 404, badge: 'Best Seller', popular: true, color: '#c0392b' },
    { slug: 'cisco-ccna-voucher', vendor: 'Cisco', examName: 'CCNA', examCode: '200-301', price: 330, original: 395, badge: 'Hot', popular: true, color: '#1ba0d8' },
    { slug: 'isc2-cissp-voucher', vendor: 'ISC2', examName: 'CISSP', examCode: 'CISSP', price: 699, original: 749, badge: 'Gold Standard', popular: true, color: '#005f6b' },
    { slug: 'aws-saa-voucher', vendor: 'AWS', examName: 'Solutions Architect Associate', examCode: 'SAA-C03', price: 150, original: 175, popular: true, color: '#ff9900' },
    { slug: 'pmi-pmp-voucher', vendor: 'PMI', examName: 'PMP', examCode: 'PMP', price: 555, original: 605, badge: 'PMI Member Rate', color: '#2c5282' },
  ];
  for (const v of voucherSeed) {
    const exists = await voucherRepo.findOne({ where: { slug: v.slug } });
    if (!exists) {
      await voucherRepo.save(
        voucherRepo.create({
          slug: v.slug,
          vendor: v.vendor,
          examName: v.examName,
          examCode: v.examCode,
          // Voucher prices on the frontend are USD-looking; store as NGN minor.
          priceMinor: NGN(v.price),
          originalPriceMinor: NGN(v.original),
          badge: v.badge ?? null,
          popular: v.popular ?? false,
          color: v.color,
          isPublished: true,
        }),
      );
    }
  }
  console.log(`✓ Exam vouchers: ${voucherSeed.length}`);

  console.log('✔ Seed complete.');
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
