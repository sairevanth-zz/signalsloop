'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Network,
    Lightbulb,
    Link2,
    ArrowRight,
    Target,
    AlertTriangle
} from 'lucide-react'
import type { ThemeNetwork, ThemeCorrelation, CorrelationInsight } from '@/types/theme-correlation'

interface ThemeCorrelationProps {
    network: ThemeNetwork
    correlations: ThemeCorrelation[]
    insights: CorrelationInsight[]
}

const INSIGHT_ICONS = {
    cluster: Link2,
    driver: Target,
    effect: ArrowRight,
    opposing: AlertTriangle
}

const INSIGHT_COLORS = {
    cluster: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    driver: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    effect: 'bg-green-500/10 border-green-500/20 text-green-400',
    opposing: 'bg-orange-500/10 border-orange-500/20 text-orange-400'
}

export function ThemeCorrelationView({
    network,
    correlations,
    insights
}: ThemeCorrelationProps) {
    return (
        <div className="space-y-6">
            {/* Network Visualization Placeholder */}
            <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        Theme Relationship Network
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Simple node-edge representation */}
                    <div className="relative h-[300px] bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-wrap gap-2 p-4 justify-center max-w-lg">
                                {network.nodes.slice(0, 10).map((node, i) => {
                                    const size = Math.min(100, Math.max(40, node.frequency / 2));
                                    const connectedEdges = network.edges.filter(
                                        e => e.source === node.id || e.target === node.id
                                    );
                                    return (
                                        <div
                                            key={node.id}
                                            className={`
                        flex items-center justify-center rounded-full
                        border-2 text-xs font-medium text-center p-2
                        transition-transform hover:scale-110 cursor-pointer
                        ${node.sentiment > 0.2 ? 'border-green-400 bg-green-500/20' :
                                                    node.sentiment < -0.2 ? 'border-red-400 bg-red-500/20' :
                                                        'border-slate-400 bg-slate-500/20'}
                      `}
                                            style={{
                                                width: size,
                                                height: size,
                                                minWidth: size
                                            }}
                                            title={`${node.name}\n${node.frequency} mentions\n${connectedEdges.length} connections`}
                                        >
                                            <span className="line-clamp-2 text-white text-[10px]">
                                                {node.name.split(' ').slice(0, 2).join(' ')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                            {network.nodes.length} themes • {network.edges.length} connections
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Insights */}
            {insights.length > 0 && (
                <Card className="border-slate-700 bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-400" />
                            Correlation Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {insights.map((insight, i) => {
                            const Icon = INSIGHT_ICONS[insight.type];
                            return (
                                <div
                                    key={i}
                                    className={`p-4 rounded-lg border ${INSIGHT_COLORS[insight.type]}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                                            <p className="text-sm text-slate-300">{insight.description}</p>
                                            {insight.suggestedAction && (
                                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                    <ArrowRight className="w-3 h-3" />
                                                    {insight.suggestedAction}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Top Correlations */}
            <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-emerald-400" />
                        Strongest Correlations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {correlations.slice(0, 8).map((corr, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Badge
                                    variant="outline"
                                    className={`text-xs flex-shrink-0 ${corr.correlationType === 'positive' ? 'border-green-500 text-green-400' :
                                            corr.correlationType === 'negative' ? 'border-red-500 text-red-400' :
                                                'border-slate-500 text-slate-400'
                                        }`}
                                >
                                    {(corr.correlationScore * 100).toFixed(0)}%
                                </Badge>
                                <span className="text-sm text-white truncate">{corr.themeName1}</span>
                                <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="text-sm text-white truncate">{corr.themeName2}</span>
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                {corr.coOccurrences} co-mentions
                            </span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

/**
 * Compact widget for dashboard
 */
export function CorrelationSummaryWidget({
    totalCorrelations,
    strongCorrelations,
    insightsCount,
    topCorrelation
}: {
    totalCorrelations: number
    strongCorrelations: number
    insightsCount: number
    topCorrelation?: { theme1: string; theme2: string; score: number }
}) {
    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Theme Relationships
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p className="text-2xl font-bold text-white">{totalCorrelations}</p>
                        <p className="text-xs text-slate-400">Correlations</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-400">{strongCorrelations}</p>
                        <p className="text-xs text-slate-400">Strong</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-yellow-400">{insightsCount}</p>
                        <p className="text-xs text-slate-400">Insights</p>
                    </div>
                </div>

                {topCorrelation && (
                    <div className="p-2 bg-slate-800 rounded text-xs">
                        <span className="text-slate-400">Top link: </span>
                        <span className="text-white">{topCorrelation.theme1}</span>
                        <span className="text-slate-400"> ↔ </span>
                        <span className="text-white">{topCorrelation.theme2}</span>
                        <Badge className="ml-2 bg-blue-600 text-white text-[10px]">
                            {(topCorrelation.score * 100).toFixed(0)}%
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
