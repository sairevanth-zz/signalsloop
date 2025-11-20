/**
 * Hook for Spec CRUD Operations
 */

import { useState, useEffect } from 'react';
import type {
  Spec,
  SpecFilter,
  SpecSortOption,
  SpecStatus,
  SaveSpecRequest,
} from '@/types/specs';

// ============================================================================
// useSpecs - List and manage specs
// ============================================================================

export function useSpecs(projectId: string, filter?: SpecFilter, sort?: SpecSortOption) {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchSpecs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        projectId,
        ...(filter?.search && { search: filter.search }),
        ...(filter?.status && { status: filter.status.join(',') }),
        ...(filter?.template && { template: filter.template.join(',') }),
        ...(sort && { sort }),
      });

      const response = await fetch(`/api/specs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch specs');
      }

      const data = await response.json();

      if (data.success) {
        setSpecs(data.specs);
        setTotal(data.total);
      } else {
        throw new Error(data.error || 'Failed to fetch specs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSpecs();
    }
  }, [projectId, filter, sort]);

  return {
    specs,
    loading,
    error,
    total,
    refetch: fetchSpecs,
  };
}

// ============================================================================
// useSpec - Get individual spec
// ============================================================================

export function useSpec(specId: string | null) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpec = async () => {
    if (!specId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/specs/${specId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch spec');
      }

      const data = await response.json();

      if (data.success) {
        setSpec(data.spec);
      } else {
        throw new Error(data.error || 'Failed to fetch spec');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpec();
  }, [specId]);

  return {
    spec,
    loading,
    error,
    refetch: fetchSpec,
  };
}

// ============================================================================
// useCreateSpec - Create a new spec
// ============================================================================

export function useCreateSpec() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSpec = async (specData: Partial<Spec> & { projectId: string }): Promise<Spec | null> => {
    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(specData),
      });

      if (!response.ok) {
        throw new Error('Failed to create spec');
      }

      const data = await response.json();

      if (data.success) {
        return data.spec;
      } else {
        throw new Error(data.error || 'Failed to create spec');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    createSpec,
    creating,
    error,
  };
}

// ============================================================================
// useUpdateSpec - Update a spec
// ============================================================================

export function useUpdateSpec() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSpec = async (
    specId: string,
    updates: Partial<Spec>,
    createVersion = false,
    versionSummary?: string
  ): Promise<Spec | null> => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/specs/${specId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          createVersion,
          versionSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update spec');
      }

      const data = await response.json();

      if (data.success) {
        return data.spec;
      } else {
        throw new Error(data.error || 'Failed to update spec');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateSpec,
    updating,
    error,
  };
}

// ============================================================================
// useDeleteSpec - Delete a spec
// ============================================================================

export function useDeleteSpec() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSpec = async (specId: string): Promise<boolean> => {
    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`/api/specs/${specId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete spec');
      }

      const data = await response.json();

      return data.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    deleteSpec,
    deleting,
    error,
  };
}

// ============================================================================
// useChangeSpecStatus - Change spec status
// ============================================================================

export function useChangeSpecStatus() {
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStatus = async (specId: string, newStatus: SpecStatus): Promise<Spec | null> => {
    try {
      setChanging(true);
      setError(null);

      const response = await fetch(`/api/specs/${specId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'approved' && {
            publishedAt: new Date().toISOString(),
          }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change spec status');
      }

      const data = await response.json();

      if (data.success) {
        return data.spec;
      } else {
        throw new Error(data.error || 'Failed to change spec status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setChanging(false);
    }
  };

  return {
    changeStatus,
    changing,
    error,
  };
}
