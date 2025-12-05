/**
 * ShortcutsProvider - Global keyboard shortcut handler
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  SHORTCUTS,
  type Shortcut,
  matchesShortcut,
} from '@/lib/shortcuts';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';

interface ShortcutsContextType {
  shortcuts: Shortcut[];
  showHelp: () => void;
  hideHelp: () => void;
  isHelpOpen: boolean;
  registerShortcut: (shortcut: Shortcut) => () => void;
  unregisterShortcut: (id: string) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}

interface ShortcutsProviderProps {
  children: React.ReactNode;
  projectSlug?: string;
}

export function ShortcutsProvider({ children, projectSlug }: ShortcutsProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build complete shortcut list with actions
  const shortcuts: Shortcut[] = SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    action: () => executeShortcut(shortcut.id),
  })).concat(customShortcuts);

  const showHelp = useCallback(() => setIsHelpOpen(true), []);
  const hideHelp = useCallback(() => setIsHelpOpen(false), []);

  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setCustomShortcuts((prev) => [...prev.filter((s) => s.id !== shortcut.id), shortcut]);
    return () => {
      setCustomShortcuts((prev) => prev.filter((s) => s.id !== shortcut.id));
    };
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setCustomShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Navigate helper with project slug
  const navigateTo = useCallback(
    (path: string) => {
      const fullPath = projectSlug ? `/${projectSlug}${path}` : path;
      router.push(fullPath);
    },
    [router, projectSlug]
  );

  // Execute shortcut action
  const executeShortcut = useCallback(
    (id: string) => {
      switch (id) {
        // Search
        case 'open-ask':
          // Trigger Cmd+K modal (dispatch custom event)
          window.dispatchEvent(new CustomEvent('open-ask-modal'));
          break;
        case 'search-feedback':
          navigateTo('/board?search=true');
          break;
        case 'search-specs':
          navigateTo('/specs?search=true');
          break;

        // Navigation
        case 'go-dashboard':
          navigateTo('/dashboard');
          break;
        case 'go-feedback':
          navigateTo('/board');
          break;
        case 'go-specs':
          navigateTo('/specs');
          break;
        case 'go-roadmap':
          navigateTo('/roadmap');
          break;
        case 'go-competitive':
          navigateTo('/competitive');
          break;
        case 'go-experiments':
          navigateTo('/experiments');
          break;
        case 'go-themes':
          navigateTo('/themes');
          break;
        case 'go-hunter':
          navigateTo('/hunter');
          break;
        case 'go-settings':
          navigateTo('/settings');
          break;

        // Actions
        case 'new-spec':
          navigateTo('/specs/new');
          break;
        case 'new-feedback':
          window.dispatchEvent(new CustomEvent('open-feedback-modal'));
          break;
        case 'refresh-briefing':
          window.dispatchEvent(new CustomEvent('refresh-briefing'));
          break;
        case 'toggle-sidebar':
          window.dispatchEvent(new CustomEvent('toggle-sidebar'));
          break;
        case 'toggle-dark-mode':
          window.dispatchEvent(new CustomEvent('toggle-dark-mode'));
          break;

        // Editor
        case 'save':
          window.dispatchEvent(new CustomEvent('save-document'));
          break;
        case 'regenerate':
          window.dispatchEvent(new CustomEvent('regenerate-section'));
          break;

        // Help
        case 'show-shortcuts':
          setIsHelpOpen(true);
          break;
        case 'escape':
          // Close any open modal
          setIsHelpOpen(false);
          window.dispatchEvent(new CustomEvent('close-modal'));
          break;
        case 'start-tour':
          window.dispatchEvent(new CustomEvent('start-tour'));
          break;

        default:
          // Check custom shortcuts
          const customShortcut = customShortcuts.find((s) => s.id === id);
          if (customShortcut) {
            customShortcut.action();
          }
      }
    },
    [navigateTo, customShortcuts]
  );

  // Check if shortcut should be active based on scope
  const isShortcutActive = useCallback(
    (shortcut: typeof SHORTCUTS[number]) => {
      if (shortcut.enabled === false) return false;

      if (shortcut.global) return true;

      if (shortcut.scope) {
        const scopes = Array.isArray(shortcut.scope)
          ? shortcut.scope
          : [shortcut.scope];
        return scopes.some((scope) => pathname.includes(scope));
      }

      return true;
    },
    [pathname]
  );

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea (except for global shortcuts with modifiers)
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow some shortcuts even in inputs
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        // Skip if not active
        if (!isShortcutActive(shortcut)) continue;

        // Check if any key combination matches
        const matches = shortcut.keys.some((key) =>
          matchesShortcut(event, key)
        );

        if (matches) {
          // If in input and no modifier, skip (except for escape)
          if (isInput && !hasModifier && shortcut.id !== 'escape') {
            continue;
          }

          event.preventDefault();
          event.stopPropagation();
          executeShortcut(shortcut.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isShortcutActive, executeShortcut]);

  const value: ShortcutsContextType = {
    shortcuts,
    showHelp,
    hideHelp,
    isHelpOpen,
    registerShortcut,
    unregisterShortcut,
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsHelpModal
        open={isHelpOpen}
        onClose={hideHelp}
        shortcuts={shortcuts}
      />
    </ShortcutsContext.Provider>
  );
}

/**
 * Hook to register a shortcut from a component
 */
export function useShortcut(shortcut: Shortcut) {
  const { registerShortcut } = useShortcuts();

  useEffect(() => {
    return registerShortcut(shortcut);
  }, [registerShortcut, shortcut.id]);
}
