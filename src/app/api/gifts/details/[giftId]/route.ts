import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get gift details with project name
    const { data: gift, error } = await supabase
      .from('gift_subscriptions')
      .select(`
        *,
        projects!inner(name)
      `)
      .eq('id', params.giftId)
      .single();

    if (error) {
      console.error('Error fetching gift details:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Gift not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch gift details' },
        { status: 500 }
      );
    }

    // Add project name to the gift object
    const giftWithProject = {
      ...gift,
      project_name: gift.projects?.name,
    };

    // Remove the projects object from the response
    delete giftWithProject.projects;

    return NextResponse.json({ gift: giftWithProject });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
