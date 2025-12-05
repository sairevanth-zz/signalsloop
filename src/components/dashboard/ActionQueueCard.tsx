'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  X,
  AlertCircle,
  TrendingUp,
  GitMerge,
  FileText,
  Users,
  Zap,
  Target,
  AlertTriangle,
  Rocket,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const ACTION_ICONS: Record<string, any> = {
  merge_suggestion: GitMerge,
  priority_change: TrendingUp,
  competitive_threat: AlertTriangle,
  spec_ready_for_review: FileText,
  customer_at_risk: Users,
  anomaly_detected: AlertCircle,
  roadmap_adjustment: Target,
  opportunity_identified: Rocket,
  feedback_spike: Activity,
  sentiment_drop: TrendingUp
}

const SEVERITY_CONFIG: Record<string, { color: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  critical: { color: 'text-red-600', variant: 'destructive' },
  warning: { color: 'text-yellow-600', variant: 'secondary' },
  info: { color: 'text-blue-600', variant: 'outline' },
  success: { color: 'text-green-600', variant: 'default' }
}

export function ActionQueueCard({ projectId }: { projectId: string }) {
  const [actions, setActions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchActions()
    const interval = setInterval(fetchActions, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [projectId])

  async function fetchActions() {
    try {
      const res = await fetch(`/api/actions/pending?projectId=${projectId}`)
      const data = await res.json()
      setActions(data.actions || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Failed to fetch actions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExecute(actionId: string) {
    setExecuting(new Set(executing).add(actionId))

    try {
      const res = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId })
      })

      if (!res.ok) {
        throw new Error('Failed to execute action')
      }

      toast.success('Action executed successfully')
      await fetchActions()
    } catch (error) {
      toast.error('Failed to execute action')
    } finally {
      setExecuting(new Set([...executing].filter(id => id !== actionId)))
    }
  }

  async function handleDismiss(actionId: string) {
    try {
      const res = await fetch('/api/actions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId })
      })

      if (!res.ok) {
        throw new Error('Failed to dismiss action')
      }

      toast.success('Action dismissed')
      await fetchActions()
    } catch (error) {
      toast.error('Failed to dismiss action')
    }
  }

  const criticalActions = actions.filter(a => a.action.severity === 'critical')
  const highPriorityActions = actions.filter(a => a.action.priority === 1)

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading actions...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2" data-tour="action-queue">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Action Queue
            </CardTitle>
            <CardDescription>AI-recommended actions requiring your attention</CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalActions.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalActions.length} critical
              </Badge>
            )}
            {highPriorityActions.length > 0 && (
              <Badge variant="secondary">
                {highPriorityActions.length} high priority
              </Badge>
            )}
            <Badge variant="outline">
              {actions.length} pending
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No pending actions. Your AI agents are monitoring everything.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {actions.map((item) => {
              const action = item.action
              const Icon = ACTION_ICONS[action.action_type] || Zap
              const severityConfig = SEVERITY_CONFIG[action.severity] || SEVERITY_CONFIG.info
              const isExecuting = executing.has(action.id)

              return (
                <div
                  key={action.id}
                  className={`p-4 border rounded-lg transition-all ${
                    action.severity === 'critical'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : action.severity === 'warning'
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`w-5 h-5 mt-0.5 ${severityConfig.color}`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{action.title}</h4>
                        {action.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {action.description}
                          </p>
                        )}

                        {/* Metadata based on action type */}
                        {action.action_type === 'merge_suggestion' && action.metadata && (
                          <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            <p>• Source: {action.metadata.sourceTitle}</p>
                            <p>• Target: {action.metadata.targetTitle}</p>
                            <p className="font-medium">
                              Similarity: {(action.metadata.similarityScore * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Badge variant={severityConfig.variant} className="text-xs">
                            {action.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            P{action.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.age_minutes < 60
                              ? `${item.age_minutes}m ago`
                              : `${Math.floor(item.age_minutes / 60)}h ago`}
                          </span>

                          {/* Related entity links */}
                          {action.related_post_id && (
                            <Link
                              href={`/${projectId}/board?post=${action.related_post_id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              View feedback →
                            </Link>
                          )}
                          {action.related_spec_id && (
                            <Link
                              href={`/${projectId}/specs/${action.related_spec_id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              View spec →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {action.requires_approval ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleExecute(action.id)}
                          disabled={isExecuting}
                          className="flex-1"
                        >
                          {isExecuting ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Execute
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismiss(action.id)}
                          disabled={isExecuting}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(action.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Stats Summary */}
        {stats && actions.length > 0 && (
          <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.pending || 0}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.executed || 0}</p>
              <p className="text-xs text-muted-foreground">Executed (30d)</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.critical || 0}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
