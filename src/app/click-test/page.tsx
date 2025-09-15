'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ClickTestPage() {
  const router = useRouter();
  const [clickCount, setClickCount] = useState(0);
  const [lastClicked, setLastClicked] = useState('');

  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
    setClickCount(prev => prev + 1);
    setLastClicked(cardId);
    alert(`Card ${cardId} clicked! Total clicks: ${clickCount + 1}`);
  };

  const handleNavigation = () => {
    console.log('Navigation button clicked');
    router.push('/demo/board');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Click Test Page</h1>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Click Statistics</h2>
          <p><strong>Total Clicks:</strong> {clickCount}</p>
          <p><strong>Last Clicked:</strong> {lastClicked || 'None'}</p>
        </div>

        <div className="space-y-4">
          <Card 
            className="hover:shadow-md hover:bg-blue-50 transition-all cursor-pointer border-2 hover:border-blue-200" 
            onClick={() => handleCardClick('A')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Card A</h3>
              <p className="text-gray-600">Click this card to test click handlers</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md hover:bg-green-50 transition-all cursor-pointer border-2 hover:border-green-200" 
            onClick={() => handleCardClick('B')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Card B</h3>
              <p className="text-gray-600">Click this card to test click handlers</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md hover:bg-red-50 transition-all cursor-pointer border-2 hover:border-red-200" 
            onClick={() => handleCardClick('C')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Card C</h3>
              <p className="text-gray-600">Click this card to test click handlers</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 space-x-4">
          <Button onClick={handleNavigation}>
            Navigate to Demo Board
          </Button>
          <Button asChild>
            <Link href="/demo/board">Link to Demo Board</Link>
          </Button>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        <div className="mt-6 bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click on the colored cards above</li>
            <li>You should see an alert and the statistics should update</li>
            <li>If clicking works here but not on the demo board, there's a specific issue with the demo board</li>
            <li>If clicking doesn't work here either, there's a broader JavaScript issue</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
