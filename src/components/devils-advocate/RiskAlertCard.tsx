'use client';

/**
 * Risk Alert Card Component
 *
 * Displays a single risk alert with severity badge and actions.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import type { PRDRiskAlert } from '@/types/devils-advocate';

interface RiskAlertCardProps {
  alert: PRDRiskAlert;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onClick?: () => void;
}

export function RiskAlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
  onClick,
}: RiskAlertCardProps) {
  const getSeverityIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = () => {
    const colorMap = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-blue-100 text-blue-700 border-blue-300',
    };

    return (
      <Badge className={colorMap[alert.severity]}>
        {alert.severity.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = () => {
    const statusMap = {
      open: { label: 'Open', color: 'bg-gray-100 text-gray-700' },
      acknowledged: { label: 'Acknowledged', color: 'bg-blue-100 text-blue-700' },
      resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
      dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-500' },
    };

    const status = statusMap[alert.status];
    return <Badge className={status.color}>{status.label}</Badge>;
  };

  const getRiskTypeLabel = () => {
    const typeMap = {
      competitive_threat: 'Competitive Threat',
      data_contradiction: 'Data Contradiction',
      assumption_challenge: 'Assumption Challenge',
      market_shift: 'Market Shift',
      technical_risk: 'Technical Risk',
      resource_constraint: 'Resource Constraint',
    };

    return typeMap[alert.risk_type];
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        alert.status === 'open' ? 'border-l-4 border-l-red-500' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            {getSeverityIcon()}
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">{alert.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {getRiskTypeLabel()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {getSeverityBadge()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">{alert.description}</p>

        {/* Recommended Action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">
            Recommended Action:
          </p>
          <p className="text-sm text-blue-800">{alert.recommended_action}</p>
        </div>

        {/* Evidence Summary */}
        {alert.evidence && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-900">Evidence:</p>
            <div className="space-y-1">
              {alert.evidence.sources?.slice(0, 3).map((source, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-600 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{source.title}</span>
                </div>
              ))}
              {alert.evidence.data_points?.slice(0, 2).map((point, idx) => (
                <div key={idx} className="text-xs text-gray-600">
                  • {point}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Score */}
        {alert.confidence_score && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Confidence:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${alert.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold">
              {Math.round(alert.confidence_score * 100)}%
            </span>
          </div>
        )}

        {/* Actions */}
        {alert.status === 'open' && (
          <div className="flex gap-2 pt-2">
            {onAcknowledge && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge(alert.id);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Acknowledge
              </Button>
            )}
            {onResolve && (
              <Button
                size="sm"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve(alert.id);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Resolve
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
            )}
          </div>
        )}

        {alert.resolution_notes && (
          <div className="text-xs text-gray-600 pt-2 border-t">
            <span className="font-semibold">Resolution notes: </span>
            {alert.resolution_notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
