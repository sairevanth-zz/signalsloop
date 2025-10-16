import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client with the user's session
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the name from request body
    const { name } = await request.json();

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required and must be a string' }, { status: 400 });
    }

    // Sanitize and validate name length
    const sanitizedName = name.trim();
    if (sanitizedName.length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    if (sanitizedName.length > 255) {
      return NextResponse.json({ error: 'Name must be less than 255 characters' }, { status: 400 });
    }

    // Update the user's name in the users table
    const { data, error } = await supabase
      .from('users')
      .update({ name: sanitizedName })
      .eq('id', user.id)
      .select('id, email, name, plan')
      .single();

    if (error) {
      console.error('Error updating user name:', error);
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Unexpected error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
