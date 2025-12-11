'use client';

/**
 * Mission Control Page
 * 
 * Theme-aware with support for light and dark modes
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme-provider';
import { getSupabaseClient } from '@/lib/supabase-client';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Brain, Sparkles, Target, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
}

function ProjectSelector() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  // Theme-aware color palette
  const colors = {
    bg: isDark ? '#0d1117' : '#f8fafc',
    cardBg: isDark ? '#1e2530' : '#ffffff',
    textPrimary: isDark ? '#e6edf3' : '#1e293b',
    textSecondary: isDark ? '#8b949e' : '#64748b',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    if (!user?.email) return '';
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  useEffect(() => {
    async function loadProjects() {
      if (!supabase || !user) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [supabase, user]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, transition: 'background-color 0.3s ease' }}>
      <GlobalBanner />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* AI Greeting Section */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#14b8a6',
              boxShadow: '0 0 10px #14b8a6'
            }} />
            <span style={{ fontSize: '14px', color: '#14b8a6', fontWeight: 500 }}>AI Ready</span>
          </div>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 300,
            color: colors.textPrimary,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em'
          }}>
            {getGreeting()}, {getUserName()}!
          </h1>
          <p style={{ fontSize: '18px', color: colors.textSecondary, margin: 0 }}>
            Which project would you like to check on today?
          </p>
        </div>

        {/* Feature Cards - with glows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '48px' }}>
          {/* AI-Powered Briefings */}
          <div style={{
            backgroundColor: colors.cardBg,
            padding: '24px',
            borderRadius: '16px',
            border: '2px solid rgba(20, 184, 166, 0.5)',
            boxShadow: isDark ? '0 0 60px rgba(20, 184, 166, 0.25), inset 0 0 40px rgba(20, 184, 166, 0.08)' : '0 0 30px rgba(20, 184, 166, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <Sparkles style={{ width: '32px', height: '32px', color: '#14b8a6', marginBottom: '12px' }} />
            <h3 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>AI-Powered Briefings</h3>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Get executive summaries and actionable insights powered by GPT-4
            </p>
          </div>

          {/* Real-Time Sentiment */}
          <div style={{
            backgroundColor: colors.cardBg,
            padding: '24px',
            borderRadius: '16px',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            boxShadow: isDark ? '0 0 60px rgba(16, 185, 129, 0.25), inset 0 0 40px rgba(16, 185, 129, 0.08)' : '0 0 30px rgba(16, 185, 129, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <TrendingUp style={{ width: '32px', height: '32px', color: '#10b981', marginBottom: '12px' }} />
            <h3 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>Real-Time Sentiment</h3>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Track customer sentiment and feedback velocity in real-time
            </p>
          </div>

          {/* Priority Insights */}
          <div style={{
            backgroundColor: colors.cardBg,
            padding: '24px',
            borderRadius: '16px',
            border: '2px solid rgba(251, 191, 36, 0.5)',
            boxShadow: isDark ? '0 0 60px rgba(251, 191, 36, 0.25), inset 0 0 40px rgba(251, 191, 36, 0.08)' : '0 0 30px rgba(251, 191, 36, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <Target style={{ width: '32px', height: '32px', color: '#fbbf24', marginBottom: '12px' }} />
            <h3 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>Priority Insights</h3>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Understand what matters most to your customers right now
            </p>
          </div>
        </div>

        {/* Project Selection Card */}
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          padding: '24px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Brain style={{ width: '20px', height: '20px', color: '#14b8a6' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Select a Project</h2>
            </div>
            <p style={{ fontSize: '14px', color: '#8b949e', margin: 0 }}>
              Choose a project to view its Mission Control dashboard
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: '#8b949e' }}>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: '#8b949e', marginBottom: '16px' }}>No projects found</p>
              <Button asChild style={{ backgroundColor: '#14b8a6' }}>
                <Link href="/app/create">Create Your First Project</Link>
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/${project.slug}/dashboard`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: '#161b22',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#14b8a6';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(20, 184, 166, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                      {project.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6e7681', margin: 0 }}>/{project.slug}</p>
                  </div>
                  <ArrowRight style={{ width: '20px', height: '20px', color: '#6e7681' }} />
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Button
              variant="outline"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: '#9ca3af',
                backgroundColor: 'transparent'
              }}
              onClick={() => {
                sessionStorage.setItem('skipMissionControlRedirect', 'true');
                router.push('/app');
              }}
            >
              View All Projects
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionControlContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <GlobalBanner />
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: '#8b949e' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <GlobalBanner />
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <Brain style={{ width: '64px', height: '64px', color: '#14b8a6', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '40px', fontWeight: 300, color: '#e6edf3', marginBottom: '16px' }}>Mission Control</h1>
          <p style={{ fontSize: '18px', color: '#8b949e', marginBottom: '32px' }}>
            AI-powered executive dashboard with real-time insights
          </p>
          <Button asChild size="lg" style={{
            backgroundColor: '#14b8a6',
            boxShadow: '0 8px 30px rgba(20, 184, 166, 0.4)'
          }}>
            <Link href="/login">Sign In to Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ProjectSelector />;
}

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
          <GlobalBanner />
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#8b949e' }}>Loading...</p>
          </div>
        </div>
      }
    >
      <MissionControlContent />
    </Suspense>
  );
}
