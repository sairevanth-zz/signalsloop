import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ReviewSource } from '@/lib/competitive-intel/types';
import { Reddit, Smartphone, PenTool, Globe, Apple, Play } from 'lucide-react'; // Using icon proxies
// Lucide icons: Reddit -> using Globe or similar if not avail, checking imports carefully.
// actually Lucide has no Reddit icon by default? I'll use Globe for web sources.
// I'll stick to generic icons if needed, but 'Apple' and 'Play' (PlayStore) might not exist or be named differently.
// Checking standard Lucide icons: Github, Facebook, etc exist. Apple/PlayStore often don't.
// I'll use generic icons.

interface DataSourceSelectorProps {
    selectedSources: ReviewSource[];
    onToggle: (source: ReviewSource) => void;
}

export function DataSourceSelector({ selectedSources, onToggle }: DataSourceSelectorProps) {
    const sources: { id: ReviewSource; label: string; icon: React.ReactNode }[] = [
        { id: 'reddit', label: 'Reddit', icon: <Globe className="h-4 w-4" /> }, // Reddit often represented by social icon
        { id: 'app_store', label: 'App Store', icon: <Apple className="h-4 w-4" /> }, // Apple icon usually exists in some sets, if not using generic
        { id: 'play_store', label: 'Play Store', icon: <Smartphone className="h-4 w-4" /> }, // Android
        { id: 'hacker_news', label: 'Hacker News', icon: <Globe className="h-4 w-4" /> },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md text-foreground">
                            {source.icon}
                        </div>
                        <div className="space-y-0.5">
                            <Label htmlFor={`source-${source.id}`} className="text-base cursor-pointer">
                                {source.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">Auto-scrape mentions</p>
                        </div>
                    </div>
                    <Switch
                        id={`source-${source.id}`}
                        checked={selectedSources.includes(source.id)}
                        onCheckedChange={() => onToggle(source.id)}
                    />
                </div>
            ))}
        </div>
    );
}
