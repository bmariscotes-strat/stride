"use client";
import React from "react";
import { Info } from "lucide-react";
import type { TeamWithRelations, TeamRole } from "@/types";

interface FormData {
  name: string;
  slug: string;
  description: string;
}

interface TeamInformationSectionProps {
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
  formData: FormData;
  onInputChange: (
    field: keyof Omit<FormData, "settings">,
    value: string
  ) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TeamInformationSection({
  team,
  formData,
  onInputChange,
  sectionRef,
}: TeamInformationSectionProps) {
  return (
    <section id="information" ref={sectionRef} className="scroll-mt-6">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Info size={20} />
          Team Information
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Update basic details about your team.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="teamName"
            className="block text-sm font-medium text-gray-700"
          >
            Team Name *
          </label>
          <input
            type="text"
            id="teamName"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onInputChange("name", e.target.value)
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            placeholder="Enter team name"
            required
            maxLength={100}
            disabled={team.isPersonal}
          />
          {team.isPersonal && (
            <p className="mt-1 text-xs text-gray-500">
              Personal team names cannot be changed.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="teamSlug"
            className="block text-sm font-medium text-gray-700"
          >
            Team URL Slug *
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              yourapp.com/teams/
            </span>
            <input
              type="text"
              id="teamSlug"
              value={formData.slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onInputChange("slug", e.target.value)
              }
              className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              placeholder="team-url"
              required
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens are allowed"
              maxLength={50}
              disabled={team.isPersonal}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {team.isPersonal
              ? "Personal team URLs cannot be changed."
              : "Only lowercase letters, numbers, and hyphens. This will be your team's URL."}
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onInputChange("description", e.target.value)
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            placeholder="What's this team about?"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/500 characters
          </p>
        </div>
      </div>
    </section>
  );
}
