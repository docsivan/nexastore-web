'use client'

import { useState, useEffect } from 'react'

interface LogEntry {
  timestamp:    string
  trigger_type: string
  action:       string
  target:       string
  value:        string
  reason:       string
  status:       string
}

interface InsightEntry {
  record_id:       string
  insight_id:      string
  package:         string
  insight_type:    string
  insight:         string
  action_required: string
  priority:        number
  status:          string
  created_at:      string
}

interface Props {}

type CronPhase = 'idle' | 'running' | 'done' | 'error'
interface CronState { phase: CronPhase; msg: string }

const DATA_CRONS = [
  {
    key:   'badges',
    label: 'Assign Badges',
    url:   '/api/admin/cron/badges',
    desc:  'Flash Deal / Urgent / Slow Mover / Featured / Top Seller',
  },
  {
    key:   'translate',
    label: 'Translate Arabic',
    url:   '/api/admin/cron/translate',
    desc:  'nameAr · categoryAr · descriptionAr via Gemini (blank rows only)',
  },
  {
    key:   'display-order',
    label: 'Set Display Order',
    url:   '/api/admin/cron/display-order',
    desc:  'Non-moving → Slow-moving → Rest, by stock DESC',
  },
]

function fmtTime(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

const STATUS_COLORS: Record<string, string> = {
  applied:          'bg-green-100 text-green-700',
  pending:          'bg-amber-100 text-amber-700',
  failed:           'bg-red-100 text-red-700',
  signal:           'bg-blue-100 text-blue-700',
}

const INSIGHT_STATUS_COLORS: Record<string, string> = {
  new:              'bg-blue-100 text-blue-700',
  acknowledged:     'bg-green-100 text-green-700',
  actioned:         'bg-purple-100 text-purple-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  dismissed:        'bg-gray-100 text-gray-500',
}

function priorityBadge(p: number) {
  if (p >= 5) return 'bg-red-100 text-red-700 border border-red-200'
  if (p >= 4) return 'bg-orange-100 text-orange-700 border border-orange-200'
  if (p >= 3) return 'bg-amber-100 text-amber-700 border border-amber-200'
  return 'bg-blue-50 text-blue-600 border border-blue-200'
}

function priorityLabel(p: number) {
  if (p >= 5) return 'High'
  if (p >= 3) return 'Med'
  return 'Low'
}

export default function NexaControl({}: Props) {
  const [log,             setLog]             = useState<LogEntry[]>([])
  const [insights,        setInsights]        = useState<InsightEntry[]>([])
  const [patternCount,    setPatternCount]     = useState(0)
  const [loading,         setLoading]         = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [running,         setRunning]         = useState<string | null>(null)
  const [result,          setResult]          = useState('')
  const [updatingId,      setUpdatingId]      = useState<string | null>(null)
  const [cronStates,      setCronStates]      = useState<Record<string, CronState>>(
    () => Object.fromEntries(DATA_CRONS.map(c => [c.key, { phase: 'idle', msg: '' }]))
  )

  const runCron = async (cron: typeof DATA_CRONS[number]) => {
    setCronStates(prev => ({ ...prev, [cron.key]: { phase: 'running', msg: '' } }))
    try {
      const res = await fetch(cron.url)
      const d   = await res.json()
      if (res.ok) {
        setCronStates(prev => ({
          ...prev,
          [cron.key]: { phase: 'done', msg: d.message ?? `Processed ${d.processed ?? 0}` },
        }))
        fetchLog()
      } else {
        setCronStates(prev => ({
          ...prev,
          [cron.key]: { phase: 'error', msg: d.error ?? 'Unknown error' },
        }))
      }
    } catch {
      setCronStates(prev => ({ ...prev, [cron.key]: { phase: 'error', msg: 'Network error' } }))
    }
  }

  const fetchLog = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/nexa-log', { headers: {} })
      if (res.ok) { const d = await res.json(); setLog(d.entries ?? []) }
    } catch {} finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/admin/insights', { headers: {} })
      if (res.ok) {
        const d = await res.json()
        setInsights(d.entries ?? [])
        setPatternCount(d.pattern_count ?? 0)
      }
    } catch {} finally {
      setInsightsLoading(false)
    }
  }

  useEffect(() => { fetchLog(); fetchInsights() }, [])

  const trigger = async (label: string, url: string) => {
    setRunning(label)
    setResult('')
    try {
      const res = await fetch(url, { method: 'GET', headers: {} })
      const d   = await res.json()
      setResult(res.ok ? `✓ ${label} complete. ${d.message ?? JSON.stringify(d).slice(0, 120)}` : `✗ ${d.error ?? 'Failed'}`)
      fetchLog()
      fetchInsights()
    } catch {
      setResult('✗ Network error')
    } finally {
      setRunning(null)
    }
  }

  const updateInsightStatus = async (recordId: string, status: string) => {
    setUpdatingId(recordId)
    try {
      await fetch('/api/admin/insights', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json',},
        body:    JSON.stringify({ record_id: recordId, status }),
      })
      setInsights(prev => prev.map(i => i.record_id === recordId ? { ...i, status } : i))
    } catch {}
    setUpdatingId(null)
  }

  const ACTIONS = [
    { label: 'Run Image Fetch',     url: '/api/nexa/images'          },
    { label: 'Send Briefing',       url: '/api/nexa/briefing'         },
    { label: 'Run Analysis',        url: '/api/nexa/analyse'          },
    { label: 'Run Actions',         url: '/api/nexa/act'              },
    { label: 'Fetch GSC Data',      url: '/api/nexa/gsc'              },
    { label: 'Fetch Trends',        url: '/api/nexa/trends'           },
    { label: 'Write Content',       url: '/api/nexa/content'          },
    { label: 'Refresh Content',     url: '/api/nexa/content-refresh'  },
  ]

  const newInsights = insights.filter(i => i.status === 'new')

  return (
    <div className="space-y-5">
      {/* Data Enrichment Crons */}
      <div className="bg-white rounded-[4px] border border-border p-5">
        <h3 className="font-heading font-semibold text-sm text-primary-dark mb-3">Data Enrichment Crons</h3>
        <div className="space-y-3">
          {DATA_CRONS.map(cron => {
            const state = cronStates[cron.key]
            const isRunning = state.phase === 'running'
            return (
              <div key={cron.key} className="flex items-start gap-3 p-3 rounded-[3px] bg-surface border border-border">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-xs text-primary-dark">{cron.label}</p>
                  <p className="font-body text-[10px] text-slate-muted mt-0.5">{cron.desc}</p>
                  {state.phase !== 'idle' && (
                    <p className={`mt-1.5 text-[11px] font-body rounded px-2 py-1 inline-block ${
                      state.phase === 'running' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                      state.phase === 'done'    ? 'bg-green-50 text-green-700' :
                                                  'bg-red-50 text-red-600'
                    }`}>
                      {state.phase === 'running' ? 'Running…' : state.phase === 'done' ? `✓ ${state.msg}` : `✗ ${state.msg}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => runCron(cron)}
                  disabled={Object.values(cronStates).some(s => s.phase === 'running')}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-body font-medium bg-primary-50 text-primary rounded-btn hover:bg-primary hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {isRunning ? 'Running…' : 'Run Now'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Manual trigger buttons */}
      <div className="bg-white rounded-[4px] border border-border p-5">
        <h3 className="font-heading font-semibold text-sm text-primary-dark mb-3">Manual Triggers</h3>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map(a => (
            <button key={a.label} onClick={() => trigger(a.label, a.url)} disabled={running !== null}
              className="px-4 py-2 text-sm font-body font-medium bg-primary-50 text-primary rounded-btn hover:bg-primary hover:text-white transition-colors disabled:opacity-40">
              {running === a.label ? 'Running…' : a.label}
            </button>
          ))}
          <button onClick={() => { fetchLog(); fetchInsights() }} disabled={loading}
            className="px-4 py-2 text-sm font-body font-medium border border-border text-slate-muted rounded-btn hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
            ↻ Refresh
          </button>
        </div>
        {result && (
          <p className={`mt-3 text-xs font-body rounded-[3px] p-2 ${result.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {result}
          </p>
        )}
      </div>

      {/* Pattern summary card */}
      <div className="bg-primary/[0.03] rounded-[4px] border border-primary/15 p-4 flex items-center gap-4">
        <div className="w-8 h-8 rounded-[3px] bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 font-heading">H</div>
        <div>
          <p className="font-heading font-semibold text-sm text-primary-dark">
            Haya has observed <span className="text-primary">{patternCount}</span> pattern{patternCount !== 1 ? 's' : ''} in the last 30 days
          </p>
          <p className="font-body text-xs text-slate-muted mt-0.5">
            {newInsights.length} insight{newInsights.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      {/* Haya Insights table */}
      <div className="bg-white rounded-[4px] border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-sm text-primary-dark">Haya Insights</h3>
            {newInsights.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{newInsights.length}</span>
            )}
          </div>
          <span className="text-xs font-body text-slate-muted">Last 30 days</span>
        </div>

        {insightsLoading && (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
          </div>
        )}

        {!insightsLoading && insights.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-body text-slate-muted text-sm">No insights yet.</p>
            <p className="font-body text-slate-muted text-xs mt-1">Run Analysis above to generate insights from behavioural signals.</p>
          </div>
        )}

        {!insightsLoading && insights.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="bg-surface text-slate-muted uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">P</th>
                  <th className="px-4 py-2 text-left">Insight</th>
                  <th className="px-4 py-2 text-left">Action Required</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {insights.map(entry => (
                  <tr key={entry.record_id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-primary-dark capitalize">
                        {(entry.insight_type || entry.package).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityBadge(entry.priority)}`}>
                        {priorityLabel(entry.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <p className="text-slate leading-snug line-clamp-2">{entry.insight}</p>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <p className="text-slate-muted leading-snug line-clamp-2">{entry.action_required || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${INSIGHT_STATUS_COLORS[entry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {entry.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-muted whitespace-nowrap">{fmtTime(entry.created_at)}</td>
                    <td className="px-4 py-2.5">
                      {(entry.status === 'new' || entry.status === 'pending_approval') && (
                        <div className="flex gap-1">
                          <button onClick={() => updateInsightStatus(entry.record_id, 'acknowledged')}
                            disabled={updatingId === entry.record_id}
                            className="px-2 py-1 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors disabled:opacity-40">
                            ✓ Ack
                          </button>
                          <button onClick={() => updateInsightStatus(entry.record_id, 'dismissed')}
                            disabled={updatingId === entry.record_id}
                            className="p-1 bg-gray-50 text-gray-400 border border-gray-200 rounded hover:bg-gray-100 transition-colors disabled:opacity-40" aria-label="Dismiss">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Haya Activity Log */}
      <div className="bg-white rounded-[4px] border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm text-primary-dark">Haya Activity Log</h3>
          <span className="text-xs font-body text-slate-muted">Last 50 entries</span>
        </div>

        {loading && (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />)}
          </div>
        )}

        {!loading && log.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-body text-slate-muted text-sm">No Haya activity yet.</p>
            <p className="font-body text-slate-muted text-xs mt-1">Run a trigger above or wait for the next cron.</p>
          </div>
        )}

        {!loading && log.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="bg-surface text-slate-muted uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Target</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {log.map((entry, i) => (
                  <tr key={i} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-muted whitespace-nowrap">{fmtTime(entry.timestamp)}</td>
                    <td className="px-4 py-2.5 text-slate font-medium capitalize">{entry.trigger_type}</td>
                    <td className="px-4 py-2.5 text-primary-dark">{entry.action}</td>
                    <td className="px-4 py-2.5 text-slate-muted">{entry.target}</td>
                    <td className="px-4 py-2.5 text-slate-muted max-w-xs truncate">{entry.reason || entry.value}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[entry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
