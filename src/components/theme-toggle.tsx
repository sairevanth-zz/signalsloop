'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: isDark ? '2px solid rgba(251,191,36,0.5)' : '2px solid rgba(100,116,139,0.4)',
        backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(100,116,139,0.15)',
        transition: 'all 0.2s ease',
        boxShadow: isDark ? '0 0 12px rgba(251,191,36,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
      ) : (
        <Moon style={{ width: '20px', height: '20px', color: '#475569' }} />
      )}
    </button>
  );
}
