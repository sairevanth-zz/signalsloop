
"use client";

import { Check, AlertTriangle, Info, HelpCircle } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface RoastSectionProps {
    title: string;
    count?: number;
    type: "blind_spots" | "demand" | "assumptions" | "good" | "quick_wins";
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function RoastSection({ title, count, type, children, defaultOpen = false }: RoastSectionProps) {
    const getIcon = () => {
        switch (type) {
            case "blind_spots": return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case "demand": return <HelpCircle className="w-5 h-5 text-yellow-500" />;
            case "assumptions": return <Info className="w-5 h-5 text-orange-500" />;
            case "good": return <Check className="w-5 h-5 text-green-500" />;
            case "quick_wins": return <Check className="w-5 h-5 text-blue-500" />;
            default: return null;
        }
    };

    const getBadgesColor = () => {
        switch (type) {
            case "blind_spots": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "demand": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "assumptions": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
            case "good": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "quick_wins": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            default: return "bg-gray-100 text-gray-700";
        }
    }

    return (
        <Accordion type="single" collapsible defaultValue={defaultOpen ? "item-1" : undefined} className="w-full mb-4">
            <AccordionItem value="item-1" className="border rounded-lg px-4 bg-white dark:bg-zinc-900 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 w-full">
                        {getIcon()}
                        <span className="font-semibold text-lg">{title}</span>
                        {count !== undefined && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium ml-2", getBadgesColor())}>
                                {count} {count === 1 ? 'item' : 'items'}
                            </span>
                        )}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                    {children}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
