import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch all discount codes
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data: codes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount codes:', error);
      return NextResponse.json({ error: 'Failed to fetch discount codes', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes: codes || [] });
  } catch (error) {
    console.error('Admin discount codes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new discount code
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_amount,
      max_discount,
      usage_limit,
      valid_until,
      target_email
    } = body;

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('discount_codes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existingCode) {
      return NextResponse.json({ error: 'Discount code already exists' }, { status: 400 });
    }

    const { data: newCode, error } = await supabase
      .from('discount_codes')
      .insert({
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value: parseFloat(discount_value),
        min_amount: min_amount ? parseFloat(min_amount) : 0,
        max_discount: max_discount ? parseFloat(max_discount) : null,
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        valid_from: new Date().toISOString(),
        valid_until: valid_until || null,
        target_email: target_email || null,
        is_active: true,
        usage_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating discount code:', error);
      return NextResponse.json({ error: 'Failed to create discount code', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: newCode, message: 'Discount code created successfully' });
  } catch (error) {
    console.error('Admin create discount code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a discount code
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Discount code ID required' }, { status: 400 });
    }

    if (action === 'toggle') {
      // Toggle active status
      const { data: currentCode } = await supabase
        .from('discount_codes')
        .select('is_active')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !currentCode?.is_active })
        .eq('id', id);

      if (error) {
        console.error('Error toggling discount code:', error);
        return NextResponse.json({ error: 'Failed to toggle discount code', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Discount code toggled successfully' });
    }

    // Update discount code
    const { error } = await supabase
      .from('discount_codes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating discount code:', error);
      return NextResponse.json({ error: 'Failed to update discount code', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Discount code updated successfully' });
  } catch (error) {
    console.error('Admin update discount code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a discount code
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Discount code ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting discount code:', error);
      return NextResponse.json({ error: 'Failed to delete discount code', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Discount code deleted successfully' });
  } catch (error) {
    console.error('Admin delete discount code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

