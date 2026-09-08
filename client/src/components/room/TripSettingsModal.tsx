import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { RoomDetailsData } from './AboutTab';
import { RolePermissionsScreen } from './RolePermissionsScreen';
import api from '../../services/api';

interface TripSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  data: RoomDetailsData;
  onRefresh: () => void;
}

export const TripSettingsModal: React.FC<TripSettingsModalProps> = ({
  visible,
  onClose,
  data,
  onRefresh,
}) => {
  const router = useRouter();
  const { room, membership } = data;
  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin';
  const isAdminOrOwner = isOwner || isAdmin;

  const [rolePermScreenVisible, setRolePermScreenVisible] = useState(false);

  const adminCanEdit = room.permissions?.admins?.canEditTripInfo ?? true;
  const adminCanEnd = room.permissions?.admins?.canEndTrip ?? true;
  const adminCanDelete = room.permissions?.admins?.canDeleteRoom ?? false;

  const canEditTrip = isOwner || (isAdmin && adminCanEdit);
  const canEndTrip = isOwner || (isAdmin && adminCanEnd);
  const canDeleteRoom = isOwner || (isAdmin && adminCanDelete);

  const handleEndTrip = () => {
    Alert.alert(
      'End Trip',
      `Are you sure you want to mark "${room.name}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/rooms/${room._id}`, { status: 'completed' });
              onRefresh();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not end the trip.');
            }
          },
        },
      ]
    );
  };

  const handleLockItinerary = async () => {
    try {
      await api.put(`/rooms/${room._id}`, {
        isItineraryLocked: !(room as any).isItineraryLocked,
      });
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not toggle itinerary lock.');
    }
  };

  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete Room',
      `This will permanently delete "${room.name}" and all its data (messages, photos, expenses, etc). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/rooms/${room._id}`);
              onClose();
              router.replace('/rooms');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete the room.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={22} color={Colors.rooms.darkText} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Trip Settings</Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Role & Permissions — Owner or Admin with canManageRoles */}
              {(isOwner || (isAdmin && (room.permissions?.admins?.canManageRoles ?? true))) && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setRolePermScreenVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIconContainer}>
                    <Feather name="shield" size={18} color="#648A62" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Role Permissions</Text>
                    <Text style={styles.settingSubtitle}>Manage member roles & access controls</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
                </TouchableOpacity>
              )}

              {/* Edit Trip */}
              {canEditTrip && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => Alert.alert('Edit Trip', 'Edit trip form coming in next phase.')}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIconContainer}>
                    <Feather name="edit-2" size={18} color="#C97935" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Edit Trip Details</Text>
                    <Text style={styles.settingSubtitle}>Name, destination, dates & cover photo</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
                </TouchableOpacity>
              )}

              {/* Lock / Unlock Itinerary */}
              {canEditTrip && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleLockItinerary}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIconContainer}>
                    <Feather
                      name={(room as any).isItineraryLocked ? 'unlock' : 'lock'}
                      size={18}
                      color="#5F745F"
                    />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>
                      {(room as any).isItineraryLocked ? 'Unlock Itinerary' : 'Lock Itinerary'}
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      {(room as any).isItineraryLocked
                        ? 'Allow members to edit the itinerary again'
                        : 'Prevent members from changing the plan'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
                </TouchableOpacity>
              )}

              {/* End Trip */}
              {canEndTrip && room.status !== 'completed' && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleEndTrip}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIconContainer}>
                    <Feather name="check-circle" size={18} color="#0D9488" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>End Trip</Text>
                    <Text style={styles.settingSubtitle}>Mark this trip as completed & archive it</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
                </TouchableOpacity>
              )}

              {/* Danger Zone */}
              {canDeleteRoom && (
                <View style={styles.dangerSection}>
                  <Text style={styles.dangerLabel}>Danger Zone</Text>
                  <TouchableOpacity
                    style={[styles.settingRow, styles.dangerRow]}
                    onPress={handleDeleteRoom}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconContainer, { backgroundColor: '#FEF2F2' }]}>
                      <Feather name="trash-2" size={18} color="#DC2626" />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={[styles.settingTitle, { color: '#DC2626' }]}>Delete Room</Text>
                      <Text style={styles.settingSubtitle}>
                        Permanently delete this room and all data
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Role Permissions Full-Screen */}
      <RolePermissionsScreen
        visible={rolePermScreenVisible}
        onClose={() => {
          setRolePermScreenVisible(false);
          onRefresh();
        }}
        data={data}
        onRefresh={onRefresh}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.rooms.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rooms.sandBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rooms.sandBorder,
  },
  settingIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.rooms.greige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.rooms.darkText,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    lineHeight: 16,
  },
  dangerSection: {
    marginTop: 24,
  },
  dangerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
});
