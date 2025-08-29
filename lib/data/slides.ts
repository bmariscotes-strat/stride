// data/slides.ts
import { Users, Calendar, BarChart3, Kanban } from "lucide-react";

export interface Slide {
  image: string;
  title: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const slides: Slide[] = [
  {
    image: "/images/hero/analytics.png",
    title: "Analytics",
    desc: "Transform raw data into actionable insights with powerful visualizations, comprehensive reports, and real-time metrics that drive informed decision-making.",
    color: "from-blue-500 to-cyan-400",
    icon: BarChart3,
  },
  {
    image: "/images/hero/calendar.png",
    title: "Calendar",
    desc: "Never miss a deadline with intelligent scheduling, automated reminders, and seamless integration across all your devices and team workflows.",
    color: "from-purple-500 to-pink-400",
    icon: Calendar,
  },
  {
    image: "/images/hero/kanban.png",
    title: "Kanban",
    desc: "Visualize your workflow with intuitive boards, drag-and-drop simplicity, and customizable columns that adapt to your team's unique processes.",
    color: "from-green-500 to-emerald-400",
    icon: Kanban,
  },
];
