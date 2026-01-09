'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Globe, Target, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Internal tracking components
import { CompetitiveOverview } from './CompetitiveOverview';
import { CompetitiveAdminPanel } from './CompetitiveAdminPanel';
import { CompetitiveUsagePanel } from './CompetitiveUsagePanel';

// External monitoring components
import { CompetitorMonitoringSetup } from './CompetitorMonitoringSetup';
import { ExternalReviewsPanel } from './ExternalReviewsPanel';
import { StrengthsWeaknessesGrid } from './StrengthsWeaknessesGrid';

interface HybridCompetitiveDashboardProps {
  projectId: string;
  slug?: string;
  onCompetitorClick?: (competitorId: string) => void;
  onFeatureGapClick?: (gapId: string) => void;
  onRecommendationClick?: (recommendationId: string) => void;
}

export function HybridCompetitiveDashboard({
  projectId,
  slug,
  onCompetitorClick,
  onFeatureGapClick,
  onRecommendationClick,
}: HybridCompetitiveDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('internal');
  const [selectedExternalProduct, setSelectedExternalProduct] = useState<string | null>(null);
  const [externalProducts, setExternalProducts] = useState<any[]>([]);

  // Load external products when switching to external tab
  useEffect(() => {
    if (activeTab === 'external') {
      loadExternalProducts();
    }
  }, [activeTab, projectId]);

  async function loadExternalProducts() {
    try {
      const res = await fetch(`/api/competitive/external/products?projectId=${projectId}`);
      const result = await res.json();
      if (result.success) {
        setExternalProducts(result.products);
        if (result.products.length > 0 && !selectedExternalProduct) {
          setSelectedExternalProduct(result.products[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading external products:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Usage Panel - Shows tier limits */}
      <CompetitiveUsagePanel
        projectId={projectId}
        slug={slug}
        onRefresh={() => setRefreshKey(prev => prev + 1)}
      />

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Hybrid Competitive Intelligence</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>Internal Mentions:</strong> Track competitors mentioned in YOUR feedback - understand why users switch to/from you.
              <br />
              <strong>External Reviews:</strong> Monitor competitor reviews on G2, Capterra, TrustRadius - identify their strengths, weaknesses, and feature gaps.
            </p>
          </div>
        </div>
      </Card>

      {/* Hybrid Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Internal Mentions</span>
            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
              From Your Feedback
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>External Reviews</span>
            <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
              G2 / Capterra / TrustRadius
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Internal Mentions Tab */}
        <TabsContent value="internal" className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Internal Competitor Tracking</h3>
            <p className="text-sm text-gray-600 mb-6">
              Competitors mentioned in your feedback. This helps you understand why users choose you over competitors (or vice versa).
            </p>
          </div>

          {/* Admin Panel */}
          <CompetitiveAdminPanel
            projectId={projectId}
            onDataExtracted={() => setRefreshKey(prev => prev + 1)}
          />

          {/* Overview Dashboard */}
          <CompetitiveOverview
            key={refreshKey}
            projectId={projectId}
            onCompetitorClick={onCompetitorClick}
            onFeatureGapClick={onFeatureGapClick}
            onRecommendationClick={onRecommendationClick}
          />
        </TabsContent>

        {/* External Reviews Tab */}
        <TabsContent value="external" className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">External Competitor Monitoring</h3>
            <p className="text-sm text-gray-600 mb-6">
              Monitor up to 5 competitor products on review platforms. Identify their strengths, weaknesses, and opportunities for your product.
            </p>
          </div>

          {/* Monitoring Setup */}
          <CompetitorMonitoringSetup
            projectId={projectId}
            existingProducts={externalProducts}
            onProductAdded={() => {
              // Reload external products
              loadExternalProducts();
            }}
          />

          {/* External Product Analysis */}
          {selectedExternalProduct && (
            <Tabs defaultValue="strengths-weaknesses" className="space-y-4">
              <TabsList>
                <TabsTrigger value="strengths-weaknesses">Strengths & Weaknesses</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="strengths-weaknesses">
                <StrengthsWeaknessesGrid
                  competitorProductId={selectedExternalProduct}
                  projectId={projectId}
                />
              </TabsContent>

              <TabsContent value="reviews">
                <ExternalReviewsPanel
                  competitorProductId={selectedExternalProduct}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Empty State */}
          {externalProducts.length === 0 && !selectedExternalProduct && (
            <Card className="p-12 text-center border-dashed">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Start Monitoring Competitors</h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Add competitor products to track their reviews, identify their strengths and weaknesses, and discover opportunities.
              </p>
              <p className="text-sm text-gray-500">
                Use the "Add Competitor" button above to get started
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
