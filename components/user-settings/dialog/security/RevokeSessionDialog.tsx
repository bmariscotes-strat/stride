"use client";
import React from "react";
import { LogOut, Smartphone, Monitor } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

interface UserSession {
  id: string;
  status: string;
  lastActiveAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  latestActivity?: {
    isMobile: boolean;
    ipAddress: string;
    city: string;
    country: string;
    browserVersion: string;
    browserName: string;
    deviceType: string;
  };
}

interface RevokeSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  onRevoke: () => void;
  isRevoking: boolean;
}

const getDeviceIcon = (session: UserSession) => {
  if (session.latestActivity?.isMobile) {
    return <Smartphone size={16} />;
  }
  return <Monitor size={16} />;
};

const getDeviceName = (session: UserSession) => {
  if (!session.latestActivity) return "Unknown Device";

  const { deviceType, browserName, browserVersion } = session.latestActivity;
  return `${deviceType} ${browserName} ${browserVersion}`;
};

const getLocationInfo = (session: UserSession) => {
  if (!session.latestActivity) return "Location unknown";

  const { ipAddress, city, country } = session.latestActivity;
  return `${city}, ${country} (${ipAddress})`;
};

export default function RevokeSessionDialog({
  isOpen,
  onClose,
  session,
  onRevoke,
  isRevoking,
}: RevokeSessionDialogProps) {
  if (!session) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <DialogContent className="p-5">
        <div className="mt-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <LogOut className="w-6 h-6 text-red-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">End Session</h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">
                Are you sure you want to end this session? You will be logged
                out from this device.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-left">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  {getDeviceIcon(session)}
                  {getDeviceName(session)}
                  {session.status === "active" && (
                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full ml-auto">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {getLocationInfo(session)}
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
                onClick={onRevoke}
                disabled={isRevoking}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevoking ? "Ending..." : "End Session"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
