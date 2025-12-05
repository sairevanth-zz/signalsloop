/**
 * Shortcut Definitions
 * All keyboard shortcuts for the application
 */

import type { Shortcut, ShortcutGroup } from './types';

// Note: Actions are placeholders - they're overridden in the provider
export const SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  // === SEARCH & ASK ===
  {
    id: 'open-ask',
    keys: [{ key: 'k', modifiers: ['cmd'] }],
    description: 'Open Ask SignalsLoop',
    category: 'search',
    global: true,
  },
  {
    id: 'search-feedback',
    keys: [{ key: 'f', modifiers: ['cmd', 'shift'] }],
    description: 'Search feedback',
    category: 'search',
    global: true,
  },
  {
    id: 'search-specs',
    keys: [{ key: 'p', modifiers: ['cmd', 'shift'] }],
    description: 'Search specs',
    category: 'search',
    global: true,
  },

  // === NAVIGATION (Vim-style g + letter) ===
  {
    id: 'go-dashboard',
    keys: [{ key: 'd', modifiers: ['alt'] }],
    description: 'Go to Dashboard',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-feedback',
    keys: [{ key: 'b', modifiers: ['alt'] }],
    description: 'Go to Feedback Board',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-specs',
    keys: [{ key: 's', modifiers: ['alt'] }],
    description: 'Go to Specs',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-roadmap',
    keys: [{ key: 'r', modifiers: ['alt'] }],
    description: 'Go to Roadmap',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-competitive',
    keys: [{ key: 'c', modifiers: ['alt'] }],
    description: 'Go to Competitive Intel',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-experiments',
    keys: [{ key: 'e', modifiers: ['alt'] }],
    description: 'Go to Experiments',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-themes',
    keys: [{ key: 't', modifiers: ['alt'] }],
    description: 'Go to Themes',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-hunter',
    keys: [{ key: 'h', modifiers: ['alt'] }],
    description: 'Go to Feedback Hunter',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-settings',
    keys: [{ key: ',', modifiers: ['cmd'] }],
    description: 'Go to Settings',
    category: 'navigation',
    global: true,
  },

  // === ACTIONS ===
  {
    id: 'new-spec',
    keys: [{ key: 'n', modifiers: ['cmd', 'shift'] }],
    description: 'Create new spec',
    category: 'actions',
    global: true,
  },
  {
    id: 'new-feedback',
    keys: [{ key: 'i', modifiers: ['cmd', 'shift'] }],
    description: 'Add new feedback',
    category: 'actions',
    global: true,
  },
  {
    id: 'refresh-briefing',
    keys: [{ key: 'r', modifiers: ['cmd', 'shift'] }],
    description: 'Refresh AI briefing',
    category: 'actions',
    scope: ['/dashboard'],
  },
  {
    id: 'toggle-sidebar',
    keys: [{ key: '[', modifiers: ['cmd'] }],
    description: 'Toggle sidebar',
    category: 'actions',
    global: true,
  },
  {
    id: 'toggle-dark-mode',
    keys: [{ key: 'd', modifiers: ['cmd', 'shift'] }],
    description: 'Toggle dark mode',
    category: 'actions',
    global: true,
  },

  // === EDITOR (for spec writing) ===
  {
    id: 'save',
    keys: [{ key: 's', modifiers: ['cmd'] }],
    description: 'Save changes',
    category: 'editor',
    scope: ['/specs/'],
  },
  {
    id: 'undo',
    keys: [{ key: 'z', modifiers: ['cmd'] }],
    description: 'Undo',
    category: 'editor',
    scope: ['/specs/'],
    hidden: true,
  },
  {
    id: 'redo',
    keys: [{ key: 'z', modifiers: ['cmd', 'shift'] }],
    description: 'Redo',
    category: 'editor',
    scope: ['/specs/'],
    hidden: true,
  },
  {
    id: 'regenerate',
    keys: [{ key: 'g', modifiers: ['cmd', 'shift'] }],
    description: 'Regenerate section',
    category: 'editor',
    scope: ['/specs/'],
  },

  // === HELP ===
  {
    id: 'show-shortcuts',
    keys: [{ key: '/' }, { key: '?', modifiers: ['shift'] }],
    description: 'Show keyboard shortcuts',
    category: 'help',
    global: true,
  },
  {
    id: 'escape',
    keys: [{ key: 'escape' }],
    description: 'Close modal / Cancel',
    category: 'help',
    global: true,
    hidden: true,
  },
  {
    id: 'start-tour',
    keys: [{ key: 't', modifiers: ['cmd', 'shift'] }],
    description: 'Start product tour',
    category: 'help',
    global: true,
  },
];

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'navigation',
    label: 'Navigation',
    icon: '🧭',
    shortcuts: [],
  },
  {
    category: 'search',
    label: 'Search',
    icon: '🔍',
    shortcuts: [],
  },
  {
    category: 'actions',
    label: 'Actions',
    icon: '⚡',
    shortcuts: [],
  },
  {
    category: 'editor',
    label: 'Editor',
    icon: '✏️',
    shortcuts: [],
  },
  {
    category: 'help',
    label: 'Help',
    icon: '❓',
    shortcuts: [],
  },
];

/**
 * Get shortcuts grouped by category
 */
export function getGroupedShortcuts(
  shortcuts: Shortcut[],
  includeHidden: boolean = false
): ShortcutGroup[] {
  const groups = SHORTCUT_GROUPS.map((group) => ({
    ...group,
    shortcuts: shortcuts.filter(
      (s) =>
        s.category === group.category && (includeHidden || !s.hidden)
    ),
  }));

  // Filter out empty groups
  return groups.filter((g) => g.shortcuts.length > 0);
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(
  category: Shortcut['category']
): Omit<Shortcut, 'action'>[] {
  return SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Get shortcut by ID
 */
export function getShortcutById(id: string): Omit<Shortcut, 'action'> | undefined {
  return SHORTCUTS.find((s) => s.id === id);
}
