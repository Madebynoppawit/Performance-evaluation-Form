import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Activity,
  ChevronRight,
  FileText,
  Layers3,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import api from '@/lib/api'
import { getTypeLabel } from '@/lib/utils'
import type { Template } from '@/types'

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: template, isLoading } = useQuery<Template>({
    queryKey: ['templates', id],
    queryFn: () => api.get(`/templates/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { register, handleSubmit } = useForm<{ name: string; description: string }>()

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Template>) => api.patch(`/templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates', id] }),
  })

  const addSectionMutation = useMutation({
    mutationFn: () =>
      api.post(`/templates/${id}/sections`, {
        title: 'New Section',
        weight: 1,
        order: (template?.sections.length ?? 0) + 1,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates', id] }),
  })

  if (isLoading) {
    return (
      <div className="amw-loading-panel">
        <Activity size={18} />
        Loading blueprint...
      </div>
    )
  }

  if (!template) return <div className="kbt-msg-error">Template not found</div>

  const sectionCount = template.sections.length
  const questionCount = template.sections.reduce((total, section) => total + section.questions.length, 0)
  const totalWeight = template.sections.reduce((total, section) => total + Number(section.weight || 0), 0)
  const requiredQuestions = template.sections.reduce(
    (total, section) => total + section.questions.filter((question) => question.required).length,
    0,
  )
  const readiness = Math.min(100, Math.round(sectionCount * 20 + questionCount * 5 + (totalWeight > 0 ? 15 : 0)))
  const coverage = questionCount ? Math.round((requiredQuestions / questionCount) * 100) : 0

  return (
    <div className="amw-studio">
      <nav className="amw-breadcrumb">
        <Link to="/templates">Templates</Link>
        <ChevronRight size={13} />
        <span>{template.name}</span>
      </nav>

      <section className="amw-studio-hero">
        <div className="amw-hero-copy">
          <span className="amw-eyebrow">AMW Blueprint Studio</span>
          <h1>{template.name}</h1>
          <p>
            Design a high-control performance evaluation flow with clear structure, visible weights,
            and governance signals before it enters the review cycle.
          </p>
          <div className="amw-hero-badges">
            <span>{getTypeLabel(template.type)}</span>
            <span>{sectionCount} sections</span>
            <span>{questionCount} questions</span>
          </div>
        </div>
        <div className="amw-hero-actions">
          <button
            onClick={() => addSectionMutation.mutate()}
            disabled={addSectionMutation.isPending}
            className="kbt-btn-primary"
          >
            <Plus size={15} />
            Add Section
          </button>
        </div>
      </section>

      <div className="amw-studio-layout">
        <main className="amw-studio-main">
          <section className="amw-blueprint-card">
            <div className="amw-card-head">
              <div>
                <span className="amw-eyebrow">Identity Layer</span>
                <h2>Blueprint Identity</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
              <div className="amw-field-grid">
                <label>
                  <span>Template Name</span>
                  <input {...register('name')} defaultValue={template.name} className="kbt-input" />
                </label>
                <label>
                  <span>Description</span>
                  <input {...register('description')} defaultValue={template.description ?? ''} className="kbt-input" />
                </label>
              </div>
              <div className="amw-form-actions">
                <button type="submit" disabled={updateMutation.isPending} className="kbt-btn-primary">
                  <Save size={14} />
                  {updateMutation.isPending ? 'Saving...' : 'Save Blueprint'}
                </button>
              </div>
            </form>
          </section>

          <section className="amw-blueprint-card">
            <div className="amw-card-head">
              <div>
                <span className="amw-eyebrow">Architecture Layer</span>
                <h2>Section Architecture</h2>
              </div>
              <button
                onClick={() => addSectionMutation.mutate()}
                disabled={addSectionMutation.isPending}
                className="kbt-btn-ghost"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {sectionCount === 0 ? (
              <div className="amw-empty-state">
                <div>
                  <FileText size={26} />
                </div>
                <strong>No architecture yet</strong>
                <span>Create the first section to start shaping the evaluation blueprint.</span>
              </div>
            ) : (
              <div className="amw-blueprint-sections">
                {template.sections.map((section) => (
                  <article key={section.id} className="amw-blueprint-section">
                    <div className="amw-step-index">{String(section.order).padStart(2, '0')}</div>
                    <div className="amw-section-content">
                      <div className="amw-section-title-row">
                        <div>
                          <h3>{section.title}</h3>
                          <p>{section.description || 'No description configured'}</p>
                        </div>
                        <span className="amw-weight-pill">{section.weight} weight</span>
                      </div>
                      <div className="amw-section-meta">
                        <span>
                          <Layers3 size={14} />
                          {section.questions.length} questions
                        </span>
                        <span>
                          <ShieldCheck size={14} />
                          {section.questions.filter((question) => question.required).length} required
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="amw-inspector">
          <div className="amw-inspector-head">
            <span className="amw-eyebrow">Live Inspector</span>
            <SlidersHorizontal size={18} />
          </div>
          <div className="amw-score-ring" style={{ ['--score' as string]: `${readiness}%` }}>
            <strong>{readiness}</strong>
            <span>readiness</span>
          </div>
          <div className="amw-inspector-grid">
            <div>
              <span>Total Weight</span>
              <strong>{totalWeight}</strong>
            </div>
            <div>
              <span>Required Coverage</span>
              <strong>{coverage}%</strong>
            </div>
            <div>
              <span>Question Bank</span>
              <strong>{questionCount}</strong>
            </div>
            <div>
              <span>Governance</span>
              <strong>{sectionCount ? 'Ready' : 'Draft'}</strong>
            </div>
          </div>
          <div className="amw-governance-card">
            <Sparkles size={17} />
            <div>
              <strong>Enterprise-grade flow</strong>
              <p>Use balanced weights, required questions, and section clarity before launching a review cycle.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
