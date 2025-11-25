/**
 * Integrations Settings Page
 * Configure LaunchDarkly, Optimizely, and other experiment platform integrations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Beaker, CheckCircle, AlertCircle, Loader2, ExternalLink, Trash2, Users, DollarSign } from 'lucide-react';

interface Integration {
  id: string;
  provider: 'launchdarkly' | 'optimizely' | 'salesforce' | 'hubspot';
  is_active: boolean;
  validation_status: 'valid' | 'invalid' | 'pending' | 'error' | null;
  validation_error: string | null;
  last_validated_at: string | null;
  created_at: string;
}

import { useSearchParams } from 'next/navigation';

export default function IntegrationsSettingsPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const section = searchParams.get('section'); // 'crm' or 'experiments'

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state - Experiment platforms
  const [provider, setProvider] = useState<'launchdarkly' | 'optimizely' | 'salesforce' | 'hubspot'>('launchdarkly');
  const [apiKey, setApiKey] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [environmentKey, setEnvironmentKey] = useState('production');
  const [projectId, setProjectId] = useState('');

  // Form state - CRM
  const [crmProvider, setCrmProvider] = useState<'salesforce' | 'hubspot'>('salesforce');
  const [crmApiKey, setCrmApiKey] = useState('');
  const [salesforceInstanceUrl, setSalesforceInstanceUrl] = useState('https://login.salesforce.com');
  const [savingCrm, setSavingCrm] = useState(false);
  const [syncingCrm, setSyncingCrm] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const response = await fetch(`/api/projects/${params.slug}/integrations`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: any = {
        provider,
        api_key: apiKey,
      };

      if (provider === 'launchdarkly') {
        body.additional_config = {
          project_key: projectKey,
          environment_key: environmentKey,
        };
      } else if (provider === 'optimizely') {
        body.additional_config = {
          project_id: projectId,
        };
      }

      const response = await fetch(`/api/projects/${params.slug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        // Clear form
        setApiKey('');
        setProjectKey('');
        setProjectId('');
        await fetchIntegrations();
      } else {
        const error = await response.json();
        alert(`Failed to save integration: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
      alert('Failed to save integration');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(integration: Integration) {
    setTesting(integration.id);
    try {
      const response = await fetch(`/api/projects/${params.slug}/integrations/${integration.id}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchIntegrations();
      } else {
        const error = await response.json();
        alert(`Test failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to test integration:', error);
      alert('Failed to test integration');
    } finally {
      setTesting(null);
    }
  }

  async function handleDelete(integrationId: string) {
    if (!confirm('Are you sure you want to delete this integration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${params.slug}/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
      alert('Failed to delete integration');
    }
  }

  async function handleSaveCrm() {
    setSavingCrm(true);
    try {
      const body: any = {
        provider: crmProvider,
        api_key: crmApiKey,
      };

      if (crmProvider === 'salesforce') {
        body.additional_config = {
          instance_url: salesforceInstanceUrl,
        };
      }

      const response = await fetch(`/api/projects/${params.slug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        // Clear form
        setCrmApiKey('');
        setSalesforceInstanceUrl('https://login.salesforce.com');
        await fetchIntegrations();
        alert('CRM integration saved! Run sync to import customer data.');
      } else {
        const error = await response.json();
        alert(`Failed to save CRM integration: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save CRM integration:', error);
      alert('Failed to save CRM integration');
    } finally {
      setSavingCrm(false);
    }
  }

  async function handleSyncCrm(provider?: string) {
    setSyncingCrm(true);
    try {
      // Get project ID from slug
      const projectResponse = await fetch(`/api/projects/${params.slug}`);
      if (!projectResponse.ok) {
        throw new Error('Failed to fetch project');
      }
      const projectData = await projectResponse.json();

      const response = await fetch('/api/crm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectData.project.id,
          provider,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const summary = result.summary || result;
        alert(
          `CRM sync complete!\n\n` +
          `Customers synced: ${summary.total_synced || summary.customersSynced || 0}\n` +
          `New customers: ${summary.total_created || summary.customersCreated || 0}\n` +
          `Updated customers: ${summary.total_updated || summary.customersUpdated || 0}`
        );
      } else {
        const error = await response.json();
        alert(`CRM sync failed: ${error.error || error.message}`);
      }
    } catch (error) {
      console.error('Failed to sync CRM:', error);
      alert('Failed to sync CRM data');
    } finally {
      setSyncingCrm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Separate integrations by type
  const experimentIntegrations = integrations.filter(i => ['launchdarkly', 'optimizely'].includes(i.provider));
  const crmIntegrations = integrations.filter(i => ['salesforce', 'hubspot'].includes(i.provider));

  // Determine what to show based on section parameter
  const showCRM = !section || section === 'crm';
  const showExperiments = !section || section === 'experiments';

  // Update page title based on section
  const pageTitle = section === 'crm'
    ? 'CRM Systems'
    : section === 'experiments'
    ? 'Experiment Platforms'
    : 'Integrations';

  const pageDescription = section === 'crm'
    ? 'Connect Salesforce or HubSpot to prioritize feedback by customer revenue'
    : section === 'experiments'
    ? 'Connect LaunchDarkly or Optimizely to sync experiment results in real-time'
    : 'Connect your tools to unlock revenue-based prioritization and real-time experiment tracking';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{pageTitle}</h1>
        <p className="text-slate-400">
          {pageDescription}
        </p>
      </div>

      {/* CRM Integrations Section */}
      {showCRM && (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-green-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">CRM Systems</h2>
            <p className="text-sm text-slate-400">
              Connect Salesforce or HubSpot to prioritize feedback by customer revenue
            </p>
          </div>
        </div>

        {/* Existing CRM Integrations */}
        {crmIntegrations.length > 0 && (
          <div className="space-y-3">
            {crmIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-green-400" />
                    <div>
                      <h3 className="font-medium text-white capitalize">
                        {integration.provider}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {integration.validation_status === 'valid' && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                          </span>
                        )}
                        {integration.validation_status === 'invalid' && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Invalid credentials
                          </span>
                        )}
                        {integration.last_validated_at && (
                          <span className="text-xs text-slate-500">
                            • Tested {new Date(integration.last_validated_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {integration.validation_error && (
                        <p className="text-xs text-red-400 mt-1">{integration.validation_error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncCrm(integration.provider)}
                      disabled={syncingCrm}
                      className="px-3 py-1.5 text-sm rounded bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:bg-slate-800"
                    >
                      {syncingCrm ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sync Now'
                      )}
                    </button>
                    <button
                      onClick={() => handleTest(integration)}
                      disabled={testing === integration.id}
                      className="px-3 py-1.5 text-sm rounded border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {testing === integration.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="p-1.5 rounded hover:bg-red-950/50 transition-colors text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New CRM Integration */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-md font-semibold text-white mb-4">Add CRM Integration</h3>

          <div className="space-y-4">
            {/* CRM Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CRM Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCrmProvider('salesforce')}
                  className={`p-4 rounded-lg border transition-colors ${
                    crmProvider === 'salesforce'
                      ? 'border-green-500 bg-green-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-white">Salesforce</div>
                  <div className="text-xs text-slate-500 mt-1">Sync accounts & revenue</div>
                </button>
                <button
                  onClick={() => setCrmProvider('hubspot')}
                  className={`p-4 rounded-lg border transition-colors ${
                    crmProvider === 'hubspot'
                      ? 'border-green-500 bg-green-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-white">HubSpot</div>
                  <div className="text-xs text-slate-500 mt-1">Sync companies & deals</div>
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label htmlFor="crmApiKey" className="block text-sm font-medium text-slate-300 mb-2">
                API Key / Access Token
              </label>
              <input
                type="password"
                id="crmApiKey"
                value={crmApiKey}
                onChange={(e) => setCrmApiKey(e.target.value)}
                placeholder={`Enter your ${crmProvider} API key`}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Salesforce specific fields */}
            {crmProvider === 'salesforce' && (
              <div>
                <label htmlFor="salesforceInstanceUrl" className="block text-sm font-medium text-slate-300 mb-2">
                  Instance URL
                </label>
                <input
                  type="text"
                  id="salesforceInstanceUrl"
                  value={salesforceInstanceUrl}
                  onChange={(e) => setSalesforceInstanceUrl(e.target.value)}
                  placeholder="https://your-instance.salesforce.com"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your Salesforce instance URL (e.g., https://company.my.salesforce.com)
                </p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveCrm}
              disabled={savingCrm || !crmApiKey}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium rounded transition-colors"
            >
              {savingCrm ? 'Saving...' : 'Save CRM Integration'}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Experiment Platforms Section */}
      {showExperiments && (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Beaker className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Experiment Platforms</h2>
            <p className="text-sm text-slate-400">
              Connect LaunchDarkly or Optimizely to sync experiment results in real-time
            </p>
          </div>
        </div>

        {/* Existing Experiment Integrations */}
        {experimentIntegrations.length > 0 && (
          <div className="space-y-3">
            {experimentIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Beaker className="h-8 w-8 text-purple-400" />
                  <div>
                    <h3 className="font-medium text-white capitalize">
                      {integration.provider}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {integration.validation_status === 'valid' && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                      {integration.validation_status === 'invalid' && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          Invalid credentials
                        </span>
                      )}
                      {integration.validation_status === 'error' && (
                        <span className="flex items-center gap-1 text-xs text-orange-400">
                          <AlertCircle className="h-3 w-3" />
                          Connection error
                        </span>
                      )}
                      {integration.last_validated_at && (
                        <span className="text-xs text-slate-500">
                          • Tested {new Date(integration.last_validated_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {integration.validation_error && (
                      <p className="text-xs text-red-400 mt-1">{integration.validation_error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(integration)}
                    disabled={testing === integration.id}
                    className="px-3 py-1.5 text-sm rounded border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {testing === integration.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(integration.id)}
                    className="p-1.5 rounded hover:bg-red-950/50 transition-colors text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Add New Experiment Integration */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-md font-semibold text-white mb-4">Add Experiment Platform</h3>

        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProvider('launchdarkly')}
                className={`p-4 rounded-lg border transition-colors ${
                  provider === 'launchdarkly'
                    ? 'border-purple-500 bg-purple-950/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-medium text-white">LaunchDarkly</div>
                <div className="text-xs text-slate-500 mt-1">Feature flags & experiments</div>
              </button>
              <button
                onClick={() => setProvider('optimizely')}
                className={`p-4 rounded-lg border transition-colors ${
                  provider === 'optimizely'
                    ? 'border-purple-500 bg-purple-950/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-medium text-white">Optimizely</div>
                <div className="text-xs text-slate-500 mt-1">A/B testing & experimentation</div>
              </button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider} API key`}
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* LaunchDarkly specific fields */}
          {provider === 'launchdarkly' && (
            <>
              <div>
                <label htmlFor="projectKey" className="block text-sm font-medium text-slate-300 mb-2">
                  Project Key
                </label>
                <input
                  type="text"
                  id="projectKey"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  placeholder="default"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label htmlFor="environmentKey" className="block text-sm font-medium text-slate-300 mb-2">
                  Environment Key
                </label>
                <input
                  type="text"
                  id="environmentKey"
                  value={environmentKey}
                  onChange={(e) => setEnvironmentKey(e.target.value)}
                  placeholder="production"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </>
          )}

          {/* Optimizely specific fields */}
          {provider === 'optimizely' && (
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-slate-300 mb-2">
                Project ID
              </label>
              <input
                type="text"
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter your Optimizely project ID"
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !apiKey}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium rounded transition-colors"
          >
            {saving ? 'Saving...' : 'Save Integration'}
          </button>
          </div>
        </div>
      </div>
      )}

      {/* Documentation Links */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Documentation</h2>
        <div className="space-y-3">
          {showCRM && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">CRM Integrations</p>
            <div className="space-y-1">
              <a
                href="https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_what_is_rest_api.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                Salesforce API Documentation
              </a>
              <a
                href="https://developers.hubspot.com/docs/api/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                HubSpot API Documentation
              </a>
            </div>
          </div>
          )}
          {showExperiments && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Experiment Platforms</p>
            <div className="space-y-1">
              <a
                href="https://docs.launchdarkly.com/home/getting-started/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                LaunchDarkly API Documentation
              </a>
              <a
                href="https://docs.developers.optimizely.com/experimentation/v4.0.0-full-stack/reference/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                Optimizely API Documentation
              </a>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
