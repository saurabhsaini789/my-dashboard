"use client";

import React, { useState, useMemo } from 'react';
import { useWardrobe } from '@/hooks/useWardrobe';
import { WardrobeItem } from '@/types/wardrobe';
import { WardrobeFormModal } from '@/components/wardrobe/WardrobeFormModal';
import { Plus, Edit2, Trash2, Tag, Calendar, Activity, RefreshCw, Layers, DollarSign, Archive, Focus, LayoutGrid, List } from 'lucide-react';
import { useSyncStatus } from '@/context/SyncContext';

export default function WardrobePage() {
  const { items, isLoaded, addItem, updateItem, deleteItem } = useWardrobe();
  const { syncStatus, isLocalhost } = useSyncStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
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

  const handleSave = (itemData: Omit<WardrobeItem, 'id' | 'createdAt'>) => {
    if (editingItem) {
      updateItem(editingItem.id, itemData);
    } else {
      addItem(itemData);
    }
  };

  // --- Metrics Calculations ---
  const activeCount = items.filter(i => i.status === 'Active').length;
  const activeRatio = items.length > 0 ? (activeCount / items.length) * 100 : 0;
  
  const coreCount = items.filter(i => i.outfitRole?.startsWith('Core')).length;
  const supportCount = items.filter(i => i.outfitRole?.startsWith('Support')).length;
  const singleUseCount = items.filter(i => i.outfitRole?.startsWith('Single-use')).length;

  const coreRatio = items.length > 0 ? (coreCount / items.length) * 100 : 0;
  const supportRatio = items.length > 0 ? (supportCount / items.length) * 100 : 0;
  const singleUseRatio = items.length > 0 ? (singleUseCount / items.length) * 100 : 0;

  const highFreqCount = items.filter(i => i.frequency?.startsWith('Very High') || i.frequency?.startsWith('High')).length;
  const highFreqRatio = items.length > 0 ? (highFreqCount / items.length) * 100 : 0;

  const deadItems = items.filter(i => i.frequency?.startsWith('Low') || i.status === 'Inactive' || i.status === 'Stored (seasonal)');
  const replaceSoonItems = items.filter(i => i.condition === 'Replace Soon');

  const versatilityScore = items.length > 0 ? items.reduce((acc, curr) => {
    if (curr.versatility?.startsWith('High')) return acc + 3;
    if (curr.versatility?.startsWith('Medium')) return acc + 2;
    return acc + 1;
  }, 0) / items.length : 0;

  const totalCost = items.reduce((a, b) => a + (Number(b.cost) || 0), 0);

  // Rough cost per wear estimation based on frequency over 1 year
  const calcCPW = (cost: number, freq: string) => {
    if (!cost) return 0;
    let wearsPerYear = 1;
    if (freq.startsWith('Very High')) wearsPerYear = 50;
    else if (freq.startsWith('High')) wearsPerYear = 25;
    else if (freq.startsWith('Medium')) wearsPerYear = 12;
    else if (freq.startsWith('Low')) wearsPerYear = 2; // conservative
    return cost / wearsPerYear;
  };

  const avgCpw = items.length > 0 ? items.reduce((acc, curr) => acc + calcCPW(Number(curr.cost), curr.frequency), 0) / items.length : 0;

  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category)))];
  const filteredItems = filterCategory === 'ALL' ? items : items.filter(i => i.category === filterCategory);

  if (!isLoaded) return <div className="text-center py-20 text-zinc-500">Loading wardrobe array...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-12 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            Wardrobe Inventory
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage and optimize your clothing investments.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Metrics Dashboard */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Wardrobe Size</h3>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><Layers size={18} /></div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{items.length}</div>
            <div className={`text-xs mt-2 font-medium ${activeRatio > 70 ? 'text-green-500' : 'text-amber-500'}`}>
              {activeRatio.toFixed(0)}% Active ({activeCount} items)
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Composition</h3>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"><Focus size={18} /></div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{coreRatio.toFixed(0)}% <span className="text-sm text-zinc-500 font-medium">Core</span></div>
            <div className="text-xs mt-2 text-zinc-500 font-medium flex gap-3">
              <span>{supportRatio.toFixed(0)}% Support</span>
              <span className={singleUseRatio > 10 ? 'text-red-500' : ''}>{singleUseRatio.toFixed(0)}% Single-use</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Utilization</h3>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"><Activity size={18} /></div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{highFreqRatio.toFixed(0)}%</div>
            <div className="text-xs mt-2 text-zinc-500 font-medium flex justify-between">
              <span>High Freq.</span>
              <span className="font-semibold">{versatilityScore.toFixed(1)}/3 Versatility</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Total Value</h3>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><DollarSign size={18} /></div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">${totalCost.toFixed(0)}</div>
            <div className="text-xs mt-2 text-zinc-500 font-medium">
              ~${avgCpw.toFixed(2)} Avg Cost/Wear (1yr est.)
            </div>
          </div>
        </div>
      )}

      {/* Actionable List Sections */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dead Items List */}
          {deadItems.length > 0 && (
            <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-5">
              <h4 className="text-rose-800 dark:text-rose-400 font-semibold mb-3 flex items-center gap-2">
                <Archive size={16} /> Declutter Candidates ({deadItems.length})
              </h4>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {deadItems.map(item => (
                  <li key={`dead-${item.id}`} className="text-sm flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span className="truncate">{item.itemName}</span>
                    <span className="text-xs bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md whitespace-nowrap ml-2">
                      {item.frequency?.split(' ')[0]} / {item.status.split(' ')[0]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Replacement Pipeline List */}
          {replaceSoonItems.length > 0 && (
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-5">
              <h4 className="text-amber-800 dark:text-amber-400 font-semibold mb-3 flex items-center gap-2">
                <RefreshCw size={16} /> Replacement Pipeline ({replaceSoonItems.length})
              </h4>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {replaceSoonItems.map(item => (
                  <li key={`repl-${item.id}`} className="text-sm flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span className="truncate">{item.itemName}</span>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md whitespace-nowrap ml-2">
                      Replace Soon
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Inventory List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Inventory</h2>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar items-center">
            {/* View Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mr-2 shrink-0">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewType === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewType('table')}
                className={`p-1.5 rounded-md transition-colors ${viewType === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
              >
                <List size={16} />
              </button>
            </div>
            
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterCategory === cat 
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-500">No items found in this category.</p>
          </div>
        ) : viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className={`p-4 rounded-xl border relative shadow-sm transition-all hover:shadow-md ${
                  item.status === 'Inactive' || item.status === 'Discarded'
                    ? 'bg-zinc-50/50 border-zinc-200/50 dark:bg-zinc-900/20 dark:border-zinc-800/50 opacity-70'
                    : 'bg-white border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800'
                }`}
              >
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity group-hover:opacity-100">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="pr-16">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{item.itemName}</h3>
                  <div className="flex items-center gap-2 mt-1 -ml-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {item.type}
                    </span>
                    <div className="flex text-amber-400 text-xs tracking-widest">
                      {'★'.repeat(item.rating || 0)}{'☆'.repeat(5 - (item.rating || 0))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-5 text-sm">
                  <div className="flex items-start gap-2">
                    <Tag size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-200 line-clamp-1">{item.outfitRole?.split(' ')[0]}</p>
                      <p className="text-zinc-500 text-xs">Role</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Activity size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-200 line-clamp-1">{item.frequency?.split(' ')[0]}</p>
                      <p className="text-zinc-500 text-xs">Freq / {item.condition}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-200">{item.cost > 0 ? `$${item.cost}` : '-'}</p>
                      <p className="text-zinc-500 text-xs">Cost</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-200 font-medium text-xs px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md inline-block">
                        {item.status?.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Item Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Freq / Cond</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{item.itemName}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{item.type}</span>
                        {item.status !== 'Active' && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{item.status.split(' ')[0]}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{item.cost > 0 ? `$${item.cost}` : '-'}</td>
                    <td className="px-4 py-3 text-zinc-500">{item.frequency?.split(' ')[0]} / <span className={item.condition === 'Replace Soon' ? 'text-amber-500' : ''}>{item.condition}</span></td>
                    <td className="px-4 py-3 text-amber-400 tracking-widest text-xs">{'★'.repeat(item.rating || 0)}{'☆'.repeat(5 - (item.rating || 0))}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WardrobeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingItem}
      />
    </div>
  );
}
