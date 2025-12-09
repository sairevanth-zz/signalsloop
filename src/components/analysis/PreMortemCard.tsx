'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    AlertTriangle,
    ShieldAlert,
    TrendingDown,
    Users,
    Zap,
    Target,
    Clock,
    Maximize2,
    CheckCircle2,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import type { PreMortemAnalysis, PreMortemRisk, RiskCategory } from '@/types/pre-mortem'

interface PreMortemCardProps {
    analysis: PreMortemAnalysis
    onAcknowledgeRisk?: (riskId: string) => void
}

const CATEGORY_ICONS: Record<RiskCategory, React.ReactNode> = {
    technical: <Zap className="w-4 h-4" />,
    adoption: <Users className="w-4 h-4" />,
    market: <TrendingDown className="w-4 h-4" />,
    resource: <Clock className="w-4 h-4" />,
    competitive: <ShieldAlert className="w-4 h-4" />,
    timing: <Clock className="w-4 h-4" />,
    scope: <Maximize2 className="w-4 h-4" />
}

const CATEGORY_COLORS: Record<RiskCategory, string> = {
    technical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    adoption: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    market: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    resource: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    competitive: 'bg-red-500/20 text-red-400 border-red-500/30',
    timing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    scope: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
}

const SEVERITY_STYLES = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white'
}

export function PreMortemCard({ analysis, onAcknowledgeRisk }: PreMortemCardProps) {
    const [expandedRisk, setExpandedRisk] = useState<string | null>(null)

    const sortedRisks = [...analysis.risks].sort((a, b) => b.riskScore - a.riskScore)

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        Pre-Mortem Analysis
                    </CardTitle>
                    <Badge className={SEVERITY_STYLES[analysis.overallRiskLevel]}>
                        {analysis.overallRiskLevel.toUpperCase()} RISK
                    </Badge>
                </div>
                <p className="text-sm text-slate-400">{analysis.featureName}</p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Executive Summary */}
                <div className={`p-4 rounded-lg border ${analysis.recommendedProceed
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}>
                    <div className="flex items-start gap-3">
                        {analysis.recommendedProceed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className="font-medium text-white mb-1">
                                {analysis.recommendedProceed ? 'Proceed with Caution' : 'Reconsider Approach'}
                            </p>
                            <p className="text-sm text-slate-300">{analysis.executiveSummary}</p>

                            {analysis.proceedConditions && analysis.proceedConditions.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs text-slate-400 mb-1">Proceed if:</p>
                                    <ul className="text-xs text-slate-300 space-y-1">
                                        {analysis.proceedConditions.map((c, i) => (
                                            <li key={i}>• {c}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Concerns */}
                {analysis.topConcerns.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Top Concerns</h4>
                        <div className="flex flex-wrap gap-2">
                            {analysis.topConcerns.map((concern, i) => (
                                <Badge key={i} variant="outline" className="border-slate-600 text-slate-300">
                                    {concern}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Risk List */}
                <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">
                        Identified Risks ({sortedRisks.length})
                    </h4>
                    <div className="space-y-2">
                        {sortedRisks.map(risk => (
                            <div
                                key={risk.id}
                                className="border border-slate-700 rounded-lg overflow-hidden"
                            >
                                {/* Risk Header */}
                                <div
                                    className="p-3 bg-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-750"
                                    onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded ${CATEGORY_COLORS[risk.category]}`}>
                                            {CATEGORY_ICONS[risk.category]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white text-sm">{risk.title}</p>
                                            <p className="text-xs text-slate-400">
                                                {risk.category} • {(risk.riskScore * 100).toFixed(0)}% risk score
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={SEVERITY_STYLES[risk.severity]}>
                                            {risk.severity}
                                        </Badge>
                                        {expandedRisk === risk.id ? (
                                            <ChevronUp className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRisk === risk.id && (
                                    <div className="p-4 bg-slate-850 border-t border-slate-700 space-y-4">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">Failure Scenario</p>
                                            <p className="text-sm text-slate-300 italic">"{risk.failureScenario}"</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-400 mb-1">Warning Signals</p>
                                                <ul className="text-sm text-slate-300 space-y-1">
                                                    {risk.warningSignals.map((s, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            <span className="text-yellow-400">⚠</span> {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 mb-1">Mitigation Strategies</p>
                                                <ul className="text-sm text-slate-300 space-y-1">
                                                    {risk.mitigationStrategies.map((s, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            <span className="text-green-400">→</span> {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {onAcknowledgeRisk && !risk.acknowledged && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onAcknowledgeRisk(risk.id)}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                Acknowledge Risk
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Confidence */}
                <p className="text-xs text-slate-500 text-center">
                    Analysis confidence: {(analysis.confidenceScore * 100).toFixed(0)}%
                </p>
            </CardContent>
        </Card>
    )
}
