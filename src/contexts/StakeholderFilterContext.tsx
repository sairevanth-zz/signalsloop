'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FilterState {
  theme?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  competitor?: string;
  source?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  customer?: string;
}

interface FilterContextType {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: any) => void;
  removeFilter: (key: keyof FilterState) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function StakeholderFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({});

  const setFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key: keyof FilterState) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilter,
        removeFilter,
        clearFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useStakeholderFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useStakeholderFilters must be used within StakeholderFilterProvider');
  }
  return context;
}
