import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

import { RoomsHeader, RoomTab } from '../components/rooms/RoomsHeader';
import { RoomCard, RoomData } from '../components/rooms/RoomCard';
import { CreateRoomCard } from '../components/rooms/CreateRoomCard';

interface RoomsApiResponse {
  total: number;
  active: any[];
  planning: any[];
  completed: any[];
}

export default function RoomsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<RoomTab>('myRooms');
  const [rooms, setRooms] = useState<RoomsApiResponse>({
    total: 0,
    active: [],
    planning: [],
    completed: [],
  });
  const [roomDetails, setRoomDetails] = useState<Record<string, RoomData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Fetch rooms list from GET /api/rooms */
  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      if (res.data?.success && res.data?.data) {
        const data = res.data.data as RoomsApiResponse;
        setRooms(data);

        // Fetch details (including members) for each room in parallel
        const allRooms = [...data.active, ...data.planning, ...data.completed];
        if (allRooms.length > 0) {
          const detailPromises = allRooms.map(async (room: any) => {
            try {
              const detailRes = await api.get(`/rooms/${room._id}`);
              if (detailRes.data?.success && detailRes.data?.data) {
                const detail = detailRes.data.data;
                const members = (detail.members || []).map((m: any) => ({
                  _id: m.userId?._id || m._id,
                  name: m.userId?.name || 'Unknown',
                  avatar: m.userId?.avatar,
                }));
                return {
                  _id: room._id,
                  name: room.name,
                  destination: room.destination,
                  startDate: room.startDate,
                  endDate: room.endDate,
                  description: room.description,
                  status: room.status || 'planning',
                  coverImage: room.coverImage,
                  members,
                } as RoomData;
              }
            } catch {
              // If detail fetch fails, return basic room data without members
            }
            return {
              _id: room._id,
              name: room.name,
              destination: room.destination,
              startDate: room.startDate,
              endDate: room.endDate,
              description: room.description,
              status: room.status || 'planning',
              coverImage: room.coverImage,
              members: [],
            } as RoomData;
          });

          const details = await Promise.all(detailPromises);
          const detailMap: Record<string, RoomData> = {};
          details.forEach((d) => {
            detailMap[d._id] = d;
          });
          setRoomDetails(detailMap);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [fetchRooms])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms();
  }, [fetchRooms]);

  /** Get the enriched RoomData for a room, falling back to the raw room object */
  const getRoomData = (room: any): RoomData => {
    return roomDetails[room._id] || {
      _id: room._id,
      name: room.name,
      destination: room.destination,
      startDate: room.startDate,
      endDate: room.endDate,
      description: room.description,
      status: room.status || 'planning',
      coverImage: room.coverImage,
      members: [],
    };
  };

  /** Determine which rooms to display based on active tab */
  const getDisplayedRooms = (): any[] => {
    switch (activeTab) {
      case 'myRooms':
        return [...rooms.active, ...rooms.planning];
      case 'invites':
        return [];
      case 'archived':
        return rooms.completed;
      default:
        return [];
    }
  };

  const displayedRooms = getDisplayedRooms();

  const handleRoomPress = (room: RoomData) => {
    router.push({ pathname: '/room/[id]', params: { id: room._id } } as any);
  };

  const handleCreateRoom = () => {
    router.push('/create-room');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.rooms.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.rooms.forestGreen}
            colors={[Colors.rooms.forestGreen]}
          />
        }
      >
        {/* Header: Logo + Avatar + Title + Tabs */}
        <RoomsHeader
          userName={user?.name || 'Traveler'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.rooms.forestGreen} />
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        )}

        {/* Room Cards */}
        {!loading && displayedRooms.length > 0 && (
          <View style={styles.cardsContainer}>
            {displayedRooms.map((room) => (
              <RoomCard
                key={room._id}
                room={getRoomData(room)}
                onPress={handleRoomPress}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && displayedRooms.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'invites'
                ? '💌'
                : activeTab === 'archived'
                ? '📦'
                : '🗺️'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'invites'
                ? 'No pending invites'
                : activeTab === 'archived'
                ? 'No archived trips yet'
                : 'No rooms yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'invites'
                ? "When friends invite you to a trip, it'll show up here."
                : activeTab === 'archived'
                ? 'Completed trips will appear here as a keepsake.'
                : 'Create your first room to start planning a trip!'}
            </Text>
          </View>
        )}

        {/* Create New Room CTA */}
        {activeTab === 'myRooms' && !loading && (
          <View style={styles.createRoomWrapper}>
            <CreateRoomCard onPress={handleCreateRoom} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  cardsContainer: {
    paddingHorizontal: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    lineHeight: 21,
  },
  createRoomWrapper: {
    marginTop: 'auto',
    paddingTop: 12,
  },
});
