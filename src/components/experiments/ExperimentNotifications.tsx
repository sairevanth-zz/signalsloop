/**
 * ExperimentNotifications Component
 * In-app notifications for experiment events
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Bell,
    Trophy,
    AlertTriangle,
    CheckCircle,
    X,
    ArrowRight,
    Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    type: 'significance' | 'anomaly' | 'completed' | 'milestone';
    title: string;
    message: string;
    experimentId?: string;
    experimentName?: string;
    isRead: boolean;
    createdAt: Date;
}

interface ExperimentNotificationsProps {
    projectId: string;
    projectSlug: string;
}

export function ExperimentNotifications({
    projectId,
    projectSlug,
}: ExperimentNotificationsProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // For now, generate mock notifications based on experiments
        // In production, this would fetch from a notifications API
        const fetchNotifications = async () => {
            try {
                const response = await fetch(`/api/experiments?projectId=${projectId}`);
                if (response.ok) {
                    const data = await response.json();

                    // Generate notifications from experiment data
                    const mockNotifications: Notification[] = [];

                    (data.experiments || []).forEach((e: { experiment: { id: string; name: string; status: string }; significant_results: number }) => {
                        if (e.significant_results > 0) {
                            mockNotifications.push({
                                id: `sig-${e.experiment.id}`,
                                type: 'significance',
                                title: 'Statistical Significance Reached',
                                message: `"${e.experiment.name}" has reached statistical significance. Time to decide!`,
                                experimentId: e.experiment.id,
                                experimentName: e.experiment.name,
                                isRead: false,
                                createdAt: new Date(Date.now() - Math.random() * 86400000 * 3),
                            });
                        }

                        if (e.experiment.status === 'completed') {
                            mockNotifications.push({
                                id: `comp-${e.experiment.id}`,
                                type: 'completed',
                                title: 'Experiment Completed',
                                message: `"${e.experiment.name}" has completed. AI extracted insights are ready.`,
                                experimentId: e.experiment.id,
                                experimentName: e.experiment.name,
                                isRead: true,
                                createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
                            });
                        }
                    });

                    // Sort by date descending
                    mockNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                    setNotifications(mockNotifications);
                    setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchNotifications();
        }
    }, [projectId]);

    const handleDismiss = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleMarkAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'significance':
                return <Trophy className="h-5 w-5 text-green-600" />;
            case 'anomaly':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-purple-600" />;
            default:
                return <Bell className="h-5 w-5 text-blue-600" />;
        }
    };

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (loading) {
        return null;
    }

    if (notifications.length === 0) {
        return null;
    }

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Experiment Notifications</h3>
                    {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                            {unreadCount} new
                        </Badge>
                    )}
                </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
                {notifications.slice(0, 5).map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-3 rounded-lg border transition-colors ${notification.isRead
                                ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            }`}
                        onClick={() => {
                            if (!notification.isRead) {
                                handleMarkAsRead(notification.id);
                            }
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getIcon(notification.type)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDismiss(notification.id);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {getTimeAgo(notification.createdAt)}
                                    </span>
                                    {notification.experimentId && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/${projectSlug}/experiments/${notification.experimentId}`);
                                            }}
                                        >
                                            View →
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
