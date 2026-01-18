/**
 * Dynamic SDK Endpoint
 * 
 * Serves project-specific SDK configuration
 * GET /api/sdk/[projectId] - Returns configured SDK bundle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface RouteContext {
    params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { projectId } = await context.params;

        // Validate project exists
        const supabase = getSupabaseServiceRoleClient();
        if (supabase) {
            const { data: project } = await supabase
                .from('projects')
                .select('id, name')
                .eq('id', projectId)
                .single();

            if (!project) {
                return new NextResponse('Project not found', { status: 404 });
            }
        }

        // Read the base SDK file
        const sdkPath = path.join(process.cwd(), 'public', 'sdk', 'signalsloop.js');
        let sdkContent = '';

        try {
            sdkContent = fs.readFileSync(sdkPath, 'utf-8');
        } catch (err) {
            // If file doesn't exist, return inline SDK
            sdkContent = getInlineSDK();
        }

        // Inject project-specific configuration
        const configuredSDK = `
// SignalsLoop Experiments SDK v1.0.0
// Project: ${projectId}
// Generated: ${new Date().toISOString()}

${sdkContent}

// Auto-initialize with project ID
if (typeof SignalsLoop !== 'undefined') {
  SignalsLoop.init({ projectId: '${projectId}' });
}
`;

        return new NextResponse(configuredSDK, {
            status: 200,
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('[SDK API] Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

function getInlineSDK(): string {
    return `
(function(window) {
  'use strict';
  
  const API_BASE = 'https://signalsloop.com/api';
  
  function getVisitorId() {
    const COOKIE_NAME = 'sl_visitor_id';
    let visitorId = document.cookie.split('; ').find(c => c.startsWith(COOKIE_NAME + '='))?.split('=')[1];
    if (!visitorId) {
      visitorId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      document.cookie = COOKIE_NAME + '=' + visitorId + '; path=/; max-age=31536000';
    }
    return visitorId;
  }

  const SignalsLoop = {
    projectId: null,
    visitorId: null,
    
    init: function(config) {
      this.projectId = config.projectId;
      this.visitorId = getVisitorId();
      return this;
    },
    
    getVariant: async function(experimentKey) {
      const res = await fetch(API_BASE + '/experiments/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentKey,
          visitorId: this.visitorId
        })
      });
      const data = await res.json();
      return data.variant;
    },
    
    track: function(eventName, props = {}) {
      fetch(API_BASE + '/experiments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentId: props.experimentId,
          visitorId: this.visitorId,
          eventType: props.type || 'conversion',
          eventName,
          eventValue: props.value
        })
      });
    }
  };
  
  window.SignalsLoop = SignalsLoop;
})(window);
`;
}
