import { RoomDetailsData } from '../../../types/room';

export interface SavedPlace {
  _id: string;
  roomId: string;
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  photoUrl?: string;
  addedBy?: {
    _id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  createdAt?: string;
  distanceKm?: number | null;
}

export interface ItineraryItem {
  _id: string;
  roomId: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  placeId?: SavedPlace | null;
  isCompleted: boolean;
  reminderMinutesBefore?: number | null;
  reminderSent?: boolean;
  createdBy?: {
    _id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationSearchResult {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  country?: string;
  city?: string;
}

export interface DayScheduleGroup {
  date: string;
  formattedDate: string;
  activities: ItineraryItem[];
}

export interface ItineraryTabProps {
  data: RoomDetailsData;
  onRefresh?: () => void;
}
