export interface RoomNotificationSettings {
  muted?: boolean;
  chat?: boolean;
  expenses?: boolean;
  itinerary?: boolean;
  gallery?: boolean;
}

export interface AdminPermissions {
  editRoom: boolean;
  manageMembers: boolean;
  manageItinerary: boolean;
  lockItinerary: boolean;
  manageExpenses: boolean;
  managePhotos: boolean;
  managePlaces: boolean;
  endTrip: boolean;
}

export interface RoleColors {
  owner: string;
  admin: string;
  member: string;
}

export interface RoomRolePermissions {
  canAddItinerary?: boolean;
  canAddExpenses?: boolean;
  canUploadMedia?: boolean;
  canAddPlaces?: boolean;
  canInvite?: boolean;
}

export interface RoomAdminPermissions {
  canEditTripInfo?: boolean;
  canEndTrip?: boolean;
  canManageRoles?: boolean;
  canDeleteRoom?: boolean;
}

export interface RoomPermissions {
  members?: RoomRolePermissions;
  admins?: RoomAdminPermissions;
}

export interface RoomDetailsData {
  room: {
    _id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
    coverImage?: string;
    status: 'planning' | 'active' | 'completed';
    inviteCode: string;
    isItineraryLocked?: boolean;
    adminPermissions?: AdminPermissions;
    roleColors?: RoleColors;
    permissions?: RoomPermissions;
    createdBy?: any;
  };
  membership: {
    role: 'owner' | 'admin' | 'member';
    notifications?: RoomNotificationSettings;
  };
  members: Array<{
    _id: string;
    role: 'owner' | 'admin' | 'member';
    userId: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
      phone?: string;
    };
  }>;
  stats: {
    totalDays: number;
    currentDay: number;
    progressPercentage: number;
    isUnderway: boolean;
    isCompleted: boolean;
    totalSpent: number;
    messageCount: number;
    photoCount: number;
    placeCount: number;
    itineraryCount: number;
    memberCount: number;
  };
  currentUserId?: string;
}
