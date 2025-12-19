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

    // Get gift details
    const { data: gift, error } = await supabase
      .from('gift_subscriptions')
      .select('*')
      .eq('id', params.giftId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching gift details:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gift details' },
        { status: 500 }
      );
    }

    if (!gift) {
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      );
    }

    let projectName: string | undefined;
    if (gift.project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', gift.project_id)
        .maybeSingle();

      if (projectError) {
        console.error('Error fetching project for gift:', projectError);
      } else {
        projectName = project?.name ?? undefined;
      }
    }

    // Add project name to the gift object
    // Detect tier from redemption_code (GIFT-PREMIUM-xxx vs GIFT-PRO-xxx)
    const redemptionCode = gift.redemption_code || '';
    const tier: 'pro' | 'premium' = redemptionCode.includes('PREMIUM') ? 'premium' : 'pro';

    const giftWithProject = {
      ...gift,
      project_name: projectName,
      tier, // Add tier for UI to use
    };

    return NextResponse.json({ gift: giftWithProject });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
