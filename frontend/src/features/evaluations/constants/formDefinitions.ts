/* Performance-evaluation form definitions.
   Each definition models a company appraisal form so the system can support a
   different form per employee level (Director&Up / Manager / Officer /
   Supervisor / Production) without changing the UI — the UI renders from these
   definitions. All five share the AMW-01-036 skeleton (6 categories × 3
   criteria, 1–5 rating, same grade bands); only the criterion wording differs.

   NOTE: OFFICER_LEVEL is the real AMW-01-036 sent by the company. The other
   four are tailored DRAFTS reusing the same skeleton and should be reconciled
   against the official documents for each level when available. */

import type { Position } from '@/types'

export type FormTypeId =
  | 'DIRECTOR_LEVEL'
  | 'MANAGER_LEVEL'
  | 'OFFICER_LEVEL'
  | 'SUPERVISOR_LEVEL'
  | 'PRODUCTION_LEVEL'

export interface CriterionDef {
  /** Stable id used as competencyId in storage, e.g. "1.1". */
  id: string
  en: string
  th: string
  /** Optional scoring note shown under the criterion (e.g. attendance scale). */
  noteEn?: string
  noteTh?: string
}

export interface CategoryDef {
  id: string
  num: string
  titleEn: string
  titleTh: string
  criteria: CriterionDef[]
}

export interface RatingDef {
  score: number
  en: string
  th: string
}

export interface GradeDef {
  /** Numeric band 5..1 */
  value: number
  key: PerformanceGradeKey
  en: string
  th: string
  fr: string
  definitionEn: string
  definitionTh: string
  definitionFr: string
}

export type PerformanceGradeKey = 'EXCELLENT' | 'ABOVE_STANDARD' | 'MEETS_STANDARD' | 'ALMOST_STANDARD' | 'BELOW_STANDARD'

export interface FormDefinition {
  id: FormTypeId
  code: string
  titleEn: string
  titleTh: string
  /** Per-criterion rating scale (1..5). */
  ratingScale: RatingDef[]
  /** Overall grade bands shown in Performance Summary. */
  gradeScale: GradeDef[]
  categories: CategoryDef[]
  /** Optional sections this form includes. */
  sections: {
    goalSetting: boolean
    salary: boolean
  }
}

/* ── Shared scales (identical across all levels) ──────────────────────────── */
const RATING_SCALE: RatingDef[] = [
  { score: 1, en: 'Bad', th: 'แย่' },
  { score: 2, en: 'Not Good', th: 'ไม่ดี' },
  { score: 3, en: 'Average', th: 'ปานกลาง' },
  { score: 4, en: 'Good', th: 'ดี' },
  { score: 5, en: 'Very Good', th: 'ดีมาก' },
]

const GRADE_SCALE: GradeDef[] = [
  {
    value: 5, key: 'EXCELLENT', en: 'Excellent', th: 'ดีเลิศ', fr: 'Excellent',
    definitionEn: 'Extraordinary performance in terms of quality, quantity and punctuality.',
    definitionTh: 'ปฏิบัติหน้าที่ได้ดีเลิศเกินความคาดหมาย ทั้งด้านคุณภาพ ปริมาณ และเวลาที่กำหนดอย่างสม่ำเสมอ',
    definitionFr: 'Performance extraordinaire en termes de qualité, de quantité et de ponctualité.',
  },
  {
    value: 4, key: 'ABOVE_STANDARD', en: 'Above Average', th: 'ดีเกินกว่ามาตรฐานที่กำหนด', fr: 'Au-dessus de la moyenne',
    definitionEn: 'Above standard in terms of quality, quantity and punctuality.',
    definitionTh: 'ปฏิบัติหน้าที่ได้รับผลเกินกว่ามาตรฐานที่ต้องการสำหรับตำแหน่งอย่างสม่ำเสมอ ทั้งด้านคุณภาพ ปริมาณ และ/หรือเวลาที่กำหนด',
    definitionFr: 'Au-dessus du standard en termes de qualité, de quantité et de ponctualité.',
  },
  {
    value: 3, key: 'MEETS_STANDARD', en: 'Meet Required Standard', th: 'พอดีกับมาตรฐาน', fr: 'Conforme au standard requis',
    definitionEn: 'Able to meet the required standard or sometimes higher, in terms of quality, quantity and punctuality; objectives attained.',
    definitionTh: 'สามารถปฏิบัติหน้าที่พอดีกับมาตรฐานที่ต้องการสำหรับตำแหน่งอย่างสม่ำเสมอ และบางครั้งเกินกว่าเกณฑ์ที่ต้องการ รวมทั้งบรรลุเป้าหมายและวัตถุประสงค์ที่กำหนด',
    definitionFr: "Capable d'atteindre le standard requis, parfois plus, en termes de qualité, de quantité et de ponctualité ; objectifs atteints.",
  },
  {
    value: 2, key: 'ALMOST_STANDARD', en: 'Almost Up to Standard', th: 'เกือบได้ตามมาตรฐาน', fr: 'Presque au standard',
    definitionEn: 'Objectives attained from time to time, but improvement is needed; more supervision and further assessment required.',
    definitionTh: 'ปฏิบัติงานได้ตามเป้าหมายและวัตถุประสงค์เป็นบางครั้ง แต่จะต้องปรับปรุงในด้านคุณภาพ ปริมาณ และเวลา อาจต้องได้รับการควบคุมดูแลมากขึ้นจากหัวหน้างาน',
    definitionFr: "Objectifs atteints de temps à autre, mais une amélioration est nécessaire ; davantage de supervision et d'évaluation requises.",
  },
  {
    value: 1, key: 'BELOW_STANDARD', en: 'Below Standard', th: 'ไม่ได้มาตรฐานที่กำหนด', fr: 'En dessous du standard',
    definitionEn: 'Failed to meet the required standard. Lacks attention and/or skills for the job; to be included in consultation and skill-improvement programs.',
    definitionTh: 'ความสามารถไม่เป็นไปตามมาตรฐานที่กำหนด ขาดความตั้งใจที่จะทำงาน และ/หรือทักษะในงานที่มอบหมาย จำเป็นต้องอยู่ในแผนการให้คำปรึกษาแนะนำหรือเพิ่มทักษะ',
    definitionFr: "N'a pas atteint le standard requis. Manque d'attention et/ou de compétences pour le poste ; à inclure dans des programmes de conseil et d'amélioration des compétences.",
  },
]

/* Attendance scoring note — shared by criterion 6.1 of every form. */
const ATTENDANCE_NOTE = {
  noteEn: '>7 days = 1, 5-6 days = 2, 3-4 days = 3, 1-2 days = 4, Never = 5',
  noteTh: '>7 วัน = 1, 5-6 วัน = 2, 3-4 วัน = 3, 1-2 วัน = 4, ไม่เคย = 5',
}

/* ── Category skeleton (titles shared) ────────────────────────────────────── */
const CATEGORY_META = [
  { id: 'C1', num: '1', titleEn: 'Technical Skills', titleTh: 'ทักษะในงาน' },
  { id: 'C2', num: '2', titleEn: 'Quality of Work', titleTh: 'คุณภาพของงาน' },
  { id: 'C3', num: '3', titleEn: 'Quantity of Work', titleTh: 'ปริมาณงาน' },
  { id: 'C4', num: '4', titleEn: 'Communication Skill / Cooperation', titleTh: 'ทักษะในการสื่อสาร / ความร่วมมือ' },
  { id: 'C5', num: '5', titleEn: 'Approach to Work', titleTh: 'แนวทางการทำงาน' },
  { id: 'C6', num: '6', titleEn: 'Attendance & Safety', titleTh: 'การมาทำงานและความปลอดภัย' },
] as const

type CritText = { en: string; th: string; noteEn?: string; noteTh?: string }

/** Build 6 categories from 18 criterion texts ordered 1.1,1.2,1.3,2.1,…,6.3. */
function buildCategories(crit: CritText[]): CategoryDef[] {
  return CATEGORY_META.map((c, ci) => ({
    id: c.id, num: c.num, titleEn: c.titleEn, titleTh: c.titleTh,
    criteria: [0, 1, 2].map(ri => ({ id: `${ci + 1}.${ri + 1}`, ...crit[ci * 3 + ri] })),
  }))
}

/* ── Officer (real AMW-01-036) ────────────────────────────────────────────── */
const OFFICER_CRITERIA: CritText[] = [
  { en: 'Job Knowledge', th: 'ความรู้ / ความชำนาญในงาน' },
  { en: 'Analyzes Problems / Provides Suggestions for Work Improvement', th: 'การวิเคราะห์ปัญหา / การให้คำแนะนำในการปรับปรุงการทำงาน' },
  { en: 'Employs Tools of the Job competently', th: 'การใช้เครื่องมือในการทำงานอย่างเหมาะสม' },
  { en: 'Accuracy or Precision / Thoroughness / Neatness / Reliability', th: 'ความละเอียด รอบคอบในการทำงาน / ความเป็นระเบียบเรียบร้อย / ความน่าเชื่อถือ' },
  { en: "Responsibility based on ability to work on one's own initiative & adherence to instructions without close supervision", th: 'ความรับผิดชอบในการทำงาน พิจารณาถึงการปฏิบัติงานตามคำสั่งโดยผู้บังคับบัญชาไม่ต้องเข้ามาควบคุมใกล้ชิด' },
  { en: 'Follow-Through / Follow-up', th: 'การปฏิบัติตาม และการติดตามงาน' },
  { en: 'Priority Setting', th: 'การจัดลำดับความสำคัญของงาน' },
  { en: 'Amount of Work Completed', th: 'ปริมาณงานที่ทำสำเร็จ' },
  { en: 'Work Completed on Schedule', th: 'งานที่สามารถทำได้สำเร็จตามเวลาที่กำหนด' },
  { en: 'Communicates clearly, concisely and effectively', th: 'การสื่อสารที่ชัดเจน กระชับ และมีประสิทธิภาพ ทั้งการพูดและการเขียน' },
  { en: 'Cooperate with Other workers in any Department', th: 'การประสานงานกับเพื่อนร่วมงาน และพนักงานในแผนกอื่น' },
  { en: 'With Supervisors / Team Participation Contributions', th: 'การทำงานร่วมกับผู้บังคับบัญชา / การมีส่วนร่วมในทีมงาน' },
  { en: 'Open to New Ideas and Approaches / Initiative', th: 'ความคิดสร้างสรรค์' },
  { en: 'Planning and Organization', th: 'การวางแผนและการจัดการ' },
  { en: 'Flexible / Adaptable', th: 'ความยืดหยุ่น / ความสามารถในการปรับตัว' },
  { en: 'Attendance taking into account leave, absenteeism and late etc. (Refer to company rules)', th: 'ความสม่ำเสมอในการมาปฏิบัติงานโดยไม่ลากิจ ป่วย หรือขาดงานโดยไม่ได้รับเงิน (อ้างอิงกฎบริษัท)', ...ATTENDANCE_NOTE },
  { en: 'Follows Proper Safety Procedures', th: 'การปฏิบัติตามกฎของความปลอดภัยอย่างเคร่งครัด' },
  { en: 'Cleanliness & housekeeping based on the condition of workplace', th: 'ความสะอาดเป็นระเบียบเรียบร้อยบริเวณที่ทำงาน' },
]

/* ── Director & Up (DRAFT — strategic / leadership emphasis) ───────────────── */
const DIRECTOR_CRITERIA: CritText[] = [
  { en: 'Business & Functional Expertise', th: 'ความรู้เชิงธุรกิจและความเชี่ยวชาญในสายงาน' },
  { en: 'Strategic Analysis & Decision Making', th: 'การวิเคราะห์เชิงกลยุทธ์และการตัดสินใจ' },
  { en: 'Drives Innovation & Improvement across the organization', th: 'การผลักดันนวัตกรรมและการปรับปรุงทั่วทั้งองค์กร' },
  { en: 'Sets and upholds high quality standards', th: 'การกำหนดและรักษามาตรฐานคุณภาพระดับสูง' },
  { en: 'Accountability for organizational outcomes', th: 'ความรับผิดชอบต่อผลลัพธ์ขององค์กร' },
  { en: 'Governance, risk & compliance oversight', th: 'การกำกับดูแล ความเสี่ยง และการปฏิบัติตามกฎเกณฑ์' },
  { en: 'Sets priorities aligned to company strategy', th: 'การจัดลำดับความสำคัญให้สอดคล้องกับกลยุทธ์บริษัท' },
  { en: 'Delivers business targets', th: 'การบรรลุเป้าหมายทางธุรกิจ' },
  { en: 'Achieves results on schedule', th: 'การบรรลุผลตามกรอบเวลาที่กำหนด' },
  { en: 'Communicates vision clearly & persuasively', th: 'การสื่อสารวิสัยทัศน์อย่างชัดเจนและโน้มน้าวใจ' },
  { en: 'Builds cross-functional & external relationships', th: 'การสร้างความสัมพันธ์ข้ามสายงานและภายนอกองค์กร' },
  { en: 'Leadership & development of managers/teams', th: 'ภาวะผู้นำและการพัฒนาผู้บริหาร/ทีมงาน' },
  { en: 'Visionary thinking & initiative', th: 'การคิดเชิงวิสัยทัศน์และความริเริ่ม' },
  { en: 'Strategic planning & resource management', th: 'การวางแผนเชิงกลยุทธ์และการบริหารทรัพยากร' },
  { en: 'Leads change & adaptability', th: 'การนำการเปลี่ยนแปลงและการปรับตัว' },
  { en: 'Attendance, availability & commitment (Refer to company rules)', th: 'ความสม่ำเสมอ ความพร้อม และความทุ่มเทในการปฏิบัติงาน (อ้างอิงกฎบริษัท)', ...ATTENDANCE_NOTE },
  { en: 'Champions safety & company culture', th: 'การเป็นแบบอย่างด้านความปลอดภัยและวัฒนธรรมองค์กร' },
  { en: 'Role model in ethics & workplace standards', th: 'การเป็นแบบอย่างด้านจริยธรรมและมาตรฐานในที่ทำงาน' },
]

/* ── Manager (DRAFT — people & departmental management) ────────────────────── */
const MANAGER_CRITERIA: CritText[] = [
  { en: 'Job & functional knowledge of the department', th: 'ความรู้ในงานและสายงานที่รับผิดชอบ' },
  { en: 'Problem solving & decision making', th: 'การแก้ปัญหาและการตัดสินใจ' },
  { en: 'Process & work improvement', th: 'การปรับปรุงกระบวนการทำงาน' },
  { en: 'Quality & accuracy of team deliverables', th: 'คุณภาพและความถูกต้องของงานในทีม' },
  { en: 'Responsibility & ownership of results', th: 'ความรับผิดชอบและความเป็นเจ้าของงาน' },
  { en: 'Monitoring & follow-up of work', th: 'การติดตามและกำกับงาน' },
  { en: 'Priority setting & workload allocation', th: 'การจัดลำดับความสำคัญและการกระจายงาน' },
  { en: 'Achieves departmental targets / KPIs', th: 'การบรรลุเป้าหมาย / KPI ของหน่วยงาน' },
  { en: 'Work completed on schedule', th: 'การส่งมอบงานตามกำหนดเวลา' },
  { en: 'Clear & effective communication', th: 'การสื่อสารที่ชัดเจนและมีประสิทธิภาพ' },
  { en: 'Cross-department cooperation', th: 'การประสานงานระหว่างแผนก' },
  { en: 'Team leadership & staff development', th: 'การนำทีมและการพัฒนาผู้ใต้บังคับบัญชา' },
  { en: 'Initiative & openness to new ideas', th: 'ความริเริ่มและการเปิดรับแนวคิดใหม่' },
  { en: 'Planning & organization', th: 'การวางแผนและการจัดการ' },
  { en: 'Flexibility & adaptability', th: 'ความยืดหยุ่นและการปรับตัว' },
  { en: 'Attendance taking into account leave, absenteeism and late (Refer to company rules)', th: 'ความสม่ำเสมอในการมาปฏิบัติงาน โดยพิจารณาการลา ขาด และมาสาย (อ้างอิงกฎบริษัท)', ...ATTENDANCE_NOTE },
  { en: 'Follows & enforces safety procedures', th: 'การปฏิบัติและกำกับให้ปฏิบัติตามกฎความปลอดภัย' },
  { en: 'Workplace cleanliness & 5S leadership', th: 'การรักษาความสะอาดและการนำ 5ส ในพื้นที่ทำงาน' },
]

/* ── Supervisor (DRAFT — front-line supervision) ──────────────────────────── */
const SUPERVISOR_CRITERIA: CritText[] = [
  { en: 'Job knowledge & technical skill', th: 'ความรู้และทักษะทางเทคนิคในงาน' },
  { en: 'Problem solving on the floor', th: 'การแก้ปัญหาหน้างาน' },
  { en: 'Competent use of tools / equipment', th: 'การใช้เครื่องมือ / อุปกรณ์อย่างเหมาะสม' },
  { en: 'Accuracy, thoroughness & reliability', th: 'ความถูกต้อง รอบคอบ และความน่าเชื่อถือ' },
  { en: 'Responsibility & works with minimal supervision', th: 'ความรับผิดชอบและการทำงานโดยควบคุมใกล้ชิดน้อย' },
  { en: 'Follow-through & follow-up', th: 'การติดตามและสานต่องาน' },
  { en: 'Work scheduling & priority setting', th: 'การจัดตารางและลำดับความสำคัญของงาน' },
  { en: 'Output / work completed by the team', th: 'ปริมาณงานที่ทีมทำสำเร็จ' },
  { en: 'Work completed on schedule', th: 'งานสำเร็จตามเวลาที่กำหนด' },
  { en: 'Clear communication & giving instructions', th: 'การสื่อสารและการสั่งงานที่ชัดเจน' },
  { en: 'Cooperation with other sections', th: 'การประสานงานกับหน่วยงานอื่น' },
  { en: 'Coaching & supporting team members', th: 'การสอนงานและสนับสนุนสมาชิกในทีม' },
  { en: 'Initiative & improvement ideas', th: 'ความริเริ่มและการเสนอแนวทางปรับปรุง' },
  { en: 'Planning & organizing the work', th: 'การวางแผนและจัดระเบียบงาน' },
  { en: 'Flexibility & adaptability', th: 'ความยืดหยุ่นและการปรับตัว' },
  { en: 'Attendance taking into account leave, absenteeism and late (Refer to company rules)', th: 'ความสม่ำเสมอในการมาปฏิบัติงาน โดยพิจารณาการลา ขาด และมาสาย (อ้างอิงกฎบริษัท)', ...ATTENDANCE_NOTE },
  { en: 'Enforces & follows safety procedures', th: 'การปฏิบัติและกำกับความปลอดภัยอย่างเคร่งครัด' },
  { en: 'Cleanliness & housekeeping (5S)', th: 'ความสะอาดและความเป็นระเบียบเรียบร้อย (5ส)' },
]

/* ── Production Staff (DRAFT — operators) ──────────────────────────────────── */
const PRODUCTION_CRITERIA: CritText[] = [
  { en: 'Job knowledge & skill for assigned work', th: 'ความรู้และทักษะในงานที่ได้รับมอบหมาย' },
  { en: 'Ability to spot & report problems', th: 'ความสามารถในการสังเกตและแจ้งปัญหา' },
  { en: 'Correct use of machines / tools', th: 'การใช้เครื่องจักร / เครื่องมืออย่างถูกต้อง' },
  { en: 'Accuracy & meeting quality standards', th: 'ความถูกต้องและการได้ตามมาตรฐานคุณภาพ' },
  { en: 'Responsibility & following work instructions', th: 'ความรับผิดชอบและการปฏิบัติตามคำสั่งงาน' },
  { en: 'Care & consistency of output', th: 'ความใส่ใจและความสม่ำเสมอของผลงาน' },
  { en: 'Works to the production plan', th: 'การทำงานตามแผนการผลิตที่กำหนด' },
  { en: 'Output quantity', th: 'ปริมาณผลงานที่ผลิตได้' },
  { en: 'Work completed on schedule', th: 'งานเสร็จตามเวลาที่กำหนด' },
  { en: 'Communicates & reports clearly', th: 'การสื่อสารและการรายงานที่ชัดเจน' },
  { en: 'Teamwork & cooperation', th: 'การทำงานเป็นทีมและความร่วมมือ' },
  { en: "Responds to supervisor's instructions", th: 'การปฏิบัติตามคำแนะนำของหัวหน้างาน' },
  { en: 'Willingness to learn & improve', th: 'ความตั้งใจเรียนรู้และพัฒนาตนเอง' },
  { en: 'Orderliness in work', th: 'ความเป็นระเบียบในการทำงาน' },
  { en: 'Flexibility (shift / assigned tasks)', th: 'ความยืดหยุ่น (กะ / งานที่ได้รับมอบหมาย)' },
  { en: 'Attendance taking into account leave, absenteeism and late (Refer to company rules)', th: 'ความสม่ำเสมอในการมาปฏิบัติงาน โดยพิจารณาการลา ขาด และมาสาย (อ้างอิงกฎบริษัท)', ...ATTENDANCE_NOTE },
  { en: 'Strict adherence to safety procedures', th: 'การปฏิบัติตามกฎความปลอดภัยอย่างเคร่งครัด' },
  { en: 'Cleanliness & 5S at the workstation', th: 'ความสะอาดและ 5ส ที่จุดปฏิบัติงาน' },
]

const NO_EXTRA_SECTIONS = { goalSetting: false, salary: false }

export const FORM_DEFINITIONS: Record<FormTypeId, FormDefinition> = {
  DIRECTOR_LEVEL: {
    id: 'DIRECTOR_LEVEL',
    code: 'AMW-01-033',
    titleEn: 'Performance Evaluation Form (Director Level & Up)',
    titleTh: 'แบบประเมินผลการปฏิบัติงาน สำหรับระดับผู้อำนวยการขึ้นไป',
    ratingScale: RATING_SCALE, gradeScale: GRADE_SCALE,
    categories: buildCategories(DIRECTOR_CRITERIA), sections: NO_EXTRA_SECTIONS,
  },
  MANAGER_LEVEL: {
    id: 'MANAGER_LEVEL',
    code: 'AMW-01-034',
    titleEn: 'Performance Evaluation Form (Manager Level)',
    titleTh: 'แบบประเมินผลการปฏิบัติงาน สำหรับระดับผู้จัดการ',
    ratingScale: RATING_SCALE, gradeScale: GRADE_SCALE,
    categories: buildCategories(MANAGER_CRITERIA), sections: NO_EXTRA_SECTIONS,
  },
  OFFICER_LEVEL: {
    id: 'OFFICER_LEVEL',
    code: 'AMW-01-036',
    titleEn: 'Performance Evaluation Form (Office / Supervisor / Engineer Level)',
    titleTh: 'แบบประเมินผลการปฏิบัติงาน สำหรับพนักงานสำนักงาน',
    ratingScale: RATING_SCALE, gradeScale: GRADE_SCALE,
    categories: buildCategories(OFFICER_CRITERIA), sections: NO_EXTRA_SECTIONS,
  },
  SUPERVISOR_LEVEL: {
    id: 'SUPERVISOR_LEVEL',
    code: 'AMW-01-037',
    titleEn: 'Performance Evaluation Form (Supervisor Level)',
    titleTh: 'แบบประเมินผลการปฏิบัติงาน สำหรับระดับหัวหน้างาน',
    ratingScale: RATING_SCALE, gradeScale: GRADE_SCALE,
    categories: buildCategories(SUPERVISOR_CRITERIA),
    // Weighted scoring: Goal(60-70%) + Competency(20%) + Attendance(10%) + Training(10%)
    sections: { goalSetting: true, salary: false },
  },
  PRODUCTION_LEVEL: {
    id: 'PRODUCTION_LEVEL',
    code: 'AMW-01-038',
    titleEn: 'Performance Evaluation Form (Production Staff Level)',
    titleTh: 'แบบประเมินผลการปฏิบัติงาน สำหรับพนักงานฝ่ายผลิต',
    ratingScale: RATING_SCALE, gradeScale: GRADE_SCALE,
    categories: buildCategories(PRODUCTION_CRITERIA),
    // Weighted scoring: Goal(60-70%) + Competency(20%) + Attendance(10%) + Training(10%)
    sections: { goalSetting: true, salary: false },
  },
}

export const DEFAULT_FORM_TYPE: FormTypeId = 'OFFICER_LEVEL'

/** Each employee level uses its own form. */
export const POSITION_FORM_TYPE: Record<Position, FormTypeId> = {
  CEO: 'DIRECTOR_LEVEL',
  MANAGING_DIRECTOR: 'DIRECTOR_LEVEL',
  DIRECTOR_UP: 'DIRECTOR_LEVEL',
  MANAGER: 'MANAGER_LEVEL',
  OFFICER: 'OFFICER_LEVEL',
  SUPERVISOR: 'SUPERVISOR_LEVEL',
  PRODUCTION_STAFF: 'PRODUCTION_LEVEL',
  OTHER: 'OFFICER_LEVEL',
}

export function formTypeForPosition(position?: string | null): FormTypeId {
  return POSITION_FORM_TYPE[(position as Position)] ?? DEFAULT_FORM_TYPE
}

export function getFormDefinition(id?: string | null): FormDefinition {
  return FORM_DEFINITIONS[(id as FormTypeId)] ?? FORM_DEFINITIONS[DEFAULT_FORM_TYPE]
}

/** Map an averaged criterion score (1..5) to a grade band. */
export function scoreToGrade(avg: number, def: FormDefinition): GradeDef {
  const rounded = Math.round(avg)
  return def.gradeScale.find(g => g.value === rounded) ?? def.gradeScale[def.gradeScale.length - 1]
}

export const EVALUATION_REASONS = [
  { value: 'PROBATION', en: 'Probation', th: 'ทดลองงาน' },
  { value: 'ANNUAL', en: 'Annual', th: 'ประจำปี' },
  { value: 'OTHER', en: 'Other', th: 'อื่น ๆ' },
] as const

export type EvaluationReasonValue = typeof EVALUATION_REASONS[number]['value']
