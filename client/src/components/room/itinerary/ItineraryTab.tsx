import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import {
  ItineraryItem,
  DayScheduleGroup,
  SavedPlace,
  ItineraryTabProps,
} from './itineraryTypes';
import { ItineraryHeader } from './ItineraryHeader';
import { DayScheduleList } from './DayScheduleList';
import { EmptyItineraryState } from './EmptyItineraryState';
import { AddActivityModal } from './AddActivityModal';
import { PlacesListModal } from './PlacesListModal';
import { AddPlaceModal } from './AddPlaceModal';
import api from '../../../services/api';
import { connectSocket } from '../../../services/socket';

export const ItineraryTab: React.FC<ItineraryTabProps> = ({ data, onRefresh }) => {
  const { room, membership, currentUserId } = data;
  const roomId = room._id;

  const [days, setDays] = useState<DayScheduleGroup[]>([]);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [isAddActivityVisible, setIsAddActivityVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [defaultDateForActivity, setDefaultDateForActivity] = useState<string | undefined>();
  const [isPlacesVisible, setIsPlacesVisible] = useState(false);
  const [isAddPlaceVisible, setIsAddPlaceVisible] = useState(false);

  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const isItineraryLocked = Boolean(room.isItineraryLocked);

  // Can user add or edit activities?
  // Only owner can edit if itinerary is locked; otherwise all members can collaborate
  const canEdit = !isItineraryLocked || isOwner;

  /** Fetch schedule from GET /api/rooms/:roomId/itinerary */
  const fetchItinerary = useCallback(async () => {
    if (!roomId) return;
    try {
      setErrorMsg(null);
      const res = await api.get(`/rooms/${roomId}/itinerary`);
      if (res.data?.success && res.data?.data) {
        setDays(res.data.data.days || []);
      }
    } catch (err: any) {
      console.error('Error fetching itinerary:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Could not load itinerary.'
      );
    }
  }, [roomId]);

  /** Fetch places from GET /api/rooms/:roomId/places */
  const fetchPlaces = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await api.get(`/rooms/${roomId}/places`);
      if (res.data?.success && res.data?.data) {
        setPlaces(res.data.data.places || []);
      }
    } catch (err: any) {
      console.warn('Error fetching places:', err);
    }
  }, [roomId]);

  /** Initial load */
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchItinerary(), fetchPlaces()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchItinerary, fetchPlaces]);

  /** Real-time Socket.IO sync for itinerary and places */
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        const socket = await connectSocket();
        if (!mounted || !socket) return;

        socket.emit('join_room', { roomId });

        // Activity added by another traveler
        socket.on('new_itinerary_item', (payload: { item: ItineraryItem }) => {
          if (!mounted || !payload?.item) return;
          fetchItinerary();
        });

        // Activity updated (or completed)
        socket.on('updated_itinerary_item', (updatedItem: ItineraryItem) => {
          if (!mounted || !updatedItem) return;
          setDays((prevDays) =>
            prevDays.map((group) => ({
              ...group,
              activities: group.activities.map((a) =>
                a._id === updatedItem._id ? updatedItem : a
              ),
            }))
          );
        });

        // Activity deleted
        socket.on('deleted_itinerary_item', (payload: { itemId: string }) => {
          if (!mounted || !payload?.itemId) return;
          setDays((prevDays) =>
            prevDays
              .map((group) => ({
                ...group,
                activities: group.activities.filter(
                  (a) => a._id !== payload.itemId
                ),
              }))
              .filter((group) => group.activities.length > 0)
          );
        });

        // New place saved
        socket.on('new_place', (newPlace: SavedPlace) => {
          if (!mounted || !newPlace) return;
          setPlaces((prev) => {
            const exists = prev.some((p) => p._id === newPlace._id);
            if (exists) return prev;
            return [newPlace, ...prev];
          });
        });
      } catch (err) {
        console.warn('Itinerary socket connection error:', err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [roomId, fetchItinerary]);

  /** Pull to refresh */
  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchItinerary(), fetchPlaces()]);
    setRefreshing(false);
    onRefresh?.();
  }, [fetchItinerary, fetchPlaces, onRefresh]);

  /** Toggle complete */
  const handleToggleComplete = async (item: ItineraryItem) => {
    if (!canEdit) {
      Alert.alert(
        'Itinerary Locked',
        'Only the trip Owner can modify this locked itinerary.'
      );
      return;
    }

    const nextCompleted = !item.isCompleted;

    // Optimistic UI update
    setDays((prevDays) =>
      prevDays.map((group) => ({
        ...group,
        activities: group.activities.map((a) =>
          a._id === item._id ? { ...a, isCompleted: nextCompleted } : a
        ),
      }))
    );

    try {
      await api.put(`/rooms/${roomId}/itinerary/${item._id}`, {
        isCompleted: nextCompleted,
      });
    } catch (err: any) {
      console.error('Error toggling complete:', err);
      // Revert optimistic update on error
      setDays((prevDays) =>
        prevDays.map((group) => ({
          ...group,
          activities: group.activities.map((a) =>
            a._id === item._id ? { ...a, isCompleted: item.isCompleted } : a
          ),
        }))
      );
      Alert.alert(
        'Update Failed',
        err.response?.data?.message || 'Could not update activity completion.'
      );
    }
  };

  /** Edit an activity */
  const handleEditItem = (item: ItineraryItem) => {
    if (!canEdit) {
      Alert.alert(
        'Itinerary Locked',
        'Only the trip Owner can edit activities in this locked itinerary.'
      );
      return;
    }
    setEditingItem(item);
    setIsAddActivityVisible(true);
  };

  /** Delete an activity */
  const handleDeleteItem = async (item: ItineraryItem) => {
    if (!canEdit) {
      Alert.alert(
        'Itinerary Locked',
        'Only the trip Owner can remove activities in this locked itinerary.'
      );
      return;
    }

    // Optimistic removal
    setDays((prevDays) =>
      prevDays
        .map((group) => ({
          ...group,
          activities: group.activities.filter((a) => a._id !== item._id),
        }))
        .filter((group) => group.activities.length > 0)
    );

    try {
      await api.delete(`/rooms/${roomId}/itinerary/${item._id}`);
      try {
        Vibration.vibrate(20);
      } catch (e) {}
    } catch (err: any) {
      console.error('Error deleting activity:', err);
      fetchItinerary();
      Alert.alert(
        'Delete Failed',
        err.response?.data?.message || 'Could not remove activity.'
      );
    }
  };

  /** Delete a saved place */
  const handleDeletePlace = async (placeId: string) => {
    try {
      await api.delete(`/rooms/${roomId}/places/${placeId}`);
      setPlaces((prev) => prev.filter((p) => p._id !== placeId));
      try {
        Vibration.vibrate(20);
      } catch (e) {}
    } catch (err: any) {
      console.error('Error deleting place:', err);
      Alert.alert(
        'Delete Failed',
        err.response?.data?.message || 'Could not remove place.'
      );
    }
  };

  /** Add activity for a specific date shortcut */
  const handleAddActivityForDate = (dateString: string) => {
    setDefaultDateForActivity(dateString);
    setEditingItem(null);
    setIsAddActivityVisible(true);
  };

  /** Save activity success callback */
  const handleSaveActivitySuccess = (savedItem: ItineraryItem, isEdit: boolean) => {
    fetchItinerary();
  };

  /** Place added callback */
  const handlePlaceAdded = (newPlace: SavedPlace) => {
    setPlaces((prev) => [newPlace, ...prev]);
  };

  const totalActivities = useMemo(() => {
    return days.reduce((sum, d) => sum + d.activities.length, 0);
  }, [days]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <ItineraryHeader
        roomName={room.name}
        coverImage={room.coverImage}
        totalActivities={totalActivities}
        totalDays={days.length}
        isLocked={isItineraryLocked}
        placesCount={places.length}
        onOpenPlaces={() => setIsPlacesVisible(true)}
        onRefresh={onPullRefresh}
      />

      {/* Locked Mode Banner */}
      {isItineraryLocked && !isOwner && (
        <View style={styles.lockedBanner}>
          <Feather name="lock" size={14} color="#C96A25" />
          <Text style={styles.lockedBannerText}>
            Itinerary is locked by the trip Owner. Activities are view-only.
          </Text>
        </View>
      )}

      {/* Main Content Area */}
      {loading && days.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.rooms.forestGreen} />
          <Text style={styles.loadingText}>Loading itinerary...</Text>
        </View>
      ) : errorMsg && days.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onPullRefresh}
            activeOpacity={0.8}
          >
            <Feather name="rotate-cw" size={14} color="#FFFDF9" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={Colors.rooms.forestGreen}
              colors={[Colors.rooms.forestGreen]}
            />
          }
        >
          {days.length === 0 ? (
            <EmptyItineraryState
              canAdd={canEdit}
              onAddPress={() => {
                setDefaultDateForActivity(undefined);
                setEditingItem(null);
                setIsAddActivityVisible(true);
              }}
              onPinPlace={() => setIsAddPlaceVisible(true)}
            />
          ) : (
            <DayScheduleList
              days={days}
              canEdit={canEdit}
              onToggleComplete={handleToggleComplete}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onPlacePress={(place) => setIsPlacesVisible(true)}
              onAddActivityForDate={handleAddActivityForDate}
            />
          )}
        </ScrollView>
      )}

      {/* Floating Action Button (+ Add Activity) */}
      {canEdit && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setDefaultDateForActivity(undefined);
            setEditingItem(null);
            setIsAddActivityVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color="#FFFDF9" />
          <Text style={styles.fabText}>Add Activity</Text>
        </TouchableOpacity>
      )}

      {/* Modals */}
      <AddActivityModal
        visible={isAddActivityVisible}
        roomId={roomId}
        places={places}
        editingItem={editingItem}
        defaultDate={defaultDateForActivity}
        onClose={() => {
          setIsAddActivityVisible(false);
          setEditingItem(null);
        }}
        onSaveSuccess={handleSaveActivitySuccess}
        onOpenAddPlace={() => {
          setIsAddActivityVisible(false);
          setIsAddPlaceVisible(true);
        }}
      />

      <PlacesListModal
        visible={isPlacesVisible}
        places={places}
        currentUserId={currentUserId || ''}
        isOwnerOrAdmin={isOwnerOrAdmin}
        onClose={() => setIsPlacesVisible(false)}
        onOpenAddPlace={() => {
          setIsPlacesVisible(false);
          setIsAddPlaceVisible(true);
        }}
        onDeletePlace={handleDeletePlace}
        onSelectPlaceForActivity={(place) => {
          setIsPlacesVisible(false);
          setDefaultDateForActivity(undefined);
          setEditingItem({
            _id: '',
            roomId,
            title: `Visit ${place.name}`,
            date: new Date().toISOString(),
            startTime: '10:00 AM',
            endTime: '12:00 PM',
            placeId: place,
            isCompleted: false,
          });
          setIsAddActivityVisible(true);
        }}
      />

      <AddPlaceModal
        visible={isAddPlaceVisible}
        roomId={roomId}
        onClose={() => setIsAddPlaceVisible(false)}
        onPlaceAdded={handlePlaceAdded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF3E7',
    borderBottomWidth: 1,
    borderBottomColor: '#F2DFCB',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#8A4A14',
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  errorEmoji: {
    fontSize: 36,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFDF9',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C96A25',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: '#C96A25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFDF9',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
