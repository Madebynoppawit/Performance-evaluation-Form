import { useEffect, useState } from 'react'
import {
  Command,
  Compass,
  Gauge,
  Scale,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

type Locale = 'th' | 'en' | 'fr'

const LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: 'th', label: 'ไทย',       flag: '🇹🇭' },
  { id: 'en', label: 'English',   flag: '🇬🇧' },
  { id: 'fr', label: 'Français',  flag: '🇫🇷' },
]

const SECTION_ICONS: Record<string, LucideIcon> = {
  overview:  Compass,
  roles:     ShieldCheck,
  workflow:  Workflow,
  scoring:   Gauge,
  shortcuts: Command,
  legal:     Scale,
}

interface Section {
  id: keyof typeof SECTION_ICONS
  title: string
  body: string
  items: { term: string; desc: string }[]
}
interface Content {
  eyebrow: string
  title: string
  subtitle: string
  updated: string
  sections: Section[]
}

const GUIDE: Record<Locale, Content> = {
  th: {
    eyebrow: 'คู่มือการใช้งาน',
    title: 'แนวทางการใช้งาน AMW Command',
    subtitle: 'เรียนรู้วิธีใช้ระบบประเมินผลการปฏิบัติงานตั้งแต่ต้นจนจบ ครอบคลุมสิทธิ์ ขั้นตอน เกณฑ์คะแนน และการปฏิบัติตามกฎหมาย',
    updated: 'อัปเดตล่าสุด มิถุนายน 2026',
    sections: [
      {
        id: 'overview',
        title: 'ภาพรวมระบบ',
        body: 'AMW Command คือศูนย์กลางการประเมินผลงาน รวมการประเมินตนเอง ผู้บังคับบัญชา และแบบ 360° ไว้ในที่เดียว',
        items: [
          { term: 'แดชบอร์ด', desc: 'ภาพรวมความคืบหน้า คะแนนเฉลี่ย และสถานะระบบแบบเรียลไทม์' },
          { term: 'การประเมิน', desc: 'แบบฟอร์มรีวิวรายบุคคล คำนวณคะแนนอัตโนมัติตามน้ำหนัก' },
          { term: 'รายงาน', desc: 'วิเคราะห์แนวโน้มคะแนน การกระจายตัว และผลตามแผนก' },
        ],
      },
      {
        id: 'roles',
        title: 'บทบาทและสิทธิ์การใช้งาน',
        body: 'สิทธิ์การเข้าถึงถูกควบคุมตามบทบาท (RBAC) บังคับใช้ที่ฝั่งเซิร์ฟเวอร์',
        items: [
          { term: 'ผู้ดูแลระบบ (Admin)', desc: 'จัดการเทมเพลต รอบประเมิน ผู้ใช้ และดูรายงานทั้งหมด' },
          { term: 'ผู้จัดการ (Manager)', desc: 'สร้างและประเมินทีม ดูรายงานของหน่วยงาน' },
          { term: 'พนักงาน (Employee)', desc: 'กรอกแบบประเมินตนเองและดูผลของตน' },
        ],
      },
      {
        id: 'workflow',
        title: 'ขั้นตอนการทำงาน',
        body: 'เริ่มต้นใช้งานตามลำดับ 4 ขั้นตอน ดูเช็กลิสต์ "Getting Started" ที่แดชบอร์ดได้',
        items: [
          { term: '1 · เทมเพลต', desc: 'สร้างแบบฟอร์มพร้อมหมวดและน้ำหนักคะแนน' },
          { term: '2 · รอบประเมิน', desc: 'กำหนดช่วงเวลาและผูกเทมเพลต' },
          { term: '3 · ประเมิน', desc: 'มอบหมายและให้คะแนนผู้ถูกประเมิน' },
          { term: '4 · รายงาน', desc: 'ตรวจสอบแนวโน้มและตัดสินใจ' },
        ],
      },
      {
        id: 'scoring',
        title: 'เกณฑ์การให้คะแนน',
        body: 'ใช้มาตรวัด 1–5 โดยแต่ละระดับมีความหมายชัดเจน',
        items: [
          { term: '5 · ต้นแบบ', desc: 'เป็นแบบอย่างที่ดีเยี่ยม (4.5–5.0)' },
          { term: '4 · เกินความคาดหวัง', desc: 'ทำได้ดีกว่าเป้าหมาย (4.0–4.4)' },
          { term: '3 · ตามความคาดหวัง', desc: 'บรรลุเป้าหมาย (3.0–3.9)' },
          { term: '2 · ต้องปรับปรุง', desc: 'ต่ำกว่าเป้าบางส่วน (2.0–2.9)' },
          { term: '1 · ไม่น่าพอใจ', desc: 'ต้องพัฒนาอย่างมาก (1.0–1.9)' },
        ],
      },
      {
        id: 'shortcuts',
        title: 'ทางลัดและการค้นหา',
        body: 'ใช้ Command Palette เพื่อไปยังทุกหน้าและสั่งงานได้รวดเร็ว',
        items: [
          { term: 'Ctrl / ⌘ + K', desc: 'เปิด Command Palette ค้นหาและสั่งงาน' },
          { term: 'Ctrl / ⌘ + T', desc: 'สลับธีมสว่าง/มืด' },
          { term: '↑ ↓ ↵ Esc', desc: 'เลื่อน เลือก และปิดภายใน Palette' },
        ],
      },
      {
        id: 'legal',
        title: 'ข้อมูลและการปฏิบัติตามกฎหมาย',
        body: 'ระบบประมวลผลข้อมูลส่วนบุคคลตาม PDPA และ GDPR ทุกเซสชันถูกบันทึกและตรวจสอบได้',
        items: [
          { term: 'PDPA พ.ศ. 2562', desc: 'คุ้มครองข้อมูลส่วนบุคคลของไทย' },
          { term: 'GDPR', desc: 'มาตรฐานการคุ้มครองข้อมูลของสหภาพยุโรป' },
          { term: 'บันทึกการตรวจสอบ', desc: 'เก็บหลักฐานการเข้าถึงและแก้ไข' },
        ],
      },
    ],
  },
  en: {
    eyebrow: 'User Guide',
    title: 'AMW Command Guidelines',
    subtitle: 'Learn the evaluation system end to end — roles, workflow, scoring scale, and compliance.',
    updated: 'Last updated June 2026',
    sections: [
      {
        id: 'overview',
        title: 'System Overview',
        body: 'AMW Command is the central performance-evaluation hub, unifying self, manager, and 360° reviews.',
        items: [
          { term: 'Dashboard', desc: 'Real-time overview of progress, average score, and system status.' },
          { term: 'Evaluations', desc: 'Per-employee review forms with auto-computed weighted scores.' },
          { term: 'Reports', desc: 'Analyze score trends, distribution, and department performance.' },
        ],
      },
      {
        id: 'roles',
        title: 'Roles & Access',
        body: 'Access is governed by role-based rules (RBAC) enforced on the server.',
        items: [
          { term: 'Admin', desc: 'Manage templates, cycles, users, and view all reports.' },
          { term: 'Manager', desc: 'Create and score team reviews; view department reports.' },
          { term: 'Employee', desc: 'Complete self-assessments and view personal results.' },
        ],
      },
      {
        id: 'workflow',
        title: 'Workflow',
        body: 'Get started in four steps — track them on the dashboard "Getting Started" checklist.',
        items: [
          { term: '1 · Template', desc: 'Build a form with weighted sections.' },
          { term: '2 · Cycle', desc: 'Define the period and attach a template.' },
          { term: '3 · Evaluation', desc: 'Assign and score an employee review.' },
          { term: '4 · Report', desc: 'Review trends and make decisions.' },
        ],
      },
      {
        id: 'scoring',
        title: 'Scoring Scale',
        body: 'A 1–5 scale where each level carries a clear meaning.',
        items: [
          { term: '5 · Role Model', desc: 'Exceptional example for others (4.5–5.0).' },
          { term: '4 · Exceeds', desc: 'Performs above target (4.0–4.4).' },
          { term: '3 · Meets', desc: 'Achieves expectations (3.0–3.9).' },
          { term: '2 · Needs Improvement', desc: 'Below target in areas (2.0–2.9).' },
          { term: '1 · Unsatisfactory', desc: 'Significant development needed (1.0–1.9).' },
        ],
      },
      {
        id: 'shortcuts',
        title: 'Shortcuts & Search',
        body: 'Use the Command Palette to jump anywhere and run actions fast.',
        items: [
          { term: 'Ctrl / ⌘ + K', desc: 'Open the Command Palette to search and act.' },
          { term: 'Ctrl / ⌘ + T', desc: 'Toggle light / dark theme.' },
          { term: '↑ ↓ ↵ Esc', desc: 'Move, select, and close within the palette.' },
        ],
      },
      {
        id: 'legal',
        title: 'Data & Compliance',
        body: 'Personal data is processed under PDPA and GDPR. All sessions are recorded and auditable.',
        items: [
          { term: 'PDPA B.E. 2562', desc: "Thailand's personal data protection act." },
          { term: 'GDPR', desc: 'EU general data protection regulation.' },
          { term: 'Audit Trail', desc: 'Immutable record of access and changes.' },
        ],
      },
    ],
  },
  fr: {
    eyebrow: "Guide d'utilisation",
    title: 'Guide AMW Command',
    subtitle: "Maîtrisez le système d'évaluation de bout en bout — rôles, flux, barème et conformité.",
    updated: 'Dernière mise à jour juin 2026',
    sections: [
      {
        id: 'overview',
        title: "Aperçu du système",
        body: "AMW Command est le centre d'évaluation de la performance, réunissant auto-évaluation, manager et 360°.",
        items: [
          { term: 'Tableau de bord', desc: "Aperçu en temps réel de l'avancement, du score moyen et de l'état du système." },
          { term: 'Évaluations', desc: 'Formulaires individuels avec scores pondérés calculés automatiquement.' },
          { term: 'Rapports', desc: 'Analysez les tendances, la distribution et la performance par service.' },
        ],
      },
      {
        id: 'roles',
        title: 'Rôles et accès',
        body: "L'accès est régi par des règles basées sur les rôles (RBAC) appliquées côté serveur.",
        items: [
          { term: 'Administrateur', desc: 'Gère modèles, cycles, utilisateurs et voit tous les rapports.' },
          { term: 'Manager', desc: "Crée et note les évaluations de l'équipe ; voit les rapports du service." },
          { term: 'Employé', desc: 'Complète les auto-évaluations et consulte ses résultats.' },
        ],
      },
      {
        id: 'workflow',
        title: 'Flux de travail',
        body: 'Démarrez en quatre étapes — suivez-les via la liste « Getting Started » du tableau de bord.',
        items: [
          { term: '1 · Modèle', desc: 'Créez un formulaire avec sections pondérées.' },
          { term: '2 · Cycle', desc: 'Définissez la période et associez un modèle.' },
          { term: '3 · Évaluation', desc: 'Assignez et notez une évaluation.' },
          { term: '4 · Rapport', desc: 'Examinez les tendances et décidez.' },
        ],
      },
      {
        id: 'scoring',
        title: 'Barème de notation',
        body: 'Une échelle de 1 à 5 où chaque niveau a un sens précis.',
        items: [
          { term: '5 · Modèle', desc: 'Exemple exceptionnel pour les autres (4,5–5,0).' },
          { term: '4 · Dépasse', desc: "Au-dessus de l'objectif (4,0–4,4)." },
          { term: '3 · Conforme', desc: 'Atteint les attentes (3,0–3,9).' },
          { term: '2 · À améliorer', desc: "En dessous de l'objectif par endroits (2,0–2,9)." },
          { term: '1 · Insuffisant', desc: 'Développement important requis (1,0–1,9).' },
        ],
      },
      {
        id: 'shortcuts',
        title: 'Raccourcis et recherche',
        body: 'Utilisez la palette de commandes pour naviguer et agir rapidement.',
        items: [
          { term: 'Ctrl / ⌘ + K', desc: 'Ouvre la palette de commandes pour chercher et agir.' },
          { term: 'Ctrl / ⌘ + T', desc: 'Bascule le thème clair / sombre.' },
          { term: '↑ ↓ ↵ Échap', desc: 'Naviguer, sélectionner et fermer dans la palette.' },
        ],
      },
      {
        id: 'legal',
        title: 'Données et conformité',
        body: 'Les données personnelles sont traitées selon la PDPA et le RGPD. Toutes les sessions sont enregistrées et auditables.',
        items: [
          { term: 'PDPA B.E. 2562', desc: 'Loi thaïlandaise sur la protection des données.' },
          { term: 'RGPD', desc: "Règlement général de l'UE sur la protection des données." },
          { term: "Piste d'audit", desc: 'Enregistrement immuable des accès et modifications.' },
        ],
      },
    ],
  },
}

const STORAGE_KEY = 'guide-locale'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'th'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'th' || stored === 'en' || stored === 'fr' ? stored : 'th'
}

export default function GuidelinesPage() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const content = GUIDE[locale]

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </div>
        <div className="amw-lang-switch" role="group" aria-label="Language">
          {LOCALES.map(l => (
            <button
              key={l.id}
              type="button"
              className={locale === l.id ? 'active' : ''}
              onClick={() => setLocale(l.id)}
              aria-pressed={locale === l.id}
            >
              <span className="amw-lang-flag">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <p className="amw-guide-updated">{content.updated}</p>

      <div className="amw-guide-grid">
        {content.sections.map((section, i) => {
          const Icon = SECTION_ICONS[section.id]
          return (
            <section key={section.id} className="kbt-card amw-guide-card kbt-animate-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="amw-guide-card-head">
                <div className="amw-guide-icon"><Icon size={18} /></div>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              </div>
              <div className="amw-guide-items">
                {section.items.map(item => (
                  <div key={item.term} className="amw-guide-item">
                    <strong>{item.term}</strong>
                    <span>{item.desc}</span>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
