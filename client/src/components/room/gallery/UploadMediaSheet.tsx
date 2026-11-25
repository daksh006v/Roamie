import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import api from '../../../services/api';

interface UploadMediaSheetProps {
  visible: boolean;
  roomId: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadMediaSheet: React.FC<UploadMediaSheetProps> = ({
  visible,
  roomId,
  onClose,
  onUploadSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadText, setUploadText] = useState('Uploading photos...');

  const uploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets || assets.length === 0) return;

    setUploading(true);
    setUploadText(`Uploading ${assets.length} ${assets.length === 1 ? 'photo' : 'photos'}...`);

    try {
      const formData = new FormData();
      formData.append('mediaType', 'image');

      assets.forEach((asset, idx) => {
        const uri = asset.uri;
        const filename = uri.split('/').pop() || `photo_${Date.now()}_${idx}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('images', {
          uri,
          name: filename,
          type,
        } as any);
      });

      const res = await api.post(`/rooms/${roomId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      });

      if (res.data?.success) {
        onUploadSuccess();
        onClose();
      } else {
        Alert.alert('Upload Failed', res.data?.message || 'Could not upload photos.');
      }
    } catch (err: any) {
      console.error('Media upload error:', err);
      Alert.alert(
        'Upload Error',
        err.response?.data?.message || err.message || 'Network error while uploading.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission',
          'Please grant camera permissions to capture photos for your trip.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImages(result.assets);
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission',
          'Please allow access to your photos to upload trip memories.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImages(result.assets);
      }
    } catch (err) {
      console.warn('Library pick error:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={uploading ? undefined : onClose}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <Text style={styles.sheetTitle}>Add to Trip Gallery</Text>
          <Text style={styles.sheetSubtitle}>
            Share photos with everyone in this room.
          </Text>

          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={Colors.rooms.burntOrange} />
              <Text style={styles.uploadingText}>{uploadText}</Text>
            </View>
          ) : (
            <View style={styles.optionsList}>
              {/* Option 1: Camera */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={handleTakePhoto}
                activeOpacity={0.75}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#FDEBDD' }]}>
                  <Feather name="camera" size={20} color={Colors.rooms.burntOrange} />
                </View>
                <View style={styles.optionTextColumn}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtitle}>Capture a moment right now</Text>
                </View>
                <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
              </TouchableOpacity>

              {/* Option 2: Photo Library */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={handlePickFromLibrary}
                activeOpacity={0.75}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#E8F0E8' }]}>
                  <Feather name="image" size={20} color={Colors.rooms.forestGreen} />
                </View>
                <View style={styles.optionTextColumn}>
                  <Text style={styles.optionTitle}>Choose from Library</Text>
                  <Text style={styles.optionSubtitle}>Select multiple photos</Text>
                </View>
                <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
              </TouchableOpacity>
            </View>
          )}

          {!uploading && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 37, 31, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5C5AE',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
    marginBottom: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8D9C8',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextColumn: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  optionSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 2,
  },
  uploadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
  },
  cancelButton: {
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#EAE1D3',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
});
