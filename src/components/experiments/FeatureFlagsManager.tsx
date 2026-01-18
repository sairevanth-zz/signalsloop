/**
 * Feature Flags Management Component
 * 
 * UI for creating, managing, and toggling feature flags
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
    Flag,
    Plus,
    Settings,
    Trash2,
    Users,
    Percent,
    Code,
    Copy,
    Check,
    Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface FeatureFlag {
    id: string;
    name: string;
    key: string;
    description: string;
    flag_type: 'boolean' | 'string' | 'number' | 'json';
    default_value: string;
    is_enabled: boolean;
    rollout_percentage: number;
    targeting_rules: unknown[];
    tags: string[];
    created_at: string;
}

interface Props {
    projectId: string;
}

export function FeatureFlagsManager({ projectId }: Props) {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // New flag form state
    const [newFlag, setNewFlag] = useState({
        name: '',
        key: '',
        description: '',
        flagType: 'boolean',
        defaultValue: false,
        rolloutPercentage: 100,
    });

    useEffect(() => {
        fetchFlags();
    }, [projectId]);

    const fetchFlags = async () => {
        try {
            const response = await fetch(`/api/feature-flags?projectId=${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch flags');
            const data = await response.json();
            setFlags(data.flags || []);
        } catch (error) {
            console.error('Error fetching flags:', error);
            toast.error('Failed to load feature flags');
        } finally {
            setLoading(false);
        }
    };

    const createFlag = async () => {
        if (!newFlag.name || !newFlag.key) {
            toast.error('Name and key are required');
            return;
        }

        try {
            const response = await fetch('/api/feature-flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    ...newFlag,
                }),
            });

            if (!response.ok) throw new Error('Failed to create flag');

            toast.success('Feature flag created!');
            setShowCreateModal(false);
            setNewFlag({
                name: '',
                key: '',
                description: '',
                flagType: 'boolean',
                defaultValue: false,
                rolloutPercentage: 100,
            });
            fetchFlags();
        } catch (error) {
            console.error('Error creating flag:', error);
            toast.error('Failed to create feature flag');
        }
    };

    const toggleFlag = async (flagId: string, isEnabled: boolean) => {
        try {
            const response = await fetch(`/api/feature-flags/${flagId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled }),
            });

            if (!response.ok) throw new Error('Failed to update flag');

            setFlags(prev =>
                prev.map(f => (f.id === flagId ? { ...f, is_enabled: isEnabled } : f))
            );
            toast.success(isEnabled ? 'Flag enabled' : 'Flag disabled');
        } catch (error) {
            console.error('Error toggling flag:', error);
            toast.error('Failed to update flag');
        }
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const filteredFlags = flags.filter(
        flag =>
            flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-pulse text-muted-foreground">Loading feature flags...</div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search flags..."
                            className="pl-9 w-64"
                        />
                    </div>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Flag
                </Button>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-semibold mb-4">Create Feature Flag</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="flagName">Flag Name</Label>
                            <Input
                                id="flagName"
                                value={newFlag.name}
                                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                                placeholder="e.g., Dark Mode"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="flagKey">Flag Key</Label>
                            <Input
                                id="flagKey"
                                value={newFlag.key}
                                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                placeholder="e.g., dark_mode"
                                className="mt-1 font-mono"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="flagDescription">Description</Label>
                            <Input
                                id="flagDescription"
                                value={newFlag.description}
                                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                                placeholder="What does this flag control?"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Flag Type</Label>
                            <select
                                value={newFlag.flagType}
                                onChange={(e) => setNewFlag({ ...newFlag, flagType: e.target.value })}
                                className="w-full mt-1 p-2 border rounded-md bg-background"
                            >
                                <option value="boolean">Boolean (on/off)</option>
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>
                        <div>
                            <Label>Rollout Percentage: {newFlag.rolloutPercentage}%</Label>
                            <Slider
                                value={[newFlag.rolloutPercentage]}
                                onValueChange={([v]) => setNewFlag({ ...newFlag, rolloutPercentage: v })}
                                min={0}
                                max={100}
                                step={5}
                                className="mt-3"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={createFlag}>
                            Create Flag
                        </Button>
                    </div>
                </Card>
            )}

            {/* Flags List */}
            {filteredFlags.length === 0 ? (
                <Card className="p-8 text-center">
                    <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Feature Flags</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Create your first feature flag to start rolling out features safely.
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Flag
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredFlags.map((flag) => (
                        <Card key={flag.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-semibold">{flag.name}</h4>
                                        <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                                            {flag.is_enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                        {flag.rollout_percentage < 100 && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Percent className="h-3 w-3" />
                                                {flag.rollout_percentage}%
                                            </Badge>
                                        )}
                                        {flag.targeting_rules?.length > 0 && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Targeting
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <code className="bg-muted px-2 py-0.5 rounded text-xs">{flag.key}</code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => copyKey(flag.key)}
                                        >
                                            {copiedKey === flag.key ? (
                                                <Check className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </Button>
                                        {flag.description && (
                                            <span className="ml-2">{flag.description}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={flag.is_enabled}
                                        onCheckedChange={(checked) => toggleFlag(flag.id, checked)}
                                    />
                                    <Button variant="ghost" size="sm">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* SDK Usage */}
            <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-3">
                    <Code className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium">SDK Usage</h4>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {`// Check if a feature is enabled
const isEnabled = await SignalsLoop.isFeatureEnabled('your_flag_key');

// Get feature value (for non-boolean flags)
const value = await SignalsLoop.getFeatureValue('your_flag_key');

// With user attributes for targeting
const isEnabled = await SignalsLoop.isFeatureEnabled('your_flag_key', {
  plan: 'premium',
  country: 'US'
});`}
                </pre>
            </Card>
        </div>
    );
}
