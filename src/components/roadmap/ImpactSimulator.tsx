'use client';

/**
 * Impact Simulator Component
 *
 * Simulates the impact of roadmap decisions:
 * - "What if we build this feature?"
 * - "What if we deprioritize this?"
 * - Compare multiple features side-by-side
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  Zap,
  Target,
  Info
} from 'lucide-react';

interface ImpactSimulatorProps {
  projectId: string;
  suggestionId: string;
  themeName: string;
  trigger?: React.ReactNode;
}

export function ImpactSimulator({
  projectId,
  suggestionId,
  themeName,
  trigger
}: ImpactSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [mode, setMode] = useState<'build' | 'deprioritize'>('build');

  const runSimulation = async (action: 'build' | 'deprioritize') => {
    setLoading(true);
    setMode(action);

    try {
      const response = await fetch('/api/roadmap/simulate-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          suggestionId,
          action
        })
      });

      const result = await response.json();

      if (result.success) {
        setPrediction(result.data);
      } else {
        console.error('Simulation failed:', result.error);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <LineChart className="w-4 h-4 mr-2" />
            Simulate Impact
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Impact Simulation: {themeName}
          </DialogTitle>
          <DialogDescription>
            Predict the outcomes of building or deprioritizing this feature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Selector */}
          <div className="flex gap-2">
            <Button
              onClick={() => runSimulation('build')}
              disabled={loading}
              variant={mode === 'build' ? 'default' : 'outline'}
              className="flex-1"
            >
              {loading && mode === 'build' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Simulate: Build
            </Button>

            <Button
              onClick={() => runSimulation('deprioritize')}
              disabled={loading}
              variant={mode === 'deprioritize' ? 'default' : 'outline'}
              className="flex-1"
            >
              {loading && mode === 'deprioritize' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-2" />
              )}
              Simulate: Defer
            </Button>
          </div>

          {/* Results */}
          {prediction && (
            <div className="space-y-4">
              {/* Confidence & Data Quality */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    Confidence: {(prediction.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <Badge variant={
                  prediction.dataQuality === 'high' ? 'default' :
                  prediction.dataQuality === 'medium' ? 'secondary' : 'outline'
                }>
                  Data Quality: {prediction.dataQuality}
                </Badge>
              </div>

              {/* Impact Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Sentiment Impact */}
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {prediction.sentimentImpact.predicted > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">Sentiment</span>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    prediction.sentimentImpact.predicted > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {prediction.sentimentImpact.predicted > 0 ? '+' : ''}
                    {prediction.sentimentImpact.predicted.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Range: {prediction.sentimentImpact.range.min.toFixed(2)} to{' '}
                    {prediction.sentimentImpact.range.max.toFixed(2)}
                  </div>
                </Card>

                {/* Churn Impact */}
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {prediction.churnImpact.predicted < 0 ? (
                        <TrendingDown className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">Churn Impact</span>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    prediction.churnImpact.predicted < 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {prediction.churnImpact.predicted > 0 ? '+' : ''}
                    {(prediction.churnImpact.predicted * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ~{prediction.churnImpact.affectedCustomers} customers affected
                  </div>
                </Card>

                {/* Adoption Rate */}
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Adoption</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(prediction.adoptionRate.predicted * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Expected adoption rate
                  </div>
                </Card>

                {/* Revenue Impact */}
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className={`w-5 h-5 ${
                        prediction.revenueImpact.predicted > 0 ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <span className="font-medium">Revenue</span>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    prediction.revenueImpact.predicted > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {prediction.revenueImpact.predicted >= 0 ? '+' : ''}
                    ${Math.abs(prediction.revenueImpact.predicted).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Estimated annual impact
                  </div>
                </Card>
              </div>

              {/* Risk Assessment */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    prediction.riskLevel === 'high' ? 'text-red-600' :
                    prediction.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Risk Level:</span>
                      <Badge variant={
                        prediction.riskLevel === 'high' ? 'destructive' :
                        prediction.riskLevel === 'medium' ? 'secondary' : 'default'
                      }>
                        {prediction.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {prediction.businessJustification}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Key Assumptions */}
              {prediction.keyAssumptions && prediction.keyAssumptions.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 mt-0.5 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Key Assumptions</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {prediction.keyAssumptions.map((assumption: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{assumption}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* Mitigation Strategies */}
              {prediction.mitigationStrategies && prediction.mitigationStrategies.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 mt-0.5 text-purple-600" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Risk Mitigation</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {prediction.mitigationStrategies.map((strategy: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-600 mt-1">•</span>
                            <span>{strategy}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* Similar Historical Features */}
              {prediction.similarFeatures && prediction.similarFeatures.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Based on Similar Features</h4>
                  <div className="space-y-2">
                    {prediction.similarFeatures.map((feature: any, i: number) => (
                      <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="font-medium">{feature.name}</div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                          <span>Sentiment: {feature.sentimentImpact > 0 ? '+' : ''}{feature.sentimentImpact.toFixed(2)}</span>
                          <span>Churn: {(feature.churnImpact * 100).toFixed(1)}%</span>
                          <span>Adoption: {(feature.adoptionRate * 100).toFixed(0)}%</span>
                          <span>Success: {feature.successRating}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Empty State */}
          {!prediction && !loading && (
            <div className="text-center py-12 text-gray-500">
              <LineChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Click a button above to run an impact simulation</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
