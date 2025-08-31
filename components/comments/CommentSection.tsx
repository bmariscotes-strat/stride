// components/comments/CommentSection.tsx
"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  Plus,
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { Textarea } from "@/components/ui/shared/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/shared/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shared/dialog";
import { formatDistanceToNow } from "date-fns";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/useComments";
import {
  CommentSectionProps,
  MentionHoverProps,
  CommentItemProps,
  EditCommentDialogProps,
  DeleteCommentDialogProps,
} from "@/types/forms/comment";

function renderContentWithMentions(content: string, mentions?: any[]) {
  if (!mentions || mentions.length === 0) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  const mentionRegex = /@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Add text before mention
    if (matchStart > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, matchStart)}
        </span>
      );
    }

    // Find mention data
    const mentionData = mentions.find(
      (m) => m.mentionedUser.username === username
    );

    if (mentionData) {
      const user = mentionData.mentionedUser;
      parts.push(
        <MentionHover
          key={`mention-${matchStart}`}
          user={user}
          username={username}
        />
      );
    } else {
      // Render as plain text if no match
      parts.push(<span key={`text-mention-${matchStart}`}>@{username}</span>);
    }

    lastIndex = matchEnd;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(<span key={`text-final`}>{content.slice(lastIndex)}</span>);
  }

  // Wrap everything in a div to avoid <p> nesting issues
  return <div className="whitespace-pre-wrap break-words">{parts}</div>;
}

const MentionHover: React.FC<MentionHoverProps> = ({ user, username }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded text-sm font-medium cursor-default hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
        @{username}
      </span>

      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10
             max-w-xs sm:max-w-sm w-max p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
             rounded-lg shadow-lg text-sm text-gray-700 dark:text-gray-200 whitespace-normal"
        >
          <div className="flex items-center gap-2">
            <img
              src={user.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-700 translate-y-px"></div>
        </div>
      )}
    </span>
  );
};

function EditCommentDialog({
  isOpen,
  onClose,
  comment,
}: EditCommentDialogProps) {
  const [content, setContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateCommentMutation = useUpdateComment();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await updateCommentMutation.mutateAsync({
        commentId: String(comment.id),
        content: content.trim(),
      });
      onClose();
    } catch (error) {
      console.error("Failed to update comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Comment</DialogTitle>
          <DialogDescription>
            Make changes to your comment below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit your comment..."
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Updating..." : "Update Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCommentDialog({
  isOpen,
  onClose,
  comment,
}: DeleteCommentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCommentMutation = useDeleteComment();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCommentMutation.mutateAsync(comment.id.toString());
      onClose();
    } catch (error) {
      console.error("Failed to delete comment:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle>Delete Comment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this comment? This action cannot be
            undone.
            {comment.replies && comment.replies.length > 0 && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                This comment has {comment.replies.length} reply(ies) that will
                also be deleted.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 break-words">
            {comment.content}
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? "Deleting..." : "Delete Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommentItem({
  comment,
  userId,
  onReply,
  level = 0,
}: CommentItemProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isOwner = comment.userId === userId;
  const maxLevel = 3; // Limit nesting depth

  return (
    <>
      <div
        className={`${level > 0 ? "ml-4 sm:ml-8 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700" : ""}`}
      >
        <div className="flex gap-2 sm:gap-3">
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
            <AvatarImage src={comment.user.avatarUrl} />
            <AvatarFallback className="text-xs">
              {comment.user.firstName?.charAt(0)}
              {comment.user.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {comment.user.firstName} {comment.user.lastName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{comment.user.username}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {new Date(comment.createdAt).getTime() !==
                new Date(comment.updatedAt).getTime() && (
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  (edited)
                </span>
              )}
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mb-2">
              {renderContentWithMentions(comment.content, comment.mentions)}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {level < maxLevel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id.toString())}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-0 h-auto"
                >
                  <Reply size={12} className="mr-1" />
                  Reply
                </Button>
              )}

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 h-auto"
                    >
                      <MoreHorizontal size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Edit size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                userId={userId}
                onReply={onReply}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <>
          <EditCommentDialog
            isOpen={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            comment={comment}
          />
          <DeleteCommentDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            comment={comment}
          />
        </>
      )}
    </>
  );
}

function CommentForm({
  cardId,
  parentId,
  onCancel,
  availableUsers,
}: {
  cardId: string;
  parentId?: string;
  onCancel?: () => void;
  availableUsers?: Array<{
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  }>;
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const createCommentMutation = useCreateComment();

  const filteredUsers =
    availableUsers?.filter(
      (user) =>
        user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.firstName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(mentionQuery.toLowerCase())
    ) || [];

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch && availableUsers) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      setMentionPosition(mentionMatch.index || 0);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const insertMention = (user: {
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  }) => {
    const beforeMention = content.slice(0, mentionPosition);
    const afterMention = content.slice(
      mentionPosition + mentionQuery.length + 1
    ); // +1 for @
    const newContent = `${beforeMention}@${user.username} ${afterMention}`;
    setContent(newContent);
    setShowMentions(false);
    setMentionQuery("");
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createCommentMutation.mutateAsync({
        cardId,
        content: content.trim(),
        parentId,
      });
      setContent("");
      if (onCancel) onCancel();
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[0]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3 relative">
      <div className="relative">
        <Textarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={
            parentId
              ? "Write a reply... (use @username to mention someone)"
              : "Write a comment... (use @username to mention someone)"
          }
          rows={3}
          className="resize-none"
        />

        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-w-xs sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    @{user.username}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.firstName} {user.lastName}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 order-2 sm:order-1">
          Press Cmd/Ctrl + Enter to {parentId ? "reply" : "comment"}
          {availableUsers && " • Type @ to mention someone"}
        </p>
        <div className="flex gap-2 order-1 sm:order-2">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            size="sm"
            className="flex items-center gap-2 flex-1 sm:flex-none"
          >
            <Send size={14} />
            <span className="hidden sm:inline">
              {isSubmitting ? "Sending..." : parentId ? "Reply" : "Comment"}
            </span>
            <span className="sm:hidden">
              {isSubmitting ? "..." : parentId ? "Reply" : "Send"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({
  cardId,
  userId,
  availableUsers,
}: CommentSectionProps) {
  const [showNewComment, setShowNewComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // Changed to number

  // Real-time comments hook automatically handles WebSocket connections
  const { data: comments, isLoading, error } = useComments(cardId);

  const handleReply = (commentId: string) => {
    setReplyingTo(parseInt(commentId, 10)); // Convert string to number
    setShowNewComment(false);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 sm:p-6 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load comments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageCircle size={16} className="flex-shrink-0" />
          <span>
            Comments {comments && comments.length > 0 && `(${comments.length})`}
          </span>
        </h3>

        {!showNewComment && (
          <Button
            onClick={() => setShowNewComment(true)}
            size="sm"
            className="flex items-center gap-2 hover:cursor-pointer w-full sm:w-auto"
          >
            <Plus size={14} />
            Add Comment
          </Button>
        )}
      </div>

      {showNewComment && (
        <div className="mb-6">
          <CommentForm
            cardId={cardId}
            availableUsers={availableUsers}
            onCancel={() => setShowNewComment(false)}
          />
        </div>
      )}

      {comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment: any) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                userId={userId}
                onReply={handleReply}
              />

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="ml-4 sm:ml-8 mt-3 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700">
                  <CommentForm
                    cardId={cardId}
                    parentId={comment.id} // Keep as number
                    availableUsers={availableUsers}
                    onCancel={handleCancelReply}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !showNewComment && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-6 text-center">
            <MessageCircle
              size={24}
              className="mx-auto text-gray-400 dark:text-gray-500 mb-2"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              No comments yet
            </p>
          </div>
        )
      )}
    </div>
  );
}
