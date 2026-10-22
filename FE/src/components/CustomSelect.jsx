import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon } from './Icons';

/**
 * Premium custom dropdown select component that replaces native browser <select>
 * with a sleek, dark-mode compatible, searchable, and accessible popover menu.
 */
const extractText = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) return extractText(node.props?.children);
  return String(node);
};

export const CustomSelect = ({
  value,
  onChange,
  options,
  children,
  placeholder = 'Select...',
  className = '',
  dropdownClassName = '',
  containerClassName = '',
  align = 'left',
  disabled = false,
  id,
  name,
  'aria-label': ariaLabel,
  searchable = undefined,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Parse options either from options prop or React children (<option>)
  const parsedOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((opt) =>
        typeof opt === 'string' || typeof opt === 'number'
          ? { value: String(opt), label: String(opt) }
          : { value: String(opt.value ?? ''), label: String(opt.label ?? opt.value ?? ''), disabled: !!opt.disabled }
      );
    }
    if (children) {
      const list = [];
      React.Children.forEach(children, (child) => {
        if (!child) return;
        if (child.type === 'option') {
          const text = extractText(child.props.children).trim();
          const fallback =
            child.props.value !== undefined && child.props.value !== '' ? String(child.props.value) : placeholder;
          list.push({
            value: String(child.props.value ?? ''),
            label: text || fallback,
            disabled: !!child.props.disabled,
          });
        }
      });
      return list;
    }
    return [];
  }, [options, children, placeholder]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(value ?? ''));
  }, [parsedOptions, value]);

  const displayLabel = selectedOption?.label || placeholder;

  // Click outside & escape key listeners
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Smart alignment: auto-detect if opening to left would overflow right viewport/container edge
  const [effectiveAlign, setEffectiveAlign] = useState(align);

  useEffect(() => {
    if (!isOpen) return;
    if (align === 'right') {
      setEffectiveAlign('right');
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const parent = containerRef.current.closest('.overflow-hidden, [role="dialog"], .modal') || document.documentElement;
      const parentRect = parent.getBoundingClientRect();
      // If extending 160px from left-0 exceeds container or screen right edge, align right:
      if (rect.left + 160 > parentRect.right - 8 || rect.left + 160 > window.innerWidth - 8) {
        setEffectiveAlign('right');
      } else {
        setEffectiveAlign('left');
      }
    }
  }, [isOpen, align]);

  // Focus search input on open and reset search on close
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = (optVal) => {
    setIsOpen(false);
    if (onChange) {
      const synthEvent = {
        target: { value: optVal, name },
        currentTarget: { value: optVal, name },
        value: optVal,
        toString: () => optVal,
        valueOf: () => optVal,
      };
      onChange(synthEvent, optVal);
    }
  };

  const isSearchEnabled = searchable ?? (parsedOptions.length > 7);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return parsedOptions;
    const term = search.toLowerCase().trim();
    return parsedOptions.filter((opt) => opt.label.toLowerCase().includes(term));
  }, [parsedOptions, search]);

  const isFullWidth = className.includes('w-full') && !className.includes('sm:w-');
  const containerCls = `relative text-left ${
    containerClassName || (isFullWidth ? 'w-full block' : 'w-full sm:w-auto inline-block')
  }`;

  return (
    <div ref={containerRef} className={containerCls} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
          isOpen ? 'ring-2 ring-institutional-500 border-institutional-500' : ''
        } ${className}`}
      >
        <span className="truncate text-left flex-1 font-semibold">
          {displayLabel}
        </span>
        <ChevronDownIcon
          size={14}
          className={`text-charcoal-400 dark:text-charcoal-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-institutional-600 dark:text-institutional-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            effectiveAlign === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 min-w-[9rem] ${
            isFullWidth ? 'w-full' : 'w-full sm:w-max max-w-xs sm:max-w-sm'
          } z-50 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700/80 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-scale-in text-xs ${dropdownClassName}`}
        >
          {isSearchEnabled && (
            <div className="relative px-1 pt-1 pb-1 border-b border-charcoal-150 dark:border-charcoal-800">
              <SearchIcon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search options..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-charcoal-50 dark:bg-charcoal-800/80 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-white placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-institutional-500"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-[11px] text-charcoal-400 font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value ?? '');
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 font-bold shadow-xs'
                        : 'text-charcoal-700 dark:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 hover:text-charcoal-950 dark:hover:text-white font-medium'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="truncate flex-1">{opt.label}</span>
                    {isSelected && (
                      <CheckIcon size={13} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
