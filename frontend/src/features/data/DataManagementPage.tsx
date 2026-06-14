import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Database, Download,
  FileDown, FileUp, History, Loader2, RefreshCw, Search, Shield, Upload,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { FORM_DEFINITIONS } from '@/features/evaluations/constants/formDefinitions'
import { COMPETENCY_DEFINITIONS } from '@/features/evaluations/constants/competency'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportSummary {
  importId: string
  totalRows: number
  created: number
  updated: number
  failed: number
  errors: { row: number; reason: string; employeeNo?: string; email?: string }[]
  added: { employeeNo: string; name: string }[]
  missing: { employeeNo: string; name: string }[]
}

interface ImportHistoryItem {
  id: string
  filename: string | null
  importedById: string
  totalRows: number
  created: number
  updated: number
  failed: number
  createdAt: string
}

interface AuditEvent {
  id: string
  eventType: string
  actorId: string | null
  actorRole: string | null
  method: string | null
  path: string | null
  statusCode: number | null
  targetType: string | null
  targetId: string | null
  ip: string | null
  createdAt: string
}

type Tab = 'import' | 'export' | 'masterdata' | 'audit'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(v: string) {
  return new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
      background: ok ? 'rgba(22,163,74,0.12)' : 'rgba(229,35,33,0.1)',
      color: ok ? '#16a34a' : 'var(--amw-red)',
      border: `1px solid ${ok ? 'rgba(22,163,74,0.25)' : 'rgba(229,35,33,0.25)'}`,
    }}>
      {ok ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
      {ok ? 'OK' : 'Errors'}
    </span>
  )
}

// ─── TAB: Import ─────────────────────────────────────────────────────────────

function ImportTab() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [showMissing, setShowMissing] = useState(false)

  const { data: history = [], isLoading: histLoading } = useQuery<ImportHistoryItem[]>({
    queryKey: ['import-history'],
    queryFn: () => api.get('/users/imports').then(r => r.data),
  })

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text()
      const res = await api.post<ImportSummary>('/users/import', text, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Filename': encodeURIComponent(file.name),
        },
      })
      return res.data
    },
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['import-history'] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    importMut.mutate(file)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Upload zone */}
      <div style={{
        border: '1.5px dashed rgba(92,86,144,0.3)',
        borderRadius: 12, padding: '32px 24px',
        background: 'rgba(92,86,144,0.03)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(92,86,144,0.12)', border: '1px solid rgba(92,86,144,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileUp size={22} color="var(--m-light-blue)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: 'var(--kbt-text)', marginBottom: 4 }}>
            Upload Employee Master File
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--kbt-text-3)' }}>
            CSV or TSV export from HR system — columns: No, Name, Surname, Department, Position Level, Email, Start date, etc.
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{ display: 'none' }} />
        <button
          className="kbt-btn-outline"
          style={{ gap: 7 }}
          onClick={() => fileRef.current?.click()}
          disabled={importMut.isPending}
        >
          {importMut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
          {importMut.isPending ? 'Importing…' : 'Choose File & Import'}
        </button>
      </div>

      {/* Error */}
      {importMut.isError && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, fontSize: '0.8rem',
          background: 'rgba(229,35,33,0.08)', border: '1px solid rgba(229,35,33,0.2)',
          color: 'var(--amw-red)',
        }}>
          Import failed — check the file format and try again.
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          borderRadius: 10, border: '1px solid var(--kbt-border)',
          overflow: 'hidden', background: 'var(--kbt-surface)',
        }}>
          <div style={{
            padding: '14px 18px', background: 'rgba(22,163,74,0.06)',
            borderBottom: '1px solid var(--kbt-border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CheckCircle2 size={15} color="#16a34a" />
            <span style={{ fontWeight: 700, color: 'var(--kbt-text)', fontSize: '0.875rem' }}>Import Complete</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Rows', value: result.totalRows, color: 'var(--kbt-text-2)' },
              { label: 'Created', value: result.created, color: '#16a34a' },
              { label: 'Updated', value: result.updated, color: 'var(--m-light-blue)' },
              { label: 'Failed', value: result.failed, color: result.failed > 0 ? 'var(--amw-red)' : 'var(--kbt-text-3)' },
            ].map(s => (
              <div key={s.label} style={{
                flex: '1 1 80px', padding: '10px 14px', borderRadius: 8,
                background: 'var(--control-bg)', border: '1px solid var(--kbt-border)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div style={{ padding: '0 18px 16px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amw-red)', marginBottom: 8 }}>Row Errors</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem',
                    background: 'rgba(229,35,33,0.06)', border: '1px solid rgba(229,35,33,0.15)',
                    color: 'var(--kbt-text-2)',
                  }}>
                    <span style={{ color: 'var(--amw-red)', fontWeight: 700 }}>Row {e.row}</span>
                    {e.employeeNo && <span> · #{e.employeeNo}</span>}
                    <span style={{ marginLeft: 8 }}>{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--kbt-border)' }}>
              <button
                onClick={() => setShowMissing(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginTop: 12, color: 'var(--kbt-text-2)', fontSize: '0.8rem',
                }}
              >
                {showMissing ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <AlertTriangle size={12} color="var(--kbt-text-3)" />
                {result.missing.length} employees not in this file (possibly resigned)
              </button>
              {showMissing && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.missing.map(m => (
                    <span key={m.employeeNo} style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem',
                      background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)',
                      color: 'var(--kbt-text-2)',
                    }}>
                      #{m.employeeNo} {m.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          paddingBottom: 10, borderBottom: '1px solid var(--kbt-border)',
        }}>
          <History size={14} color="var(--kbt-text-3)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--kbt-text-2)' }}>Import History</span>
          <span style={{
            marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--kbt-text-3)',
            padding: '2px 7px', borderRadius: 99, background: 'var(--control-bg)',
            border: '1px solid var(--kbt-border)',
          }}>Last 20 runs</span>
        </div>

        {histLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="var(--kbt-text-3)" />
          </div>
        ) : history.length === 0 ? (
          <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.8rem', padding: '16px 0' }}>No imports yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map(h => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '10px 14px', borderRadius: 8, fontSize: '0.78rem',
                background: 'var(--control-bg)', border: '1px solid var(--kbt-border)',
              }}>
                <StatusBadge ok={h.failed === 0} />
                <span style={{ color: 'var(--kbt-text)', fontWeight: 600, flex: 1, minWidth: 140 }}>
                  {h.filename ?? 'unnamed file'}
                </span>
                <span style={{ color: 'var(--kbt-text-3)', fontSize: '0.7rem' }}>{fmtDate(h.createdAt)}</span>
                <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                  {[
                    { l: 'Total', v: h.totalRows },
                    { l: 'New', v: h.created, c: '#16a34a' },
                    { l: 'Upd', v: h.updated, c: 'var(--m-light-blue)' },
                    { l: 'Err', v: h.failed, c: h.failed > 0 ? 'var(--amw-red)' : 'var(--kbt-text-3)' },
                  ].map(s => (
                    <span key={s.l} style={{ fontSize: '0.72rem', color: s.c ?? 'var(--kbt-text-2)' }}>
                      {s.l}: <strong>{s.v}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TAB: Export ─────────────────────────────────────────────────────────────

function ExportTab() {
  const [busy, setBusy] = useState<string | null>(null)

  async function exportUsers() {
    setBusy('users')
    try {
      const res = await api.get<{
        id: string; name: string; email: string; role: string;
        position?: string; department?: string; jobTitle?: string;
        employeeNo?: string; hireDate?: string;
      }[]>('/users')
      const headers = ['employeeNo', 'name', 'email', 'role', 'position', 'department', 'jobTitle', 'hireDate']
      const rows = [headers, ...res.data.map(u => headers.map(h => (u as Record<string, string | undefined>)[h] ?? ''))]
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }

  const exports = [
    {
      id: 'users',
      title: 'Employee Master List',
      desc: 'All employees — ID, name, email, role, position, department, hire date.',
      icon: FileDown,
      action: exportUsers,
      color: 'var(--m-light-blue)',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: '0.82rem', color: 'var(--kbt-text-3)', marginBottom: 4 }}>
        Download system data as CSV files. Individual evaluation PDFs and CSVs are available from the Evaluations page.
      </p>
      {exports.map(ex => {
        const Icon = ex.icon
        const loading = busy === ex.id
        return (
          <div key={ex.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 18px', borderRadius: 10,
            background: 'var(--kbt-surface)', border: '1px solid var(--kbt-border)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(92,86,144,0.1)', border: '1px solid rgba(92,86,144,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={ex.color} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: 'var(--kbt-text)', fontSize: '0.875rem' }}>{ex.title}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', marginTop: 2 }}>{ex.desc}</p>
            </div>
            <button
              className="kbt-btn-outline"
              style={{ gap: 6, flexShrink: 0 }}
              onClick={ex.action}
              disabled={!!busy}
            >
              {loading
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <Download size={13} />}
              {loading ? 'Exporting…' : 'Download CSV'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── TAB: Master Data ─────────────────────────────────────────────────────────

function MasterDataTab() {
  const [openForm, setOpenForm] = useState<string | null>(null)
  const [openCc, setOpenCc] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Form Definitions */}
      <div>
        <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--kbt-border)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--kbt-text-2)' }}>Evaluation Form Definitions</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--kbt-text-3)', marginTop: 2 }}>
            {Object.keys(FORM_DEFINITIONS).length} forms — hardcoded in <code>formDefinitions.ts</code>. Read-only.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(FORM_DEFINITIONS).map(form => {
            const open = openForm === form.id
            const totalCriteria = form.categories.reduce((s, c) => s + c.criteria.length, 0)
            return (
              <div key={form.id} style={{
                borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--kbt-border)', background: 'var(--kbt-surface)',
              }}>
                <button
                  onClick={() => setOpenForm(open ? null : form.id)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800,
                    fontFamily: 'monospace', background: 'rgba(46,99,166,0.1)',
                    color: 'var(--m-light-blue)', border: '1px solid rgba(46,99,166,0.2)',
                  }}>
                    {form.code}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--kbt-text)' }}>{form.titleEn}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', marginTop: 1 }}>{form.titleTh}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: 'var(--kbt-text-3)' }}>
                    <span>{form.categories.length} categories</span>
                    <span>·</span>
                    <span>{totalCriteria} criteria</span>
                    <span>·</span>
                    <span>{form.sections.goalSetting ? 'KPI form' : 'Appraisal form'}</span>
                  </div>
                  <div style={{ color: 'var(--kbt-text-3)', marginLeft: 8 }}>
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>

                {open && (
                  <div style={{ borderTop: '1px solid var(--kbt-border)', padding: '12px 16px' }}>
                    {form.categories.map(cat => (
                      <div key={cat.id} style={{ marginBottom: 12 }}>
                        <p style={{
                          fontSize: '0.72rem', fontWeight: 700, color: 'var(--kbt-text-2)',
                          marginBottom: 6, padding: '4px 8px', borderRadius: 5,
                          background: 'var(--control-bg)', display: 'inline-block',
                        }}>
                          {cat.num}. {cat.titleEn}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                          {cat.criteria.map(crit => (
                            <div key={crit.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{
                                fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--kbt-text-3)',
                                marginTop: 2, flexShrink: 0,
                              }}>{crit.id}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-2)' }}>{crit.en}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Competency Definitions */}
      <div>
        <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--kbt-border)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--kbt-text-2)' }}>Competency Definitions</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--kbt-text-3)', marginTop: 2 }}>
            {COMPETENCY_DEFINITIONS.length} competencies — hardcoded in <code>competency.ts</code>. Read-only.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COMPETENCY_DEFINITIONS.map(cc => {
            const open = openCc === cc.id
            return (
              <div key={cc.id} style={{
                borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--kbt-border)', background: 'var(--kbt-surface)',
              }}>
                <button
                  onClick={() => setOpenCc(open ? null : cc.id)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800,
                    fontFamily: 'monospace',
                    background: cc.id.startsWith('CC') ? 'rgba(46,200,180,0.1)' : cc.id.startsWith('MC') ? 'rgba(92,86,144,0.1)' : 'rgba(234,128,0,0.1)',
                    color: cc.id.startsWith('CC') ? '#2ec8b4' : cc.id.startsWith('MC') ? 'var(--m-light-blue)' : '#ea8000',
                    border: `1px solid ${cc.id.startsWith('CC') ? 'rgba(46,200,180,0.25)' : cc.id.startsWith('MC') ? 'rgba(92,86,144,0.25)' : 'rgba(234,128,0,0.25)'}`,
                  }}>
                    {cc.id}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--kbt-text)' }}>{cc.name}</p>
                  </div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)' }}>
                    {cc.positions.length} position{cc.positions.length !== 1 ? 's' : ''}
                  </p>
                  <div style={{ color: 'var(--kbt-text-3)', marginLeft: 8 }}>
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>
                {open && (
                  <div style={{ borderTop: '1px solid var(--kbt-border)', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {cc.positions.map(p => (
                        <span key={p} style={{
                          padding: '2px 8px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                          background: 'rgba(92,86,144,0.1)', color: 'var(--m-light-blue)',
                          border: '1px solid rgba(92,86,144,0.2)',
                        }}>{p}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(cc.descriptions).map(([pos, desc]) => (
                        <div key={pos} style={{
                          display: 'flex', gap: 10,
                          padding: '8px 10px', borderRadius: 7,
                          background: 'var(--control-bg)', border: '1px solid var(--kbt-border)',
                        }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--kbt-text-3)',
                            flexShrink: 0, marginTop: 2, width: 100,
                          }}>{pos}</span>
                          <span style={{ fontSize: '0.775rem', color: 'var(--kbt-text-2)' }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── TAB: Audit Log ───────────────────────────────────────────────────────────

function AuditTab() {
  const [search, setSearch] = useState('')
  const { data: events = [], isLoading, refetch } = useQuery<AuditEvent[]>({
    queryKey: ['audit-events'],
    queryFn: () => api.get('/reports/audit-events').then(r => r.data),
  })

  const filtered = events.filter(e =>
    !search ||
    e.eventType?.toLowerCase().includes(search.toLowerCase()) ||
    e.actorId?.toLowerCase().includes(search.toLowerCase()) ||
    e.path?.toLowerCase().includes(search.toLowerCase()) ||
    e.targetType?.toLowerCase().includes(search.toLowerCase())
  )

  function statusColor(code: number | null) {
    if (!code) return 'var(--kbt-text-3)'
    if (code < 300) return '#16a34a'
    if (code < 400) return '#ea8000'
    return 'var(--amw-red)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)' }} />
          <input
            className="kbt-input"
            placeholder="Filter by event type, actor, path…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, fontSize: '0.82rem' }}
          />
        </div>
        <button className="kbt-btn-ghost" onClick={() => refetch()} style={{ gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} color="var(--kbt-text-3)" />
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
          {search ? 'No events match this filter.' : 'No audit events recorded yet.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(e => (
            <div key={e.id} style={{
              padding: '10px 14px', borderRadius: 8, fontSize: '0.78rem',
              background: 'var(--control-bg)', border: '1px solid var(--kbt-border)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <span style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 5,
                  fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace',
                  background: 'rgba(46,99,166,0.1)', color: 'var(--m-light-blue)',
                  border: '1px solid rgba(46,99,166,0.2)',
                }}>
                  {e.eventType}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  {e.method && (
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>
                      {e.method}
                    </span>
                  )}
                  {e.path && (
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--kbt-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                      {e.path}
                    </span>
                  )}
                  {e.statusCode != null && (
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', color: statusColor(e.statusCode) }}>
                      {e.statusCode}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>
                  {e.actorId && <span>Actor: <span style={{ color: 'var(--kbt-text-2)' }}>{e.actorId.slice(0, 8)}…</span></span>}
                  {e.actorRole && <span>({e.actorRole})</span>}
                  {e.targetType && <span>· {e.targetType}</span>}
                  {e.ip && <span>· {e.ip}</span>}
                </div>
              </div>
              <span style={{ flexShrink: 0, fontSize: '0.68rem', color: 'var(--kbt-text-3)', marginTop: 2, whiteSpace: 'nowrap' }}>
                {fmtDate(e.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p style={{ fontSize: '0.68rem', color: 'var(--kbt-text-3)', textAlign: 'center' }}>
          Showing {filtered.length} of {events.length} events (last 100)
        </p>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof Database }[] = [
  { id: 'import', label: 'Import', icon: FileUp },
  { id: 'export', label: 'Export', icon: FileDown },
  { id: 'masterdata', label: 'Master Data', icon: Database },
  { id: 'audit', label: 'Audit Log', icon: Shield },
]

export default function DataManagementPage() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('import')

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <Shield size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
        <p style={{ color: 'var(--kbt-text-2)', fontWeight: 700 }}>Admin access required</p>
        <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.82rem' }}>Only administrators can access Data Management.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 4,
        }}>
          Administration
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--kbt-text)', lineHeight: 1.2 }}>
          Data Management
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--kbt-text-3)', marginTop: 6 }}>
          Import employees, export data, inspect master definitions, monitor system audit trail.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        padding: '4px', borderRadius: 10,
        background: 'var(--control-bg)', border: '1px solid var(--kbt-border)',
        width: 'fit-content',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 7,
                border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
                background: active ? 'var(--kbt-surface)' : 'transparent',
                color: active ? 'var(--kbt-text)' : 'var(--kbt-text-3)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.14s',
              }}
            >
              <Icon size={13} color={active ? 'var(--amw-red)' : 'var(--kbt-text-3)'} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{
        background: 'var(--kbt-surface)', borderRadius: 12,
        border: '1px solid var(--kbt-border)', padding: '24px',
      }}>
        {activeTab === 'import' && <ImportTab />}
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'masterdata' && <MasterDataTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  )
}
