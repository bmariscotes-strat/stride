import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import { Settings, Info } from "lucide-react";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";

export default function SettingsPage() {
  return (
    <>
      <DualPanelLayout
        left={
          <>
            <div>
              <AppBreadcrumb />
            </div>
            <div className="p-4 h-full">
              <h2 className="font-bold text-lg">Sidebar</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>Overview</li>
                <li>Projects</li>
                <li>Settings</li>
              </ul>
            </div>
          </>
        }
        right={
          <div className="p-4">
            <h1 className="text-2xl font-semibold">Main Content</h1>
            <p className="mt-2 text-gray-700">Welcome to your dashboard.</p>
          </div>
        }
      />
    </>
  );
}
