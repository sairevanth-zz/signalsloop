'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function DebugPage() {
  const [status, setStatus] = useState('Loading...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Check environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        console.log('Environment variables:', { supabaseUrl, supabaseKey });
        
        if (!supabaseUrl || !supabaseKey) {
          setStatus('❌ Missing environment variables');
          return;
        }
        
        setStatus('✅ Environment variables found');
        
        // Create client
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test project fetch
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', 'test-project')
          .single();
        
        if (projectError) {
          setStatus(`❌ Project Error: ${projectError.message}`);
          console.error('Project error:', projectError);
          return;
        }
        
        setStatus(`✅ Project found: ${project.name}`);
        
        // Test posts fetch
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            vote_count:votes(count),
            comment_count:comments(count)
          `)
          .eq('project_id', project.id);
        
        if (postsError) {
          setStatus(`❌ Posts Error: ${postsError.message}`);
          console.error('Posts error:', postsError);
          return;
        }
        
        setStatus(`✅ Found ${postsData.length} posts`);
        setPosts(postsData || []);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setStatus(`❌ Error: ${errorMessage}`);
        console.error('Debug error:', error);
      }
    };
    
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">SignalSloop Debug Page</h1>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Status:</h2>
          <p>{status}</p>
        </div>
        
        {posts.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Posts ({posts.length}):</h2>
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border p-4 rounded">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <p className="text-gray-600 mt-2">{post.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span>Status: {post.status}</span> | 
                    <span> Author: {post.author_email}</span> | 
                    <span> Votes: {post.vote_count?.[0]?.count || 0}</span> | 
                    <span> Comments: {post.comment_count?.[0]?.count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <Link 
            href="/test-project/board" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Real Board Page
          </Link>
        </div>
      </div>
    </div>
  );
}
