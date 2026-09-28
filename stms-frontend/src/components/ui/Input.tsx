import React, { forwardRef } from 'react';
import { cn } from '@/utils/helpers';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  as?: 'input' | 'textarea';
  rows?: number;
}

export const Input = forwardRef<HTMLTextAreaElement | HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, fullWidth = true, className, id, as = 'input', rows, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    const isTextarea = as === 'textarea';

    return (
      <div className={cn('form-group', fullWidth ? 'w-full' : '')}>
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
            {props.required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
              {leftIcon}
            </div>
          )}
          {isTextarea ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={inputId}
              rows={rows || 3}
              className={cn(
                'input min-h-[100px] resize-y',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                error && 'input-error',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={cn(errorId, hintId)}
              {...props}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={inputId}
              className={cn(
                'input',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                error && 'input-error',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={cn(errorId, hintId)}
              {...props}
            />
          )}
          {rightIcon && !isTextarea && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-surface-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="form-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="form-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ==================== TEXTAREA ====================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, fullWidth = true, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;

    return (
      <div className={cn('form-group', fullWidth ? 'w-full' : '')}>
        {label && (
          <label htmlFor={textareaId} className="label">
            {label}
            {props.required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn('input min-h-[100px] resize-y', error && 'input-error', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(errorId, hintId)}
          {...props}
        />
        {error && (
          <p id={errorId} className="form-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="form-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ==================== SELECT ====================
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, fullWidth = true, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint ? `${selectId}-hint` : undefined;

    return (
      <div className={cn('form-group', fullWidth ? 'w-full' : '')}>
        {label && (
          <label htmlFor={selectId} className="label">
            {label}
            {props.required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn('input appearance-none bg-no-repeat bg-right pr-10', error && 'input-error', className)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(errorId, hintId)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-surface-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={errorId} className="form-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="form-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ==================== CHECKBOX ====================
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${checkboxId}-error` : undefined;

    return (
      <div className="form-group">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              'w-4 h-4 mt-0.5 rounded border-surface-300 text-primary-800 focus:ring-2 focus:ring-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={errorId}
            {...props}
          />
          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <label htmlFor={checkboxId} className="text-body text-surface-700 dark:text-surface-300 cursor-pointer">
                  {label}
                  {props.required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
                </label>
              )}
              {description && (
                <p className="form-hint">{description}</p>
              )}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ==================== RADIO GROUP ====================
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?: string;
  error?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  required?: boolean;
  inline?: boolean;
}

export function RadioGroup({ label, error, options, value, onChange, name, required, inline = false }: RadioGroupProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="form-group">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div
        className={cn('flex gap-4', inline ? 'flex-wrap' : 'flex-col')}
        role="radiogroup"
        aria-label={label}
        aria-describedby={errorId}
      >
        {options.map(option => (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              option.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={option.disabled}
              required={required}
              className={cn(
                'w-4 h-4 border-surface-300 text-primary-800 focus:ring-2 focus:ring-primary-500',
                'disabled:opacity-50'
              )}
            />
            <div>
              <span className="text-body text-surface-700 dark:text-surface-300">{option.label}</span>
              {option.description && (
                <p className="form-hint">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ==================== SWITCH ====================
export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="form-group flex items-center gap-3">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            role="switch"
            className={cn(
              'peer w-11 h-6 rounded-full border-2 border-surface-300 dark:border-surface-600',
              'bg-surface-200 dark:bg-surface-700',
              'appearance-none cursor-pointer transition-all duration-200',
              'checked:bg-primary-800 checked:border-primary-800',
              'checked:dark:bg-primary-600 checked:dark:border-primary-600',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          <span className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm',
            'transition-transform duration-200',
            'peer-checked:translate-x-full',
            'dark:peer-checked:translate-x-full'
          )} />
        </div>
        {(label || description) && (
          <div>
            {label && (
              <label htmlFor={switchId} className="text-body font-medium text-surface-700 dark:text-surface-300 cursor-pointer">
                {label}
              </label>
            )}
            {description && (
              <p className="form-hint">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';