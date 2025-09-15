'use client';

import React, { useState, useEffect } from 'react';

export default function JSTestPage() {
  const [message, setMessage] = useState('Initial message');
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('🔍 JavaScript is working!');
    setMessage('JavaScript is working! ✅');
  }, []);

  const handleClick = () => {
    setCount(count + 1);
    setMessage(`Button clicked ${count + 1} times!`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">JavaScript Test Page</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-100 p-4 rounded">
          <p><strong>Status:</strong> {message}</p>
        </div>
        
        <div className="bg-green-100 p-4 rounded">
          <p><strong>Count:</strong> {count}</p>
          <button 
            onClick={handleClick}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2"
          >
            Click Me
          </button>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded">
          <p>If you can see this page and the button works, JavaScript is functioning properly.</p>
        </div>
      </div>
    </div>
  );
}
