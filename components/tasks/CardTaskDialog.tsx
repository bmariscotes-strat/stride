// components/tasks/CardTaskDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CalendarIcon,
  Clock,
  User,
  MessageCircle,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Reply,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shared/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/shared/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shared/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/shared/popover";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Textarea } from "@/components/ui/shared/textarea";
import { Calendar } from "@/components/ui/shared/calendar";
import { Badge } from "@/components/ui/shared/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/shared/avatar";
import { Separator } from "@/components/ui/shared/separator";
import { cn } from "@/lib/utils";
import { useTask, useUpdateTask, useProjectAssignees } from "@/hooks/useTask";
import type { UpdateCardInput, CardWithServiceRelations } from "@/types";
import type { Priority } from "@/types/enums/notif";

const TiptapEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}> = ({ content, onChange, placeholder = "Write something..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
      }),
      Bold,
      Italic,
      BulletList.configure({
        HTMLAttributes: {
          class: "list-disc list-inside",
        },
      }),
      ListItem,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[60px] p-3",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
        >
          <strong className="text-xs">B</strong>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        >
          <em className="text-xs">I</em>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        >
          <span className="text-xs">•</span>
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "text-red-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "low", label: "Low", color: "text-green-600" },
];

// Mock comment service - replace with your actual service
const commentService = {
  async addComment(cardId: string, content: string, userId: string) {
    // Replace with actual API call
    return {
      id: Date.now(),
      cardId,
      content,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: userId,
        firstName: "Current",
        lastName: "User",
        avatarUrl: null,
      },
    };
  },
  async deleteComment(commentId: number, userId: string) {
    // Replace with actual API call
    return true;
  },
};

const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["high", "medium", "low"] as const).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.string().optional(),
});

type UpdateTaskForm = z.infer<typeof updateTaskSchema>;

interface CardTaskDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface CommentItemProps {
  comment: any;
  onDelete: (commentId: number) => void;
  canDelete: boolean;
  onReply?: (content: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onDelete,
  canDelete,
  onReply,
}) => {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleReply = () => {
    if (replyContent.trim() && onReply) {
      onReply(`@${comment.user.firstName} ${replyContent}`);
      setReplyContent("");
      setShowReply(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.user.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {comment.user.firstName.charAt(0)}
            {comment.user.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.user.firstName} {comment.user.lastName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <div
            className="text-sm text-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />

          <div className="flex items-center gap-2 text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowReply(!showReply)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {showReply && (
        <div className="ml-11 space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleReply}>
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowReply(false);
                setReplyContent("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CardTaskDialog({
  cardId,
  open,
  onOpenChange,
  userId,
}: CardTaskDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const { data: card, isLoading } = useTask(cardId, open);
  const updateTaskMutation = useUpdateTask(userId);
  const { data: assignees = [] } = useProjectAssignees(
    card?.column.projectId || "",
    !!card
  );

  const form = useForm<UpdateTaskForm>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      assigneeId: "",
      status: "",
    },
  });

  // Load card data into form
  useEffect(() => {
    if (card) {
      form.reset({
        title: card.title,
        description: card.description || "",
        priority: (card.priority as Priority) || "medium",
        assigneeId: card.assigneeId || "",
        status: card.status || "",
      });
      setComments(card.comments || []);
    }
  }, [card, form]);

  const onSubmit = async (data: UpdateTaskForm) => {
    try {
      const updateInput: UpdateCardInput = {
        id: cardId,
        title: data.title,
        description: data.description || null,
        priority: data.priority || null,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
        status: data.status || null,
      };

      await updateTaskMutation.mutateAsync(updateInput);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setAddingComment(true);
    try {
      const comment = await commentService.addComment(
        cardId,
        newComment,
        userId
      );
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentService.deleteComment(commentId, userId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleReplyToComment = (content: string) => {
    setNewComment(content);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading task...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!card) {
    return null;
  }

  const priorityOption = PRIORITY_OPTIONS.find(
    (p) => p.value === card.priority
  );
  const assignedUser = assignees.find((a) => a.id === card.assigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <DialogTitle className="text-lg">
              {isEditing ? "Edit Task" : card.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <X className="w-4 h-4" />
              ) : (
                <Edit3 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
              {isEditing ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <TiptapEditor
                              content={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={updateTaskMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateTaskMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  {/* Description */}
                  {card.description && (
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <div
                        className="prose prose-sm max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: card.description }}
                      />
                    </div>
                  )}

                  {/* Labels */}
                  {card.labels && card.labels.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Labels</h3>
                      <div className="flex flex-wrap gap-2">
                        {card.labels.map((cardLabel) => (
                          <Badge
                            key={cardLabel.id}
                            variant="secondary"
                            style={{
                              backgroundColor: cardLabel.color + "20",
                              color: cardLabel.color,
                            }}
                          >
                            {cardLabel.id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Comments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comments ({comments.length})
                  </h3>
                </div>

                {/* Add Comment */}
                <div className="space-y-3">
                  <TiptapEditor
                    content={newComment}
                    onChange={setNewComment}
                    placeholder="Add a comment..."
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addingComment}
                      size="sm"
                    >
                      {addingComment ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onDelete={handleDeleteComment}
                        canDelete={comment.userId === userId}
                        onReply={handleReplyToComment}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        No comments yet. Be the first to add one!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 border-l pl-6 overflow-y-auto">
              {/* Task Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Task Details</h3>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <p className="text-sm capitalize">
                      {card.status || "No status"}
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${option.color.replace("text-", "bg-")}`}
                                  />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {priorityOption && (
                        <>
                          <div
                            className={`w-2 h-2 rounded-full ${priorityOption.color.replace("text-", "bg-")}`}
                          />
                          <span className={`text-sm ${priorityOption.color}`}>
                            {priorityOption.label}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assignee</label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {assignees.map((assignee) => (
                              <SelectItem key={assignee.id} value={assignee.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage
                                      src={assignee.avatarUrl || undefined}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {assignee.firstName.charAt(0)}
                                      {assignee.lastName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {assignee.firstName} {assignee.lastName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {assignedUser ? (
                        <>
                          <Avatar className="w-6 h-6">
                            <AvatarImage
                              src={assignedUser.avatarUrl || undefined}
                            />
                            <AvatarFallback className="text-xs">
                              {assignedUser.firstName.charAt(0)}
                              {assignedUser.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {assignedUser.firstName} {assignedUser.lastName}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      {card.dueDate ? (
                        <>
                          <CalendarIcon className="w-4 h-4" />
                          <span>{format(new Date(card.dueDate), "PPP")}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          No due date
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Created/Updated Info */}
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      Created {format(new Date(card.createdAt), "PPP")}
                    </span>
                  </div>
                  {card.updatedAt !== card.createdAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        Updated{" "}
                        {formatDistanceToNow(new Date(card.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
