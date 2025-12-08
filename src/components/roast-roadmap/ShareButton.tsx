
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
    shareToken: string;
}

export function ShareButton({ shareToken }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const url = `${window.location.origin}/demo/roast/${shareToken}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
            onClick={handleCopy}
        >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Share Roast"}
        </Button>
    );
}
