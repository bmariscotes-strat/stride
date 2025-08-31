"use client";
import React, { useState } from "react";
import {
  Shield,
  Smartphone,
  Monitor,
  LogOut,
  AlertTriangle,
  Clock,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useUserSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from "@/hooks/useUserSettings";
import { formatDistanceToNow } from "date-fns";
import RevokeSessionDialog from "@/components/user-settings/dialog/security/RevokeSessionDialog";
import RevokeAllSessionsDialog from "@/components/user-settings/dialog/security/RevokeAllSessionsDialog";

interface SecuritySectionProps {
  clerkUserId: string;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

// Define the session type to avoid serialization issues
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

// Enhanced device detection
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

const isCurrentSession = (session: UserSession) => {
  return session.status === "active";
};

const getLocationInfo = (session: UserSession) => {
  if (!session.latestActivity) return "Location unknown";

  const { ipAddress, city, country } = session.latestActivity;
  return `${city}, ${country} (${ipAddress})`;
};

export default function SecuritySection({
  clerkUserId,
  sectionRef,
}: SecuritySectionProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Dialog states
  const [revokeSessionDialog, setRevokeSessionDialog] = useState<{
    isOpen: boolean;
    session: UserSession | null;
  }>({ isOpen: false, session: null });
  const [revokeAllSessionsDialog, setRevokeAllSessionsDialog] = useState(false);

  const { data: sessionsData, isLoading } = useUserSessions();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  // Convert sessions to plain objects to avoid serialization issues
  const sessions: UserSession[] = React.useMemo(() => {
    if (!sessionsData) return [];

    return sessionsData.map((session: any) => ({
      id: session.id,
      status: session.status,
      lastActiveAt: session.lastActiveAt
        ? new Date(session.lastActiveAt).toISOString()
        : null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      latestActivity: session.latestActivity,
    }));
  }, [sessionsData]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      isValid:
        minLength &&
        hasUppercase &&
        hasLowercase &&
        hasNumber &&
        hasSpecialChar,
    };
  };

  const passwordValidation = validatePassword(passwordData.newPassword);
  const passwordsMatch =
    passwordData.newPassword === passwordData.confirmPassword;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      toast.error("Password doesn't meet security requirements!");
      return;
    }

    if (!passwordsMatch) {
      toast.error("New passwords don't match!");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordForm(false);
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("Failed to change password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = (session: UserSession) => {
    setRevokeSessionDialog({ isOpen: true, session });
  };

  const handleRevokeAllSessions = () => {
    setRevokeAllSessionsDialog(true);
  };

  const confirmRevokeSession = () => {
    if (revokeSessionDialog.session) {
      revokeSession.mutate(revokeSessionDialog.session.id);
      setRevokeSessionDialog({ isOpen: false, session: null });
    }
  };

  const confirmRevokeAllSessions = () => {
    revokeAllSessions.mutate();
    setRevokeAllSessionsDialog(false);
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <>
      <div id="security" ref={sectionRef} className="scroll-mt-6">
        {/* Password Management Section */}
        <section className="border-b border-gray-200 dark:border-gray-700 pb-6 md:pb-8">
          <div className="pb-4 md:pb-6">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Shield size={20} className="flex-shrink-0" />
              <span className="break-words">Password & Authentication</span>
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage your password and authentication settings.
            </p>
          </div>

          <div className="space-y-4">
            {!showPasswordForm ? (
              <div className="p-3 md:p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Key
                    size={20}
                    className="text-blue-600 dark:text-blue-400 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      Change Password
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Update your password to keep your account secure.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-200 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors flex-shrink-0"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-6 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Lock size={18} className="flex-shrink-0" />
                    <span className="break-words">Change Your Password</span>
                  </h4>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords.current ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords.new ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>

                    {/* Password Requirements */}
                    {passwordData.newPassword && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          <div
                            className={`flex items-center gap-1 ${passwordValidation.minLength ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {passwordValidation.minLength ? (
                              <CheckCircle
                                size={12}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <XCircle size={12} className="flex-shrink-0" />
                            )}
                            <span>At least 8 characters</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidation.hasUppercase ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {passwordValidation.hasUppercase ? (
                              <CheckCircle
                                size={12}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <XCircle size={12} className="flex-shrink-0" />
                            )}
                            <span>One uppercase letter</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidation.hasLowercase ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {passwordValidation.hasLowercase ? (
                              <CheckCircle
                                size={12}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <XCircle size={12} className="flex-shrink-0" />
                            )}
                            <span>One lowercase letter</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidation.hasNumber ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {passwordValidation.hasNumber ? (
                              <CheckCircle
                                size={12}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <XCircle size={12} className="flex-shrink-0" />
                            )}
                            <span>One number</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidation.hasSpecialChar ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} sm:col-span-2`}
                          >
                            {passwordValidation.hasSpecialChar ? (
                              <CheckCircle
                                size={12}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <XCircle size={12} className="flex-shrink-0" />
                            )}
                            <span>One special character</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {passwordData.confirmPassword && (
                      <div
                        className={`mt-1 text-xs flex items-center gap-1 ${passwordsMatch ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {passwordsMatch ? (
                          <CheckCircle size={12} className="flex-shrink-0" />
                        ) : (
                          <XCircle size={12} className="flex-shrink-0" />
                        )}
                        <span>
                          {passwordsMatch
                            ? "Passwords match"
                            : "Passwords don't match"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={
                        passwordLoading ||
                        !passwordValidation.isValid ||
                        !passwordsMatch
                      }
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {passwordLoading
                        ? "Changing Password..."
                        : "Change Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* Active Sessions Section */}
        <section className="pt-6 md:pt-8">
          <div className="pb-4 md:pb-6">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Monitor size={20} className="flex-shrink-0" />
              <span className="break-words">Active Sessions</span>
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View and manage your active sessions across different devices.
            </p>
          </div>

          <div className="space-y-4">
            {/* Revoke All Sessions Button */}
            {sessions && sessions.length > 1 && (
              <div className="flex justify-end">
                <button
                  onClick={handleRevokeAllSessions}
                  disabled={revokeAllSessions.isPending}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <LogOut size={16} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Log Out All Devices</span>
                  <span className="sm:hidden">Log Out All</span>
                </button>
              </div>
            )}

            {/* Sessions List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="p-3 md:p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <div className="w-32 h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                            <div className="w-24 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                          </div>
                        </div>
                        <div className="w-16 h-8 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions?.length ? (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const isCurrentDevice = isCurrentSession(session);

                  return (
                    <div
                      key={session.id}
                      className="p-3 md:p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
                            {getDeviceIcon(session)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                {getDeviceName(session)}
                              </h4>
                              {isCurrentDevice && (
                                <span className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full flex-shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock size={14} className="flex-shrink-0" />
                                <span className="break-words">
                                  {session.lastActiveAt
                                    ? `Active ${formatDistanceToNow(new Date(session.lastActiveAt))} ago`
                                    : "Activity unknown"}
                                </span>
                              </span>
                              <span className="break-words">
                                {getLocationInfo(session)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isCurrentDevice ? (
                          <div className="px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md cursor-not-allowed flex-shrink-0 text-center">
                            <span className="hidden sm:inline">
                              Current Device
                            </span>
                            <span className="sm:hidden">Current</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRevokeSession(session)}
                            disabled={revokeSession.isPending}
                            className="px-3 py-1 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                          >
                            <span className="hidden sm:inline">
                              End Session
                            </span>
                            <span className="sm:hidden">End</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <Monitor className="h-10 md:h-12 w-10 md:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Active Sessions
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  There are no active sessions to display.
                </p>
              </div>
            )}
          </div>

          {/* Security Tips */}
          <div className="mt-6 md:mt-8 p-3 md:p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-md">
            <div className="flex items-start gap-3">
              <Shield
                size={20}
                className="text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Security Tips
                </h4>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
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

      {/* Dialogs */}
      <RevokeSessionDialog
        isOpen={revokeSessionDialog.isOpen}
        onClose={() => setRevokeSessionDialog({ isOpen: false, session: null })}
        session={revokeSessionDialog.session}
        onRevoke={confirmRevokeSession}
        isRevoking={revokeSession.isPending}
      />

      <RevokeAllSessionsDialog
        isOpen={revokeAllSessionsDialog}
        onClose={() => setRevokeAllSessionsDialog(false)}
        onRevokeAll={confirmRevokeAllSessions}
        isRevoking={revokeAllSessions.isPending}
        sessionCount={sessions?.length || 0}
      />
    </>
  );
}
