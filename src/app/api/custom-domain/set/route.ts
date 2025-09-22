import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

export async function POST(request: NextRequest) {
  try {
    const { projectId, domain } = await request.json();

    if (!projectId || !domain) {
      return NextResponse.json({ error: 'Project ID and domain are required' }, { status: 400 });
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Check if domain is already in use
    const supabase = getSupabaseClient();
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('custom_domain', domain)
      .neq('id', projectId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking domain:', checkError);
      return NextResponse.json({ error: 'Failed to check domain availability' }, { status: 500 });
    }

    if (existingProject) {
      return NextResponse.json({ error: 'Domain is already in use' }, { status: 409 });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update project with new domain
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        custom_domain: domain,
        domain_verified: false,
        domain_verification_token: verificationToken,
        domain_verification_method: 'dns_txt',
        domain_status: 'pending',
        domain_verified_at: null
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({ error: 'Failed to set domain' }, { status: 500 });
    }

    // Create domain verification record
    const { error: verificationError } = await supabase
      .from('domain_verifications')
      .insert({
        project_id: projectId,
        domain: domain,
        verification_token: verificationToken,
        verification_method: 'dns_txt',
        status: 'pending',
        verification_data: {
          txt_record: `signalsloop-verification=${verificationToken}`,
          cname_record: `${domain} CNAME signalsloop.vercel.app`
        }
      });

    if (verificationError) {
      console.error('Error creating verification record:', verificationError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      domain: domain,
      verification_token: verificationToken,
      message: 'Domain set successfully. Please verify it using DNS records.'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
