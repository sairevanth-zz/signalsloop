'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TestBoardPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        
        // Create Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        console.log('🔍 Loading posts...');
        
        // Get project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', 'test-project')
          .single();
        
        if (projectError) {
          setError(`Project error: ${projectError.message}`);
          return;
        }
        
        console.log('✅ Project found:', project.name);
        
        // Get board
        const { data: board, error: boardError } = await supabase
          .from('boards')
          .select('*')
          .eq('project_id', project.id)
          .single();
        
        if (boardError) {
          setError(`Board error: ${boardError.message}`);
          return;
        }
        
        console.log('✅ Board found:', board.name);
        
        // Get posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('board_id', board.id)
          .order('created_at', { ascending: false });
        
        if (postsError) {
          setError(`Posts error: ${postsError.message}`);
          return;
        }
        
        console.log('✅ Posts loaded:', postsData?.length || 0);
        setPosts(postsData || []);
        
      } catch (error) {
        console.error('❌ Error:', error);
        setError(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadPosts();
  }, []);

  const handleVote = async (postId: string) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { error } = await supabase
        .from('votes')
        .insert({
          post_id: postId,
          ip_address: '127.0.0.1'
        });
      
      if (error) {
        console.error('Vote error:', error);
        alert(`Vote error: ${error.message}`);
      } else {
        alert('Vote recorded!');
        // Reload posts to show updated vote count
        window.location.reload();
      }
    } catch (error) {
      console.error('Vote error:', error);
      alert(`Vote error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Test Board - Loading...</h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Test Board - Error</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Test Board</h1>
        <p className="text-gray-600 mb-6">Simple test to verify database connection and voting works.</p>
        
        {posts.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            No posts found. Check the console for errors.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.description}</p>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleVote(post.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    👍 Vote
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    Status: {post.status} | Author: {post.author_email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8">
          <a 
            href="/test-project/board" 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4"
          >
            Go to Real Board
          </a>
          <a 
            href="/env-test" 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Check Environment Variables
          </a>
        </div>
      </div>
    </div>
  );
}
