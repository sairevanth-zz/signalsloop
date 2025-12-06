import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logAuditEvent, AuditEventTypes } from '@/lib/audit-logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function ensureSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }
}

function createSupabaseServerClient() {
  ensureSupabaseEnv();

  const cookieStore = cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing access_token or refresh_token' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('Failed to set Supabase session on server:', error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: data.user ?? null,
    });
  } catch (error) {
    console.error('Auth session POST error:', error);
    return NextResponse.json(
      { error: 'Failed to sync session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get user before signing out for audit log
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Failed to sign out Supabase session on server:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log: User logout
    if (user) {
      const forwarded = request.headers.get('x-forwarded-for');
      logAuditEvent({
        eventType: AuditEventTypes.USER_LOGOUT,
        eventCategory: 'auth',
        actorId: user.id,
        actorEmail: user.email || undefined,
        action: 'logout',
        actionStatus: 'success',
        ipAddress: forwarded ? forwarded.split(',')[0].trim() : undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(err => console.error('[AUDIT] Failed to log logout:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth session DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
