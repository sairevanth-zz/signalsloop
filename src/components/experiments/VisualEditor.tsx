/**
 * Visual Editor Component
 * 
 * Provides a point-and-click interface for creating experiment variants.
 * Uses postMessage to communicate with injected script in iframe.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    MousePointer,
    Type,
    Palette,
    Eye,
    EyeOff,
    Save,
    Trash2,
    Plus,
    X,
    ExternalLink,
    AlertCircle,
    Loader2,
} from 'lucide-react';

interface ElementChange {
    id: string;
    selector: string;
    originalValue: string;
    newValue: string;
    changeType: 'text' | 'style' | 'class' | 'attribute' | 'visibility';
    property?: string;
}

interface Props {
    experimentId: string;
    variantKey: string;
    targetUrl: string;
    onSave: (changes: ElementChange[]) => void;
    onCancel: () => void;
}

export function VisualEditor({ experimentId, variantKey, targetUrl, onSave, onCancel }: Props) {
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedElement, setSelectedElement] = useState<{ selector: string; textContent: string } | null>(null);
    const [changes, setChanges] = useState<ElementChange[]>([]);
    const [editorReady, setEditorReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Current edit state
    const [editMode, setEditMode] = useState<'text' | 'style' | 'visibility'>('text');
    const [textValue, setTextValue] = useState('');
    const [styleProperty, setStyleProperty] = useState('backgroundColor');
    const [styleValue, setStyleValue] = useState('');

    // Listen for messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, selector, textContent } = event.data;

            switch (type) {
                case 'SL_EDITOR_READY':
                    setEditorReady(true);
                    setLoading(false);
                    setError(null);
                    break;

                case 'SL_ELEMENT_SELECTED':
                    setSelectedElement({ selector, textContent: textContent || '' });
                    setTextValue(textContent || '');
                    setIsSelecting(false);
                    break;

                case 'SL_PONG':
                    // Editor is responding
                    setEditorReady(true);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle iframe load
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const handleLoad = () => {
            // Try to ping the injected script
            setTimeout(() => {
                iframe.contentWindow?.postMessage({ type: 'SL_PING' }, '*');
            }, 500);

            // Set timeout for editor not responding
            setTimeout(() => {
                if (!editorReady) {
                    setLoading(false);
                    setError('Could not connect to page. Make sure the SignalsLoop extension is installed and enabled.');
                }
            }, 3000);
        };

        iframe.addEventListener('load', handleLoad);
        return () => iframe.removeEventListener('load', handleLoad);
    }, [editorReady]);

    // Start selecting mode
    const startSelecting = () => {
        setIsSelecting(true);
        iframeRef.current?.contentWindow?.postMessage({ type: 'SL_START_SELECTING' }, '*');
    };

    // Stop selecting mode
    const stopSelecting = () => {
        setIsSelecting(false);
        iframeRef.current?.contentWindow?.postMessage({ type: 'SL_STOP_SELECTING' }, '*');
    };

    // Apply a change
    const applyChange = (change: ElementChange) => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'SL_APPLY_CHANGE',
            data: change
        }, '*');
    };

    // Add a new change
    const addChange = () => {
        if (!selectedElement) return;

        let change: ElementChange | null = null;

        switch (editMode) {
            case 'text':
                change = {
                    id: Date.now().toString(),
                    selector: selectedElement.selector,
                    originalValue: selectedElement.textContent,
                    newValue: textValue,
                    changeType: 'text',
                };
                break;
            case 'style':
                change = {
                    id: Date.now().toString(),
                    selector: selectedElement.selector,
                    originalValue: '',
                    newValue: styleValue,
                    changeType: 'style',
                    property: styleProperty,
                };
                break;
            case 'visibility':
                change = {
                    id: Date.now().toString(),
                    selector: selectedElement.selector,
                    originalValue: 'visible',
                    newValue: 'hidden',
                    changeType: 'visibility',
                };
                break;
        }

        if (change) {
            setChanges(prev => [...prev, change!]);
            applyChange(change);
        }
    };

    // Remove a change
    const removeChange = (changeId: string) => {
        setChanges(prev => prev.filter(c => c.id !== changeId));
    };

    // Style property options
    const styleProperties = [
        { value: 'backgroundColor', label: 'Background Color' },
        { value: 'color', label: 'Text Color' },
        { value: 'fontSize', label: 'Font Size' },
        { value: 'fontWeight', label: 'Font Weight' },
        { value: 'padding', label: 'Padding' },
        { value: 'margin', label: 'Margin' },
        { value: 'borderRadius', label: 'Border Radius' },
    ];

    return (
        <div className="flex h-[80vh] gap-4">
            {/* Sidebar */}
            <div className="w-80 flex flex-col gap-4">
                {/* Toolbar */}
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Visual Editor</h3>
                        <Badge variant="secondary">{variantKey}</Badge>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center gap-2 text-muted-foreground mb-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading page...</span>
                        </div>
                    )}

                    {editorReady && (
                        <>
                            <div className="flex gap-2 mb-4">
                                <Button
                                    variant={isSelecting ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={isSelecting ? stopSelecting : startSelecting}
                                    className="flex-1"
                                >
                                    <MousePointer className="h-4 w-4 mr-2" />
                                    {isSelecting ? 'Selecting...' : 'Select Element'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => iframeRef.current?.contentWindow?.location.reload()}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </div>

                            {selectedElement && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                                    <p className="text-xs text-muted-foreground mb-1">Selected Element</p>
                                    <code className="text-xs break-all">{selectedElement.selector}</code>
                                </div>
                            )}

                            {/* Edit Controls */}
                            {selectedElement && (
                                <Tabs value={editMode} onValueChange={(v) => setEditMode(v as typeof editMode)}>
                                    <TabsList className="w-full mb-4">
                                        <TabsTrigger value="text" className="flex-1">
                                            <Type className="h-4 w-4 mr-1" />
                                            Text
                                        </TabsTrigger>
                                        <TabsTrigger value="style" className="flex-1">
                                            <Palette className="h-4 w-4 mr-1" />
                                            Style
                                        </TabsTrigger>
                                        <TabsTrigger value="visibility" className="flex-1">
                                            <EyeOff className="h-4 w-4 mr-1" />
                                            Hide
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="text" className="space-y-3">
                                        <div>
                                            <Label htmlFor="textValue">New Text</Label>
                                            <Input
                                                id="textValue"
                                                value={textValue}
                                                onChange={(e) => setTextValue(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button onClick={addChange} className="w-full" size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Apply Text Change
                                        </Button>
                                    </TabsContent>

                                    <TabsContent value="style" className="space-y-3">
                                        <div>
                                            <Label htmlFor="styleProperty">Property</Label>
                                            <select
                                                id="styleProperty"
                                                value={styleProperty}
                                                onChange={(e) => setStyleProperty(e.target.value)}
                                                className="w-full mt-1 p-2 border rounded-md bg-background"
                                            >
                                                {styleProperties.map(({ value, label }) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label htmlFor="styleValue">Value</Label>
                                            <Input
                                                id="styleValue"
                                                value={styleValue}
                                                onChange={(e) => setStyleValue(e.target.value)}
                                                placeholder={styleProperty === 'backgroundColor' ? '#3b82f6' : ''}
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button onClick={addChange} className="w-full" size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Apply Style Change
                                        </Button>
                                    </TabsContent>

                                    <TabsContent value="visibility" className="space-y-3">
                                        <p className="text-sm text-muted-foreground">
                                            Hide this element in the treatment variant.
                                        </p>
                                        <Button onClick={addChange} className="w-full" size="sm">
                                            <EyeOff className="h-4 w-4 mr-2" />
                                            Hide Element
                                        </Button>
                                    </TabsContent>
                                </Tabs>
                            )}
                        </>
                    )}
                </Card>

                {/* Changes List */}
                <Card className="p-4 flex-1 overflow-auto">
                    <h4 className="font-semibold mb-3">Changes ({changes.length})</h4>
                    {changes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No changes yet. Select an element to start editing.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {changes.map((change) => (
                                <div
                                    key={change.id}
                                    className="p-2 bg-muted rounded-lg flex items-start justify-between"
                                >
                                    <div className="flex-1 min-w-0">
                                        <Badge variant="secondary" className="text-xs mb-1">
                                            {change.changeType}
                                        </Badge>
                                        <p className="text-xs truncate">{change.selector}</p>
                                        <p className="text-xs text-muted-foreground">
                                            → {change.newValue.substring(0, 30)}
                                            {change.newValue.length > 30 && '...'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeChange(change.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel} className="flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={() => onSave(changes)} className="flex-1" disabled={changes.length === 0}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Preview Frame */}
            <Card className="flex-1 overflow-hidden">
                <div className="h-10 bg-muted flex items-center px-4 gap-2 border-b">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 bg-background rounded px-3 py-1 text-sm text-muted-foreground">
                        {targetUrl}
                    </div>
                    <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </a>
                </div>
                <iframe
                    ref={iframeRef}
                    src={targetUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms"
                />
            </Card>
        </div>
    );
}
