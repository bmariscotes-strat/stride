// components/tasks/CreateTaskDialog.tsx - Fixed TypeScript errors
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { Editor } from "@tiptap/react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/shared/command";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Calendar } from "@/components/ui/shared/calendar";
import { Badge } from "@/components/ui/shared/badge";
import { cn } from "@/lib/utils";
import {
  useCreateTask,
  useProjectAssignees,
  useCreateLabel,
  useProjectLabels,
} from "@/hooks/useTask";
import { useEditor, EditorContent } from "@tiptap/react";
import type { CreateCardInput } from "@/types";
import { PRIORITY_OPTIONS, LABEL_COLORS } from "@/lib/constants/tasks";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["high", "medium", "low"] as const).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.date().optional(),
  labelIds: z.array(z.string()).optional(),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId?: string;
  projectId: string;
  userId: string;
}

const TiptapEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
}> = ({ content, onChange }) => {
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
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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
          <strong>B</strong>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        >
          <em>I</em>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        >
          •
        </Button>
      </div>

      {/* Editor Content */}
      <div className="p-3 min-h-[120px] max-h-[200px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default function CreateTaskDialog({
  open,
  onOpenChange,
  columnId,
  projectId,
  userId, // Accept userId prop
}: CreateTaskDialogProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);

  // Use the createTaskMutation hook
  const createTaskMutation = useCreateTask();
  const { data: assignees = [] } = useProjectAssignees(projectId);
  const { data: projectLabels = [], refetch: refetchLabels } =
    useProjectLabels(projectId);
  const createLabelMutation = useCreateLabel();

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      assigneeId: "",
      labelIds: [],
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setNewLabelName("");
    }
  }, [open, form]);

  const onSubmit = async (data: CreateTaskForm) => {
    try {
      console.log("Form data:", data);
      console.log("Column ID:", columnId);
      console.log("Project ID:", projectId);

      // Check if columnId is provided
      if (!columnId) {
        console.error("Column ID is missing");
        return;
      }

      const createInput: CreateCardInput & { projectId: string } = {
        projectId,
        columnId,
        title: data.title,
        description: data.description || null,
        priority: data.priority || null,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      };

      console.log("Submitting task with data:", createInput);

      // Use the mutation to create the task
      await createTaskMutation.mutateAsync(createInput);

      console.log("Task created successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    setCreatingLabel(true);
    try {
      const randomColor =
        LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];

      const newLabel = await createLabelMutation.mutateAsync({
        projectId,
        name: newLabelName.trim(),
        color: randomColor,
      });

      // Add to selected labels
      const currentLabels = form.getValues("labelIds") ?? [];
      form.setValue("labelIds", [...currentLabels, newLabel.id]);

      setNewLabelName("");

      // Refresh the project labels list
      await refetchLabels();
    } catch (error) {
      console.error("Failed to create label:", error);
    } finally {
      setCreatingLabel(false);
    }
  };

  const selectedLabels = projectLabels.filter((label: any) =>
    (form.watch("labelIds") ?? []).includes(label.id)
  );

  const removeLabel = (labelId: string) => {
    const currentLabels = form.getValues("labelIds") ?? [];
    form.setValue(
      "labelIds",
      currentLabels.filter((id) => id !== labelId)
    );
  };

  // Add debug logging for button state
  const isSubmitting = createTaskMutation.isPending;
  const isFormValid = form.formState.isValid;

  console.log("Form state:", {
    isSubmitting,
    isFormValid,
    errors: form.formState.errors,
    values: form.getValues(),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title..." {...field} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${option.color.split(" ")[0]}`}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assignee */}
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {field.value
                              ? assignees.find(
                                  (assignee: any) => assignee.id === field.value
                                )?.firstName +
                                " " +
                                assignees.find(
                                  (assignee: any) => assignee.id === field.value
                                )?.lastName
                              : "Select assignee..."}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search assignees..." />
                          <CommandEmpty>No assignees found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                field.onChange("");
                                setAssigneeOpen(false);
                              }}
                            >
                              Unassigned
                            </CommandItem>
                            {assignees.map((assignee: any) => (
                              <CommandItem
                                key={assignee.id}
                                onSelect={() => {
                                  field.onChange(assignee.id);
                                  setAssigneeOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {assignee.avatarUrl ? (
                                    <img
                                      src={assignee.avatarUrl}
                                      alt=""
                                      className="w-6 h-6 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                      {assignee.firstName.charAt(0)}
                                      {assignee.lastName.charAt(0)}
                                    </div>
                                  )}
                                  {assignee.firstName} {assignee.lastName}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
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
                      </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Labels */}
            <FormField
              control={form.control}
              name="labelIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Labels</FormLabel>
                  <div className="space-y-2">
                    {/* Selected Labels */}
                    {selectedLabels.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedLabels.map((label: any) => (
                          <Badge
                            key={label.id}
                            variant="secondary"
                            style={{
                              backgroundColor: label.color + "20",
                              color: label.color,
                            }}
                            className="flex items-center gap-1"
                          >
                            {label.name}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() => removeLabel(label.id)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Popover open={labelOpen} onOpenChange={setLabelOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add labels...
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search or create labels..."
                            value={newLabelName}
                            onValueChange={setNewLabelName}
                          />
                          {newLabelName &&
                            !projectLabels.some(
                              (l: any) =>
                                l.name.toLowerCase() ===
                                newLabelName.toLowerCase()
                            ) && (
                              <CommandItem
                                onSelect={handleCreateLabel}
                                disabled={creatingLabel}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create "{newLabelName}"
                              </CommandItem>
                            )}

                          <CommandGroup>
                            {projectLabels.map((label: any) => (
                              <CommandItem
                                key={label.id}
                                onSelect={() => {
                                  const currentLabels = field.value ?? [];
                                  if (currentLabels.includes(label.id)) {
                                    field.onChange(
                                      currentLabels.filter(
                                        (id) => id !== label.id
                                      )
                                    );
                                  } else {
                                    field.onChange([
                                      ...currentLabels,
                                      label.id,
                                    ]);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                  />
                                  {label.name}
                                  {(field.value ?? []).includes(label.id) && (
                                    <div className="ml-auto">✓</div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
