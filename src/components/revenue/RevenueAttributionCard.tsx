'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    DollarSign,
    TrendingUp,
    Users,
    Shield,
    Sparkles,
    ArrowUpRight,
    HelpCircle
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface RevenueAttributionProps {
    featureName: string
    totalRevenue: number
    directRevenue: number
    influencedRevenue: number
    retentionRevenue: number
    expansionRevenue: number
    newSaleRevenue: number
    confidence: 'high' | 'medium' | 'low'
    confidenceExplanation: string
    affectedCustomers: number
    roi?: number
    paybackMonths?: number
}

const CONFIDENCE_STYLES = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-red-500/20 text-red-400 border-red-500/30'
}

export function RevenueAttributionCard({
    featureName,
    totalRevenue,
    directRevenue,
    influencedRevenue,
    retentionRevenue,
    expansionRevenue,
    newSaleRevenue,
    confidence,
    confidenceExplanation,
    affectedCustomers,
    roi,
    paybackMonths
}: RevenueAttributionProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

    const maxSourceRevenue = Math.max(expansionRevenue, retentionRevenue, newSaleRevenue, 1)

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        Revenue Attribution
                    </CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className={`border ${CONFIDENCE_STYLES[confidence]} cursor-help`}>
                                    {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs bg-slate-800 border-slate-700">
                                <p className="text-sm">{confidenceExplanation}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <p className="text-xs text-slate-400">{featureName}</p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Total Revenue Banner */}
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Total Attributed Revenue</p>
                            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
                        </div>
                        {roi && (
                            <div className="text-right">
                                <p className="text-sm text-slate-400">ROI</p>
                                <p className={`text-2xl font-bold ${roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {roi > 0 ? '+' : ''}{(roi * 100).toFixed(0)}%
                                </p>
                            </div>
                        )}
                    </div>
                    {paybackMonths && (
                        <p className="text-xs text-slate-400 mt-2">
                            Payback period: {paybackMonths} months
                        </p>
                    )}
                </div>

                {/* Revenue Breakdown */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-400">Revenue Sources</h4>

                    {/* Expansion */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-white">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                Expansion
                            </span>
                            <span className="font-medium text-blue-400">{formatCurrency(expansionRevenue)}</span>
                        </div>
                        <Progress
                            value={(expansionRevenue / maxSourceRevenue) * 100}
                            className="h-1.5 bg-blue-900"
                        />
                    </div>

                    {/* Retention */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-white">
                                <Shield className="w-4 h-4 text-purple-400" />
                                Churn Prevention
                            </span>
                            <span className="font-medium text-purple-400">{formatCurrency(retentionRevenue)}</span>
                        </div>
                        <Progress
                            value={(retentionRevenue / maxSourceRevenue) * 100}
                            className="h-1.5 bg-purple-900"
                        />
                    </div>

                    {/* New Sales */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-white">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                New Sales
                            </span>
                            <span className="font-medium text-amber-400">{formatCurrency(newSaleRevenue)}</span>
                        </div>
                        <Progress
                            value={(newSaleRevenue / maxSourceRevenue) * 100}
                            className="h-1.5 bg-amber-900"
                        />
                    </div>
                </div>

                {/* Attribution Method */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700">
                    <div className="p-3 bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Direct Attribution</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(directRevenue)}</p>
                        <p className="text-[10px] text-slate-500">Customers mentioned feature</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Influenced Revenue</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(influencedRevenue)}</p>
                        <p className="text-[10px] text-slate-500">Temporal correlation</p>
                    </div>
                </div>

                {/* Affected Customers */}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                        <Users className="w-4 h-4 text-slate-400" />
                        Customers Impacted
                    </span>
                    <Badge variant="outline" className="border-slate-600">
                        {affectedCustomers}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * Compact summary widget for dashboard
 */
export function RevenueSummaryWidget({
    totalRevenue,
    featuresCount,
    avgRevenuePerFeature,
    topFeatureName,
    topFeatureRevenue
}: {
    totalRevenue: number
    featuresCount: number
    avgRevenuePerFeature: number
    topFeatureName?: string
    topFeatureRevenue?: number
}) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(val)

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Revenue Impact
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
                        <p className="text-xs text-slate-400">from {featuresCount} features</p>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-emerald-500/50" />
                </div>

                <div className="text-sm">
                    <span className="text-slate-400">Avg per feature: </span>
                    <span className="text-white font-medium">{formatCurrency(avgRevenuePerFeature)}</span>
                </div>

                {topFeatureName && (
                    <div className="p-2 bg-slate-800 rounded text-xs">
                        <span className="text-slate-400">Top performer: </span>
                        <span className="text-white">{topFeatureName}</span>
                        <span className="text-emerald-400 ml-1">({formatCurrency(topFeatureRevenue || 0)})</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
