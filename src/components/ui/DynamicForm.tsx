import React, { useCallback } from 'react';
import { FormSection, AccentColor } from './FormSection';
import { FormField, FormFieldProps } from './FormField';

export interface FormSchemaField extends Omit<FormFieldProps, 'value' | 'onChange'> {
 // Add any schema specific additions here if needed
}

export interface FormSchemaSection {
 id: string;
 title: string;
 fields: FormSchemaField[];
 isAdvanced?: boolean;
 initiallyExpanded?: boolean;
}

interface DynamicFormProps {
 id?: string;
 sections: FormSchemaSection[];
 formData: Record<string, any>;
 onChange: (name: string, value: any) => void;
 onSubmit?: (e: React.FormEvent) => void;
 errors?: Record<string, string>;
 isReadonly?: boolean;
 accentColor?: AccentColor;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
 id = 'dynamic-form',
 sections,
 formData,
 onChange,
 onSubmit,
 errors = {},
 isReadonly = false,
 accentColor = 'blue',
}) => {
 const handleChange = useCallback((name: string, value: any) => {
 onChange(name, value);
 }, [onChange]);

 return (
 <div id={id} className="space-y-8">
 {sections.map((section) => {
 // Skip empty sections
 if (!section.fields || section.fields.length === 0) return null;
 
 return (
 <FormSection
 key={section.id}
 title={section.title}
 isAdvanced={section.isAdvanced}
 initiallyExpanded={section.initiallyExpanded}
 accentColor={accentColor}
 >
 {section.fields.map((field) => (
 <FormField
 key={field.name}
 {...field}
 value={formData[field.name]}
 onChange={handleChange}
 error={errors[field.name]}
 disabled={isReadonly || field.disabled}
 />
 ))}
 </FormSection>
 );
 })}
 </div>
 );
};
