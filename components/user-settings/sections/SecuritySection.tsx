"use client";
import React from "react";
import {
  Shield,
  Smartphone,
  Monitor,
  LogOut,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  useUserSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from "@/hooks/useUserSettings";
import { formatDistanceToNow } from "date-fns";

interface SecuritySectionProps {
  clerkUserId: string;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function SecuritySection({
  clerkUserId,
  sectionRef,
}: SecuritySectionProps) {
  const { data: sessions, isLoading } = useUserSessions();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  const handleRevokeSession = (sessionId: string) => {
    if (
      confirm(
        "Are you sure you want to revoke this session? You will be logged out from that device."
      )
    ) {
      revokeSession.mutate(sessionId);
    }
  };

  const handleRevokeAllSessions = () => {
    if (
      confirm(
        "Are you sure you want to log out from all other devices? This will end all your other sessions."
      )
    ) {
      revokeAllSessions.mutate();
    }
  };

  const getDeviceIcon = (lastActiveSessionName?: string) => {
    if (!lastActiveSessionName) return <Monitor size={16} />;

    const name = lastActiveSessionName.toLowerCase();
    if (
      name.includes("mobile") ||
      name.includes("android") ||
      name.includes("ios")
    ) {
      return <Smartphone size={16} />;
    }
    return <Monitor size={16} />;
  };

  const getLocationInfo = (
    lastActiveIpAddress?: string,
    lastActiveOrganizationId?: string
  ) => {
    if (lastActiveIpAddress) {
      return `IP: ${lastActiveIpAddress}`;
    }
    return "Location unknown";
  };

  return (
    <div id="security" ref={sectionRef} className="scroll-mt-6">
      {/* Password Management */}
      <section className="border-b border-gray-200 pb-8">
        <div className="pb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={20} />
            Password & Authentication
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Manage your password and authentication settings.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Password Management
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Password changes are managed through Clerk. Click the button
                  below to update your password.
                </p>
                <button
                  onClick={() => {
                    // This will open Clerk's password change modal
                    window.location.href = `/user-profile#/security/password`;
                  }}
                  className="mt-3 px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800">
                  Two-Factor Authentication
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Add an extra layer of security to your account with 2FA.
                </p>
                <button
                  onClick={() => {
                    // This will open Clerk's 2FA setup
                    window.location.href = `/user-profile#/security/mfa`;
                  }}
                  className="mt-3 px-4 py-2 text-sm font-medium text-blue-800 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manage 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Sessions */}
      <section className="pt-8">
        <div className="pb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Monitor size={20} />
            Active Sessions
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            View and manage your active sessions across different devices.
          </p>
        </div>

        <div className="space-y-4">
          {/* Revoke All Sessions Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRevokeAllSessions}
              disabled={revokeAllSessions.isPending || !sessions?.length}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={16} />
              {revokeAllSessions.isPending
                ? "Revoking..."
                : "Log Out All Devices"}
            </button>
          </div>

          {/* Sessions List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="p-4 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded"></div>
                        <div>
                          <div className="w-32 h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="w-24 h-3 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                      <div className="w-16 h-8 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sessions?.length ? (
            <div className="space-y-4">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="p-4 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        {getDeviceIcon(session.lastActiveSessionName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {session.lastActiveSessionName || "Unknown Device"}
                          </h4>
                          {session.status === "active" && (
                            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {session.lastActiveAt
                              ? `Active ${formatDistanceToNow(new Date(session.lastActiveAt))} ago`
                              : "Activity unknown"}
                          </span>
                          <span>
                            {getLocationInfo(
                              session.lastActiveIpAddress,
                              session.lastActiveOrganizationId
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {session.status !== "active" && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokeSession.isPending}
                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revokeSession.isPending ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Sessions
              </h3>
              <p className="text-gray-600">
                There are no active sessions to display.
              </p>
            </div>
          )}
        </div>

        {/* Security Tips */}
        <div className="mt-8 p-4 border border-gray-200 bg-gray-50 rounded-md">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-gray-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Security Tips</h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Use a strong, unique password for your account</li>
                <li>• Enable two-factor authentication for added security</li>
                <li>• Regularly review your active sessions</li>
                <li>• Log out from shared or public computers</li>
                <li>• Keep your browser and devices updated</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
