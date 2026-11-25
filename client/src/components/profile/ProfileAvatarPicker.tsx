import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

interface ProfileAvatarPickerProps {
  name: string;
  avatar?: string;
  uploading: boolean;
  onPickImage: (uri: string) => Promise<void>;
  onRemoveAvatar: () => Promise<void>;
}

const getInitialColor = (name: string): string => {
  const colors = ['#648A62', '#C96A25', '#5F745F', '#243C32', '#C97935', '#E18A3A'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const ProfileAvatarPicker: React.FC<ProfileAvatarPickerProps> = ({
  name,
  avatar,
  uploading,
  onPickImage,
  onRemoveAvatar,
}) => {
  const [sheetVisible, setSheetVisible] = useState(false);

  const initials = (name || 'T')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleTakePhoto = async () => {
    setSheetVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Please allow camera access to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await onPickImage(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    setSheetVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo Permission', 'Please allow photo library access to choose a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await onPickImage(result.assets[0].uri);
    }
  };

  const handleRemove = async () => {
    setSheetVisible(false);
    await onRemoveAvatar();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={() => !uploading && setSheetVisible(true)}
        activeOpacity={0.85}
      >
        {avatar ? (
          <ExpoImage
            source={{ uri: getOptimizedImageUrl(avatar, { width: 300, height: 300, crop: 'fill' }) }}
            style={styles.avatarImage}
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: getInitialColor(name || 'Traveler') }]}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}

        {uploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}

        <View style={styles.cameraBadge}>
          <Feather name="camera" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => !uploading && setSheetVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.changePhotoText}>
          {avatar ? 'Change profile photo' : 'Add profile photo'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        >
          <View style={styles.sheetCard} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profile Photo</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={handleTakePhoto} activeOpacity={0.75}>
              <View style={[styles.optionIcon, { backgroundColor: '#EDF3EE' }]}>
                <Feather name="camera" size={18} color={Colors.rooms.forestGreen} />
              </View>
              <Text style={styles.optionText}>Take a Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={handleChooseFromLibrary} activeOpacity={0.75}>
              <View style={[styles.optionIcon, { backgroundColor: '#FBF1E8' }]}>
                <Feather name="image" size={18} color={Colors.rooms.burntOrange} />
              </View>
              <Text style={styles.optionText}>Choose from Library</Text>
            </TouchableOpacity>

            {Boolean(avatar) && (
              <TouchableOpacity style={styles.sheetOption} onPress={handleRemove} activeOpacity={0.75}>
                <View style={[styles.optionIcon, { backgroundColor: '#FDECEC' }]}>
                  <Feather name="trash-2" size={18} color="#C0392B" />
                </View>
                <Text style={[styles.optionText, { color: '#C0392B' }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSheetVisible(false)}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#EADBCB',
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#EADBCB',
  },
  initialsText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 52,
    backgroundColor: 'rgba(36, 60, 50, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.rooms.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FAF7F2',
  },
  changePhotoText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.rooms.burntOrange,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 25, 20, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: '#EADBCB',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DED2C3',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 14,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F3ECE1',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
  },
});
