"use client";
import React, { useState } from "react";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import NavigationSidebar from "@/components/layout/shared/NavigationSidebar";
import { User2, Shield, Palette } from "lucide-react";
import type { User } from "@/types";
import type { NavigationItem } from "@/types";
import ProfileSection from "@/components/user-settings/sections/ProfileSection";
import SecuritySection from "@/components/user-settings/sections/SecuritySection";
import AppearanceSection from "@/components/user-settings/sections/AppearanceSection";

interface UserSettingsProps {
  user: User;
  clerkUserId: string;
}

export default function UserSettings({ user, clerkUserId }: UserSettingsProps) {
  const [activeSection, setActiveSection] = useState<string>("profile");

  const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveSection(sectionId);
  };

  const navigationItems: NavigationItem[] = [
    {
      id: "profile",
      label: "Profile",
      icon: User2,
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
    },
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection user={user} />;
      case "security":
        return <SecuritySection clerkUserId={clerkUserId} />;
      case "appearance":
        return <AppearanceSection />;
      default:
        return <ProfileSection user={user} />;
    }
  };

  return (
    <DualPanelLayout
      left={
        <NavigationSidebar
          activeSection={activeSection}
          navigationItems={navigationItems}
          onScrollToSection={scrollToSection}
          title="User Settings"
          subtitle="Manage your account"
        />
      }
      right={<div className="p-6 space-y-8">{renderActiveSection()}</div>}
    />
  );
}
