// types/comments.ts
export interface CommentUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  username: string;
}

export interface CommentMention {
  id: number;
  mentionedUser: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

export interface Comment {
  id: number;
  cardId: string;
  userId: string;
  content: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    username: string;
  };
  replies?: Comment[];
  mentions?: Array<{
    id: number;
    mentionedUser: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
    };
  }>;
}

export interface CreateCommentData {
  cardId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  commentId: string;
  content: string;
}

export interface CommentSectionProps {
  cardId: string;
  userId: string;
  availableUsers?: Array<{
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  }>;
}

export interface MentionHoverProps {
  user: {
    avatarUrl?: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  };
  username: string;
}

export interface CommentItemProps {
  comment: Comment;
  userId: string;
  onReply: (commentId: string) => void;
  level?: number;
}

export interface EditCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comment: Comment;
}

export interface DeleteCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comment: Comment;
}
