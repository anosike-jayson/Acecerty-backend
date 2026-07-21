// ── Identity ─────────────────────────────────────────
export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum UserTokenPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

// ── Course catalog ───────────────────────────────────
export enum CourseCategory {
  CYBERSECURITY = 'Cybersecurity',
  NETWORKING = 'Networking',
  CLOUD = 'Cloud',
  MANAGEMENT = 'Management',
  PROJECT_MANAGEMENT = 'Project Management',
  DEVELOPMENT = 'Development',
  AUDIT_COMPLIANCE = 'Audit & Compliance',
}

export enum CourseType {
  BOOTCAMP = 'bootcamp',
  ONLINE = 'online',
}

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

// ── Exam catalog & questions ─────────────────────────
export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTI_CHOICE = 'multi_choice', // reserved for later
}

// ── Exam engine ──────────────────────────────────────
export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  EXPIRED = 'expired',
  ABANDONED = 'abandoned',
}

// ── Commerce ─────────────────────────────────────────
export enum ItemType {
  EXAM_PRODUCT = 'exam_product',
  COURSE = 'course',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
}

export enum PaymentStatus {
  INITIALIZED = 'initialized',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum EntitlementStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}
