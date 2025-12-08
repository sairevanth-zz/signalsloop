
import { Metadata } from 'next';
import { getSupabasePublicServerClient } from '@/lib/supabase-client';
import { RoastResults, RoastResult } from '@/components/roast-roadmap/RoastResults';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ shareToken: string }>;
}

async function getRoastSession(token: string) {
    const supabase = getSupabasePublicServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('roadmap_roast_sessions')
        .select('*')
        .eq('share_token', token)
        .single();

    if (error || !data) return null;
    return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { shareToken } = await params;
    const session = await getRoastSession(shareToken);

    if (!session) {
        return {
            title: 'Roast Not Found',
        };
    }

    const score = session.confidence_score;
    const verdict = session.verdict;

    return {
        title: `Roadmap Roast: ${score}/100 - ${verdict}`,
        description: `Check out this roadmap roast by SignalsLoop. "${session.one_liner}"`,
    };
}

export default async function SharedRoastPage({ params }: Props) {
    const { shareToken } = await params;
    const session = await getRoastSession(shareToken);

    if (!session) {
        notFound();
    }

    // Cast JSONB to RoastResult type
    const roastData: RoastResult = {
        confidence_score: session.confidence_score,
        verdict: session.verdict,
        one_liner: session.one_liner,
        score_breakdown: session.score_breakdown,
        blind_spots: session.blind_spots,
        demand_questions: session.demand_questions,
        assumption_challenges: session.assumption_challenges,
        prioritization_notes: session.prioritization_notes,
        quick_wins: session.quick_wins,
        whats_good: session.whats_good,
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Banner */}
                <div className="bg-blue-600 text-white rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Flame className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium">
                            This roadmap was roasted by AI. Want to roast yours?
                        </span>
                    </div>

                    <Link href="/demo/roast">
                        <Button variant="secondary" className="whitespace-nowrap gap-2">
                            Roast My Roadmap <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                <RoastResults roast={roastData} isPublicView={true} />

                <div className="text-center pt-8 border-t border-gray-200 dark:border-zinc-800">
                    <p className="text-gray-500 mb-4">
                        SignalsLoop helps product teams build what matters.
                    </p>
                    <Link href="https://signalsloop.com" target="_blank">
                        <span className="text-blue-600 hover:underline font-medium">
                            Learn more about SignalsLoop &rarr;
                        </span>
                    </Link>
                </div>

            </div>
        </div>
    );
}
