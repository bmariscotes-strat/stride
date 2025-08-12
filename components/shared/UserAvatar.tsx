import { useUserContext, useDisplayName } from "@/contexts/UserContext";

interface UserAvatarProps {
  // Optional override props
  name?: string;
  src?: string | null;
  size?: string;
  className?: string;
  onClick?: () => void;
  showName?: boolean;
  nameClassName?: string;
  layout?: "horizontal" | "vertical";
  // Option to use context or provided props
  useContext?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateColorFromName(name: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to HSL for better color variety
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

export default function UserAvatar({
  name: providedName,
  src: providedSrc,
  size = "40",
  className = "",
  onClick,
  showName = false,
  nameClassName = "",
  layout = "horizontal",
  useContext = true,
}: UserAvatarProps) {
  // Get context values only if we're in a client component
  let contextDisplayName = "";
  let avatarUrl = null;

  if (useContext && typeof window !== "undefined") {
    // Only use hooks in client components
    const { avatarUrl: contextAvatarUrl } = useUserContext();
    const contextName = useDisplayName();
    contextDisplayName = contextName;
    avatarUrl = contextAvatarUrl;
  }

  // Use context values as defaults, allow props to override
  const name = providedName || (useContext ? contextDisplayName : "");
  const src =
    providedSrc !== undefined ? providedSrc : useContext ? avatarUrl : null;

  const sizeInPx = `${size}px`;
  const initials = getInitials(name);
  const backgroundColor = generateColorFromName(name);

  const avatarElement = (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        width: sizeInPx,
        height: sizeInPx,
        backgroundColor: src ? "transparent" : backgroundColor,
      }}
      onClick={onClick}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span
          className="text-white font-medium select-none"
          style={{
            fontSize: `${parseInt(size) * 0.4}px`,
            lineHeight: "1",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );

  if (!showName) {
    return avatarElement;
  }

  const nameElement = (
    <span className={`text-sm font-medium text-gray-700 ${nameClassName}`}>
      {name}
    </span>
  );

  return (
    <div
      className={`flex items-center ${
        layout === "vertical" ? "flex-col space-y-2" : "space-x-2"
      }`}
    >
      {avatarElement}
      {nameElement}
    </div>
  );
}
