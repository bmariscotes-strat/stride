import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      showCharCount,
      maxLength,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const currentLength = typeof value === "string" ? value.length : 0;

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

        <textarea
          id={inputId}
          className={cn(
            "block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border resize-vertical",
            error && "border-red-300 focus:border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          value={value}
          maxLength={maxLength}
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

        {/* Character count and helper text container */}
        <div className="flex justify-between items-center mt-1">
          <div className="flex-1">
            {/* Error message */}
            {error && (
              <p id={`${inputId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Helper text */}
            {helperText && !error && (
              <p id={`${inputId}-helper`} className="text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>

          {/* Character count */}
          {showCharCount && maxLength && (
            <p className="text-xs text-gray-500 ml-2">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export { TextArea };
