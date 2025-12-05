/**
 * API: Spec Quality Score
 * Evaluate spec quality and provide improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { specQualityScorer } from '@/lib/specs/quality-scorer';
import type { SpecTemplate } from '@/types/specs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { specId, content, template, title, action } = body;
    
    // Get spec content from database if specId provided
    let specContent = content;
    let specTitle = title || 'Untitled Spec';
    let specTemplate: SpecTemplate = template || 'standard';
    
    if (specId && !content) {
      const { data: spec, error } = await supabase
        .from('specs')
        .select('*')
        .eq('id', specId)
        .single();
      
      if (error || !spec) {
        return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
      }
      
      specContent = spec.content;
      specTitle = spec.title;
      specTemplate = spec.template || 'standard';
    }
    
    if (!specContent) {
      return NextResponse.json({ error: 'Spec content required' }, { status: 400 });
    }
    
    switch (action) {
      case 'evaluate':
      default: {
        const result = await specQualityScorer.evaluateSpec(
          specContent,
          specTemplate,
          specTitle
        );
        
        // Store quality score in database if specId provided
        if (specId) {
          await supabase
            .from('specs')
            .update({
              quality_score: result.overallScore,
              quality_grade: result.grade,
              quality_evaluated_at: new Date().toISOString(),
              quality_issues_count: result.issues.length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', specId);
        }
        
        return NextResponse.json(result);
      }
      
      case 'autofix': {
        const { issueId, issue } = body;
        
        if (!issue) {
          return NextResponse.json({ error: 'Issue details required' }, { status: 400 });
        }
        
        const result = await specQualityScorer.autoFix(
          specContent,
          issue,
          specTemplate
        );
        
        return NextResponse.json(result);
      }
      
      case 'improve': {
        const improvedContent = await specQualityScorer.generateImprovements(
          specContent,
          specTemplate
        );
        
        return NextResponse.json({ improvedContent });
      }
    }
    
  } catch (error) {
    console.error('[API] Spec quality error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate spec quality' },
      { status: 500 }
    );
  }
}
