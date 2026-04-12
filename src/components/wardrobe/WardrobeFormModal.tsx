import React, { useState, useEffect } from 'react';
import { WardrobeItem, WardrobeCategory, WARDROBE_CATEGORIES, CATEGORY_TYPES, WARDROBE_COLOURS, WARDROBE_SEASONS, WARDROBE_OCCASIONS, WARDROBE_FITS, WARDROBE_FREQUENCIES, WARDROBE_STATUSES, WARDROBE_CONDITIONS, WARDROBE_VERSATILITIES, WARDROBE_PURCHASE_REASONS, WARDROBE_OUTFIT_ROLES } from '@/types/wardrobe';

interface WardrobeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<WardrobeItem, 'id' | 'createdAt'>) => void;
  initialData?: WardrobeItem | null;
}

export function WardrobeFormModal({ isOpen, onClose, onSave, initialData }: WardrobeFormModalProps) {
  const [formData, setFormData] = useState<Partial<WardrobeItem>>({
    itemName: '',
    category: 'TOPS',
    type: 'T-Shirt (Solid)',
    colour: 'Black',
    season: 'All Season',
    occasion: 'Casual',
    fit: 'Regular',
    frequency: 'Medium (monthly)',
    status: 'Active',
    condition: 'Good',
    versatility: 'Medium',
    cost: 0,
    purchaseReason: 'New Need',
    purchaseDate: new Date().toISOString().split('T')[0],
    outfitRole: 'Support (used sometimes)',
    replacementCycle: '',
    rating: 3,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({
          itemName: '',
          category: 'TOPS',
          type: 'T-Shirt (Solid)',
          colour: 'Black',
          season: 'All Season',
          occasion: 'Casual',
          fit: 'Regular',
          frequency: 'Medium (monthly)',
          status: 'Active',
          condition: 'Good',
          versatility: 'Medium',
          cost: 0,
          purchaseReason: 'New Need',
          purchaseDate: new Date().toISOString().split('T')[0],
          outfitRole: 'Support (used sometimes)',
          replacementCycle: '',
          rating: 3,
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-update type when category changes to the first item in the new category
      if (name === 'category') {
        const cat = value as WardrobeCategory;
        const types = CATEGORY_TYPES[cat] || [];
        updated.type = types[0] || '';
      }
      
      return updated;
    });
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<WardrobeItem, 'id' | 'createdAt'>);
    onClose();
  };

  const currentCategory = (formData.category as WardrobeCategory) || 'TOPS';
  const availableTypes = CATEGORY_TYPES[currentCategory] || [];

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[75vh] md:max-h-[90vh] mb-20 md:mb-0">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {initialData ? 'Edit Wardrobe Item' : 'Add New Item'}
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="wardrobe-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Item Name</label>
                <input
                  required
                  type="text"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  placeholder="e.g., Black Levi's 501"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Colour</label>
                  <select
                    name="colour"
                    value={formData.colour}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_COLOURS.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fit</label>
                  <select
                    name="fit"
                    value={formData.fit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_FITS.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Condition</label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_CONDITIONS.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Season</label>
                  <select
                    name="season"
                    value={formData.season}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_SEASONS.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Occasion</label>
                  <select
                    name="occasion"
                    value={formData.occasion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_OCCASIONS.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_STATUSES.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Frequency</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_FREQUENCIES.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Versatility</label>
                  <select
                    name="versatility"
                    value={formData.versatility}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_VERSATILITIES.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Outfit Role</label>
                  <select
                    name="outfitRole"
                    value={formData.outfitRole}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_OUTFIT_ROLES.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Purchase Reason</label>
                  <select
                    name="purchaseReason"
                    value={formData.purchaseReason}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WARDROBE_PURCHASE_REASONS.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cost ($)</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleCostChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Replacement Cycle</label>
                  <input
                    type="text"
                    name="replacementCycle"
                    value={formData.replacementCycle}
                    onChange={handleChange}
                    placeholder="e.g., 2 years"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Buy Again Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(star)}
                      className={`text-2xl transition-colors ${formData.rating && formData.rating >= star ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-700 hover:text-amber-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="wardrobe-form"
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            {initialData ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
