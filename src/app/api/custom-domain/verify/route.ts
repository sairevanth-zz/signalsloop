import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
import { promisify } from 'util';

const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

const resolveTxt = promisify(dns.resolveTxt);

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get project domain info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        custom_domain,
        domain_verification_token,
        domain_verification_method,
        domain_status
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.custom_domain || !project.domain_verification_token) {
      return NextResponse.json({ error: 'No domain set for verification' }, { status: 400 });
    }

    try {
      // Verify TXT record
      const txtRecords = await resolveTxt(project.custom_domain);
      const expectedRecord = `signalsloop-verification=${project.domain_verification_token}`;
      
      const foundRecord = txtRecords.some(record => 
        record.some(txt => txt.includes(expectedRecord))
      );

      if (foundRecord) {
        // Update project as verified
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            domain_verified: true,
            domain_status: 'verified',
            domain_verified_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (updateError) {
          console.error('Error updating project:', updateError);
          return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
        }

        // Update verification record
        await supabase
          .from('domain_verifications')
          .update({
            status: 'verified',
            verified_at: new Date().toISOString(),
            attempts: supabase.sql`attempts + 1`,
            last_attempt_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('domain', project.custom_domain);

        return NextResponse.json({
          verified: true,
          message: 'Domain verified successfully!'
        });
      } else {
        // Update verification record with failure
        await supabase
          .from('domain_verifications')
          .update({
            status: 'failed',
            attempts: supabase.sql`attempts + 1`,
            last_attempt_at: new Date().toISOString(),
            error_message: 'TXT record not found or incorrect'
          })
          .eq('project_id', projectId)
          .eq('domain', project.custom_domain);

        // Update project status
        await supabase
          .from('projects')
          .update({
            domain_status: 'failed'
          })
          .eq('id', projectId);

        return NextResponse.json({
          verified: false,
          error: 'TXT record not found. Please ensure you have added the correct DNS record and wait for propagation.'
        });
      }
    } catch (dnsError) {
      console.error('DNS verification error:', dnsError);
      
      // Update verification record with error
      await supabase
        .from('domain_verifications')
        .update({
          attempts: supabase.sql`attempts + 1`,
          last_attempt_at: new Date().toISOString(),
          error_message: dnsError instanceof Error ? dnsError.message : 'DNS lookup failed'
        })
        .eq('project_id', projectId)
        .eq('domain', project.custom_domain);

      return NextResponse.json({
        verified: false,
        error: 'DNS lookup failed. Please check your domain and try again later.'
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
