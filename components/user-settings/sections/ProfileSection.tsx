"use client";
import React, { useState, useRef } from "react";
import { User2, Camera, Mail, Briefcase, AtSign } from "lucide-react";
import Image from "next/image";
import type { User } from "@/types";
import {
  useUpdateProfile,
  useUpdateEmail,
  useUploadImage,
} from "@/hooks/useUserSettings";

interface ProfileSectionProps {
  user: User;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function ProfileSection({
  user,
  sectionRef,
}: ProfileSectionProps) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username || "",
    jobPosition: user.jobPosition || "",
    email: user.email,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);

  const updateProfile = useUpdateProfile();
  const updateEmail = useUpdateEmail();
  const uploadImage = useUploadImage();

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username,
      jobPosition: formData.jobPosition,
      avatarUrl: avatarUrl || undefined,
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email !== user.email) {
      updateEmail.mutate({ email: formData.email });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadImage.mutate(file, {
      onSuccess: (result) => {
        const newAvatarUrl = result.secure_url;
        setAvatarUrl(newAvatarUrl);

        // Automatically update the profile with new avatar
        updateProfile.mutate({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          jobPosition: formData.jobPosition,
          avatarUrl: newAvatarUrl,
        });
      },
    });
  };

  return (
    <div id="profile" ref={sectionRef} className="scroll-mt-6">
      {/* Basic Profile Information */}
      <section className="border-b border-gray-200 pb-8">
        <div className="pb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User2 size={20} />
            Profile Information
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Update your basic profile information and avatar.
          </p>
        </div>

        {/* Avatar Upload Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Profile Picture
          </label>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile picture"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User2 size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
              {uploadImage.isPending && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImage.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={16} />
                Change Photo
              </button>
              <p className="text-xs text-gray-500">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username *
              </label>
              <div className="relative mt-1">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2 border"
                  required
                  maxLength={50}
                />
              </div>
            </div>

            {/* Job Position */}
            <div>
              <label
                htmlFor="jobPosition"
                className="block text-sm font-medium text-gray-700"
              >
                Job Position
              </label>
              <div className="relative mt-1">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  id="jobPosition"
                  value={formData.jobPosition}
                  onChange={(e) =>
                    handleInputChange("jobPosition", e.target.value)
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2 border"
                  placeholder="e.g. Software Engineer"
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfile.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Email Management */}
      <section className="pt-8">
        <div className="pb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Mail size={20} />
            Email Address
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Update your email address. A verification email will be sent to the
            new address.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Current: {user.email}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateEmail.isPending || formData.email === user.email}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateEmail.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                  Updating...
                </>
              ) : (
                "Update Email"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
