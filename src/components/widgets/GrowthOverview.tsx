"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Target, CreditCard, ShoppingBag, Package, Calendar } from 'lucide-react';
import { calculateCategoryScores, getOverallGrowthScore, getGrowthTrendData, CategoryScore, ScoreRange, ScoreFilter } from '@/lib/growth-score';
import { SectionTitle, Text, Description } from '../ui/Text';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { MONTHS, YEARS } from '@/lib/constants';

export function GrowthOverview() {
  const [filter, setFilter] = useState<ScoreFilter>({ range: '7D' });
  const [scores, setScores] = useState<CategoryScore[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setScores(calculateCategoryScores(filter));

    const handleLocal = (e: any) => {
      setScores(calculateCategoryScores(filter));
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, [filter]);

  const overallScore = useMemo(() => getOverallGrowthScore(scores), [scores]);
  const trendData = useMemo(() => getGrowthTrendData(filter), [filter]);

  if (!mounted) return null;

  const ranges: { label: string; value: ScoreRange }[] = [
    { label: '7D', value: '7D' },
    { label: '1M', value: '1M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: 'Custom', value: 'Custom' }
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Main Score */}
      <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
        <div className="flex flex-col gap-1">
          <SectionTitle className="mb-0">Life Growth Index</SectionTitle>
          <Description>A composite metric reflecting your progress across habits, projects, finances, and systems.</Description>
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-700/30">
              {ranges.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setFilter({ ...filter, range: r.value })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filter.range === r.value 
                      ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-400 shadow-sm shadow-zinc-200/50 dark:shadow-none' 
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {filter.range === 'Custom' && (
              <div className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                <MultiSelectDropdown 
                  label="Month" 
                  options={MONTHS} 
                  selected={filter.month !== undefined ? [filter.month] : [new Date().getMonth()]} 
                  onChange={(val) => setFilter({ ...filter, month: val[val.length - 1] })}
                />
                <MultiSelectDropdown 
                  label="Year" 
                  options={YEARS} 
                  selected={filter.year !== undefined ? [filter.year] : [new Date().getFullYear()]} 
                  onChange={(val) => setFilter({ ...filter, year: val[val.length - 1] })}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm border-l-4 border-l-teal-500 min-w-[200px]">
          <div className="flex flex-col">
            <Text variant="label" className="text-[10px] uppercase tracking-wider mb-0.5">Overall Score</Text>
            <div className="flex items-baseline gap-2">
              <Text variant="metric" className="text-3xl leading-none text-teal-600 dark:text-teal-400">{overallScore}</Text>
              <Text variant="label" className="text-zinc-400">/ 100</Text>
            </div>
          </div>
          <div className={`p-2 rounded-xl scale-110 ${overallScore > 70 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900/60 p-6 md:p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-6">
             <Text variant="label" className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                <Calendar size={14} className="text-teal-500" />
                Growth Trend
             </Text>
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <span>{filter.range === 'Custom' ? `${MONTHS[filter.month || 0]} ${filter.year || 2026}` : `${filter.range} PERFORMANCE`}</span>
             </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#A1A1AA' }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#A1A1AA' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }} 
                  itemStyle={{ color: '#14b8a6' }}
                  cursor={{ stroke: '#14b8a6', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#14b8a6" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Radar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/60 p-6 md:p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-2">
             <Text variant="label" className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Focus Balance</Text>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={scores}>
                <PolarGrid stroke="#e4e4e7" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#71717A', fontWeight: '500' }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={false} 
                  axisLine={false} 
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.4}
                  animationDuration={1500}
                />
                <Tooltip 
                   contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Mini Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {scores.map((s, i) => (
          <div 
            key={s.name} 
            className="group flex flex-col p-4 bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 hover:border-teal-500/30 transition-all cursor-default"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: s.color }}
              >
                {s.name === 'Habits' && <Target size={16} />}
                {s.name === 'Projects' && <Package size={16} />}
                {s.name === 'Finance' && <CreditCard size={16} />}
                {s.name === 'Expenses' && <ShoppingBag size={16} />}
                {s.name === 'Inventory' && <Package size={16} />}
              </div>
              <Text variant="bodySmall" className="font-bold text-zinc-900 dark:text-zinc-100">{s.score}%</Text>
            </div>
            <Text variant="label" className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-teal-600 transition-colors uppercase tracking-tight">{s.name}</Text>
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
               <div 
                className="h-full transition-all duration-1000 ease-out"
                style={{ width: `${s.score}%`, backgroundColor: s.color }}
               />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
