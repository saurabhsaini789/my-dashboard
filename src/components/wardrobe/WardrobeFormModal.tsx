import React, { useState, useEffect } from 'react';
import { WardrobeItem, WardrobeCategory, WARDROBE_CATEGORIES, CATEGORY_TYPES, WARDROBE_COLOURS, WARDROBE_SEASONS, WARDROBE_OCCASIONS, WARDROBE_FITS, WARDROBE_FREQUENCIES, WARDROBE_STATUSES, WARDROBE_CONDITIONS, WARDROBE_VERSATILITIES, WARDROBE_PURCHASE_REASONS, WARDROBE_OUTFIT_ROLES, WARDROBE_CLASSIFICATIONS, WARDROBE_REPLACEMENT_UNITS } from '@/types/wardrobe';
import { Modal } from '@/components/ui/Modal';
import { DynamicForm, FormSchemaSection } from '@/components/ui/DynamicForm';

interface WardrobeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<WardrobeItem, 'id' | 'createdAt'>) => void;
  initialData?: WardrobeItem | null;
}

export function WardrobeFormModal({ isOpen, onClose, onSave, initialData }: WardrobeFormModalProps) {
  const [formData, setFormData] = useState<Partial<WardrobeItem>>({
    itemName: '',
    category: 'Tops',
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
    lastReplacedDate: '',
    purchaseClassification: 'Testing',
    outfitRole: 'Support (used sometimes)',
    replacementValue: 1,
    replacementUnit: 'Years',
    rating: 3,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({
          itemName: '',
          category: 'Tops',
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
          lastReplacedDate: '',
          purchaseClassification: 'Testing',
          outfitRole: 'Support (used sometimes)',
          replacementValue: 1,
          replacementUnit: 'Years',
          rating: 3,
        });
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (name: string, value: any) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<WardrobeItem, 'id' | 'createdAt'>);
    onClose();
  };

  const currentCategory = (formData.category as WardrobeCategory) || 'Tops';
  const availableTypes = CATEGORY_TYPES[currentCategory] || [];

  const sections: FormSchemaSection[] = [
    {
      id: 'basicInfo',
      title: 'Basic info',
      fields: [
        { name: 'itemName', label: 'Item Name', type: 'text', fullWidth: true, required: true, placeholder: "e.g., Black Levi's 501" },
        { name: 'category', label: 'Category', type: 'select', options: WARDROBE_CATEGORIES },
        { name: 'type', label: 'Type', type: 'select', options: availableTypes },
      ]
    },
    {
      id: 'appearance',
      title: 'Appearance & fit',
      fields: [
        { name: 'colour', label: 'Colour', type: 'select', options: WARDROBE_COLOURS },
        { name: 'fit', label: 'Fit', type: 'select', options: WARDROBE_FITS },
        { name: 'condition', label: 'Condition', type: 'select', options: WARDROBE_CONDITIONS },
        { name: 'season', label: 'Season', type: 'select', options: WARDROBE_SEASONS },
      ]
    },
    {
      id: 'usage',
      title: 'Usage',
      fields: [
        { name: 'occasion', label: 'Occasion', type: 'select', options: WARDROBE_OCCASIONS },
        { name: 'status', label: 'Status', type: 'select', options: WARDROBE_STATUSES },
        { name: 'frequency', label: 'Frequency', type: 'select', options: WARDROBE_FREQUENCIES },
        { name: 'versatility', label: 'Versatility', type: 'select', options: WARDROBE_VERSATILITIES },
        { name: 'outfitRole', label: 'Outfit Role', type: 'select', fullWidth: true, options: WARDROBE_OUTFIT_ROLES },
      ]
    },
    {
      id: 'purchase',
      title: 'Purchase info',
      isAdvanced: true,
      initiallyExpanded: true,
      fields: [
        { name: 'cost', label: 'Cost ($)', type: 'number', min: 0, step: 0.01 },
        { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
        { name: 'lastReplacedDate', label: 'Date Replaced/Expired', type: 'date' },
        { name: 'purchaseClassification', label: 'Classification', type: 'select', fullWidth: true, options: WARDROBE_CLASSIFICATIONS as unknown as string[] },
        { name: 'purchaseReason', label: 'Purchase Reason', type: 'select', fullWidth: true, options: WARDROBE_PURCHASE_REASONS as unknown as string[] },
        { name: 'replacementValue', label: 'Cycle Value', type: 'number', min: 1, max: 31 },
        { name: 'replacementUnit', label: 'Cycle Unit', type: 'select', options: WARDROBE_REPLACEMENT_UNITS as unknown as string[] },
      ]
    },
    {
      id: 'feedback',
      title: 'Feedback',
      fields: [
        { name: 'rating', label: 'Buy Again Rating', type: 'rating', fullWidth: true }
      ]
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit wardrobe item' : 'Add new item'}
      onSubmit={handleSubmit}
      submitText={initialData ? 'Save Changes' : 'Add Item'}
      accentColor="zinc"
    >
      <DynamicForm
        sections={sections}
        formData={formData}
        accentColor="zinc"
        onChange={handleChange}
      />
    </Modal>
  );
}
