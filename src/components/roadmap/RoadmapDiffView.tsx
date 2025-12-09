'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TrendingUp, TrendingDown, Minus, GitCompare } from 'lucide-react'

interface PriorityChange {
    suggestionId: string
    themeName: string
    oldPriority: string
    oldScore: number
    newPriority: string
    newScore: number
    reasoning: string
}

const PRIORITY_ORDER = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 }

const PRIORITY_COLORS: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-orange-500 text-white',
    'P2': 'bg-yellow-500 text-black',
    'P3': 'bg-blue-500 text-white'
}

function getChangeIcon(oldP: string, newP: string) {
    const oldOrder = PRIORITY_ORDER[oldP as keyof typeof PRIORITY_ORDER] ?? 2
    const newOrder = PRIORITY_ORDER[newP as keyof typeof PRIORITY_ORDER] ?? 2
    const diff = oldOrder - newOrder

    if (diff > 0) return <TrendingUp className="w-4 h-4 text-green-400" />
    if (diff < 0) return <TrendingDown className="w-4 h-4 text-red-400" />
    return <Minus className="w-4 h-4 text-slate-400" />
}

function getChangeLabel(oldP: string, newP: string): { text: string; color: string } {
    const oldOrder = PRIORITY_ORDER[oldP as keyof typeof PRIORITY_ORDER] ?? 2
    const newOrder = PRIORITY_ORDER[newP as keyof typeof PRIORITY_ORDER] ?? 2
    const diff = oldOrder - newOrder

    if (diff > 0) return { text: 'Priority Increased', color: 'text-green-400' }
    if (diff < 0) return { text: 'Priority Decreased', color: 'text-red-400' }
    return { text: 'No Change', color: 'text-slate-400' }
}

export function RoadmapDiffView({
    changes,
    title = 'Proposed Priority Changes'
}: {
    changes: PriorityChange[]
    title?: string
}) {
    if (!changes || changes.length === 0) {
        return (
            <Card className="border-slate-700 bg-slate-900">
                <CardContent className="py-8 text-center">
                    <GitCompare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">No changes proposed</p>
                </CardContent>
            </Card>
        )
    }

    // Group changes by direction
    const increased = changes.filter(c =>
        (PRIORITY_ORDER[c.oldPriority as keyof typeof PRIORITY_ORDER] ?? 2) >
        (PRIORITY_ORDER[c.newPriority as keyof typeof PRIORITY_ORDER] ?? 2)
    )
    const decreased = changes.filter(c =>
        (PRIORITY_ORDER[c.oldPriority as keyof typeof PRIORITY_ORDER] ?? 2) <
        (PRIORITY_ORDER[c.newPriority as keyof typeof PRIORITY_ORDER] ?? 2)
    )

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-blue-400" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4 text-sm">
                    {increased.length > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                            <TrendingUp className="w-4 h-4" />
                            {increased.length} moving up
                        </div>
                    )}
                    {decreased.length > 0 && (
                        <div className="flex items-center gap-1 text-red-400">
                            <TrendingDown className="w-4 h-4" />
                            {decreased.length} moving down
                        </div>
                    )}
                </div>

                {/* Changes list */}
                <div className="space-y-2">
                    {changes.map((change, i) => {
                        const changeInfo = getChangeLabel(change.oldPriority, change.newPriority)

                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {getChangeIcon(change.oldPriority, change.newPriority)}
                                    <div className="min-w-0">
                                        <p className="font-medium text-white truncate">{change.themeName}</p>
                                        <p className="text-xs text-slate-400 truncate">{change.reasoning}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                    {/* Old priority */}
                                    <div className="text-center">
                                        <Badge className={`${PRIORITY_COLORS[change.oldPriority]} font-mono`}>
                                            {change.oldPriority}
                                        </Badge>
                                        <p className="text-[10px] text-slate-500 mt-1">{change.oldScore.toFixed(0)}</p>
                                    </div>

                                    <ArrowRight className="w-4 h-4 text-slate-500" />

                                    {/* New priority */}
                                    <div className="text-center">
                                        <Badge className={`${PRIORITY_COLORS[change.newPriority]} font-mono`}>
                                            {change.newPriority}
                                        </Badge>
                                        <p className="text-[10px] text-slate-500 mt-1">{change.newScore.toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
