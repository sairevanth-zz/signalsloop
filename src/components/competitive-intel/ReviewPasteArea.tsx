import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

interface ReviewPasteAreaProps {
    products: string[];
    onAddReviews: (product: string, text: string) => Promise<void>;
}

export function ReviewPasteArea({ products, onAddReviews }: ReviewPasteAreaProps) {
    const [selectedProduct, setSelectedProduct] = useState<string>(products[0] || '');
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedProduct || !text.trim()) return;

        setIsSubmitting(true);
        await onAddReviews(selectedProduct, text);
        setText('');
        setIsSubmitting(false);
    };

    const validProducts = products.filter(p => p.trim().length > 0);

    return (
        <div className="space-y-4 border rounded-lg p-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <Label>Paste Reviews for:</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                        {validProducts.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Textarea
                placeholder="Paste text from G2, Capterra, Reddit threads, or blog comments..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
            />

            <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={!text.trim() || !selectedProduct || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Reviews
                </Button>
            </div>
        </div>
    );
}
