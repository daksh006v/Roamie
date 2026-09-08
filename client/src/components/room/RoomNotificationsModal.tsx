import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import api from '../../services/api';

export interface RoomNotificationSettings {
  muted: boolean;
  chat: boolean;
  expenses: boolean;
  itinerary: boolean;
  gallery: boolean;
}

interface RoomNotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  initialNotifications?: Partial<RoomNotificationSettings>;
  onRefresh?: () => void;
}

const DEFAULT_NOTIFICATIONS: RoomNotificationSettings = {
  muted: false,
  chat: true,
  expenses: true,
  itinerary: true,
  gallery: true,
};

export const RoomNotificationsModal: React.FC<RoomNotificationsModalProps> = ({
  visible,
  onClose,
  roomId,
  initialNotifications,
  onRefresh,
}) => {
  const [settings, setSettings] = useState<RoomNotificationSettings>({
    ...DEFAULT_NOTIFICATIONS,
    ...initialNotifications,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialNotifications) {
      setSettings({
        ...DEFAULT_NOTIFICATIONS,
        ...initialNotifications,
      });
    }
  }, [initialNotifications, visible]);

  const handleToggle = (key: keyof RoomNotificationSettings, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/rooms/${roomId}/notifications`, {
        notifications: settings,
      });
      onRefresh?.();
      Alert.alert('Saved', 'Notification preferences updated for this room.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const isMuted = settings.muted;

  const categories: Array<{
    key: keyof Omit<RoomNotificationSettings, 'muted'>;
    title: string;
    description: string;
    icon: keyof typeof Feather.glyphMap;
  }> = [
    {
      key: 'chat',
      title: 'Chat Messages',
      description: 'New text messages and photos in group chat',
      icon: 'message-square',
    },
    {
      key: 'expenses',
      title: 'Expenses & Splits',
      description: 'When travelers record expenses or settlements',
      icon: 'credit-card',
    },
    {
      key: 'itinerary',
      title: 'Itinerary & Reminders',
      description: 'Scheduled activities and upcoming reminders',
      icon: 'calendar',
    },
    {
      key: 'gallery',
      title: 'Gallery Uploads',
      description: 'When travelers add new trip photos',
      icon: 'image',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerBtn}
          >
            <Feather name="arrow-left" size={22} color={Colors.rooms.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room Notifications</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Feather name="info" size={16} color="#648A62" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={styles.infoBannerText}>
              These settings only affect push notifications for this specific room. Other travelers will not be affected.
            </Text>
          </View>

          {/* Master Mute Card */}
          <View style={styles.card}>
            <View style={styles.masterRow}>
              <View style={[styles.iconContainer, isMuted && { backgroundColor: '#FEE2E2' }]}>
                <Feather
                  name={isMuted ? 'bell-off' : 'bell'}
                  size={20}
                  color={isMuted ? '#DC2626' : '#648A62'}
                />
              </View>
              <View style={styles.masterContent}>
                <Text style={styles.masterTitle}>Mute Room</Text>
                <Text style={styles.masterSubtitle}>
                  {isMuted
                    ? 'All notifications for this room are muted'
                    : 'Pause all notifications from this trip'}
                </Text>
              </View>
              <Switch
                value={settings.muted}
                onValueChange={(val) => handleToggle('muted', val)}
                trackColor={{ false: '#E2DCD4', true: '#DC2626' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Categories Section */}
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <Text style={styles.sectionSubtitle}>
            {isMuted ? 'Unmute the room above to customize individual alerts' : 'Select what you want to be alerted about'}
          </Text>

          <View style={[styles.card, isMuted && styles.cardDisabled]}>
            {categories.map((cat, idx) => {
              const value = settings[cat.key];
              return (
                <View key={cat.key}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryIconWrap}>
                      <Feather
                        name={cat.icon}
                        size={18}
                        color={isMuted ? '#A0AFA6' : '#648A62'}
                      />
                    </View>
                    <View style={styles.categoryContent}>
                      <Text style={[styles.categoryTitle, isMuted && styles.textDisabled]}>
                        {cat.title}
                      </Text>
                      <Text style={[styles.categorySubtitle, isMuted && styles.textDisabled]}>
                        {cat.description}
                      </Text>
                    </View>
                    <Switch
                      disabled={isMuted}
                      value={isMuted ? false : value}
                      onValueChange={(val) => handleToggle(cat.key, val)}
                      trackColor={{ false: '#E2DCD4', true: '#648A62' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Save Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4D9',
    backgroundColor: Colors.rooms.background,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF3EE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D8E4D8',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#344F3A',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E2D8',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#1A261E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDisabled: {
    opacity: 0.55,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  masterContent: {
    flex: 1,
    marginRight: 12,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  masterSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  categoryContent: {
    flex: 1,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  categorySubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 2,
  },
  textDisabled: {
    color: '#8C9E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0ECE4',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#EAE4D9',
    backgroundColor: Colors.rooms.background,
  },
  saveBtn: {
    backgroundColor: '#648A62',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#648A62',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
