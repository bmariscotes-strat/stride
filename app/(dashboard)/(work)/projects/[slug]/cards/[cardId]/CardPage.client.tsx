"use client";

import React, { useState, lazy, Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import { Badge } from "@/components/ui/shared/badge";
import {
  Settings,
  Calendar,
  Users,
  Crown,
  Edit,
  Trash2,
  ArrowLeft,
  Clock,
  Flag,
  User,
  Tag,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTask, useDeleteTask } from "@/hooks/useTask";
import { toast } from "sonner";
import { PRIORITY_OPTIONS } from "@/lib/constants/tasks";
import { getRoleIcon, getRoleBadgeClass, getIcon } from "@/lib/ui/icons-colors";
import CommentSection from "@/components/comments/CommentSection";
import type { CardPageClientProps } from "@/types";
import Loading from "./loading"; // Adjust path as needed

// Lazy load dialogs to avoid importing heavy dependencies on initial load
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog"));
const DeleteTaskDialog = lazy(
  () => import("@/components/tasks/DeleteTaskDialog")
);

export default function CardPageClient({
  project,
  userId,
  canEditProject,
  showSettings,
  isProjectOwner,
  views,
}: CardPageClientProps) {
  const params = useParams();
  const router = useRouter();
  const cardId = params?.cardId as string;

  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch the card data
  const { data: card, isLoading, error } = useTask(cardId);
  const deleteTaskMutation = useDeleteTask();

  const uniqueAvailableUsers = useMemo(() => {
    if (!project.projectTeamMembers) return [];

    const userMap = new Map();

    project.projectTeamMembers.forEach((member) => {
      const user = member.teamMember?.user;
      if (user && user.username && !userMap.has(user.id)) {
        userMap.set(user.id, {
          id: user.id,
          username: user.username,
          email: user.email || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          avatarUrl: user.avatarUrl || "",
        });
      }
    });

    return Array.from(userMap.values());
  }, [project.projectTeamMembers]);

  const getPriorityConfig = (priority: string) => {
    return (
      PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]
    );
  };

  const handleDeleteClick = () => {
    setDeleteTaskOpen(true);
    setDeleteStep(1);
    setConfirmationText("");
  };

  const handleProceedToStep2 = () => {
    setDeleteStep(2);
  };

  const handleDelete = async () => {
    if (confirmationText !== card?.title) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTaskMutation.mutateAsync(cardId);
      toast.success("Task deleted successfully");
      router.push(`/projects/${project.slug}`);
      setDeleteTaskOpen(false);
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteTaskOpen(false);
    setDeleteStep(1);
    setConfirmationText("");
  };

  const canEdit =
    canEditProject || card?.assigneeId === userId || card?.ownerId === userId;
  const canDelete = canEditProject || isProjectOwner;

  if (isLoading) {
    return <Loading />;
  }

  if (error || !card) {
    return (
      <DualPanelLayout
        left={<div className="p-6">Error loading project</div>}
        right={
          <div className="p-6">
            Card not found or you don't have permission to view it.
          </div>
        }
      />
    );
  }

  if (card) {
    console.log("Card owner ID:", card.ownerId);
    console.log("Current user ID:", userId);
    console.log("Owner match:", card.ownerId === userId);
    console.log("Can edit result:", canEdit);
  }

  return (
    <>
      <DualPanelLayout
        left={
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="font-bold text-xl text-gray-900 mb-2">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="text-sm text-gray-700 mb-4">
                    {project.description}
                  </p>
                )}
              </div>

              {showSettings && (
                <Link
                  href={`/projects/${project.slug}/settings`}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Project Settings"
                >
                  <Settings size={16} />
                </Link>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {project.teams && project.teams.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                    <Users size={14} />
                    <span>Teams ({project.teams.length}):</span>
                  </div>
                  <div className="ml-5 space-y-1">
                    {project.teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between"
                      >
                        <Link
                          href={`/team/${team.slug}`}
                          className="text-blue-500 hover:underline text-sm"
                        >
                          {team.name}
                        </Link>
                        {team.role && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(team.role)}`}
                          >
                            {getRoleIcon(team.role)}
                            {team.role}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Crown size={14} />
                <span>
                  Owner: {project.owner?.firstName} {project.owner?.lastName}
                  {isProjectOwner && " (You)"}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Views</h3>
              <div className="space-y-1">
                {views.map(({ id, label, icon, isActive }) => {
                  const Icon = getIcon(icon);
                  return (
                    <Link
                      key={id}
                      href={`/projects/${project.slug}`}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        }
        right={
          <div className="p-6">
            {/* Back Button */}
            <div className="mb-6">
              <Link
                href={`/projects/${project.slug}`}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                <ArrowLeft size={16} />
                Back to Project
              </Link>
            </div>

            {/* Card Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  {card.title}
                </h1>

                {/* Status & Priority Badges */}
                <div className="flex items-center gap-3 mb-4">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1.5",
                      card.column?.name === "Done"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : card.column?.name === "In Progress"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                    )}
                  >
                    {card.column?.name === "Done" ? (
                      <CheckCircle2 size={12} />
                    ) : card.column?.name === "In Progress" ? (
                      <PlayCircle size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {card.column?.name || "No Status"}
                  </Badge>

                  {card.priority && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "flex items-center gap-1.5",
                        getPriorityConfig(card.priority).color
                      )}
                    >
                      <Flag size={12} />
                      {getPriorityConfig(card.priority).label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {canEdit && (
                  <div className="relative group">
                    <button
                      onClick={() => setEditTaskOpen(true)}
                      className="p-2 rounded-md hover:bg-gray-100 hover:cursor-pointer text-primary hover:text-primary/70"
                    >
                      <Edit size={16} />
                    </button>
                    {/* Tooltip */}
                    <span
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                   hidden group-hover:block rounded-md bg-gray-800 px-2 py-1
                   text-xs text-white whitespace-nowrap z-50"
                    >
                      Edit
                    </span>
                  </div>
                )}

                {canDelete && (
                  <div className="relative group">
                    <button
                      onClick={handleDeleteClick}
                      className="p-2 hover:cursor-pointer rounded-md hover:bg-red-50 text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                    {/* Tooltip */}
                    <span
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                   hidden group-hover:block rounded-md bg-gray-800 px-2 py-1
                   text-xs text-white whitespace-nowrap z-50"
                    >
                      Delete
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Details */}
            <div className="space-y-6">
              {/* Description */}
              {card.description && (
                <div className=" bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Description
                  </h3>
                  <div
                    className="prose prose-sm max-w-none text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: card.description }}
                  />
                </div>
              )}

              {/* Metadata - Jira Style */}
              <div className="space-y-4">
                {/* Assignee */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 w-24">
                    <User size={14} />
                    <span>Assignee</span>
                  </div>
                  {card.assignee ? (
                    <div className="flex items-center gap-2">
                      {card.assignee.avatarUrl ? (
                        <img
                          src={card.assignee.avatarUrl}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          {card.assignee.firstName?.charAt(0)}
                          {card.assignee.lastName?.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm text-gray-900">
                        {card.assignee.firstName} {card.assignee.lastName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  )}
                </div>

                {/* Reporter/Creator */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 w-24">
                    <User size={14} />
                    <span>Reporter</span>
                  </div>
                  {card.owner ? (
                    <div className="flex items-center gap-2">
                      {card.owner.avatarUrl ? (
                        <img
                          src={card.owner.avatarUrl}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                          {card.owner.firstName?.charAt(0)}
                          {card.owner.lastName?.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm text-gray-900">
                        {card.owner.firstName} {card.owner.lastName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Unknown</span>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 w-24">
                    <Calendar size={14} />
                    <span>Due Date</span>
                  </div>
                  {card.dueDate ? (
                    <span className="text-sm text-gray-900">
                      {format(new Date(card.dueDate), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">None</span>
                  )}
                </div>

                {/* Start Date */}
                {card.startDate && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 w-24">
                      <PlayCircle size={14} />
                      <span>Start Date</span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {format(new Date(card.startDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {/* Created */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 w-24">
                    <Clock size={14} />
                    <span>Created</span>
                  </div>
                  <span className="text-sm text-gray-900">
                    {format(
                      new Date(card.createdAt),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </span>
                </div>
              </div>

              {/* Labels */}
              {card.labels && card.labels.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Tag size={14} />
                    <span>Labels</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.labels.map((label: any) => (
                      <Badge
                        key={label.id}
                        variant="secondary"
                        style={{
                          backgroundColor: label.color + "20",
                          color: label.color,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <CommentSection
                cardId={cardId}
                userId={userId}
                availableUsers={uniqueAvailableUsers}
              />
            </div>
          </div>
        }
      />

      {canEdit && editTaskOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <EditTaskDialog
            open={editTaskOpen}
            onOpenChange={setEditTaskOpen}
            card={card}
            projectId={project.id}
            userId={userId}
            columns={project.columns || []}
          />
        </Suspense>
      )}

      {canDelete && deleteTaskOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <DeleteTaskDialog
            isOpen={deleteTaskOpen}
            onClose={handleCloseDeleteDialog}
            taskTitle={card.title}
            deleteStep={deleteStep}
            confirmationText={confirmationText}
            setConfirmationText={setConfirmationText}
            onProceedToStep2={handleProceedToStep2}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </Suspense>
      )}
    </>
  );
}
