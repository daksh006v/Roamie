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
import { RoomDetailsData, AdminPermissions, RoleColors } from './AboutTab';
import api from '../../services/api';

interface RolePermissionsScreenProps {
  visible: boolean;
  onClose: () => void;
  data: RoomDetailsData;
  onRefresh: () => void;
}

const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  editRoom: true,
  manageMembers: true,
  manageItinerary: true,
  lockItinerary: true,
  manageExpenses: true,
  managePhotos: true,
  managePlaces: true,
  endTrip: true,
};

const DEFAULT_ROLE_COLORS: RoleColors = {
  owner: '#C96A25',
  admin: '#5F745F',
  member: '#59615A',
};

const COLOR_SWATCHES = [
  '#C96A25', // Burnt Orange
  '#5F745F', // Forest Sage
  '#59615A', // Charcoal Slate
  '#E18A3A', // Warm Amber
  '#648A62', // Active Green
  '#38BDF8', // Cyber Cyan
  '#8B5CF6', // Neon Purple
  '#EC4899', // Hot Pink
  '#EF4444', // Ruby Red
  '#10B981', // Emerald
  '#F59E0B', // Sunburst Gold
  '#243C32', // Dark Pine
];

export const RolePermissionsScreen: React.FC<RolePermissionsScreenProps> = ({
  visible,
  onClose,
  data,
  onRefresh,
}) => {
  const { room, membership } = data;
  const isOwner = membership?.role === 'owner';

  const [activeTab, setActiveTab] = useState<'permissions' | 'colors'>('permissions');
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    ...DEFAULT_ADMIN_PERMISSIONS,
    ...(room.adminPermissions || {}),
  });
  const [roleColors, setRoleColors] = useState<RoleColors>({
    ...DEFAULT_ROLE_COLORS,
    ...(room.roleColors || {}),
  });
  const [selectedRoleToColor, setSelectedRoleToColor] = useState<'owner' | 'admin' | 'member'>('admin');
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof AdminPermissions, value: boolean) => {
    setAdminPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      // Save admin permissions via PATCH /api/rooms/:id/admin-permissions
      await api.patch(`/rooms/${room._id}/admin-permissions`, {
        adminPermissions,
      });

      // Save role colors via PUT /api/rooms/:id/role-colors
      await api.put(`/rooms/${room._id}/role-colors`, {
        roleColors,
      });

      onRefresh();
      Alert.alert('Saved', 'Role settings and permissions updated successfully.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update role settings.');
    } finally {
      setSaving(false);
    }
  }, [room._id, adminPermissions, roleColors, onRefresh, onClose]);

  const permissionGroups: Array<{
    group: string;
    items: Array<{
      key: keyof AdminPermissions;
      label: string;
      desc: string;
      icon: string;
    }>;
  }> = [
    {
      group: 'ROOM',
      items: [
        {
          key: 'editRoom',
          label: 'Edit Room',
          desc: 'Modify room name, cover image, destination, dates & description',
          icon: 'edit-2',
        },
        {
          key: 'manageMembers',
          label: 'Manage Members',
          desc: 'Invite new travelers and remove members',
          icon: 'users',
        },
      ],
    },
    {
      group: 'ITINERARY',
      items: [
        {
          key: 'manageItinerary',
          label: 'Manage Itinerary',
          desc: 'Edit, delete and reorder activities created by others',
          icon: 'calendar',
        },
        {
          key: 'lockItinerary',
          label: 'Lock Itinerary',
          desc: 'Lock or unlock the shared schedule',
          icon: 'lock',
        },
      ],
    },
    {
      group: 'EXPENSES',
      items: [
        {
          key: 'manageExpenses',
          label: 'Manage Expenses',
          desc: 'Edit or delete expense records added by other travelers',
          icon: 'dollar-sign',
        },
      ],
    },
    {
      group: 'CONTENT',
      items: [
        {
          key: 'managePhotos',
          label: 'Manage Photos',
          desc: 'Moderate and delete photos in the shared gallery',
          icon: 'image',
        },
        {
          key: 'managePlaces',
          label: 'Manage Places',
          desc: 'Edit and delete places saved by members',
          icon: 'map-pin',
        },
      ],
    },
    {
      group: 'TRIP',
      items: [
        {
          key: 'endTrip',
          label: 'End Trip',
          desc: 'Conclude and move room to Completed archive',
          icon: 'check-circle',
        },
      ],
    },
  ];

  if (!isOwner) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>Role Permissions</Text>
            <Text style={s.subtitle}>Only the Room Owner can configure Admin permissions.</Text>
            <TouchableOpacity style={s.closeBtnSingle} onPress={onClose}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>Role Permissions</Text>
              <Text style={s.subtitle}>Configure what Admins can do in this Room</Text>
            </View>
            <TouchableOpacity style={s.closeIconBtn} onPress={onClose}>
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher: Admin Permissions vs Role Colors */}
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tab, activeTab === 'permissions' && s.tabActive]}
              onPress={() => setActiveTab('permissions')}
              activeOpacity={0.8}
            >
              <Feather
                name="shield"
                size={14}
                color={activeTab === 'permissions' ? Colors.rooms.forestGreen : Colors.rooms.mutedText}
              />
              <Text style={[s.tabText, activeTab === 'permissions' && s.tabTextActive]}>
                Admin Permissions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tab, activeTab === 'colors' && s.tabActive]}
              onPress={() => setActiveTab('colors')}
              activeOpacity={0.8}
            >
              <Feather
                name="droplet"
                size={14}
                color={activeTab === 'colors' ? Colors.rooms.forestGreen : Colors.rooms.mutedText}
              />
              <Text style={[s.tabText, activeTab === 'colors' && s.tabTextActive]}>
                Role Colors
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'permissions' ? (
              <View>
                <View style={s.infoBanner}>
                  <Feather name="info" size={15} color={Colors.rooms.forestGreen} />
                  <Text style={s.infoBannerText}>
                    Normal Members always retain full trip abilities (chat, add photos, places, itinerary, expenses).
                    These settings elevate what Admins can manage.
                  </Text>
                </View>

                {permissionGroups.map((grp) => (
                  <View key={grp.group} style={s.groupWrap}>
                    <Text style={s.groupHeader}>{grp.group}</Text>
                    <View style={s.card}>
                      {grp.items.map((item, idx) => (
                        <View key={item.key}>
                          {idx > 0 && <View style={s.divider} />}
                          <View style={s.itemRow}>
                            <View style={s.iconWrap}>
                              <Feather name={item.icon as any} size={16} color={Colors.rooms.forestGreen} />
                            </View>
                            <View style={s.textWrap}>
                              <Text style={s.itemLabel}>{item.label}</Text>
                              <Text style={s.itemDesc}>{item.desc}</Text>
                            </View>
                            <Switch
                              value={adminPermissions[item.key]}
                              onValueChange={(val) => handleToggle(item.key, val)}
                              trackColor={{ false: '#D1D5DB', true: 'rgba(36, 60, 50, 0.35)' }}
                              thumbColor={adminPermissions[item.key] ? Colors.rooms.forestGreen : '#F3F4F6'}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                <View style={s.infoBanner}>
                  <Feather name="droplet" size={15} color={Colors.rooms.forestGreen} />
                  <Text style={s.infoBannerText}>
                    Role colors are cosmetic only. In Chat, each traveler’s username appears in their role color.
                  </Text>
                </View>

                {/* Role Selector */}
                <Text style={s.groupHeader}>SELECT ROLE TO COLOR</Text>
                <View style={s.roleSelectorRow}>
                  {(['owner', 'admin', 'member'] as const).map((r) => {
                    const isSelected = selectedRoleToColor === r;
                    const roleName = r === 'owner' ? '👑 Owner' : r === 'admin' ? '🛡️ Admin' : '👤 Member';
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[s.roleSelectBtn, isSelected && s.roleSelectBtnActive]}
                        onPress={() => setSelectedRoleToColor(r)}
                        activeOpacity={0.8}
                      >
                        <View style={[s.colorDot, { backgroundColor: roleColors[r] }]} />
                        <Text style={[s.roleSelectText, isSelected && s.roleSelectTextActive]}>{roleName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Color Swatches */}
                <Text style={s.groupHeader}>CHOOSE COLOR</Text>
                <View style={s.swatchGrid}>
                  {COLOR_SWATCHES.map((color) => {
                    const isCurrent = roleColors[selectedRoleToColor] === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[s.swatch, { backgroundColor: color }, isCurrent && s.swatchSelected]}
                        onPress={() =>
                          setRoleColors((prev) => ({
                            ...prev,
                            [selectedRoleToColor]: color,
                          }))
                        }
                        activeOpacity={0.7}
                      >
                        {isCurrent && <Feather name="check" size={18} color="#FFFFFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Live Chat Preview */}
                <Text style={s.groupHeader}>CHAT PREVIEW</Text>
                <View style={s.previewChatCard}>
                  <View style={s.previewChatRow}>
                    <View style={[s.previewAvatar, { backgroundColor: roleColors.owner }]}>
                      <Text style={s.previewAvatarText}>D</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.previewUsername, { color: roleColors.owner }]}>{data.room.createdBy?.name || 'Daksh'}</Text>
                        <View style={[s.previewTag, { backgroundColor: 'rgba(201, 106, 37, 0.15)' }]}>
                          <Text style={[s.previewTagText, { color: roleColors.owner }]}>Owner</Text>
                        </View>
                      </View>
                      <Text style={s.previewMsgText}>Welcome to {room.name}! Itinerary is ready.</Text>
                    </View>
                  </View>

                  <View style={[s.previewChatRow, { marginTop: 12 }]}>
                    <View style={[s.previewAvatar, { backgroundColor: roleColors.admin }]}>
                      <Text style={s.previewAvatarText}>V</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.previewUsername, { color: roleColors.admin }]}>Vineet</Text>
                        <View style={[s.previewTag, { backgroundColor: 'rgba(95, 116, 95, 0.15)' }]}>
                          <Text style={[s.previewTagText, { color: roleColors.admin }]}>Admin</Text>
                        </View>
                      </View>
                      <Text style={s.previewMsgText}>Finally booked the stay!</Text>
                    </View>
                  </View>

                  <View style={[s.previewChatRow, { marginTop: 12 }]}>
                    <View style={[s.previewAvatar, { backgroundColor: roleColors.member }]}>
                      <Text style={s.previewAvatarText}>P</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.previewUsername, { color: roleColors.member }]}>Pal</Text>
                      </View>
                      <Text style={s.previewMsgText}>Super excited for this trip! 🏖️</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={s.saveBtn}
            onPress={handleSaveAll}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.saveBtnText}>Save Role Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 37, 31, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.rooms.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    maxHeight: '88%',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.rooms.sandBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.rooms.cardCream,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.rooms.cardCream,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  tabTextActive: {
    color: Colors.rooms.forestGreen,
    fontWeight: '700',
  },
  scrollView: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: Colors.rooms.mutedText,
    lineHeight: 18,
  },
  groupWrap: {
    marginBottom: 18,
  },
  groupHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.rooms.forestGreen,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(213, 197, 174, 0.4)',
    marginHorizontal: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(36, 60, 50, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    lineHeight: 16,
  },
  roleSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  roleSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 12,
    paddingVertical: 10,
  },
  roleSelectBtnActive: {
    borderColor: Colors.rooms.forestGreen,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roleSelectText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  roleSelectTextActive: {
    color: Colors.rooms.darkText,
    fontWeight: '700',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  previewChatCard: {
    backgroundColor: '#1E1F22', // Discord dark message background
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  previewChatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  previewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  previewUsername: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  previewTagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  previewMsgText: {
    fontSize: 13,
    color: '#DBDEE1',
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtnSingle: {
    marginTop: 20,
    backgroundColor: Colors.rooms.forestGreen,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
