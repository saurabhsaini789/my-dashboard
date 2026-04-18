"use client";

import React, { useState, useMemo } from 'react';
import { useWardrobe } from '@/hooks/useWardrobe';
import { WardrobeItem, PurchaseClassification, WARDROBE_CLASSIFICATIONS } from '@/types/wardrobe';
import { WardrobeFormModal } from '@/components/wardrobe/WardrobeFormModal';
import { 
  Plus, Edit2, Trash2, Tag, Calendar, Activity, RefreshCw, Layers, 
  DollarSign, Archive, Focus, LayoutGrid, List, Shirt, Footprints, 
  Watch, ShoppingBag, ArrowRight, CheckCircle2, XCircle, HelpCircle,
  TrendingUp, TrendingDown, Star
} from 'lucide-react';
import { useSyncStatus } from '@/context/SyncContext';
import { PageTitle, SectionTitle, Text, Description } from '@/components/ui/Text';

export default function WardrobePage() {
  const { items, isLoaded, addItem, updateItem, deleteItem } = useWardrobe();
  const { syncStatus, isDevelopment } = useSyncStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');

  const handleEdit = (item: WardrobeItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItem(id);
    }
  };

  const handleMoveClassification = (id: string, classification: PurchaseClassification) => {
    updateItem(id, { purchaseClassification: classification });
  };

  const handleSave = (itemData: Omit<WardrobeItem, 'id' | 'createdAt'>) => {
    if (editingItem) {
      updateItem(editingItem.id, itemData);
    } else {
      addItem(itemData);
    }
  };

  // --- Helpers ---
  const calcValueScore = (item: WardrobeItem) => {
    if (!item.cost || item.cost <= 0) return 0;
    const start = new Date(item.purchaseDate).getTime();
    if (isNaN(start)) return 0;
    
    const end = item.lastReplacedDate 
      ? new Date(item.lastReplacedDate).getTime() 
      : new Date().getTime();
    
    const diffDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    return diffDays / item.cost;
  };

  const getCategoryIcon = (category: string, size = 16) => {
    const c = category.toLowerCase();
    if (c.includes('top')) return <Shirt size={size} />;
    if (c.includes('footwear')) return <Footprints size={size} />;
    if (c.includes('outerwear')) return <Layers size={size} />;
    if (c.includes('accessories')) return <Watch size={size} />;
    return <Tag size={size} />;
  };

  // --- Metrics Calculations ---
  const activeCount = items.filter(i => i.status === 'Active').length;
  const activeRatio = items.length > 0 ? (activeCount / items.length) * 100 : 0;
  
  const totalCost = items.reduce((a, b) => a + (Number(b.cost) || 0), 0);
  const avgValueScore = items.length > 0 
    ? items.reduce((acc, curr) => acc + calcValueScore(curr), 0) / items.length 
    : 0;

  // --- Insights Logic ---
  const categoryEfficiency = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category)));
    return cats.map(cat => {
      const catItems = items.filter(i => i.category === cat);
      const avgScore = catItems.reduce((acc, curr) => acc + calcValueScore(curr), 0) / catItems.length;
      return { category: cat, score: avgScore };
    }).sort((a, b) => b.score - a.score);
  }, [items]);

  const replacementPipeline = useMemo(() => {
    const now = new Date();
    return items.filter(item => {
      if (!item.replacementValue || !item.replacementUnit) return false;
      const purchaseDate = new Date(item.purchaseDate);
      const replacementDate = new Date(purchaseDate);
      
      if (item.replacementUnit === 'Days') replacementDate.setDate(purchaseDate.getDate() + item.replacementValue);
      if (item.replacementUnit === 'Months') replacementDate.setMonth(purchaseDate.getMonth() + item.replacementValue);
      if (item.replacementUnit === 'Years') replacementDate.setFullYear(purchaseDate.getFullYear() + item.replacementValue);
      
      return replacementDate < now && item.status === 'Active';
    });
  }, [items]);

  const spendingByReason = useMemo(() => {
    const reasons = ['Replacement', 'New Need', 'Impulse', 'Upgrade'];
    return reasons.map(reason => {
      const total = items.filter(i => i.purchaseReason === reason)
        .reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
      return { reason, total };
    });
  }, [items]);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  
  // Segmentation Logic
  const segmentedItems = useMemo(() => {
    const filtered = filterCategory === 'All' 
      ? items 
      : items.filter(i => i.category === filterCategory);

    return {
      fixed: filtered.filter(i => i.purchaseClassification === 'Fixed')
        .sort((a, b) => calcValueScore(b) - calcValueScore(a)),
      oneTime: filtered.filter(i => i.purchaseClassification === 'One-time'),
      testing: filtered.filter(i => i.purchaseClassification === 'Testing' || !i.purchaseClassification)
    };
  }, [items, filterCategory]);

  if (!isLoaded) return <div className="text-center py-20 text-zinc-500">Loading wardrobe inventory...</div>;

  const InsightsSection = () => {
    if (items.length === 0) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Efficiency Chart */}
        <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={18} />
            <SectionTitle>Value Efficiency</SectionTitle>
          </div>
          <div className="space-y-4">
            {categoryEfficiency.slice(0, 4).map(cat => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-600 dark:text-zinc-400">{cat.category}</span>
                  <span className="text-emerald-500">{cat.score.toFixed(1)} score</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (cat.score / (avgValueScore * 2 + 0.1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Replacement Pipeline */}
        <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 text-amber-500">
            <RefreshCw size={18} />
            <SectionTitle>Replacement Pipeline</SectionTitle>
          </div>
          {replacementPipeline.length > 0 ? (
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {replacementPipeline.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="text-amber-600 dark:text-amber-400 shrink-0">
                      {getCategoryIcon(item.category, 14)}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.itemName}</span>
                  </div>
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-1 px-2 text-[10px] bg-amber-500 text-white rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    RESOLVE
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-zinc-400">
              <CheckCircle2 size={32} className="mb-2 opacity-20" />
              <p className="text-[10px] font-medium">All items within lifecycle</p>
            </div>
          )}
        </div>

        {/* Spending Habits */}
        <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 text-blue-500">
            <DollarSign size={18} />
            <SectionTitle>Spending Habits</SectionTitle>
          </div>
          <div className="flex items-end gap-2 h-32 pt-4">
            {spendingByReason.map(habit => (
              <div key={habit.reason} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex items-end justify-center h-full sm:px-1">
                  <div 
                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-1000 ${habit.reason === 'Impulse' ? 'bg-rose-500' : 'bg-blue-500 dark:bg-blue-600'}`}
                    style={{ height: `${totalCost > 0 ? (habit.total / totalCost) * 100 : 0}%` }}
                  />
                  <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[8px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap">
                    ${habit.total}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 font-bold rotate-[-45deg] origin-top sm:rotate-0 truncate w-full text-center">
                  {habit.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const InventorySection = ({ title, description, items: SectionItems, icon: Icon, accentColor }: { 
    title: string, 
    description: string, 
    items: WardrobeItem[], 
    icon: any,
    accentColor: string
  }) => {
    if (SectionItems.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${accentColor}-50 dark:bg-${accentColor}-500/10 text-${accentColor}-600 dark:text-${accentColor}-400`}>
            <Icon size={20} />
          </div>
          <div>
            <SectionTitle>{title} ({SectionItems.length})</SectionTitle>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        </div>

        {viewType === 'grid' ? (
          <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SectionItems.map(item => {
                const score = calcValueScore(item);
                return (
                  <div 
                    key={item.id} 
                    onClick={() => handleEdit(item)}
                    className="group p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 relative shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    {/* ... item card content ... */}
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }} 
                        className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 shrink-0">
                        {getCategoryIcon(item.category, 20)}
                      </div>
                      <div className="pr-12">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{item.itemName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">{item.type}</span>
                          {score > 0 && (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <TrendingUp size={10} />
                              {score.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Extended Details */}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-[10px]">
                      <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <p className="text-zinc-500 uppercase font-bold text-[8px] mb-1">Fit</p>
                        <p className="font-medium truncate">{item.fit || '-'}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <p className="text-zinc-500 uppercase font-bold text-[8px] mb-1">Occasion</p>
                        <p className="font-medium truncate">{item.occasion || '-'}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <p className="text-zinc-500 uppercase font-bold text-[8px] mb-1">Season</p>
                        <p className="font-medium truncate">{item.season || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Cost</p>
                        <p className="text-sm font-semibold">${item.cost}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Reason</p>
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 line-clamp-1">{item.purchaseReason || '-'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {title !== 'Fixed Essentials' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveClassification(item.id, 'Fixed'); }}
                          className="flex-1 text-[10px] py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-100 transition-colors"
                        >
                          MOVE TO FIXED
                        </button>
                      )}
                      {title !== 'One-time Reference' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveClassification(item.id, 'One-time'); }}
                          className="flex-1 text-[10px] py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 transition-colors"
                        >
                          DO NOT REBUY
                        </button>
                      )}
                      {title === 'Fixed Essentials' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveClassification(item.id, 'Testing'); }}
                          className="flex-1 text-[10px] py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold hover:bg-zinc-200 transition-colors"
                        >
                          REVERT TO TEST
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm">
            <table className="min-w-full text-sm text-left sticky-header">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Freq/Cond</th>
                  <th className="px-4 py-3">Occasion</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {SectionItems.map(item => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleEdit(item)}
                    className="hover:bg-zinc-100/50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className="text-zinc-400">{getCategoryIcon(item.category, 14)}</div>
                        <span className="font-medium leading-none">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{item.type}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      <span className="whitespace-nowrap">{item.frequency?.split(' ')[0]} / {item.condition}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{item.occasion}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${calcValueScore(item) > avgValueScore ? 'text-emerald-500' : 'text-zinc-500'}`}>
                        {calcValueScore(item).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">${item.cost}</td>
                    <td className="px-4 py-3">
                      <div className="flex text-amber-400 text-[10px]">
                        {'★'.repeat(item.rating || 0)}{'☆'.repeat(5 - (item.rating || 0))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12 transition-colors duration-200">
      <div className="mx-auto w-full max-w-7xl space-y-10 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col items-start">
            <PageTitle>Wardrobe Intelligence</PageTitle>
            <Description>Optimizing clothing infrastructure through value-mapping.</Description>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Text variant="label" className="mb-4 block">Wardrobe Size</Text>
            <Text variant="metric">{items.length}</Text>
            <Text variant="label" className={`mt-2 ${activeRatio > 70 ? 'text-green-500' : 'text-amber-500'}`}>
              {activeRatio.toFixed(0)}% ACTIVE
            </Text>
          </div>
          <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Text variant="label" className="mb-4 block">Total Investment</Text>
            <Text variant="metric">${totalCost.toFixed(0)}</Text>
            <Text variant="label" className="mt-2 text-zinc-500 uppercase">Replacement Cost</Text>
          </div>
          <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Text variant="label" className="mb-4 block">Avg Value Score</Text>
            <Text variant="metric">{avgValueScore.toFixed(1)}</Text>
            <Text variant="label" className="mt-2 text-zinc-500 uppercase">Days / Dollar</Text>
          </div>
          <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-lg">
              <CheckCircle2 size={24} />
              {segmentedItems.fixed.length} FIXED
            </div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-lg mt-2">
              <XCircle size={24} />
              {segmentedItems.oneTime.length} STOP
            </div>
          </div>
        </div>

        {/* Dynamic Insights Dashboard */}
        <InsightsSection />

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-zinc-900/60 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 gap-4">
          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto p-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterCategory === cat 
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md' 
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 p-1">
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus size={14} />
              ADD
            </button>
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewType === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900' : 'text-zinc-500'}`}
              >
                <LayoutGrid size={14} />
              </button>
              <button 
                onClick={() => setViewType('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewType === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900' : 'text-zinc-500'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Sections */}
        <div className="space-y-16">
          <InventorySection 
            title="Fixed Essentials" 
            description="High-value items that survived the test of time. Buy these again."
            items={segmentedItems.fixed}
            icon={CheckCircle2}
            accentColor="emerald"
          />
          
          <InventorySection 
            title="General Inventory & Testing" 
            description="New purchases or core items still being evaluated for long-term value."
            items={segmentedItems.testing}
            icon={HelpCircle}
            accentColor="blue"
          />

          <InventorySection 
            title="Referential Archive (One-time)" 
            description="Failed experiments or one-time utility items. Do not rebuy."
            items={segmentedItems.oneTime}
            icon={XCircle}
            accentColor="rose"
          />
        </div>

        {items.length === 0 && (
          <div className="text-center py-40 bg-white dark:bg-zinc-900/60 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <ShoppingBag size={48} className="mx-auto text-zinc-300 mb-4" />
            <p className="text-zinc-500 font-medium">Your inventory is empty. Start adding items to map their value.</p>
          </div>
        )}

        <WardrobeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingItem}
        />
      </div>
    </main>
  );
}
