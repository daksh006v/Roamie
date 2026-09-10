import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { RoomBottomNav, RoomNavTab } from '../../components/room/RoomBottomNav';
import { AboutTab, RoomDetailsData } from '../../components/room/AboutTab';
import { ChatTab } from '../../components/room/ChatTab';
import { ExpensesTab } from '../../components/room/ExpensesTab';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<RoomNavTab>('chat');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomDetailsData | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /** Fetch live room details from GET /api/rooms/:id */
  const fetchRoomDetails = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/rooms/${id}`);
      if (res.data?.success && res.data?.data) {
        setRoomData({
          ...res.data.data,
          currentUserId: user?._id,
        });
        setErrorMsg(null);
      } else {
        setErrorMsg(res.data?.message || 'Could not load room details');
      }
    } catch (err: any) {
      console.error('Error fetching room:', err);
      setErrorMsg(
        err.response?.data?.message ||
        err.message ||
        'Failed to connect to server.'
      );
    } finally {
      setLoading(false);
    }
  }, [id, user?._id]);

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.rooms.background} />
        <ActivityIndicator size="large" color={Colors.rooms.forestGreen} />
        <Text style={styles.loadingText}>Opening your room...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (errorMsg || !roomData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.rooms.background} />
        <Feather name="alert-triangle" size={42} color={Colors.rooms.planningOrange} />
        <Text style={styles.errorTitle}>Could not load room</Text>
        <Text style={styles.errorSubtitle}>{errorMsg || 'Room not found.'}</Text>
        <Text style={styles.backLink} onPress={() => router.back()}>
          Back to Rooms
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Tab Views */}
      <View style={styles.tabContent}>
        {activeTab === 'about' && (
          <AboutTab data={roomData} onRefresh={fetchRoomDetails} />
        )}

        {activeTab === 'itinerary' && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderEmoji}>🗓️</Text>
            <Text style={styles.placeholderTitle}>Itinerary</Text>
            <Text style={styles.placeholderSubtitle}>
              Daily schedule, activities & reminders coming in the Itinerary step.
            </Text>
          </View>
        )}

        {activeTab === 'gallery' && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderEmoji}>📸</Text>
            <Text style={styles.placeholderTitle}>Gallery</Text>
            <Text style={styles.placeholderSubtitle}>
              Shared photo grid & camera upload coming in the Gallery step.
            </Text>
          </View>
        )}

        {activeTab === 'chat' && (
          <ChatTab data={roomData} onRefresh={fetchRoomDetails} />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab data={roomData} onRefresh={fetchRoomDetails} />
        )}
      </View>

      {/* 5-Tab Bottom Navigation Bar */}
      {(!isKeyboardVisible || activeTab !== 'chat') && (
        <RoomBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  tabContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginTop: 12,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13.5,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    marginBottom: 20,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
    textDecorationLine: 'underline',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    lineHeight: 21,
  },
});
