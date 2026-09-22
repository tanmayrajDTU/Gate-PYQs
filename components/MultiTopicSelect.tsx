'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface TopicOption {
  id: string;
  label: string;
  count?: number;
}

interface MultiTopicSelectProps {
  options: TopicOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiTopicSelect({
  options,
  selected,
  onChange,
  placeholder = 'All topics',
}: MultiTopicSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(query));
  }, [options, search]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleOption = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter(x => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(options.map(o => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  // Compute trigger label
  const triggerText = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const match = options.find(o => o.id === selected[0]);
      return match ? match.label : '1 topic selected';
    }
    return `${selected.length} topics selected`;
  }, [selected, options, placeholder]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(prev => !prev);
          }
        }}
        style={{
          width: '100%',
          minHeight: 40,
          padding: '8px 12px',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--line)'}`,
          boxShadow: open ? '0 0 0 3px var(--accent-soft)' : undefined,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--input-bg)',
          color: selected.length === 0 ? 'var(--muted)' : 'var(--text)',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          transition: 'border-color .12s ease, box-shadow .12s ease',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: selected.length > 0 ? 600 : 400,
          }}
        >
          {triggerText}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {selected.length > 0 && (
            <button
              type="button"
              title="Clear topic selection"
              onClick={e => {
                e.stopPropagation();
                clearAll();
              }}
              style={{
                background: 'var(--surface2)',
                border: 'none',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--muted)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform .15s ease',
            }}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--surface)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 10,
            animation: 'rise .15s ease both',
          }}
        >
          {/* Live Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              background: 'var(--surface2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              marginBottom: 8,
            }}
          >
            <Search size={14} style={{ color: 'var(--faint)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter topics..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 13,
                padding: 0,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 4px 8px',
              borderBottom: '1px solid var(--line)',
              marginBottom: 6,
              fontSize: 11.5,
            }}
          >
            <span className="muted" style={{ fontWeight: 500 }}>
              {selected.length} of {options.length} selected
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-soft"
                onClick={selectAll}
                style={{ padding: '2px 8px', fontSize: 11, height: 24 }}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn btn-soft"
                onClick={clearAll}
                style={{ padding: '2px 8px', fontSize: 11, height: 24 }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                No topics matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedSet.has(opt.id);
                return (
                  <label
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      color: isSelected ? 'var(--accent-strong)' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'background .1s ease',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--line-strong)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word' }}>
                      {opt.label}
                    </span>
                    {typeof opt.count === 'number' && (
                      <span
                        className="pill"
                        style={{
                          fontSize: 10.5,
                          padding: '1px 6px',
                          background: isSelected ? 'var(--accent)' : 'var(--surface2)',
                          color: isSelected ? '#fff' : 'var(--muted)',
                        }}
                      >
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
