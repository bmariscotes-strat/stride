import {
  Kanban,
  List,
  Table,
  Crown,
  Calendar,
  Shield,
  Eye,
} from "lucide-react";

export const getRoleIcon = (role: "admin" | "editor" | "viewer") => {
  switch (role) {
    case "admin":
      return <Crown size={12} className="text-yellow-600" />;
    case "editor":
      return <Shield size={12} className="text-blue-600" />;
    case "viewer":
      return <Eye size={12} className="text-gray-500" />;
    default:
      return null;
  }
};

export const getRoleBadgeClass = (role: "admin" | "editor" | "viewer") => {
  switch (role) {
    case "admin":
      return "bg-yellow-100 text-yellow-800";
    case "editor":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getIcon = (iconName: string) => {
  switch (iconName) {
    case "Kanban":
      return Kanban;
    case "List":
      return List;
    case "Calendar":
      return Calendar;
    case "Table":
      return Table;
    default:
      return Kanban;
  }
};
