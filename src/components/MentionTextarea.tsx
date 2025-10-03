'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Loader2 } from 'lucide-react';

interface Participant {
  email: string;
  name: string | null;
  participation_count: number;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  postId: string;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
}

export default function MentionTextarea({
  value,
  onChange,
  postId,
  placeholder = 'Add your comment... (use @ to mention someone)',
  className = '',
  minRows = 3,
  maxRows = 10
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Participant[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // approximate line height
      const maxHeight = lineHeight * maxRows;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [value, maxRows]);

  // Fetch participants when @ is typed
  useEffect(() => {
    if (mentionSearch !== null && mentionSearch.length >= 0) {
      fetchParticipants(mentionSearch);
    }
  }, [mentionSearch, postId]);

  const fetchParticipants = async (search: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}/participants?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.participants || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    onChange(newValue);

    // Check if we're typing a mention (allow letters, numbers, spaces, dots, hyphens)
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([\w\s\.\-]*)$/);

    if (mentionMatch) {
      // We're in a mention
      const searchTerm = mentionMatch[1];
      setMentionStart(cursorPosition - searchTerm.length - 1);
      setMentionSearch(searchTerm);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      // Not in a mention
      setShowSuggestions(false);
      setMentionStart(null);
      setMentionSearch('');
    }
  };

  const insertMention = (participant: Participant) => {
    if (mentionStart === null || !textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, mentionStart);
    const textAfter = value.substring(cursorPosition);

    // Insert mention using name or email (prefer name)
    const displayName = participant.name || participant.email;
    const mentionText = `@${displayName}`;
    const newValue = textBefore + mentionText + ' ' + textAfter;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    setMentionSearch('');

    // Set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + mentionText.length + 1;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        if (showSuggestions && suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Scroll selected suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full resize-none ${className}`}
        rows={minRows}
        style={{ minHeight: `${minRows * 24}px` }}
      />

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full max-w-sm bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            bottom: '100%',
            marginBottom: '4px',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                Mention someone with @
              </div>
              {suggestions.map((participant, index) => (
                <div
                  key={participant.email}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                    index === selectedIndex
                      ? 'bg-blue-50 border-l-2 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => insertMention(participant)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {participant.name || participant.email}
                    </div>
                    {participant.name && (
                      <div className="text-xs text-gray-500 truncate">
                        {participant.email}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {participant.participation_count} {participant.participation_count === 1 ? 'comment' : 'comments'}
                    </span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No participants found
            </div>
          )}
          <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
            ↑↓ Navigate • Enter/Tab to select • ESC to close
          </div>
        </div>
      )}
    </div>
  );
}
