// components/ui/Input.tsx
import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: string;
  rightAddon?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex">
          {/* Left addon */}
          {leftAddon && (
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm whitespace-nowrap">
              {leftAddon}
            </span>
          )}

          {/* Input container */}
          <div className="relative flex-1">
            {/* Left icon (only if no leftAddon) */}
            {leftIcon && !leftAddon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {leftIcon}
              </div>
            )}

            {/* Input field */}
            <input
              id={inputId}
              type={type}
              className={cn(
                "block w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border",
                leftIcon && !leftAddon && "pl-10",
                rightIcon && !rightAddon && "pr-10",
                leftAddon && "rounded-l-none border-l-0",
                rightAddon && "rounded-r-none border-r-0",
                !leftAddon && !rightAddon && "rounded-md",
                !leftAddon && rightAddon && "rounded-l-md",
                leftAddon && !rightAddon && "rounded-r-md",
                error &&
                  "border-red-300 focus:border-red-500 focus:ring-red-500",
                className
              )}
              ref={ref}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={
                error
                  ? `${inputId}-error`
                  : helperText
                    ? `${inputId}-helper`
                    : undefined
              }
              {...props}
            />

            {/* Right icon (only if no rightAddon) */}
            {rightIcon && !rightAddon && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {rightIcon}
              </div>
            )}
          </div>

          {/* Right addon */}
          {rightAddon && (
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm whitespace-nowrap">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
