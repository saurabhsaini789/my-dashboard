import React, { memo } from 'react';

export type FieldType = 'text' | 'select' | 'date' | 'number' | 'textarea' | 'rating';

export interface FormFieldProps {
  name: string;
  label: string;
  type?: FieldType;
  value: any;
  onChange: (name: string, value: any) => void;
  options?: string[] | { label: string; value: string }[];
  fullWidth?: boolean;
  required?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  // Custom render for overrides
  render?: (props: FormFieldProps) => React.ReactNode;
}

const FormFieldComponent: React.FC<FormFieldProps> = (props) => {
  const {
    name,
    label,
    type = 'text',
    value,
    onChange,
    options = [],
    fullWidth = false,
    required = false,
    placeholder,
    error,
    disabled = false,
    min,
    max,
    step,
    render
  } = props;

  const id = `field-${name}`;
  const baseInputStyles = `w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-zinc-200 dark:border-zinc-800 focus:ring-blue-500'
  }`;

  if (render) {
    return (
      <div className={fullWidth ? 'md:col-span-2' : ''}>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor={id} className={`block text-sm font-medium ${error ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-300'}`}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
        {render(props)}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let newValue: any = e.target.value;
    if (type === 'number') {
      newValue = newValue === '' ? '' : parseFloat(newValue);
    }
    onChange(name, newValue);
  };

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={id}
            name={name}
            value={value || ''}
            onChange={handleChange}
            required={required}
            disabled={disabled}
            className={baseInputStyles}
          >
            {options.map((opt, i) => {
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const optValue = typeof opt === 'string' ? opt : opt.value;
              return (
                <option key={i} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            name={name}
            value={value || ''}
            onChange={handleChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className={baseInputStyles}
          />
        );
      case 'rating':
        return (
          <div className="flex gap-2 py-1" id={id} role="radiogroup" aria-labelledby={`${id}-label`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={value === star}
                disabled={disabled}
                onClick={() => onChange(name, star)}
                className={`text-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  value && value >= star
                    ? 'text-amber-400'
                    : 'text-zinc-300 dark:text-zinc-700 hover:text-amber-200'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        );
      case 'number':
      case 'date':
      case 'text':
      default:
        return (
          <input
            id={id}
            type={type}
            name={name}
            value={value !== undefined && value !== null ? value : ''}
            onChange={handleChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={baseInputStyles}
          />
        );
    }
  };

  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label id={`${id}-label`} htmlFor={id} className={`block text-sm font-medium mb-1 ${error ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-300'}`}>
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {renderInput()}
      {error && <p className="mt-1 text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
};

export const FormField = memo(FormFieldComponent, (prev, next) => {
  return (
    prev.value === next.value &&
    prev.error === next.error &&
    prev.disabled === next.disabled &&
    prev.options === next.options
  );
});
