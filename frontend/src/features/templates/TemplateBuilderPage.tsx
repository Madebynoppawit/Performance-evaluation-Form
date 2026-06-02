import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ChevronRight, Plus, Save } from 'lucide-react'
import api from '@/lib/api'
import type { Template } from '@/types'

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: template, isLoading } = useQuery<Template>({
    queryKey: ['templates', id],
    queryFn: () => api.get(`/templates/${id}`).then((r) => r.data),
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-48" style={{ color: 'var(--sap-text-2)' }}>
      กำลังโหลด...
    </div>
  )
  if (!template) return (
    <div className="sap-message-error p-4">ไม่พบแม่แบบ</div>
  )

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--sap-text-2)' }}>
        <Link to="/templates" className="hover:underline" style={{ color: 'var(--sap-blue)' }}>
          แม่แบบฟอร์ม
        </Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--sap-text)', fontWeight: 500 }}>{template.name}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-sap-xl font-semibold" style={{ color: 'var(--sap-text)' }}>
          {template.name}
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--sap-text-2)', marginTop: 2 }}>
          แก้ไขข้อมูลแม่แบบและหมวดคำถาม
        </p>
      </div>

      {/* General Info Panel */}
      <div className="sap-panel">
        <div className="sap-panel-header">
          <span className="sap-panel-title">General Information</span>
        </div>
        <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="sap-panel-body">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="sap-label sap-label-required">Template Name</label>
              <input
                {...register('name')}
                defaultValue={template.name}
                className="sap-input"
              />
            </div>
            <div>
              <label className="sap-label">Description</label>
              <input
                {...register('description')}
                defaultValue={template.description ?? ''}
                className="sap-input"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="sap-btn-emphasized gap-1.5"
          >
            <Save size={14} />
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* Sections Panel */}
      <div className="sap-panel">
        <div className="sap-panel-header">
          <span className="sap-panel-title">
            Sections ({template.sections.length})
          </span>
          <button
            onClick={() => addSectionMutation.mutate()}
            disabled={addSectionMutation.isPending}
            className="sap-btn-regular gap-1"
            style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}
          >
            <Plus size={12} /> Add Section
          </button>
        </div>

        {template.sections.length === 0 ? (
          <div className="sap-panel-body text-center" style={{ color: 'var(--sap-text-2)', padding: '40px 16px' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-2 opacity-30">
              <rect x="4" y="4" width="32" height="36" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 14h20M10 20h14M10 26h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: '0.875rem' }}>ยังไม่มีหมวดคำถาม</p>
          </div>
        ) : (
          <table className="sap-table">
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>ชื่อหมวด</th>
                <th className="text-right">น้ำหนัก</th>
                <th className="text-right">จำนวนคำถาม</th>
              </tr>
            </thead>
            <tbody>
              {template.sections.map((section) => (
                <tr key={section.id}>
                  <td style={{ color: 'var(--sap-text-2)', width: 60 }}>{section.order}</td>
                  <td>
                    <p style={{ fontWeight: 500, color: 'var(--sap-text)' }}>{section.title}</p>
                    {section.description && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--sap-text-2)', marginTop: 2 }}>
                        {section.description}
                      </p>
                    )}
                  </td>
                  <td className="text-right" style={{ color: 'var(--sap-text-2)' }}>
                    {section.weight}
                  </td>
                  <td className="text-right">
                    <span className="sap-status-info">{section.questions.length} ข้อ</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
