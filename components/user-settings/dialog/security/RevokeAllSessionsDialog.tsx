"use client";
import React from "react";
import { LogOut } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

interface RevokeAllSessionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRevokeAll: () => void;
  isRevoking: boolean;
  sessionCount: number;
}

export default function RevokeAllSessionsDialog({
  isOpen,
  onClose,
  onRevokeAll,
  isRevoking,
  sessionCount,
}: RevokeAllSessionsDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <DialogContent className="p-5">
        <div className="mt-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <LogOut className="w-6 h-6 text-red-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Log Out All Devices
            </h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">
                Are you sure you want to log out from all other devices? This
                will end all your other sessions.
              </p>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>{sessionCount}</strong>{" "}
                  {sessionCount === 1 ? "session" : "sessions"} will be ended.
                  You'll need to log in again on those devices.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isRevoking}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRevokeAll}
                disabled={isRevoking}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevoking ? "Logging Out..." : "Log Out All"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
