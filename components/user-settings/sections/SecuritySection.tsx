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
      alert("Password doesn't meet security requirements!");
      return;
    }

    if (!passwordsMatch) {
      alert("New passwords don't match!");
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
        alert("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordForm(false);
      } else {
        alert(result.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Password change error:", error);
      alert("Failed to change password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

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

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div id="security" ref={sectionRef} className="scroll-mt-6">
      {/* Password Management Section */}
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
          {!showPasswordForm ? (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
              <div className="flex items-center gap-3">
                <Key size={20} className="text-blue-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-800">Change Password</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Update your password to keep your account secure.
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-800 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Change Password
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 border border-gray-200 rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Lock size={18} />
                  Change Your Password
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
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("new")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                      <div
                        className={`flex items-center gap-1 ${passwordValidation.minLength ? "text-green-600" : "text-red-600"}`}
                      >
                        {passwordValidation.minLength ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        At least 8 characters
                      </div>
                      <div
                        className={`flex items-center gap-1 ${passwordValidation.hasUppercase ? "text-green-600" : "text-red-600"}`}
                      >
                        {passwordValidation.hasUppercase ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        One uppercase letter
                      </div>
                      <div
                        className={`flex items-center gap-1 ${passwordValidation.hasLowercase ? "text-green-600" : "text-red-600"}`}
                      >
                        {passwordValidation.hasLowercase ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        One lowercase letter
                      </div>
                      <div
                        className={`flex items-center gap-1 ${passwordValidation.hasNumber ? "text-green-600" : "text-red-600"}`}
                      >
                        {passwordValidation.hasNumber ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        One number
                      </div>
                      <div
                        className={`flex items-center gap-1 ${passwordValidation.hasSpecialChar ? "text-green-600" : "text-red-600"}`}
                      >
                        {passwordValidation.hasSpecialChar ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        One special character
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirm")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                      className={`mt-1 text-xs flex items-center gap-1 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}
                    >
                      {passwordsMatch ? (
                        <CheckCircle size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {passwordsMatch
                        ? "Passwords match"
                        : "Passwords don't match"}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={
                      passwordLoading ||
                      !passwordValidation.isValid ||
                      !passwordsMatch
                    }
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        {getDeviceIcon(session)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {getDeviceName(session)}
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
                          <span>{getLocationInfo(session)}</span>
                        </div>
                        {/* Debug info - remove this after testing */}
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
