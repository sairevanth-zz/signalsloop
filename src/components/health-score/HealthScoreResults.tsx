'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthScore, HealthScoreComponent, HealthScoreAction } from '@/lib/health-score/types';
import { HealthScoreGauge } from './HealthScoreGauge';
import { HealthScoreBadge } from './HealthScoreBadge';
import {
    TrendingUp,
    AlertTriangle,
    Heart,
    Target,
    Activity,
    CheckCircle,
    AlertCircle,
    ArrowRight
} from 'lucide-react';

interface HealthScoreResultsProps {
    healthScore: HealthScore;
    shareUrl?: string;
}

const componentIcons: Record<string, React.ReactNode> = {
    'Overall Sentiment': <Activity className="w-4 h-4" />,
    'Sentiment Trend': <TrendingUp className="w-4 h-4" />,
    'Issue Resolution': <AlertTriangle className="w-4 h-4" />,
    'Feature Clarity': <Target className="w-4 h-4" />,
    'User Love': <Heart className="w-4 h-4" />,
};

const statusColors: Record<HealthScoreComponent['status'], string> = {
    excellent: 'bg-green-100 text-green-800 border-green-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
};

const statusProgressColors: Record<HealthScoreComponent['status'], string> = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
};

const urgencyBadgeColors: Record<HealthScoreAction['urgency'], string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
};

export function HealthScoreResults({ healthScore, shareUrl }: HealthScoreResultsProps) {
    const components = Object.values(healthScore.components);

    return (
        <div className="space-y-8">
            {/* Main Score Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
                    <CardContent className="p-8">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            {/* Left: Gauge */}
                            <div className="flex justify-center">
                                <HealthScoreGauge
                                    score={healthScore.score}
                                    grade={healthScore.grade}
                                    size="xl"
                                />
                            </div>

                            {/* Right: Interpretation */}
                            <div className="space-y-4">
                                {healthScore.productName && (
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {healthScore.productName}
                                    </h2>
                                )}
                                <p className="text-gray-700 leading-relaxed">
                                    {healthScore.interpretation}
                                </p>

                                {/* Quick Stats */}
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className={statusColors[healthScore.grade.color === 'green' ? 'excellent' : healthScore.grade.color === 'blue' ? 'good' : healthScore.grade.color === 'yellow' ? 'warning' : 'critical']}>
                                        {healthScore.grade.emoji} {healthScore.grade.label}
                                    </Badge>
                                    <Badge variant="outline" className="bg-gray-50">
                                        Calculated {new Date(healthScore.calculatedAt).toLocaleDateString()}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Components Breakdown */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Score Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {components.map((component, index) => (
                                <motion.div
                                    key={component.name}
                                    className="space-y-2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + index * 0.05 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">
                                                {componentIcons[component.name]}
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {component.name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ({component.weight}% weight)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">
                                                {component.score}
                                            </span>
                                            <Badge variant="outline" className={`text-xs ${statusColors[component.status]}`}>
                                                {component.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${statusProgressColors[component.status]}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${component.score}%` }}
                                            transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                                        />
                                    </div>

                                    <p className="text-sm text-gray-600">
                                        {component.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Recommended Actions */}
            {healthScore.topActions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Recommended Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {healthScore.topActions.map((action, index) => (
                                    <motion.div
                                        key={index}
                                        className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + index * 0.05 }}
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-bold text-primary">
                                                {action.priority}
                                            </span>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-900">
                                                    {action.action}
                                                </span>
                                                <Badge className={urgencyBadgeColors[action.urgency]}>
                                                    {action.urgency}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span>{action.component}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className="text-green-600 font-medium">{action.impact}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Shareable Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-primary" />
                            Share Your Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <HealthScoreBadge
                            healthScore={healthScore}
                            shareUrl={shareUrl}
                            compact
                        />
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
