import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Share,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

import { Colors } from '../../constants/theme';
import api from '../../services/api';

const { width } = Dimensions.get('window');

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  room: {
    _id: string;
    name: string;
    destination: string;
    inviteCode: string;
  };
}

interface ContactItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  initials: string;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  visible,
  onClose,
  room,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'contacts'>('link');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPermission, setContactsPermission] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  // Invite Link & Share Message
  const inviteLink = `https://roamie.app/join?code=${room.inviteCode}`;
  const deepLink = `roamie://join?code=${room.inviteCode}`;
  const shareMessage = `Join my trip "${room.name}" to ${room.destination} on Roamie!\n\nTap this invite link to join directly:\n${inviteLink}\n\n(App direct link: ${deepLink} | Code: ${room.inviteCode})`;

  // Load contacts when the contacts tab is opened
  useEffect(() => {
    if (activeTab === 'contacts' && contacts.length === 0 && contactsPermission === null) {
      loadContacts();
    }
  }, [activeTab]);

  // Reset state on modal close
  useEffect(() => {
    if (!visible) {
      setActiveTab('link');
      setSearchQuery('');
      setCopiedCode(false);
      setCopiedLink(false);
      setInvitedIds(new Set());
    }
  }, [visible]);

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setContactsPermission(false);
        setContactsLoading(false);
        return;
      }
      setContactsPermission(true);

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const parsed: ContactItem[] = data
        .filter((c) => c.name && (c.phoneNumbers?.length || c.emails?.length))
        .map((c) => {
          const name = c.name || 'Unknown';
          const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          return {
            id: c.id || String(Math.random()),
            name,
            phone: c.phoneNumbers?.[0]?.number,
            email: c.emails?.[0]?.email,
            initials,
          };
        });

      setContacts(parsed);
    } catch (err) {
      console.warn('Failed to load contacts:', err);
      setContactsPermission(false);
    } finally {
      setContactsLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(room.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareInviteLink = async () => {
    try {
      await Share.share(
        {
          message: shareMessage,
          url: inviteLink,
          title: `Join ${room.name} on Roamie`,
        },
        {
          dialogTitle: `Share Invite Link for ${room.name}`,
        }
      );
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleInviteContact = async (contact: ContactItem) => {
    setInvitingId(contact.id);
    try {
      // Backend invite checks whether contact is already registered on Roamie
      const payload: any = { name: contact.name };
      if (contact.phone) payload.phone = contact.phone;
      if (contact.email) payload.email = contact.email;

      const response = await api.post(`/rooms/${room._id}/invite`, payload);
      const result = response.data?.data;

      if (result?.isRegistered) {
        // User found on Roamie — notification dispatched
        Alert.alert(
          'Invitation Sent! 🎉',
          `${result.recipient?.name || contact.name} is on Roamie and has been notified in-app.`
        );
      } else {
        // Not on Roamie yet — share the invite link & formatted message directly
        const contactMessage = `Hey ${contact.name}! Join my trip "${room.name}" to ${room.destination} on Roamie!\n\nTap this link to join the room directly:\n${inviteLink}\n\n(Invite code: ${room.inviteCode})`;
        await Share.share({
          message: contactMessage,
          url: inviteLink,
        });
      }

      setInvitedIds((prev) => new Set([...prev, contact.id]));
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err.message || 'Something went wrong';
      if (errMsg.includes('already a member')) {
        Alert.alert('Already a Member', `${contact.name} is already in this room.`);
        setInvitedIds((prev) => new Set([...prev, contact.id]));
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setInvitingId(null);
    }
  };

  const getContactColor = (name: string): string => {
    const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32', '#8B5CF6', '#0D9488'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const renderContactItem = ({ item }: { item: ContactItem }) => {
    const isInvited = invitedIds.has(item.id);
    const isInviting = invitingId === item.id;

    return (
      <View style={s.contactRow}>
        <View style={[s.contactAvatar, { backgroundColor: getContactColor(item.name) }]}>
          <Text style={s.contactInitials}>{item.initials}</Text>
        </View>

        <View style={s.contactInfo}>
          <Text style={s.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={s.contactDetail} numberOfLines={1}>
            {item.phone || item.email || ''}
          </Text>
        </View>

        {isInvited ? (
          <View style={s.invitedBadge}>
            <Feather name="check" size={14} color="#10B981" />
            <Text style={s.invitedText}>Invited</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.inviteBtn}
            onPress={() => handleInviteContact(item)}
            disabled={isInviting}
            activeOpacity={0.8}
          >
            {isInviting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.inviteBtnText}>Invite</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Top Handle */}
          <View style={s.handle} />

          {/* Header */}
          <Text style={s.title}>Invite Friends</Text>
          <Text style={s.subtitle}>
            Bring your friends into {room.name}
          </Text>

          {/* Tab Switcher */}
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tab, activeTab === 'link' && s.tabActive]}
              onPress={() => setActiveTab('link')}
              activeOpacity={0.8}
            >
              <Feather
                name="link"
                size={15}
                color={activeTab === 'link' ? Colors.rooms.forestGreen : Colors.rooms.mutedText}
              />
              <Text style={[s.tabText, activeTab === 'link' && s.tabTextActive]}>
                Invite Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tab, activeTab === 'contacts' && s.tabActive]}
              onPress={() => setActiveTab('contacts')}
              activeOpacity={0.8}
            >
              <Feather
                name="users"
                size={15}
                color={activeTab === 'contacts' ? Colors.rooms.forestGreen : Colors.rooms.mutedText}
              />
              <Text style={[s.tabText, activeTab === 'contacts' && s.tabTextActive]}>
                Contacts
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'link' ? (
            <View style={s.codeTabContent}>
              {/* Share Invite Link Button — Primary Action */}
              <TouchableOpacity
                style={s.shareLinkBtn}
                onPress={handleShareInviteLink}
                activeOpacity={0.85}
              >
                <Feather name="share-2" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={s.shareLinkText}>Share Invite Link</Text>
              </TouchableOpacity>

              {/* Room Invite Link Box */}
              <View style={s.linkCard}>
                <View style={s.cardLabelRow}>
                  <Feather name="link-2" size={13} color={Colors.rooms.forestGreen} />
                  <Text style={s.codeLabel}>ROOM INVITE LINK</Text>
                </View>
                <View style={s.codeRow}>
                  <Text style={s.linkUrlText} numberOfLines={1}>
                    {inviteLink}
                  </Text>
                  <TouchableOpacity
                    style={s.copyBtn}
                    onPress={handleCopyLink}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={copiedLink ? 'check' : 'copy'}
                      size={14}
                      color={copiedLink ? '#10B981' : Colors.rooms.forestGreen}
                    />
                    <Text style={[s.copyBtnText, copiedLink && { color: '#10B981' }]}>
                      {copiedLink ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Invite Code Box */}
              <View style={s.codeCard}>
                <View style={s.cardLabelRow}>
                  <Feather name="key" size={13} color={Colors.rooms.forestGreen} />
                  <Text style={s.codeLabel}>INVITE CODE</Text>
                </View>
                <View style={s.codeRow}>
                  <Text style={s.codeText}>{room.inviteCode}</Text>
                  <TouchableOpacity
                    style={s.copyBtn}
                    onPress={handleCopyCode}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={copiedCode ? 'check' : 'copy'}
                      size={14}
                      color={copiedCode ? '#10B981' : Colors.rooms.forestGreen}
                    />
                    <Text style={[s.copyBtnText, copiedCode && { color: '#10B981' }]}>
                      {copiedCode ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Message Preview */}
              <View style={s.previewCard}>
                <Text style={s.previewLabel}>Shared Message Preview</Text>
                <Text style={s.previewText}>{shareMessage}</Text>
              </View>
            </View>
          ) : (
            <View style={s.contactsTabContent}>
              {contactsPermission === false ? (
                <View style={s.emptyState}>
                  <Feather name="lock" size={38} color={Colors.rooms.sandBorder} />
                  <Text style={s.emptyTitle}>Contacts Access Required</Text>
                  <Text style={s.emptySubtitle}>
                    Allow Roamie access to your contacts to invite friends directly to this trip.
                  </Text>
                  <TouchableOpacity
                    style={s.settingsBtn}
                    onPress={() => Linking.openSettings()}
                    activeOpacity={0.85}
                  >
                    <Text style={s.settingsBtnText}>Open Settings</Text>
                  </TouchableOpacity>
                </View>
              ) : contactsLoading ? (
                <View style={s.emptyState}>
                  <ActivityIndicator size="large" color={Colors.rooms.forestGreen} />
                  <Text style={s.emptySubtitle}>Loading contacts...</Text>
                </View>
              ) : (
                <>
                  {/* Search input */}
                  <View style={s.searchRow}>
                    <Feather name="search" size={16} color={Colors.rooms.mutedText} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="Search name, phone, or email..."
                      placeholderTextColor={Colors.rooms.mutedText}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={16} color={Colors.rooms.mutedText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <FlatList
                    data={filteredContacts}
                    renderItem={renderContactItem}
                    keyExtractor={(item) => item.id}
                    style={s.contactsList}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <View style={s.emptyState}>
                        <Feather name="user-x" size={34} color={Colors.rooms.sandBorder} />
                        <Text style={s.emptyTitle}>No Contacts Found</Text>
                        <Text style={s.emptySubtitle}>
                          {searchQuery
                            ? 'No contacts match your search'
                            : 'No contacts with phone numbers or emails found'}
                        </Text>
                      </View>
                    }
                  />
                </>
              )}
            </View>
          )}

          {/* Close */}
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={s.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.rooms.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    marginBottom: 18,
  },

  // Tab Switcher
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.rooms.cardCream,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
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

  // Code Tab
  codeTabContent: {
    alignItems: 'center',
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.rooms.forestGreen,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  shareLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  linkCard: {
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  codeCard: {
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
    letterSpacing: 1.2,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  linkUrlText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.rooms.greige,
  },
  copyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  previewCard: {
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 14,
    padding: 12,
    width: '100%',
  },
  previewLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 12,
    color: Colors.rooms.darkText,
    lineHeight: 17,
  },

  // Contacts Tab
  contactsTabContent: {
    minHeight: 280,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.rooms.darkText,
    fontWeight: '500',
  },
  contactsList: {
    maxHeight: 320,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(213, 197, 174, 0.4)',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginRight: 10,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.darkText,
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
  },
  inviteBtn: {
    backgroundColor: Colors.rooms.burntOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  invitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  invitedText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  settingsBtn: {
    marginTop: 10,
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  settingsBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Close
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '600',
  },
});
