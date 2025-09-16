'use client';

import React, { useState } from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import { MobileLayout } from '@/components/ui/mobile-layout';

export default function AdminTestPage() {
  const [projectSlug, setProjectSlug] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  const handleShowDashboard = () => {
    if (projectSlug.trim()) {
      setShowDashboard(true);
    }
  };

  const handleNotification = (message: string, type: 'success' | 'error' | 'info') => {
    console.log(`Notification [${type}]:`, message);
    // You could add toast notifications here if needed
  };

  if (showDashboard) {
    return (
      <MobileLayout title="Admin Dashboard" showNavigation={true}>
        <div className="p-4 bg-blue-50 border-b rounded-lg mb-6">
          <button 
            onClick={() => setShowDashboard(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
          >
            ← Back to Setup
          </button>
          <div className="text-blue-800 text-sm">
            Testing Admin Dashboard for project: <strong>{projectSlug}</strong>
          </div>
        </div>
        <AdminDashboard 
          projectSlug={projectSlug} 
          onShowNotification={handleNotification}
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Admin Test" showNavigation={true}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
            🧪 Admin Dashboard Test
          </h1>
          
          <div className="mb-6">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4">
              Test AI Analytics Features
            </h2>
            <p className="text-gray-600 mb-4">
              Enter a project slug to test the admin dashboard with AI analytics. 
              The dashboard will show:
            </p>
            
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2 text-sm lg:text-base">
              <li><strong>AI Stats Cards:</strong> Total AI categorized posts, time saved, top category, success rate</li>
              <li><strong>Interactive Charts:</strong> Pie chart and bar chart showing category breakdown</li>
              <li><strong>Analytics Tracking:</strong> Console logs showing PostHog-ready events</li>
              <li><strong>Real-time Data:</strong> Live data from your Supabase database</li>
            </ul>
          </div>

          <div className="mb-6">
            <label htmlFor="projectSlug" className="block text-sm font-medium text-gray-700 mb-2">
              Project Slug
            </label>
            <input
              type="text"
              id="projectSlug"
              value={projectSlug}
              onChange={(e) => setProjectSlug(e.target.value)}
              placeholder="e.g., my-test-project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the slug of an existing project in your database
            </p>
          </div>

          <button
            onClick={handleShowDashboard}
            disabled={!projectSlug.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            🚀 Launch Admin Dashboard
          </button>

          <div className="mt-6 lg:mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">📋 Prerequisites:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Make sure you have a Supabase database set up</li>
              <li>• The project slug must exist in your database</li>
              <li>• Some posts with AI categorization data will make the charts more interesting</li>
              <li>• Check the browser console for analytics events</li>
            </ul>
          </div>

          <div className="mt-4 lg:mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🎯 What to Test:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• AI Insights section with stats cards</li>
              <li>• Interactive pie chart showing category breakdown</li>
              <li>• Bar chart showing posts by category</li>
              <li>• Analytics events in browser console</li>
              <li>• Responsive design on different screen sizes</li>
            </ul>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
