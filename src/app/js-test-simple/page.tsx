'use client';

import React, { useState } from 'react';

export default function JSTestSimplePage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Initial message');

  const handleClick = () => {
    setCount(prev => prev + 1);
    setMessage(`Button clicked ${count + 1} times!`);
    console.log('Button clicked, count:', count + 1);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple JavaScript Test</h1>
      <div className="space-y-4">
        <div className="bg-blue-100 p-4 rounded">
          <p><strong>Count:</strong> {count}</p>
          <p><strong>Message:</strong> {message}</p>
        </div>
        <button
          onClick={handleClick}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Click Me to Test JavaScript
        </button>
        <div className="bg-green-100 p-4 rounded">
          <p>If this button works and the count updates, JavaScript is functioning properly.</p>
        </div>
      </div>
    </div>
  );
}
