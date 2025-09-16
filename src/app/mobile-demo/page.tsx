'use client';

import { MobileLayout } from '@/components/ui/mobile-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MobileDemoPage() {
  return (
    <MobileLayout title="Mobile Demo" showNavigation={true}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            📱 Mobile-Responsive Layout
          </h1>
          <p className="text-gray-600">
            This page demonstrates the mobile-responsive layout component
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                📱 Mobile Header
              </CardTitle>
              <CardDescription>
                Responsive header with hamburger menu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                On mobile devices, you'll see a hamburger menu that opens a slide-out navigation panel.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                💻 Desktop Sidebar
              </CardTitle>
              <CardDescription>
                Fixed sidebar for desktop screens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                On desktop (lg and above), you'll see a fixed sidebar with navigation links.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                🎨 Responsive Content
              </CardTitle>
              <CardDescription>
                Content adapts to screen size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                The main content area automatically adjusts padding based on navigation visibility.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🚀 How to Use</CardTitle>
            <CardDescription>
              Wrap your page content with the MobileLayout component
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
{`import { MobileLayout } from '@/components/ui/mobile-layout';

export default function MyPage() {
  return (
    <MobileLayout title="Page Title" showNavigation={true}>
      <div>
        {/* Your page content here */}
      </div>
    </MobileLayout>
  );
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1">
            Primary Action
          </Button>
          <Button variant="outline" className="flex-1">
            Secondary Action
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>📋 Props</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>children:</strong> React.ReactNode - Your page content
              </div>
              <div>
                <strong>title:</strong> string - Page title shown in mobile header
              </div>
              <div>
                <strong>showNavigation:</strong> boolean (default: true) - Whether to show navigation
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
