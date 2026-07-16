import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  required = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    const searchLower = search.toLowerCase();
    const labelMatch = opt.label.toLowerCase().includes(searchLower);
    const subLabelMatch = opt.subLabel ? opt.subLabel.toLowerCase().includes(searchLower) : false;
    const valueMatch = opt.value.toLowerCase().includes(searchLower);
    return labelMatch || subLabelMatch || valueMatch;
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold bg-white flex items-center justify-between shadow-xs select-none ${
          isOpen
            ? "border-slate-400 ring-2 ring-slate-400/10"
            : "border-slate-200 hover:border-slate-350"
        } ${disabled ? "pointer-events-none" : "cursor-pointer"}`}
      >
        <div className="truncate text-left pr-2 flex-1">
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="text-slate-800 font-bold truncate leading-tight">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-[10px] text-slate-450 truncate font-medium mt-0.5 leading-none">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!required && value && (
            <button
              type="button"
              onClick={clearSelection}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-[100] mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[280px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 py-1 font-semibold"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-[220px] py-1 divide-y divide-slate-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "bg-slate-50 text-slate-900 font-extrabold"
                        : "text-slate-700 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex-1 truncate pr-2">
                      <span className="block truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="block text-[10px] text-slate-450 font-normal truncate mt-0.5 leading-normal">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-slate-400 text-[11px] font-medium">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
