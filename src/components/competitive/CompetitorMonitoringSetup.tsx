'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Monitor, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorProduct {
  id: string;
  product_name: string;
  company_name: string;
  platforms: string[];
  is_active: boolean;
  monitoring_enabled: boolean;
  g2_url?: string;
  capterra_url?: string;
  trustradius_url?: string;
  total_reviews?: number;
  avg_rating?: number;
  last_synced_at?: string;
}

interface CompetitorMonitoringSetupProps {
  projectId: string;
  existingProducts?: CompetitorProduct[];
  onProductAdded?: () => void;
}

export function CompetitorMonitoringSetup({
  projectId,
  existingProducts = [],
  onProductAdded,
}: CompetitorMonitoringSetupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    company_name: '',
    g2_url: '',
    capterra_url: '',
    trustradius_url: '',
    platforms: [] as string[],
  });

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_name || !formData.company_name) {
      toast.error('Product name and company name are required');
      return;
    }

    if (formData.platforms.length === 0) {
      toast.error('Select at least one platform to monitor');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch('/api/competitive/external/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          project_id: projectId,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Added ${formData.product_name} for monitoring`);
        setIsOpen(false);
        setFormData({
          product_name: '',
          company_name: '',
          g2_url: '',
          capterra_url: '',
          trustradius_url: '',
          platforms: [],
        });
        if (onProductAdded) onProductAdded();
      } else {
        toast.error(result.error || 'Failed to add competitor product');
      }
    } catch (error) {
      console.error('Error adding competitor product:', error);
      toast.error('Failed to add competitor product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">External Monitoring</h3>
          <p className="text-sm text-gray-600">
            Track up to 5 competitor products on G2, Capterra, and TrustRadius
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button disabled={existingProducts.length >= 5}>
              <Plus className="w-4 h-4 mr-2" />
              Add Competitor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Competitor Product to Monitor</DialogTitle>
              <DialogDescription>
                Configure which competitor product to track on external review platforms
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="e.g., Jira"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="e.g., Atlassian"
                    required
                  />
                </div>
              </div>

              {/* Platform URLs */}
              <div className="space-y-3">
                <Label>Platform URLs (provide at least one)</Label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.platforms.includes('g2')}
                      onCheckedChange={() => handlePlatformToggle('g2')}
                    />
                    <Label className="text-sm font-normal">G2</Label>
                  </div>
                  {formData.platforms.includes('g2') && (
                    <Input
                      value={formData.g2_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, g2_url: e.target.value }))}
                      placeholder="https://www.g2.com/products/..."
                      className="ml-6"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.platforms.includes('capterra')}
                      onCheckedChange={() => handlePlatformToggle('capterra')}
                    />
                    <Label className="text-sm font-normal">Capterra</Label>
                  </div>
                  {formData.platforms.includes('capterra') && (
                    <Input
                      value={formData.capterra_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, capterra_url: e.target.value }))}
                      placeholder="https://www.capterra.com/p/..."
                      className="ml-6"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.platforms.includes('trustradius')}
                      onCheckedChange={() => handlePlatformToggle('trustradius')}
                    />
                    <Label className="text-sm font-normal">TrustRadius</Label>
                  </div>
                  {formData.platforms.includes('trustradius') && (
                    <Input
                      value={formData.trustradius_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, trustradius_url: e.target.value }))}
                      placeholder="https://www.trustradius.com/products/..."
                      className="ml-6"
                    />
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4 mr-2" />
                      Start Monitoring
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monitoring Limit Notice */}
      {existingProducts.length >= 5 && (
        <Card className="border-orange-200 bg-orange-50 p-4">
          <p className="text-sm text-orange-800">
            <strong>Limit reached:</strong> You're monitoring the maximum of 5 competitor products.
            Remove a product to add another.
          </p>
        </Card>
      )}

      {/* Existing Products */}
      <div className="grid grid-cols-1 gap-4">
        {existingProducts.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">No competitors monitored yet</h4>
            <p className="text-sm text-gray-600 mb-4">
              Add up to 5 competitor products to track their reviews and feature gaps
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Competitor
            </Button>
          </Card>
        ) : (
          existingProducts.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{product.product_name}</h4>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {product.avg_rating && (
                      <span className="text-sm text-gray-600">
                        ⭐ {product.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{product.company_name}</p>

                  {/* Platforms */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.platforms.map((platform) => (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platform === 'g2' && '📊 G2'}
                        {platform === 'capterra' && '🔷 Capterra'}
                        {platform === 'trustradius' && '✓ TrustRadius'}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  {product.total_reviews !== undefined && (
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <span>{product.total_reviews} reviews synced</span>
                      {product.last_synced_at && (
                        <span>
                          Last synced: {new Date(product.last_synced_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {product.g2_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={product.g2_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
