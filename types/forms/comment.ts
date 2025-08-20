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
  user: CommentUser;
  replies?: Comment[];
  mentions?: CommentMention[];
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
