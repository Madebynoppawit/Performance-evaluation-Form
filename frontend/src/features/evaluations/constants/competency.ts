import type { Position } from '@/types'

export interface CompetencyDef {
  id: string
  name: string
  positions: Position[]
  descriptions: Partial<Record<Position, string>>
}

export const COMPETENCY_DEFINITIONS: CompetencyDef[] = [
  {
    id: 'CC1',
    name: 'CC1 – Accountability & Ownership',
    positions: ['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF'],
    descriptions: {
      DIRECTOR_UP: 'Drives organizational accountability and ensures business results are achieved.',
      MANAGER: 'Takes ownership of department targets and ensures team performance meets expectations.',
      OFFICER: 'Completes assigned tasks responsibly and follows through until results are achieved.',
      SUPERVISOR: 'Controls daily operations and ensures team members perform according to targets.',
      PRODUCTION_STAFF: 'Performs assigned duties responsibly and completes tasks as instructed.',
    },
  },
  {
    id: 'CC2',
    name: 'CC2 – Quality & Compliance',
    positions: ['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF'],
    descriptions: {
      DIRECTOR_UP: 'Establishes a culture of quality and compliance across the organization.',
      MANAGER: 'Ensures processes and operations comply with company policies and quality standards.',
      OFFICER: 'Follows procedures and maintains quality standards in daily work.',
      SUPERVISOR: 'Monitors work processes and corrects deviations to maintain quality.',
      PRODUCTION_STAFF: 'Follows work instructions, safety rules, and quality requirements.',
    },
  },
  {
    id: 'CC3',
    name: 'CC3 – Collaboration & Communication',
    positions: ['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF'],
    descriptions: {
      DIRECTOR_UP: 'Influences cross-functional collaboration and aligns teams toward organizational goals.',
      MANAGER: 'Communicates direction clearly and coordinates collaboration between teams.',
      OFFICER: 'Shares information and collaborates effectively with colleagues.',
      SUPERVISOR: 'Provides clear instructions and maintains effective communication within the team.',
      PRODUCTION_STAFF: 'Works cooperatively with team members and reports issues when necessary.',
    },
  },
  {
    id: 'CC4',
    name: 'CC4 – Continuous Improvement',
    positions: ['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF'],
    descriptions: {
      DIRECTOR_UP: 'Leads organizational transformation and drives strategic improvement initiatives.',
      MANAGER: 'Identifies improvement opportunities and drives process improvements.',
      OFFICER: 'Analyzes problems and suggests improvement ideas.',
      SUPERVISOR: 'Solves operational issues and improves daily work processes.',
      PRODUCTION_STAFF: 'Reports problems and participates in improvement activities.',
    },
  },
  {
    id: 'MC1',
    name: 'MC1 – Leadership & People Development',
    positions: ['DIRECTOR_UP', 'MANAGER'],
    descriptions: {
      DIRECTOR_UP: 'Builds leadership culture and develops future leaders across the organization.',
      MANAGER: 'Leads, motivates, and develops team members through coaching and guidance to achieve team goals.',
    },
  },
  {
    id: 'MC2',
    name: 'MC2 – Strategic & Business Thinking',
    positions: ['DIRECTOR_UP', 'MANAGER'],
    descriptions: {
      DIRECTOR_UP: 'Defines strategic direction and aligns organizational resources to achieve business objectives.',
      MANAGER: 'Understands business direction and aligns department goals with company strategy.',
    },
  },
  {
    id: 'TCM1',
    name: 'TCM1 - Business planning, budgeting & cost control',
    positions: ['DIRECTOR_UP', 'MANAGER'],
    descriptions: {
      DIRECTOR_UP: 'Plans business direction, budgets, and cost control with governance oversight.',
      MANAGER: 'Manages department planning, budgeting, financial analysis, and cost control.',
    },
  },
  {
    id: 'TCM2',
    name: 'TCM2 - Project, risk & performance management',
    positions: ['DIRECTOR_UP', 'MANAGER'],
    descriptions: {
      DIRECTOR_UP: 'Oversees strategic projects, enterprise risks, and performance management systems.',
      MANAGER: 'Executes project management, risk management, and team performance management.',
    },
  },
  {
    id: 'TCM3',
    name: 'TCM3 - Process improvement & data-driven analysis',
    positions: ['DIRECTOR_UP', 'MANAGER'],
    descriptions: {
      DIRECTOR_UP: 'Sponsors lean transformation and uses data to guide strategic improvement.',
      MANAGER: 'Uses lean thinking and data analysis to improve departmental performance.',
    },
  },
  {
    id: 'TCM4',
    name: 'TCM4 - Stakeholder, resource & compliance management',
    positions: ['DIRECTOR_UP', 'MANAGER'],
    descriptions: {
      DIRECTOR_UP: 'Aligns stakeholders, resources, governance, and compliance across functions.',
      MANAGER: 'Plans resources, manages stakeholders, and maintains governance/compliance.',
    },
  },
  // Officer / Supervisor / Production Staff are assessed on the four Core
  // Competencies (CC1–CC4) only. Management (MC) and management-technical
  // (TCM) competencies above apply to Manager / Director levels.
]

export const RATING_SCALE = [
  {
    score: 5,
    labelEn: 'Role Model',
    labelTh: 'เป็นแบบอย่างที่ดี',
    definitionEn: 'Consistently demonstrates outstanding behavior beyond expectations and serves as a role model for others.',
    definitionTh: 'แสดงพฤติกรรมเหนือความคาดหวังอย่างสม่ำเสมอ เป็นแบบอย่างให้ผู้อื่น',
    indicatorEn: 'Consistently delivers outstanding results • Positively influences the team • Drives new improvements or initiatives',
    indicatorTh: 'ผลงานโดดเด่นสม่ำเสมอ • มีอิทธิพลเชิงบวกต่อทีม • สร้างการพัฒนาใหม่ให้ทีม/องค์กร',
  },
  {
    score: 4,
    labelEn: 'Exceeds Expectation',
    labelTh: 'ผลงานเกินความคาดหวัง',
    definitionEn: 'Frequently performs above expectations and proactively contributes to improvement.',
    definitionTh: 'ปฏิบัติงานเกินความคาดหวังและมีส่วนช่วยพัฒนางาน',
    indicatorEn: 'Performs above standard • Solves problems independently • Proposes improvement ideas',
    indicatorTh: 'ทำงานได้ดีกว่ามาตรฐาน • แก้ปัญหาได้ด้วยตนเอง • เสนอแนวทางพัฒนางาน',
  },
  {
    score: 3,
    labelEn: 'Meets Expectation',
    labelTh: 'ผลงานเป็นไปตามความคาดหวัง',
    definitionEn: 'Consistently meets the required standards and expectations of the role.',
    definitionTh: 'ปฏิบัติงานได้ตามมาตรฐานและความคาดหวังของตำแหน่ง',
    indicatorEn: 'Performs duties as expected • Follows procedures and policies • Maintains stable performance',
    indicatorTh: 'ทำงานได้ตามหน้าที่ • ปฏิบัติตามขั้นตอนและกฎระเบียบ • ไม่มีปัญหาด้าน performance',
  },
  {
    score: 2,
    labelEn: 'Needs Improvement',
    labelTh: 'ควรปรับปรุง',
    definitionEn: 'Occasionally fails to meet expectations and requires guidance or supervision.',
    definitionTh: 'ผลงานยังต่ำกว่ามาตรฐานบางครั้ง ต้องได้รับคำแนะนำ',
    indicatorEn: 'Occasionally makes mistakes • Requires guidance or follow-up',
    indicatorTh: 'ทำงานผิดพลาดเป็นบางครั้ง • ต้องมีการติดตามจากหัวหน้า',
  },
  {
    score: 1,
    labelEn: 'Unsatisfactory',
    labelTh: 'ผลงานไม่เป็นที่น่าพอใจ',
    definitionEn: 'Performance is significantly below expectations and requires immediate improvement.',
    definitionTh: 'ผลงานต่ำกว่ามาตรฐานอย่างชัดเจน ต้องได้รับการปรับปรุงทันที',
    indicatorEn: 'Does not follow work standards • Performance negatively impacts team/work',
    indicatorTh: 'ไม่ปฏิบัติตามมาตรฐานงาน • มีผลกระทบต่อทีม/งาน',
  },
]

export const POSITION_LABELS: Record<Position, string> = {
  CEO: 'CEO',
  MANAGING_DIRECTOR: 'Managing Director',
  DIRECTOR_UP: 'Director',
  MANAGER: 'Manager',
  OFFICER: 'Officer',
  SUPERVISOR: 'Supervisor',
  PRODUCTION_STAFF: 'Production Staff',
}

export const DISCIPLINARY_OPTIONS = [
  { value: 'NONE', label: 'No Warning' },
  { value: 'VERBAL_WARNING_1', label: 'Verbal Warning 1 ครั้ง' },
  { value: 'WRITTEN_WARNING_1', label: 'Written Warning 1 ครั้ง' },
  { value: 'MULTIPLE_WARNING_OR_SUSPENSION', label: '>2 Warning หรือ Suspension' },
]

/** CEO and Managing Director are evaluated on the "Director and up" competency
    set — collapse them so competencies and descriptions resolve correctly. */
export function competencyPosition(position: Position): Position {
  return position === 'CEO' || position === 'MANAGING_DIRECTOR' ? 'DIRECTOR_UP' : position
}

export function getCompetenciesForPosition(position: Position): CompetencyDef[] {
  const p = competencyPosition(position)
  return COMPETENCY_DEFINITIONS.filter((c) => c.positions.includes(p))
}
