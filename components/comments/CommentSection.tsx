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
  type Comment,
} from "@/hooks/useComments";

interface CommentSectionProps {
  cardId: string;
  userId: string;
  availableUsers?: Array<{
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  }>;
}

// Helper function to render content with mentions
function renderContentWithMentions(content: string, mentions?: any[]) {
  if (!mentions || mentions.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Create a regex to match @username patterns
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

    // Find if this username corresponds to an actual mention
    const mentionData = mentions.find(
      (m) => m.mentionedUser.username === username
    );

    if (mentionData) {
      // Render as interactive mention
      parts.push(
        <span
          key={`mention-${matchStart}`}
          className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium cursor-pointer hover:bg-blue-200 transition-colors"
          title={`${mentionData.mentionedUser.firstName} ${mentionData.mentionedUser.lastName}`}
        >
          @{username}
        </span>
      );
    } else {
      // Render as plain text if not a valid mention
      parts.push(<span key={`text-mention-${matchStart}`}>@{username}</span>);
    }

    lastIndex = matchEnd;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(<span key={`text-final`}>{content.slice(lastIndex)}</span>);
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}

interface CommentItemProps {
  comment: Comment;
  userId: string;
  onReply: (commentId: string) => void; // Changed from number to string
  level?: number;
}

interface EditCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comment: Comment;
}

interface DeleteCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comment: Comment;
}

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
        commentId: comment.id.toString(), // Convert to string
        content: content.trim(),
      });
      onClose();
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
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
      await deleteCommentMutation.mutateAsync(comment.id.toString()); // Convert to string
      onClose();
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Comment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this comment? This action cannot be
            undone.
            {comment.replies && comment.replies.length > 0 && (
              <span className="block mt-2 text-amber-600">
                This comment has {comment.replies.length} reply(ies) that will
                also be deleted.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-700 line-clamp-3">
            {comment.content}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
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
        className={`${level > 0 ? "ml-8 pl-4 border-l border-gray-200" : ""}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.user.avatarUrl} />
            <AvatarFallback className="text-xs">
              {comment.user.firstName?.charAt(0)}
              {comment.user.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">
                {comment.user.firstName} {comment.user.lastName}
              </span>
              <span className="text-xs text-gray-500">
                @{comment.user.username}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {comment.createdAt !== comment.updatedAt && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 mb-2">
              <p>
                {renderContentWithMentions(comment.content, comment.mentions)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {level < maxLevel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id.toString())} // Convert to string
                  className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
                >
                  <Reply size={14} className="mr-1" />
                  Reply
                </Button>
              )}

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700 p-1 h-auto"
                    >
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Edit size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-red-600 focus:text-red-600"
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
        parentId: parentId,
      });
      setContent("");
      if (onCancel) onCancel();
    } catch (error) {
      // Error is handled by the hook
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
          <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">@{user.username}</div>
                  <div className="text-xs text-gray-500">
                    {user.firstName} {user.lastName}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Press Cmd/Ctrl + Enter to {parentId ? "reply" : "comment"}
          {availableUsers && " • Type @ to mention someone"}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            size="sm"
            className="flex items-center gap-2"
          >
            <Send size={14} />
            {isSubmitting ? "Sending..." : parentId ? "Reply" : "Comment"}
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // Changed from number to string

  const { data: comments, isLoading, error } = useComments(cardId);

  const handleReply = (commentId: string) => {
    // Changed from number to string
    setReplyingTo(commentId);
    setShowNewComment(false);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6 text-center">
        <p className="text-sm text-red-600">Failed to load comments</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <MessageCircle size={16} />
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </h3>

        {!showNewComment && (
          <Button
            onClick={() => setShowNewComment(true)}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
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
              {replyingTo === comment.id.toString() && ( // Convert for comparison
                <div className="ml-8 mt-3 pl-4 border-l border-gray-200">
                  <CommentForm
                    cardId={cardId}
                    parentId={comment.id.toString()} // Convert to string
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
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <MessageCircle size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-3">No comments yet</p>
            <Button
              onClick={() => setShowNewComment(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus size={14} />
              Add the first comment
            </Button>
          </div>
        )
      )}
    </div>
  );
}
