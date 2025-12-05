/**
 * ShortcutsHelpModal - Modal displaying all keyboard shortcuts
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type Shortcut,
  type ShortcutGroup,
  formatShortcut,
  getGroupedShortcuts,
} from '@/lib/shortcuts';

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

export function ShortcutsHelpModal({
  open,
  onClose,
  shortcuts,
}: ShortcutsHelpModalProps) {
  const groups = getGroupedShortcuts(shortcuts);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-hidden"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Keyboard className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-8">
                  {groups.map((group) => (
                    <ShortcutGroupSection key={group.category} group={group} />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
                <p className="text-sm text-slate-400 text-center">
                  Press{' '}
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-white font-mono text-xs">
                    ?
                  </kbd>{' '}
                  anytime to show this help
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ShortcutGroupSection({ group }: { group: ShortcutGroup }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
        <span>{group.icon}</span>
        <span>{group.label}</span>
      </h3>
      <div className="space-y-2">
        {group.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-400">{shortcut.description}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-xs text-slate-500 mx-1">or</span>
            )}
            <ShortcutKeys keyCombo={formatShortcut(key)} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ShortcutKeys({ keyCombo }: { keyCombo: string }) {
  const keys = keyCombo.split(' ');

  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="min-w-[24px] px-2 py-1 text-xs font-mono bg-slate-700 border border-slate-600 rounded text-white text-center"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

/**
 * ShortcutHint - Small inline hint component
 */
export function ShortcutHint({
  shortcutId,
  shortcuts,
  className,
}: {
  shortcutId: string;
  shortcuts: Shortcut[];
  className?: string;
}) {
  const shortcut = shortcuts.find((s) => s.id === shortcutId);
  if (!shortcut || shortcut.keys.length === 0) return null;

  const formatted = formatShortcut(shortcut.keys[0]);
  const keys = formatted.split(' ');

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700/50 border border-slate-600/50 rounded text-slate-400"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
