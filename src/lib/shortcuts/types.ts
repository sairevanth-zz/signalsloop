/**
 * Keyboard Shortcut Types
 */

export type ModifierKey = 'cmd' | 'ctrl' | 'alt' | 'shift';
export type KeyCode = string; // e.g., 'k', 'enter', 'escape', 'arrowup', etc.

export interface ShortcutKey {
  key: KeyCode;
  modifiers?: ModifierKey[];
}

export type ShortcutCategory =
  | 'navigation'
  | 'search'
  | 'actions'
  | 'editor'
  | 'help';

export interface Shortcut {
  id: string;
  keys: ShortcutKey[];           // Support multiple key combinations
  description: string;
  category: ShortcutCategory;
  global?: boolean;              // Works anywhere in the app
  scope?: string | string[];     // Only works on specific routes
  action: () => void | Promise<void>;
  enabled?: boolean;
  hidden?: boolean;              // Don't show in help modal
}

export interface ShortcutGroup {
  category: ShortcutCategory;
  label: string;
  icon: string;
  shortcuts: Shortcut[];
}

export interface ShortcutContext {
  registerShortcut: (shortcut: Shortcut) => () => void;
  unregisterShortcut: (id: string) => void;
  isEnabled: (id: string) => boolean;
  setEnabled: (id: string, enabled: boolean) => void;
  showHelp: () => void;
  hideHelp: () => void;
  isHelpOpen: boolean;
}

/**
 * Format key for display
 */
export function formatKey(key: KeyCode): string {
  const keyMap: Record<string, string> = {
    cmd: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    enter: '↵',
    escape: 'Esc',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    backspace: '⌫',
    delete: '⌦',
    tab: '⇥',
    space: 'Space',
  };

  return keyMap[key.toLowerCase()] || key.toUpperCase();
}

/**
 * Format shortcut keys for display
 */
export function formatShortcut(shortcutKey: ShortcutKey): string {
  const parts: string[] = [];

  if (shortcutKey.modifiers) {
    // Order modifiers consistently: cmd, ctrl, alt, shift
    const orderedModifiers: ModifierKey[] = ['cmd', 'ctrl', 'alt', 'shift'];
    orderedModifiers.forEach((mod) => {
      if (shortcutKey.modifiers?.includes(mod)) {
        parts.push(formatKey(mod));
      }
    });
  }

  parts.push(formatKey(shortcutKey.key));

  return parts.join(' ');
}

/**
 * Check if current event matches a shortcut key
 */
export function matchesShortcut(event: KeyboardEvent, shortcutKey: ShortcutKey): boolean {
  const key = event.key.toLowerCase();
  const shortcutKeyLower = shortcutKey.key.toLowerCase();

  // Check key match
  if (key !== shortcutKeyLower) {
    return false;
  }

  // Check modifiers
  const hasCmd = event.metaKey || event.ctrlKey;
  const hasAlt = event.altKey;
  const hasShift = event.shiftKey;

  const needsCmd = shortcutKey.modifiers?.includes('cmd') || shortcutKey.modifiers?.includes('ctrl');
  const needsAlt = shortcutKey.modifiers?.includes('alt');
  const needsShift = shortcutKey.modifiers?.includes('shift');

  return (
    hasCmd === !!needsCmd &&
    hasAlt === !!needsAlt &&
    hasShift === !!needsShift
  );
}
