import React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProductInputFormProps {
    userProduct: string;
    setUserProduct: (val: string) => void;
    competitors: string[];
    setCompetitors: (vals: string[]) => void;
}

export function ProductInputForm({
    userProduct,
    setUserProduct,
    competitors,
    setCompetitors
}: ProductInputFormProps) {
    const addCompetitor = () => {
        if (competitors.length < 3) {
            setCompetitors([...competitors, '']);
        }
    };

    const removeCompetitor = (index: number) => {
        const newCompetitors = [...competitors];
        newCompetitors.splice(index, 1);
        setCompetitors(newCompetitors);
    };

    const updateCompetitor = (index: number, val: string) => {
        const newCompetitors = [...competitors];
        newCompetitors[index] = val;
        setCompetitors(newCompetitors);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="userProduct" className="text-base font-semibold">Your Product / Main Subject</Label>
                <Input
                    id="userProduct"
                    placeholder="e.g. Linear, Slack, Notion"
                    value={userProduct}
                    onChange={(e) => setUserProduct(e.target.value)}
                    className="text-lg py-6"
                />
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold">Competitors (Recommended 1-3)</Label>
                {competitors.map((comp, idx) => (
                    <div key={idx} className="flex gap-2">
                        <Input
                            placeholder={`Competitor ${idx + 1}`}
                            value={comp}
                            onChange={(e) => updateCompetitor(idx, e.target.value)}
                        />
                        {competitors.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeCompetitor(idx)}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}

                {competitors.length < 3 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCompetitor}
                        className="mt-2"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Competitor
                    </Button>
                )}
            </div>
        </div>
    );
}
