import React, { useState } from 'react';
import { Text } from './Text';
import { cn } from '@/lib/utils';

export type AccentColor = 'blue' | 'emerald' | 'rose' | 'amber' | 'teal' | 'indigo' | 'purple' | 'zinc';

interface FormSectionProps {
 title: string;
 children: React.ReactNode;
 isAdvanced?: boolean;
 accentColor?: AccentColor;
 initiallyExpanded?: boolean;
}

const colorMap: Record<AccentColor, { text: string, hover: string }> = {
 blue: { text: 'text-blue-600 dark:text-blue-500', hover: 'group-hover:text-blue-700 dark:group-hover:text-blue-400' },
 emerald: { text: 'text-emerald-600 dark:text-emerald-500', hover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400' },
 rose: { text: 'text-rose-600 dark:text-rose-500', hover: 'group-hover:text-rose-700 dark:group-hover:text-rose-400' },
 amber: { text: 'text-amber-600 dark:text-amber-500', hover: 'group-hover:text-amber-700 dark:group-hover:text-amber-400' },
 teal: { text: 'text-teal-600 dark:text-teal-500', hover: 'group-hover:text-teal-700 dark:group-hover:text-teal-400' },
 indigo: { text: 'text-indigo-600 dark:text-indigo-500', hover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-400' },
 purple: { text: 'text-purple-600 dark:text-purple-500', hover: 'group-hover:text-purple-700 dark:group-hover:text-purple-400' },
 zinc: { text: 'text-zinc-600 dark:text-zinc-500', hover: 'group-hover:text-zinc-700 dark:group-hover:text-zinc-400' }
};

export const FormSection: React.FC<FormSectionProps> = ({ title, children, isAdvanced = false, accentColor = 'blue', initiallyExpanded }) => {
 const [isExpanded, setIsExpanded] = useState(initiallyExpanded ?? !isAdvanced);
 const colors = colorMap[accentColor] || colorMap.blue;

 return (
 <div>
 <div 
 className={`flex items-center justify-between mb-3 ${isAdvanced ? 'cursor-pointer select-none group' : ''}`}
 onClick={() => isAdvanced && setIsExpanded(!isExpanded)}
 >
 <Text 
 variant="heading" 
 className={cn("transition-colors", colors.text, isAdvanced && colors.hover)}
 >
 {title}
 </Text>

 {isAdvanced && (
 <Text variant="label" as="span" className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors font-semibold">
 {isExpanded ? 'Hide' : 'Show'}
 </Text>
 )}
 </div>
 
 {isExpanded && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
 {children}
 </div>
 )}
 </div>
 );
};
