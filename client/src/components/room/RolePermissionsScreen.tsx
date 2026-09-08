import React, { useState, useCallback } from 'react';
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
import { RoomDetailsData, RoomPermissions } from './AboutTab';
import api from '../../services/api';

interface RolePermissionsScreenProps {
  visible: boolean;
  onClose: () => void;
  data: RoomDetailsData;
  onRefresh: () => void;
}

const getMemberColor = (name: string): string => {
  const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const ROLE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  owner: { label: 'Owner', emoji: '👑', color: '#C97935' },
  admin: { label: 'Admin', emoji: '🛡️', color: '#648A62' },
  member: { label: 'Member', emoji: '👤', color: '#5F745F' },
};

export const RolePermissionsScreen: React.FC<RolePermissionsScreenProps> = ({
  visible,
  onClose,
  data,
  onRefresh,
}) => {
  const { room, membership, members, currentUserId } = data;
  const isOwner = membership?.role === 'owner';

  const defaultPerms: RoomPermissions = {
    members: {
      canAddItinerary: true,
      canAddExpenses: true,
      canUploadMedia: true,
      canAddPlaces: true,
      canInvite: true,
    },
    admins: {
      canEditTripInfo: true,
      canManageRoles: true,
      canEndTrip: true,
      canDeleteRoom: false,
    },
  };

  const [permissions, setPermissions] = useState<RoomPermissions>(
    room.permissions || defaultPerms
  );
  const [saving, setSaving] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const handleTogglePermission = (
    category: 'members' | 'admins',
    key: string,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleSavePermissions = useCallback(async () => {
    setSaving(true);
    try {
      await api.put(`/rooms/${room._id}/permissions`, { permissions });
      onRefresh();
      Alert.alert('Saved', 'Role permissions updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update permissions.');
    } finally {
      setSaving(false);
    }
  }, [permissions, room._id, onRefresh]);

  const handleRoleChange = useCallback(
    async (memberId: string, memberName: string, currentRole: string) => {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      const actionLabel =
        newRole === 'admin'
          ? `Promote ${memberName} to Admin?`
          : `Demote ${memberName} to Member?`;

      Alert.alert('Change Role', actionLabel, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newRole === 'admin' ? 'Promote' : 'Demote',
          style: newRole === 'admin' ? 'default' : 'destructive',
          onPress: async () => {
            setChangingRole(memberId);
            try {
              await api.put(`/rooms/${room._id}/members/${memberId}/role`, {
                role: newRole,
              });
              onRefresh();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.response?.data?.message || 'Could not update role.'
              );
            } finally {
              setChangingRole(null);
            }
          },
        },
      ]);
    },
    [room._id, onRefresh]
  );

  const memberPermEntries: Array<{
    key: keyof RoomPermissions['members'];
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      key: 'canAddItinerary',
      label: 'Add Itinerary Items',
      description: 'Create & edit planned activities',
      icon: 'calendar',
    },
    {
      key: 'canAddExpenses',
      label: 'Add Expenses',
      description: 'Record trip expenses & splits',
      icon: 'credit-card',
    },
    {
      key: 'canUploadMedia',
      label: 'Upload Photos',
      description: 'Upload photos to the gallery',
      icon: 'image',
    },
    {
      key: 'canAddPlaces',
      label: 'Add Places',
      description: 'Pin new locations to the trip',
      icon: 'map-pin',
    },
    {
      key: 'canInvite',
      label: 'Invite Friends',
      description: 'Share invite codes with others',
      icon: 'user-plus',
    },
  ];

  const adminPermEntries: Array<{
    key: keyof RoomPermissions['admins'];
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      key: 'canEditTripInfo',
      label: 'Edit Trip Details',
      description: 'Modify name, dates, destination & cover',
      icon: 'edit-2',
    },
    {
      key: 'canManageRoles',
      label: 'Manage Member Roles',
      description: 'Promote or demote other members',
      icon: 'shield',
    },
    {
      key: 'canEndTrip',
      label: 'End / Complete Trip',
      description: 'Mark the trip as completed',
      icon: 'check-circle',
    },
    {
      key: 'canDeleteRoom',
      label: 'Delete Trip',
      description: 'Permanently remove this room',
      icon: 'trash-2',
    },
  ];

  // Sort members: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return (order[a.role] || 2) - (order[b.role] || 2);
  });

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
          >
            <Feather name="arrow-left" size={22} color={Colors.rooms.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Role Permissions</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* === SECTION 1: Member Roles === */}
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <Text style={styles.sectionSubtitle}>
            Tap a member to change their role
          </Text>

          <View style={styles.card}>
            {sortedMembers.map((m, idx) => {
              const isMe = m.userId?._id === currentUserId;
              const isThisOwner = m.role === 'owner';
              const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.member;
              const initials = (m.userId?.name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              const canChangeRole = isOwner && !isThisOwner && !isMe;

              return (
                <View key={m._id}>
                  {idx > 0 && <View style={styles.memberDivider} />}
                  <TouchableOpacity
                    style={styles.memberRow}
                    disabled={!canChangeRole}
                    onPress={() =>
                      canChangeRole &&
                      handleRoleChange(m._id, m.userId?.name || 'Member', m.role)
                    }
                    activeOpacity={canChangeRole ? 0.7 : 1}
                  >
                    {/* Avatar */}
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: getMemberColor(m.userId?.name || '') },
                      ]}
                    >
                      <Text style={styles.memberAvatarText}>{initials}</Text>
                    </View>

                    {/* Name & Email */}
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {isMe ? 'You' : m.userId?.name || 'Member'}
                      </Text>
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {m.userId?.email || ''}
                      </Text>
                    </View>

                    {/* Role Badge */}
                    {changingRole === m._id ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.rooms.forestGreen}
                      />
                    ) : (
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: roleInfo.color + '18' },
                        ]}
                      >
                        <Text style={styles.roleEmoji}>{roleInfo.emoji}</Text>
                        <Text
                          style={[styles.roleLabel, { color: roleInfo.color }]}
                        >
                          {roleInfo.label}
                        </Text>
                      </View>
                    )}

                    {canChangeRole && (
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={Colors.rooms.mutedText}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* === SECTION 2: Member Permissions Toggles (Owner only) === */}
          {isOwner && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                Member Permissions
              </Text>
              <Text style={styles.sectionSubtitle}>
                Control what standard members can do
              </Text>

              <View style={styles.card}>
                {memberPermEntries.map((entry, idx) => (
                  <View key={entry.key}>
                    {idx > 0 && <View style={styles.memberDivider} />}
                    <View style={styles.permRow}>
                      <View style={styles.permIconWrap}>
                        <Feather
                          name={entry.icon as any}
                          size={16}
                          color="#648A62"
                        />
                      </View>
                      <View style={styles.permContent}>
                        <Text style={styles.permLabel}>{entry.label}</Text>
                        <Text style={styles.permDescription}>
                          {entry.description}
                        </Text>
                      </View>
                      <Switch
                        value={permissions.members[entry.key]}
                        onValueChange={(val) =>
                          handleTogglePermission('members', entry.key, val)
                        }
                        trackColor={{
                          false: '#D1D5DB',
                          true: '#648A6280',
                        }}
                        thumbColor={
                          permissions.members[entry.key]
                            ? '#648A62'
                            : '#F3F4F6'
                        }
                      />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* === SECTION 3: Admin Permissions Toggles (Owner only) === */}
          {isOwner && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                Admin Permissions
              </Text>
              <Text style={styles.sectionSubtitle}>
                Control what Admins are allowed to do
              </Text>

              <View style={styles.card}>
                {adminPermEntries.map((entry, idx) => (
                  <View key={entry.key}>
                    {idx > 0 && <View style={styles.memberDivider} />}
                    <View style={styles.permRow}>
                      <View
                        style={[
                          styles.permIconWrap,
                          entry.key === 'canDeleteRoom' && {
                            backgroundColor: '#FEF2F2',
                          },
                        ]}
                      >
                        <Feather
                          name={entry.icon as any}
                          size={16}
                          color={
                            entry.key === 'canDeleteRoom'
                              ? '#DC2626'
                              : '#C97935'
                          }
                        />
                      </View>
                      <View style={styles.permContent}>
                        <Text
                          style={[
                            styles.permLabel,
                            entry.key === 'canDeleteRoom' && {
                              color: '#DC2626',
                            },
                          ]}
                        >
                          {entry.label}
                        </Text>
                        <Text style={styles.permDescription}>
                          {entry.description}
                        </Text>
                      </View>
                      <Switch
                        value={permissions.admins[entry.key]}
                        onValueChange={(val) =>
                          handleTogglePermission('admins', entry.key, val)
                        }
                        trackColor={{
                          false: '#D1D5DB',
                          true:
                            entry.key === 'canDeleteRoom'
                              ? '#DC262640'
                              : '#C9793580',
                        }}
                        thumbColor={
                          permissions.admins[entry.key]
                            ? entry.key === 'canDeleteRoom'
                              ? '#DC2626'
                              : '#C97935'
                            : '#F3F4F6'
                        }
                      />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Save Button */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSavePermissions}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather
                    name="check"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.saveBtnText}>Save Permissions</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rooms.sandBorder,
    backgroundColor: Colors.rooms.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
  },

  /* Member Rows */
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  memberDivider: {
    height: 1,
    backgroundColor: Colors.rooms.sandBorder,
    marginHorizontal: 14,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  memberInfo: {
    flex: 1,
    marginRight: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  memberEmail: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    marginTop: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Permission Toggle Rows */
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  permIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.rooms.greige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permContent: {
    flex: 1,
    marginRight: 8,
  },
  permLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  permDescription: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    marginTop: 1,
  },

  /* Save Button */
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#648A62',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 28,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
