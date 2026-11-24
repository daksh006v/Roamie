import { RoomDetailsData } from '../../../types/room';

export interface MediaUploader {
  _id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface MediaItem {
  _id: string;
  roomId: string;
  storageUrl: string;
  thumbnailUrl?: string;
  publicId?: string;
  originalFilename: string;
  mediaType?: string;
  width?: number;
  height?: number;
  uploadedBy: MediaUploader;
  createdAt: string;
  updatedAt?: string;
}

export interface GalleryDateGroup {
  dateKey: string;
  dateLabel: string;
  items: MediaItem[];
}

export type GalleryFilter = 'all' | 'my' | string;

export interface GalleryTabProps {
  data: RoomDetailsData;
  onRefresh?: () => void;
}
