import { RoomDetailsData } from '../../../types/room';

export interface MessageUser {
  _id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface ReplyToMsg {
  _id: string;
  content?: string;
  text?: string;
  senderId?: { _id: string; name: string } | null;
  type?: string;
  media?: { url?: string };
}

export interface Reaction {
  userId: string | { _id: string };
  emoji: string;
}

export interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: MessageUser | null;
  type: 'text' | 'image' | 'system' | 'poll' | 'audio' | 'location' | 'itinerary' | 'expense';
  content: string;
  text?: string;
  media?: {
    url?: string;
    type?: string;
    width?: number;
    height?: number;
  };
  mediaUrl?: string;
  replyTo?: ReplyToMsg | null;
  reactions: Reaction[];
  metadata?: {
    type?: 'stay' | 'place' | 'itinerary';
    placeId?: string;
    title?: string;
    subtitle?: string;
    location?: string;
    details?: string;
    actionLabel?: string;
    imageUrl?: string;
  };
  isPinned?: boolean;
  pinnedBy?: string | null;
  pinnedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatTabProps {
  data: RoomDetailsData;
  onRefresh: () => void;
}
