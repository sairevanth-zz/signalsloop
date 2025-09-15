'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function DemoSimplePage() {
  const [voteCount, setVoteCount] = useState(127);
  const [userVoted, setUserVoted] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleVote = () => {
    if (userVoted) {
      setVoteCount(prev => prev - 1);
      setUserVoted(false);
    } else {
      setVoteCount(prev => prev + 1);
      setUserVoted(true);
    }
  };

  const handlePostClick = () => {
    setClickCount(prev => prev + 1);
    alert(`Post clicked! Count: ${clickCount + 1}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Simple Demo Test</h1>
              <p className="text-gray-600 mt-1">Testing JavaScript functionality</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/">← Back to Home</Link>
              </Button>
              <Button asChild>
                <Link href="/demo/board">Full Demo Board</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">JavaScript Test Results</h2>
          <div className="space-y-2">
            <p><strong>Vote Count:</strong> {voteCount}</p>
            <p><strong>User Voted:</strong> {userVoted ? 'Yes' : 'No'}</p>
            <p><strong>Post Clicks:</strong> {clickCount}</p>
          </div>
        </div>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handlePostClick}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Dark mode support</h3>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    done
                  </Badge>
                </div>
                <p className="text-gray-600 mb-3">
                  Add a dark mode toggle to the application. Many users have requested this feature.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <span>Sarah Chen</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Jan 15, 2024</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>23 comments</span>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleVote}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors ${
                    userVoted 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <svg className="w-4 h-4 mb-1" fill={userVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                  </svg>
                  <span className="font-medium text-sm">{voteCount}</span>
                  {userVoted && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <span>Voted</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            If the vote button and post click work above, JavaScript is functioning properly.
          </p>
          <div className="mt-4 space-x-4">
            <Button asChild>
              <Link href="/test-project/board">Test Real Board</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/js-test">Advanced JS Test</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
