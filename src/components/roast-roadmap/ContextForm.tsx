
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ContextData {
    industry: string;
    companyStage: string;
    teamSize: string;
}

interface ContextFormProps {
    data: ContextData;
    onChange: (data: ContextData) => void;
}

export function ContextForm({ data, onChange }: ContextFormProps) {
    const handleChange = (field: keyof ContextData, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-gray-200 dark:border-zinc-800">
            <div className="space-y-2">
                <Label>Industry (Optional)</Label>
                <Input
                    placeholder="e.g. Fintech, SaaS..."
                    value={data.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="bg-white dark:bg-zinc-950"
                />
            </div>

            <div className="space-y-2">
                <Label>Company Stage</Label>
                <Select value={data.companyStage} onValueChange={(v) => handleChange('companyStage', v)}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="early">Early Stage / Seed</SelectItem>
                        <SelectItem value="growth">Growth / Series A-C</SelectItem>
                        <SelectItem value="enterprise">Enterprise / Mature</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Team Size</Label>
                <Select value={data.teamSize} onValueChange={(v) => handleChange('teamSize', v)}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1-10">1-10 people</SelectItem>
                        <SelectItem value="11-50">11-50 people</SelectItem>
                        <SelectItem value="50-200">50-200 people</SelectItem>
                        <SelectItem value="200+">200+ people</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
