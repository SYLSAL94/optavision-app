import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { OPTAVISION_API_URL } from '../../config';

const DEFAULT_MIN_CHARS = 3;
const DEFAULT_DEBOUNCE_MS = 300;
const playerOptionCache = new Map();

const normalizeId = (value) => (
  value === null || value === undefined ? '' : String(value)
);

const normalizeOption = (rawOption) => {
  const id = normalizeId(rawOption?.id ?? rawOption?.player_id);
  if (!id) return null;
  return {
    id,
    name: rawOption?.name || rawOption?.playerName || id
  };
};

const rememberOptions = (options) => {
  options.forEach((option) => {
    if (option?.id) playerOptionCache.set(option.id, option);
  });
};

const AsyncMultiSelect = ({
  label,
  selectedIds = [],
  onChange,
  placeholder = 'Saisir 3 caracteres...',
  endpoint = `${OPTAVISION_API_URL}/api/optavision/players`,
  minChars = DEFAULT_MIN_CHARS,
  debounceMs = DEFAULT_DEBOUNCE_MS
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [optionsQuery, setOptionsQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setCacheVersion] = useState(0);

  const dropdownRef = useRef(null);
  const portalRef = useRef(null);
  const inputRef = useRef(null);

  const selectedIdList = useMemo(() => (
    (selectedIds || []).map(normalizeId).filter(Boolean)
  ), [selectedIds]);

  const selectedIdSet = useMemo(() => new Set(selectedIdList), [selectedIdList]);

  const selectedOptions = selectedIdList.map((id) => (
    playerOptionCache.get(id) || { id, name: `Joueur ${id}` }
  ));

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const insidePortal = portalRef.current && portalRef.current.contains(event.target);
      if (!insideTrigger && !insidePortal) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    setDropdownRect(dropdownRef.current.getBoundingClientRect());
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!isOpen || trimmedQuery.length < minChars) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const response = await fetch(
          `${endpoint}${separator}q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`PLAYERS_SEARCH_FAILURE: ${response.status}`);

        const payload = await response.json();
        const nextOptions = (Array.isArray(payload) ? payload : [])
          .map(normalizeOption)
          .filter(Boolean);

        rememberOptions(nextOptions);
        setOptions(nextOptions);
        setOptionsQuery(trimmedQuery);
        setCacheVersion((version) => version + 1);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setOptions([]);
          setOptionsQuery(trimmedQuery);
          setError(err.message || 'Recherche indisponible');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, isOpen, endpoint, minChars, debounceMs]);

  const emitChange = (nextOptions) => {
    rememberOptions(nextOptions);
    setCacheVersion((version) => version + 1);
    onChange?.(nextOptions.map((option) => option.id), nextOptions);
  };

  const toggleOption = (option) => {
    if (!option?.id) return;

    if (selectedIdSet.has(option.id)) {
      emitChange(selectedOptions.filter((selected) => selected.id !== option.id));
    } else {
      emitChange([...selectedOptions, option]);
    }

    setQuery('');
    setOptions([]);
    inputRef.current?.focus();
  };

  const removeOption = (optionId) => {
    emitChange(selectedOptions.filter((selected) => selected.id !== optionId));
  };

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= minChars;
  const hasFreshOptions = optionsQuery === trimmedQuery;
  const visibleOptions = canSearch && hasFreshOptions ? options : [];

  const renderStatus = () => {
    if (!canSearch) {
      return `Saisir au moins ${minChars} caracteres`;
    }
    if (loading || !hasFreshOptions) return 'Recherche...';
    if (error) return error;
    return 'Aucun joueur trouve';
  };

  return (
    <div className="filter-group relative group" ref={dropdownRef}>
      <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">
        {label}
      </label>

      <div
        className={`min-h-[50px] p-2.5 bg-canvas-black border rounded-[2px] flex flex-wrap gap-2.5 cursor-text transition-all duration-300 ${
          isOpen ? 'border-jelly-mint shadow-[0_0_25px_rgba(60,255,208,0.1)]' : 'border-hazard-white/5 hover:border-hazard-white/20'
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-center px-2 mr-1">
          {canSearch && loading ? (
            <Loader2 size={14} className="text-jelly-mint animate-spin" />
          ) : (
            <Search size={14} className={`${isOpen ? 'text-jelly-mint' : 'text-hazard-white/20'} transition-colors`} />
          )}
        </div>

        {selectedOptions.map((option) => (
          <span
            key={option.id}
            className="bg-jelly-mint text-absolute-black verge-label-mono text-[9px] px-3 py-1.5 rounded-[2px] font-black flex items-center gap-2 animate-in zoom-in-95 duration-300 shadow-[0_5px_15px_rgba(60,255,208,0.1)]"
          >
            <span className="truncate max-w-[220px]">{option.name}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeOption(option.id);
              }}
              className="hover:bg-absolute-black/10 rounded-full p-0.5 transition-colors"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none verge-label-mono text-[10px] text-hazard-white placeholder:text-secondary-text px-2 font-black tracking-widest"
          placeholder={selectedOptions.length === 0 ? placeholder : ''}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
        />

        <div className="flex items-center pr-2 ml-auto">
          <ChevronDown size={14} className={`text-secondary-text transition-all duration-500 ${isOpen ? 'rotate-180 text-jelly-mint' : ''}`} />
        </div>
      </div>

      {isOpen && dropdownRect && createPortal(
        <div
          ref={portalRef}
          className="fixed z-[9999] bg-canvas-black/95 backdrop-blur-xl border border-hazard-white/10 rounded-[2px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          style={{
            top: dropdownRect.bottom + 8,
            left: dropdownRect.left,
            width: dropdownRect.width
          }}
        >
          <div className="max-h-80 overflow-y-auto py-3 styled-scrollbar">
            {visibleOptions.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <Search size={32} className="mx-auto text-hazard-white/5 mb-4" />
                <div className="verge-label-mono text-secondary-text text-[10px] uppercase tracking-widest">
                  {renderStatus()}
                </div>
              </div>
            ) : (
              visibleOptions.map((option) => {
                const selected = selectedIdSet.has(option.id);
                return (
                  <div
                    key={option.id}
                    className={`px-8 py-4 text-[10px] flex items-center justify-between transition-all cursor-pointer verge-label-mono uppercase tracking-wider ${
                      selected ? 'text-jelly-mint font-black bg-jelly-mint/5' : 'text-secondary-text hover:bg-hazard-white/5 hover:text-hazard-white'
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleOption(option);
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selected ? 'border-jelly-mint' : 'border-hazard-white/5'
                      }`}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-jelly-mint" />}
                      </div>
                      <span className="truncate">{option.name}</span>
                    </div>
                    {selected && <Check size={14} className="text-jelly-mint shrink-0 ml-4" />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AsyncMultiSelect;
