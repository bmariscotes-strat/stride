"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, LogOut, ChevronDown } from "lucide-react";
// Install: npm install react-avatar
import Avatar from "react-avatar";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User data - you can get this from your auth context/props
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    src: "", // Profile image URL if available
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSettings = () => {
    console.log("Navigate to settings");
    setIsOpen(false);
    // Add your navigation logic here
    // Example: router.push('/settings')
  };

  const handleLogout = () => {
    console.log("Logout user");
    setIsOpen(false);
    // Add your logout logic here
    // Example: signOut()
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-50 focus:outline-none  transition-colors duration-200"
      >
        <Avatar
          name={user.name}
          email={user.email}
          src={user.src}
          size="28"
          round={true}
          className="cursor-pointer"
        />
        <span className="text-sm font-medium text-gray-700">{user.name}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {/* Settings Link */}
            <button
              onClick={handleSettings}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            >
              <Settings className="w-4 h-4 mr-3 text-gray-500" />
              Settings
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 my-1" />

            {/* Logout Link */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4 mr-3 text-red-500" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
