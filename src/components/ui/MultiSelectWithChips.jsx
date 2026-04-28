import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Search, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';
import { normalizeString } from '../../utils/stringUtils';

const MultiSelectWithChips = ({ label, options, selected = [], onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0); 
  
  const dropdownRef = useRef(null);
  const portalRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const isInsidePortal = portalRef.current && portalRef.current.contains(event.target);
      if (!isInsideTrigger && !isInsidePortal) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      setDropdownRect(dropdownRef.current.getBoundingClientRect());
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const filteredOptions = (options || []).filter(opt => {
    if (!opt || typeof opt !== 'string') return false;
    return normalizeString(opt).includes(normalizeString(searchTerm));
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.children[activeIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const toggleOption = (option) => {
    if (!option) return;
    const isSelected = selected.includes(option);
    if (isSelected) {
      onChange(selected.filter(i => i !== option));
    } else {
      onChange([...selected, option]);
    }
    setSearchTerm('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[activeIndex]) {
          toggleOption(filteredOptions[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Backspace':
        if (searchTerm === '' && selected.length > 0) {
          onChange(selected.slice(0, -1));
        }
        break;
      default:
        break;
    }
  };

  const renderLabelContent = (item, isChip = false, isActive = false) => {
    const isComposite = item.startsWith('🧩');
    const cleanLabel = isComposite ? item.replace('🧩', '').trim() : item;

    if (isComposite) {
      return (
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-4 h-4 rounded-[1px] border transition-all ${
            isChip ? 'bg-absolute-black/20 border-absolute-black/10' : 
            isActive ? 'bg-absolute-black/20 border-absolute-black/20' : 'bg-canvas-black border-jelly-mint/20'
          }`}>
            <Layers size={9} className={isChip || isActive ? 'text-absolute-black' : 'text-jelly-mint'} />
          </div>
          <span className="truncate">{cleanLabel}</span>
        </div>
      );
    }
    return <span className="truncate">{cleanLabel}</span>;
  };

  return (
    <div className="filter-group relative group" ref={dropdownRef}>
      <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">{label}</label>
      
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
           <Search size={14} className={`${isOpen ? 'text-jelly-mint' : 'text-hazard-white/20'} transition-colors`} />
        </div>

        {selected.map(item => (
          <span key={item} className="bg-jelly-mint text-absolute-black verge-label-mono text-[9px] px-3 py-1.5 rounded-[2px] font-black flex items-center gap-2 animate-in zoom-in-95 duration-300 shadow-[0_5px_15px_rgba(60,255,208,0.1)]">
            {renderLabelContent(item, true)}
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(selected.filter(i => i !== item)); }} 
              className="hover:bg-absolute-black/10 rounded-full p-0.5 transition-colors"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none verge-label-mono text-[10px] text-hazard-white placeholder:text-secondary-text px-2 font-black tracking-widest"
          placeholder={selected.length === 0 ? placeholder : ""}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
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
          <div 
            ref={listRef}
            className="max-h-80 overflow-y-auto py-3 styled-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <Search size={32} className="mx-auto text-hazard-white/5 mb-4" />
                <div className="verge-label-mono text-secondary-text text-[10px] uppercase tracking-widest">Aucun résultat</div>
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div 
                  key={option} 
                  className={`px-8 py-4 text-[10px] flex items-center justify-between transition-all cursor-pointer verge-label-mono uppercase tracking-wider ${
                    index === activeIndex ? 'bg-jelly-mint text-absolute-black font-black' : 
                    selected.includes(option) ? 'text-jelly-mint font-black bg-jelly-mint/5' : 'text-secondary-text hover:bg-hazard-white/5 hover:text-hazard-white'
                  }`}
                  onClick={(e) => { e.stopPropagation(); toggleOption(option); }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex items-center gap-4">
                    {selected.includes(option) ? (
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${index === activeIndex ? 'border-absolute-black' : 'border-jelly-mint'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${index === activeIndex ? 'bg-absolute-black' : 'bg-jelly-mint'}`} />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-hazard-white/5" />
                    )}
                    {renderLabelContent(option, false, index === activeIndex)}
                  </div>
                  {selected.includes(option) && <Check size={14} className={`${index === activeIndex ? 'text-absolute-black' : 'text-jelly-mint'} shrink-0 ml-4`} />}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MultiSelectWithChips;
