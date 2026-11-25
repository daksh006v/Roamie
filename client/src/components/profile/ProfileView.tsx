import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatarPicker } from './ProfileAvatarPicker';
import { TravelStyleSelector } from './TravelStyleSelector';

interface ProfileViewProps {
  onClose: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onClose }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, uploadAvatar, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [homeCity, setHomeCity] = useState(user?.homeCity || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [travelStyle, setTravelStyle] = useState(user?.travelStyle || '');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setHomeCity(user.homeCity || '');
      setPhone(user.phone || '');
      setTravelStyle(user.travelStyle || '');
    }
  }, [user]);

  const hasChanges =
    name.trim() !== (user?.name || '').trim() ||
    bio.trim() !== (user?.bio || '').trim() ||
    homeCity.trim() !== (user?.homeCity || '').trim() ||
    phone.trim() !== (user?.phone || '').trim() ||
    travelStyle !== (user?.travelStyle || '');

  const handlePickAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    const res = await uploadAvatar(uri);
    setUploadingAvatar(false);
    if (!res.success) {
      Alert.alert('Upload Failed', res.message || 'Could not update profile photo.');
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    const res = await updateProfile({ avatar: '' });
    setUploadingAvatar(false);
    if (!res.success) {
      Alert.alert('Update Failed', res.message || 'Could not remove profile photo.');
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a display name.');
      return;
    }

    setSaving(true);
    const res = await updateProfile({
      name: trimmedName,
      bio: bio.trim(),
      homeCity: homeCity.trim(),
      phone: phone.trim(),
      travelStyle,
    });
    setSaving(false);

    if (res.success) {
      Alert.alert('Profile Saved', 'Your traveler profile has been updated.');
    } else {
      Alert.alert('Save Failed', res.message || 'Could not save profile changes.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Roamie?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : 36);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F2" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onClose}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={24} color={Colors.rooms.darkText} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Your Profile</Text>

        <TouchableOpacity
          style={[
            styles.savePill,
            (!hasChanges || saving) && styles.savePillDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.savePillText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <ProfileAvatarPicker
            name={name || user?.name || 'Traveler'}
            avatar={user?.avatar}
            uploading={uploadingAvatar}
            onPickImage={handlePickAvatar}
            onRemoveAvatar={handleRemoveAvatar}
          />

          {/* Main Form Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Traveler Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="How friends see you in rooms"
                placeholderTextColor="#A89B8C"
                maxLength={60}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bio / Tagline</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Share a quick travel note or motto..."
                placeholderTextColor="#A89B8C"
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Home City</Text>
              <View style={styles.iconInputRow}>
                <Feather name="map-pin" size={16} color={Colors.rooms.mutedText} />
                <TextInput
                  style={styles.iconInput}
                  value={homeCity}
                  onChangeText={setHomeCity}
                  placeholder="e.g. Mumbai, India"
                  placeholderTextColor="#A89B8C"
                  maxLength={80}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.iconInputRow}>
                <Feather name="phone" size={16} color={Colors.rooms.mutedText} />
                <TextInput
                  style={styles.iconInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Optional contact number"
                  placeholderTextColor="#A89B8C"
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.iconInputRow, styles.readOnlyRow]}>
                <Feather name="mail" size={16} color="#9E9183" />
                <Text style={styles.readOnlyText} numberOfLines={1}>
                  {user?.email || 'No email'}
                </Text>
                <Feather name="lock" size={14} color="#9E9183" />
              </View>
            </View>
          </View>

          {/* Travel Vibe Card */}
          <View style={styles.card}>
            <TravelStyleSelector
              selectedStyle={travelStyle}
              onSelect={setTravelStyle}
            />
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <Feather name="log-out" size={18} color="#C0392B" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE5D8',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.3,
  },
  savePill: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillDisabled: {
    opacity: 0.45,
  },
  savePillText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EADBCB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: '#E3D7C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.rooms.darkText,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    textAlign: 'right',
    marginTop: 4,
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: '#E3D7C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.rooms.darkText,
    fontWeight: '500',
  },
  readOnlyRow: {
    backgroundColor: '#F3ECE1',
    paddingVertical: 12,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 14.5,
    color: '#7D7063',
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F4D1D1',
    marginTop: 6,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C0392B',
  },
});
