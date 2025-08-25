import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateUserProfile,
  updateUserEmail,
  getUserSessions,
  revokeSession,
  revokeAllSessions,
  updateUserAppearance,
  type UpdateProfileData,
  type UpdateEmailData,
  type UpdateAppearanceData,
} from "@/lib/services/user-settings";

// =============================================================================
// PROFILE HOOKS
// =============================================================================

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Profile updated successfully");
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });
}

export function useUpdateEmail() {
  return useMutation({
    mutationFn: updateUserEmail,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || "Verification email sent");
      } else {
        toast.error(result.error || "Failed to update email");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update email");
    },
  });
}

// =============================================================================
// SECURITY HOOKS
// =============================================================================

export function useUserSessions() {
  return useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const result = await getUserSessions();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.sessions;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Session revoked successfully");
        queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      } else {
        toast.error(result.error || "Failed to revoke session");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke session");
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Revoked ${result.revokedCount} sessions`);
        queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      } else {
        toast.error(result.error || "Failed to revoke sessions");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke sessions");
    },
  });
}

// =============================================================================
// APPEARANCE HOOKS
// =============================================================================

export function useUpdateAppearance() {
  return useMutation({
    mutationFn: updateUserAppearance,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Appearance updated");
      } else {
        toast.error(result.error || "Failed to update appearance");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update appearance");
    },
  });
}

// =============================================================================
// CLOUDINARY UPLOAD HOOK
// =============================================================================

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<CloudinaryUploadResult> => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size must be less than 5MB");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "user_avatars"); // You'll need to set this up in Cloudinary
      formData.append("folder", "user-avatars");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dphcpekk1/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to upload image");
      }

      const result = await response.json();
      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload image");
    },
    onSuccess: () => {
      toast.success("Image uploaded successfully");
    },
  });
}
