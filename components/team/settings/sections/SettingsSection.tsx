"use client";
import React from "react";
import { Settings } from "lucide-react";
import type { TeamSettings } from "@/types";

interface TeamSettingsSectionProps {
  formData: {
    settings: TeamSettings;
  };
  onSettingChange: (setting: keyof TeamSettings, value: boolean) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TeamSettingsSection({
  formData,
  onSettingChange,
  sectionRef,
}: TeamSettingsSectionProps) {
  return (
    <section id="settings" ref={sectionRef} className="scroll-mt-6">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings size={20} />
          Team Settings
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Configure how your team operates.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="isPrivate"
                type="checkbox"
                checked={formData.settings.isPrivate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSettingChange("isPrivate", e.target.checked)
                }
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="isPrivate" className="font-medium text-gray-700">
                Private Team
              </label>
              <p className="text-gray-500">
                Only invited members can see and join this team.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="allowMemberInvites"
                type="checkbox"
                checked={formData.settings.allowMemberInvites}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSettingChange("allowMemberInvites", e.target.checked)
                }
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="allowMemberInvites"
                className="font-medium text-gray-700"
              >
                Allow Member Invites
              </label>
              <p className="text-gray-500">
                Team members can invite others to join the team.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="requireApproval"
                type="checkbox"
                checked={formData.settings.requireApproval}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSettingChange("requireApproval", e.target.checked)
                }
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="requireApproval"
                className="font-medium text-gray-700"
              >
                Require Approval for New Members
              </label>
              <p className="text-gray-500">
                New member requests must be approved by team admins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
