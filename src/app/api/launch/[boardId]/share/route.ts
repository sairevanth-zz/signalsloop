/**
 * Share API Route
 * Generate and manage public share links for launch boards
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ boardId: string }> }
) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { boardId } = await params;

        // Generate share token
        const shareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

        // Update board with share token
        const { data: board, error } = await supabase
            .from('launch_boards')
            .update({
                share_token: shareToken,
                is_public: true,
            })
            .eq('id', boardId)
            .select()
            .single();

        if (error || !board) {
            console.error('Error creating share link:', error);
            return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
        }

        // Construct share URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com';
        const shareUrl = `${baseUrl}/share/launch/${shareToken}`;

        return NextResponse.json({
            shareUrl,
            shareToken,
        });
    } catch (error) {
        console.error('Share API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ boardId: string }> }
) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { boardId } = await params;

        // Remove share token
        const { error } = await supabase
            .from('launch_boards')
            .update({
                share_token: null,
                is_public: false,
            })
            .eq('id', boardId);

        if (error) {
            console.error('Error removing share link:', error);
            return NextResponse.json({ error: 'Failed to remove share link' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Share API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
