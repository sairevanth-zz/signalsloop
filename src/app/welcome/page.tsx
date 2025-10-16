'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  Plus,
  ArrowRight,
  User,
  Calendar,
  Sparkles,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

function WelcomePageContent() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile(user?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      // Pre-fill with existing name or derive from email
      const defaultName = profile.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
      setNameInput(defaultName);

      // Show name editor if:
      // 1. User doesn't have a custom name set
      // 2. OR force=true query parameter is present (for testing)
      const forceEdit = searchParams.get('force') === 'true';
      if (!profile.name || forceEdit) {
        setIsEditingName(true);
      }
    }
  }, [profile, user, searchParams]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsSavingName(true);
    try {
      await updateProfile({ name: nameInput.trim() });
      toast.success('Name saved successfully!');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error saving name:', error);
      toast.error('Failed to save name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSkipName = () => {
    setIsEditingName(false);
  };

  const createFirstProject = async () => {
    setIsCreating(true);
    try {
      // Redirect to project creation
      router.push('/app/create');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const goToDashboard = () => {
    router.push('/app');
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <CheckCircle className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to SignalsLoop! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your account has been created successfully. Let's get you started.
          </p>
          <div className="flex items-center justify-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-gray-600">{user.email}</span>
            <Badge variant="outline" className="ml-2">
              <Calendar className="h-3 w-3 mr-1" />
              Just joined
            </Badge>
          </div>
        </div>

        {/* Name Customization Section */}
        {isEditingName && (
          <Card className="mb-8 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Edit2 className="h-5 w-5 text-blue-600" />
                What should we call you?
              </CardTitle>
              <CardDescription>
                {profile?.name
                  ? `We found your name as "${displayName}". You can change it if you'd like.`
                  : "Let us know your preferred name for a personalized experience."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName();
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveName}
                      disabled={isSavingName || !nameInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingName ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSkipName}
                      disabled={isSavingName}
                    >
                      Skip for now
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Don't worry, you can always change this later in your profile settings.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Get up and running in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span className="text-sm font-medium text-blue-600">1</span>
                  </div>
                  <span className="text-gray-700">Create your first project</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-sm font-medium text-green-600">2</span>
                  </div>
                  <span className="text-gray-700">Customize your feedback board</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <span className="text-sm font-medium text-purple-600">3</span>
                  </div>
                  <span className="text-gray-700">Share with your team</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                What's Next?
              </CardTitle>
              <CardDescription>
                Your account is ready to go
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Account created</span>
                </div>
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Email verified</span>
                </div>
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Ready to create projects</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={createFirstProject}
              disabled={isCreating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Create Your First Project
                </>
              )}
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={goToDashboard}
              className="flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            You can always create projects later from your dashboard
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            What you can do with SignalsLoop
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Collect Feedback</h3>
                <p className="text-sm text-gray-600">
                  Create beautiful feedback boards to collect user input
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Insights</h3>
                <p className="text-sm text-gray-600">
                  Get AI-powered categorization and insights from feedback
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                  <ArrowRight className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Share & Collaborate</h3>
                <p className="text-sm text-gray-600">
                  Share boards with your team and collaborate on improvements
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WelcomePageContent />
    </Suspense>
  );
}
