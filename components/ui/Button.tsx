"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

// Type definitions for our button variants
type ButtonVariant = "primary" | "secondary" | "accent";
type ButtonStyle = "filled" | "outlined";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  children: ReactNode;
  variant?: ButtonVariant;
  style?: ButtonStyle;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Helper function to generate button classes
const getButtonClasses = (
  variant: ButtonVariant = "primary",
  style: ButtonStyle = "filled",
  size: ButtonSize = "md",
  fullWidth: boolean = false,
  className?: string
): string => {
  // Base classes
  const baseClasses =
    "cursor-pointer inline-flex items-center justify-center transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 active:";

  // Size classes
  const sizeClasses = {
    sm: "px-4 py-2 text-sm rounded-sm",
    md: "px-6 py-3 text-base rounded-sm",
    lg: "px-8 py-4 text-lg rounded-lg",
  };

  // Width classes
  const widthClasses = fullWidth ? "w-full" : "w-auto";

  // Style base classes
  const styleBaseClasses =
    style === "outlined" ? "border-2 bg-transparent" : "";

  // Variant and style combination classes
  const variantStyleClasses = {
    primary: {
      filled:
        "bg-primary text-white hover:bg-primary/80 hover:text-white/80 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500", // Changed from bg-primary
      outlined:
        "border-purple-600 text-purple-600 hover:bg-purple-50 hover:border-purple-700 dark:border-purple-400 dark:text-purple-300 dark:hover:bg-purple-900/40 dark:hover:border-purple-300",
    },
    secondary: {
      filled:
        "bg-gray-600 text-white hover:bg-gray-700 shadow-lg hover:shadow-xl dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100",
      outlined:
        "border-gray-600 text-gray-600 hover:bg-gray-50 hover:border-gray-700 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-400",
    },
    accent: {
      filled:
        "bg-accent text-white hover:bg-primary/50 dark:bg-pink-600 dark:hover:bg-pink-500",
      outlined:
        "border-pink-400 text-pink-600 hover:bg-pink-50 hover:border-pink-500 dark:border-pink-500 dark:text-pink-300 dark:hover:bg-pink-900/40 dark:hover:border-pink-400",
    },
  };

  // Combine all classes
  const classes = [
    baseClasses,
    sizeClasses[size],
    widthClasses,
    styleBaseClasses,
    variantStyleClasses[variant][style],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return classes;
};

export default function Button({
  children,
  variant = "primary",
  style = "filled",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={getButtonClasses(variant, style, size, fullWidth, className)}
      disabled={isDisabled}
      {...props}
    >
      {/* Left Icon */}
      {leftIcon && !loading && (
        <span className="mr-2 flex items-center w-5 h-5">{leftIcon}</span>
      )}

      {/* Loading Spinner */}
      {loading && (
        <span className="mr-2 flex items-center">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </span>
      )}

      {/* Button Text */}
      <span>{children}</span>

      {/* Right Icon */}
      {rightIcon && !loading && (
        <span className="ml-2 flex items-center">{rightIcon}</span>
      )}
    </button>
  );
}
