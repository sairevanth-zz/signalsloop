'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Loader2, 
  FolderPlus, 
  MessageSquare,
  Rocket,
  Home
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface ProjectData {
  name: string;
  slug: string;
  boardName: string;
}

export default function ProjectWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = getSupabaseClient();
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    slug: '',
    boardName: 'Feedback Board'
  });

  // Handle template parameter
  useEffect(() => {
    const template = searchParams.get('template');
    if (template) {
      const templateConfigs = {
        saas: { name: 'My SaaS Product', boardName: 'Feature Requests & Bug Reports' },
        mobile: { name: 'My Mobile App', boardName: 'App Feedback & Feature Requests' },
        website: { name: 'My Website', boardName: 'Website Feedback & Improvements' },
        community: { name: 'My Community Project', boardName: 'Community Feedback Board' }
      };
      
      const config = templateConfigs[template as keyof typeof templateConfigs];
      if (config) {
        setProjectData(prev => ({
          ...prev,
          name: config.name,
          boardName: config.boardName
        }));
      }
    }
  }, [searchParams]);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Auto-generate slug from project name with user context
  const generateSlug = async (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40); // Leave room for user suffix

    if (!supabase) return baseSlug;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // For authenticated users, add user context to make slug unique
        const userSlug = user.email?.split('@')[0] || user.id.substring(0, 8);
        const fullSlug = `${baseSlug}-${userSlug}`;
        return fullSlug.substring(0, 50);
      } else {
        // For anonymous users, add random suffix
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fullSlug = `${baseSlug}-${randomSuffix}`;
        return fullSlug.substring(0, 50);
      }
    } catch {
      // Fallback if anything fails
      return baseSlug;
    }
  };

  const handleNameChange = async (name: string) => {
    const slug = await generateSlug(name);
    setProjectData(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  const validateSlug = (slug: string) => {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 50;
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || !supabase) return false;
    
    try {
      // Check global uniqueness (slugs are now generated to be unique)
      const { data } = await supabase
        .from('projects')
        .select('slug')
        .eq('slug', slug)
        .single();
      
      return !data; // true if slug is available
    } catch {
      return true; // assume available if check fails
    }
  };

  const createProject = async () => {
    if (!supabase) {
      setError('Database connection not available. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get current user (optional for anonymous creation)
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User session:', user ? 'logged in' : 'anonymous');

      // Check board limits for authenticated users
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          const userPlan = userData.plan || 'free';
          
          // Check existing project count for free users
          if (userPlan === 'free') {
            const { data: existingProjects, error: countError } = await supabase
              .from('projects')
              .select('id', { count: 'exact' })
              .eq('owner_id', user.id);

            if (!countError && existingProjects && existingProjects.length >= 1) {
              setError('Free accounts are limited to 1 project. Upgrade to Pro to create unlimited projects.');
              setIsLoading(false);
              return;
            }
          }
        }
      }

      // Check slug availability one more time
      const isAvailable = await checkSlugAvailability(projectData.slug);
      if (!isAvailable) {
        throw new Error('This project name is already taken. Please choose a different one.');
      }

      // Create project
      const projectDataToInsert = {
        name: projectData.name,
        slug: projectData.slug,
        owner_id: user?.id || null // Allow null for anonymous users
      };
      console.log('Creating project:', projectDataToInsert);
      
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectDataToInsert)
        .select()
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        throw projectError;
      }
      console.log('Project created successfully:', project);

      // Create default board
      console.log('Creating board:', { project_id: project.id, name: projectData.boardName });
      const { error: boardError } = await supabase
        .from('boards')
        .insert({
          project_id: project.id,
          name: projectData.boardName
        });

      if (boardError) {
        console.error('Board creation error:', boardError);
        throw boardError;
      }
      console.log('Board created successfully');

      // Add user as project owner in members table (only if logged in)
      if (user) {
        console.log('Creating member:', { project_id: project.id, user_id: user.id, role: 'owner' });
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            project_id: project.id,
            user_id: user.id,
            role: 'owner'
          });

        if (memberError) {
          console.error('Member creation error:', memberError);
          throw memberError;
        }
        console.log('Member created successfully');
      } else {
        console.log('Anonymous user - skipping member creation');
      }

      // Generate API key for widget embedding
      console.log('Creating API key for project:', project.id);
      const apiKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { error: apiKeyError } = await supabase
        .from('api_keys')
        .insert({
          project_id: project.id,
          name: 'Default Widget Key',
          key_hash: btoa(apiKey),
          usage_count: 0
        });

      if (apiKeyError) {
        console.error('API key creation error:', apiKeyError);
        // Don't throw error - project creation should still succeed
      } else {
        console.log('API key created successfully');
      }

      // Success! Redirect to dashboard with cache-busting to show the new project
      console.log('Project created successfully, redirecting to dashboard...');
      router.push('/app?refresh=' + Date.now());
      
    } catch (err) {
      console.error('Project creation error:', err);
      setError((err as Error).message || 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep1 = projectData.name.trim().length >= 3;
  const canProceedFromStep2 = validateSlug(projectData.slug);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => router.push('/app')}
              className="flex items-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SignalsLoop</span>
            </div>
            
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your feedback board</h1>
          <p className="text-gray-600">Let&apos;s set up your project in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-gray-600">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            {currentStep === 1 && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderPlus className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>What&apos;s your project name?</CardTitle>
                <CardDescription>
                  This will be the main title for your feedback board
                </CardDescription>
              </>
            )}
            
            {currentStep === 2 && (
              <>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Choose your board name</CardTitle>
                <CardDescription>
                  This will be the name of your main feedback board
                </CardDescription>
              </>
            )}
            
            {currentStep === 3 && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Ready to launch!</CardTitle>
                <CardDescription>
                  Review your settings and create your feedback board
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Project Name */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <Input
                    id="projectName"
                    value={projectData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      handleNameChange(name);
                    }}
                    placeholder="e.g., My Awesome App"
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be displayed as the main title of your feedback board
                  </p>
                </div>
                
                {projectData.name && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Your board URL will be:</p>
                    <p className="font-mono text-sm bg-white p-2 rounded border">
                      signalsloop.com/<span className="text-blue-600">{projectData.slug || 'your-project'}</span>/board
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Board Name */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="boardName" className="block text-sm font-medium text-gray-700 mb-2">
                    Board Name
                  </label>
                  <Input
                    id="boardName"
                    value={projectData.boardName}
                    onChange={(e) => setProjectData(prev => ({ ...prev, boardName: e.target.value }))}
                    placeholder="e.g., General, Feature Requests, Bug Reports"
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can create additional boards later in your project settings
                  </p>
                </div>
                
                <div>
                  <label htmlFor="projectSlug" className="block text-sm font-medium text-gray-700 mb-2">
                    Project URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 font-mono">signalsloop.com/</span>
                    <Input
                      id="projectSlug"
                      value={projectData.slug}
                      onChange={(e) => setProjectData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="my-awesome-app"
                      className="font-mono flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Letters, numbers, and hyphens only. Must be 3-50 characters. 
                    <br />
                    <span className="text-blue-600">Your URL is automatically made unique by adding your username.</span>
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Project Name</h3>
                    <p className="text-gray-600">{projectData.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Board Name</h3>
                    <p className="text-gray-600">{projectData.boardName}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Public URL</h3>
                    <p className="text-blue-600 font-mono text-sm">
                      signalsloop.com/{projectData.slug}/board
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your feedback board will be created and ready to use</li>
                    <li>• You&apos;ll get a 2-line widget code to embed anywhere</li>
                    <li>• Users can start submitting feedback immediately</li>
                    <li>• You&apos;ll have full admin controls to moderate posts</li>
                  </ul>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={currentStep === 1 ? 'invisible' : ''}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !canProceedFromStep1) ||
                    (currentStep === 2 && !canProceedFromStep2)
                  }
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={createProject}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            Need help? <Link href="/support" className="text-blue-600 hover:underline">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}