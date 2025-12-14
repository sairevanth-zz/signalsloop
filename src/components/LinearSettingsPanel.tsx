'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    Loader2,
    ExternalLink,
    Trash2,
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface LinearConnection {
    id: string;
    organization_id: string;
    organization_name: string;
    organization_url_key: string;
    status: string;
    created_at: string;
}

interface LinearSettingsPanelProps {
    projectId: string;
    onUpdate?: () => void;
}

export function LinearSettingsPanel({ projectId, onUpdate }: LinearSettingsPanelProps) {
    const [connection, setConnection] = useState<LinearConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);

    const isConnected = !!connection && connection.status === 'active';

    useEffect(() => {
        fetchConnection();
    }, [projectId]);

    const fetchConnection = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/integrations/linear/connections?projectId=${projectId}`);
            const data = await response.json();

            if (data.success && data.connections?.length > 0) {
                setConnection(data.connections[0]);
            } else {
                setConnection(null);
            }
        } catch (error) {
            console.error('Failed to fetch Linear connection:', error);
            setConnection(null);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        // Redirect to OAuth flow
        window.location.href = `/api/integrations/linear/connect?projectId=${projectId}`;
    };

    const handleDisconnect = async () => {
        if (!connection) return;

        try {
            setDisconnecting(true);
            const response = await fetch('/api/integrations/linear/connections', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connectionId: connection.id }),
            });

            if (response.ok) {
                setConnection(null);
                onUpdate?.();
            }
        } catch (error) {
            console.error('Failed to disconnect Linear:', error);
        } finally {
            setDisconnecting(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="text-indigo-500">◆</span>
                    Linear Connection
                </CardTitle>
                <CardDescription>
                    Connect your Linear workspace to sync issues and get @signalsloop mentions
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isConnected ? (
                    <div className="space-y-4">
                        <Alert>
                            <AlertDescription>
                                Connect your Linear workspace to enable @signalsloop mentions in issue comments
                                and automatic status sync between Linear and SignalsLoop.
                            </AlertDescription>
                        </Alert>
                        <Button
                            onClick={handleConnect}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                        >
                            <span className="mr-2">◆</span>
                            Connect to Linear
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Connection Info */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="default" className="bg-green-500">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Connected
                                    </Badge>
                                    <span className="text-sm font-medium">
                                        {connection.organization_name}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Connected on {formatDate(connection.created_at)}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`https://linear.app/${connection.organization_url_key}`, '_blank')}
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open Linear
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Disconnect
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Disconnect Linear?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will disconnect your Linear integration. You won't receive
                                                @signalsloop mentions or status sync until you reconnect.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDisconnect}
                                                disabled={disconnecting}
                                                className="bg-destructive text-destructive-foreground"
                                            >
                                                {disconnecting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Disconnecting...
                                                    </>
                                                ) : (
                                                    'Disconnect'
                                                )}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        {/* Features Info */}
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2">Features Enabled</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• @signalsloop mentions in Linear comments</li>
                                <li>• Automatic status sync (Linear → SignalsLoop)</li>
                                <li>• Search feedback from Linear issues</li>
                            </ul>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
