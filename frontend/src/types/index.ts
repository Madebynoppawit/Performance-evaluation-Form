export type Role = 'DEVELOPER' | 'ADMIN' | 'MANAGER' | 'MANAGING_DIRECTOR' | 'DIRECTOR' | 'SUPERVISOR' | 'EMPLOYEE' | 'STAFF' | 'OPERATOR'
export type Position = 'CEO' | 'MANAGING_DIRECTOR' | 'DIRECTOR_UP' | 'MANAGER' | 'OFFICER' | 'SUPERVISOR' | 'PRODUCTION_STAFF' | 'OTHER'
export type EvaluationType = 'SELF' | 'MANAGER' | 'PEER' | 'THREE_SIXTY'
export type EvaluationStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'SUBMITTED' | 'REVIEWED' | 'CLOSED'
export type CycleStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED'
export type QuestionType = 'rating' | 'text' | 'multiple_choice'
export type DisciplinaryLevel =
  | 'NONE'
  | 'VERBAL_WARNING_1'
  | 'WRITTEN_WARNING_1'
  | 'MULTIPLE_WARNING_OR_SUSPENSION'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  position?: Position
  department?: string
  jobTitle?: string | null
  jobGrade?: string | null
  division?: string | null
  buGroup?: string | null
  phone?: string | null
  bio?: string | null
  managerId?: string
  hireDate?: string | null
  employeeNo?: string | null
  mustChangePassword?: boolean
  dateOfBirth?: string | null
  sourceData?: Record<string, string> | null
}

export interface Question {
  id: string
  sectionId: string
  text: string
  type: QuestionType
  weight: number
  options?: string[]
  required: boolean
  order: number
}

export interface Section {
  id: string
  templateId: string
  title: string
  description?: string
  weight: number
  order: number
  questions: Question[]
}

export interface Template {
  id: string
  name: string
  description?: string
  type: EvaluationType
  sections: Section[]
  competencyWeight: number
  attendanceWeight: number
  trainingWeight: number
  createdAt: string
  updatedAt: string
}

export interface Cycle {
  id: string
  name: string
  description?: string
  templateId: string
  template?: Template
  startDate: string
  endDate: string
  status: CycleStatus
  createdAt: string
  updatedAt: string
}

export interface Answer {
  id: string
  evaluationId: string
  questionId: string
  value?: string
  score?: number
}

export interface GoalEntry {
  id?: string
  goal: string
  goalDescription?: string
  weight: number
  targetRating5?: string
  targetRating4?: string
  targetRating3?: string
  targetRating2?: string
  targetRating1?: string
  wig?: string | null
  kpiCategory?: string | null
  result?: string
  evaluationScore?: number | null
  employeeComment?: string
  superiorComment?: string
  order: number
}

export interface CompetencyScore {
  competencyId: string
  score?: number | null
  selfScore?: number | null
  expectedRating?: number | null
}

export interface AttendanceScore {
  leaveActualDays?: number | null
  lateActualTimes?: number | null
  disciplinaryLevel?: DisciplinaryLevel
  leaveScore?: number | null
  lateScore?: number | null
  disciplinaryScore?: number | null
  attendanceAvgScore?: number | null
}

export interface TrainingScore {
  minimumHours?: number | null
  actualHours?: number | null
  percentOfMinimum?: number | null
  score?: number | null
  behaviorNote?: string | null
}

export interface EvaluationComment {
  strengths?: string
  improvements?: string
  requiredSkills?: string
}

export interface SalarySummary {
  oldSalary?: number | null
  newSalary?: number | null
  bonus?: number | null
  bonusDeduction?: number | null
  bonusPolicy?: string
  effectiveDate?: string | null
}

export interface EvaluationAcknowledgement {
  employeeSignedAt?: string | null
  evaluatorSignedAt?: string | null
  directorSignedAt?: string | null
}

export interface Evaluation {
  id: string
  cycleId: string
  cycle?: Cycle
  evaluateeId: string
  evaluatee?: User
  evaluateeName?: string | null
  evaluatorId: string
  evaluator?: User
  evaluatorName?: string | null
  reviewerId?: string | null
  reviewer?: User | null
  reviewerName?: string | null
  reviewerComment?: string | null
  reviewedAt?: string | null
  type: EvaluationType
  status: EvaluationStatus
  formType?: string | null
  evaluationReason?: 'PROBATION' | 'ANNUAL' | 'OTHER' | null
  evaluationReasonOther?: string | null
  evaluatorTitle?: string | null
  performanceGrade?: 'EXCELLENT' | 'ABOVE_STANDARD' | 'MEETS_STANDARD' | 'ALMOST_STANDARD' | 'BELOW_STANDARD' | null
  effectiveDate?: string | null

  goalWeight: number
  competencyWeight: number
  trainingWeight: number
  attendanceWeight: number

  goalScore?: number | null
  competencyScore?: number | null
  attendanceScore?: number | null
  totalScore?: number | null
  submittedAt?: string

  answers: Answer[]
  goalEntries: GoalEntry[]
  competencyScores: CompetencyScore[]
  attendanceRecord?: AttendanceScore | null
  trainingRecord?: TrainingScore | null
  comment?: EvaluationComment | null
  salarySummary?: SalarySummary | null
  acknowledgement?: EvaluationAcknowledgement | null

  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
