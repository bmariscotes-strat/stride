import { useState, ReactNode } from "react";
import { X } from "lucide-react";

// Type definitions
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

interface DialogHeaderProps {
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
}

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

// Main Dialog Component
export const Dialog = ({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-md",
}: DialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/10 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
};

// Dialog Header Component
export const DialogHeader = ({
  onClose,
  children,
  showCloseButton = true,
}: DialogHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div className="flex-1">{children}</div>
      {showCloseButton && (
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
      )}
    </div>
  );
};

// Dialog Title Component
export const DialogTitle = ({ children, className = "" }: DialogTitleProps) => {
  return (
    <h2 className={`text-xl font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
};

// Dialog Content Component
export const DialogContent = ({
  children,
  className = "",
}: DialogContentProps) => {
  return <div className={`p-6 overflow-y-auto ${className}`}>{children}</div>;
};

// Dialog Footer Component
export const DialogFooter = ({
  children,
  className = "",
}: DialogFooterProps) => {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-200 flex gap-3 justify-end ${className}`}
    >
      {children}
    </div>
  );
};
