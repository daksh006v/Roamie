import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';

interface EmptyGalleryStateProps {
  canUpload: boolean;
  onUploadPress: () => void;
}

export const EmptyGalleryState: React.FC<EmptyGalleryStateProps> = ({
  canUpload,
  onUploadPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="camera" size={38} color={Colors.rooms.burntOrange} />
      </View>
      <Text style={styles.title}>No trip memories yet</Text>
      <Text style={styles.subtitle}>
        Snap photos or upload from your camera roll. Everything shared here is privately visible to all travelers in this room.
      </Text>

      {canUpload && (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onUploadPress}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.ctaButtonText}>Add First Photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 70,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDEBDD',
    borderWidth: 2,
    borderColor: '#F3D2BA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.rooms.burntOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.rooms.burntOrange,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: Colors.rooms.burntOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
