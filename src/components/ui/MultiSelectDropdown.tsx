"use client";

import React, { useState, useEffect, useRef } from 'react';

interface MultiSelectDropdownProps {
    label: string;
    options: any[];
    selected: any[];
    onChange: (items: any[]) => void;
}

export function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: any) => {
        if (selected.includes(option)) {
            if (selected.length > 1) onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const displayText = selected.length === 0 ? `Select ${label}` : selected.length === options.length ? `All ${label}s` : `${selected.length} ${label}${selected.length > 1 ? 's' : ''}`;

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-6 py-3 rounded-2xl min-w-[160px] hover:shadow-lg transition-all group h-[54px]"
            >
                <div className="flex flex-col items-start px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">{label}</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{displayText}</span>
                </div>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 md:left-0 mt-2 min-w-[200px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-2xl z-[50] py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-2 space-y-1">
                        {options.map((option, idx) => {
                            const isSelected = selected.includes(typeof option === 'string' ? idx : option);
                            const val = typeof option === 'string' ? idx : option;
                            const labelStr = typeof option === 'string' ? option : option.toString();
                            
                            return (
                                <button 
                                    key={labelStr}
                                    onClick={() => toggleOption(val)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${isSelected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black shadow-lg shadow-zinc-200/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500'}`}
                                >
                                    <span className="text-xs font-bold uppercase tracking-widest">{labelStr}</span>
                                    {isSelected && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
