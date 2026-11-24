import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/theme';
import api from '../../../services/api';
import { SavedPlace } from './itineraryTypes';

interface AddPlaceModalProps {
  visible: boolean;
  roomId: string;
  onClose: () => void;
  onPlaceAdded: (place: SavedPlace) => void;
}

const CATEGORIES = [
  { key: 'food', label: 'Food & Dining', icon: '🍽️' },
  { key: 'beach', label: 'Beach & Nature', icon: '🏖️' },
  { key: 'stay', label: 'Hotel & Stay', icon: '🏨' },
  { key: 'sights', label: 'Sightseeing', icon: '🏛️' },
  { key: 'nightlife', label: 'Nightlife & Drinks', icon: '🍸' },
  { key: 'activity', label: 'Adventure', icon: '🎯' },
  { key: 'other', label: 'Other Spot', icon: '📍' },
];

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  visible,
  roomId,
  onClose,
  onPlaceAdded,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('food');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory('food');
    setAddress('');
    setDescription('');
    setLatitude('');
    setLongitude('');
    setIsLocating(false);
    setIsSubmitting(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permissions in Settings to auto-fill your current spot.'
        );
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));

      // Try reverse geocoding to suggest address & name
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        if (reverseResults && reverseResults.length > 0) {
          const placeInfo = reverseResults[0];
          const fullAddressParts = [
            placeInfo.name,
            placeInfo.street,
            placeInfo.district,
            placeInfo.city,
            placeInfo.region,
          ].filter(Boolean);

          const formattedAddress = fullAddressParts.join(', ');
          if (!address && formattedAddress) {
            setAddress(formattedAddress);
          }
          if (!name && (placeInfo.name || placeInfo.street)) {
            setName(placeInfo.name || placeInfo.street || '');
          }
        }
      } catch (geocodeErr) {
        // Reverse geocoding optional fallback
      }
    } catch (err: any) {
      Alert.alert('GPS Location Error', err.message || 'Could not detect your current GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please provide a name for this place.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert(
        'Coordinates Needed',
        'Please tap "Use Current GPS Location" or provide valid latitude and longitude coordinates.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post(`/rooms/${roomId}/places`, {
        name: name.trim(),
        category,
        address: address.trim(),
        description: description.trim(),
        latitude: latNum,
        longitude: lngNum,
      });

      const savedPlace: SavedPlace = res.data?.data?.place || res.data?.place;
      Alert.alert('Place Saved', `"${name.trim()}" has been added to room places.`);
      resetForm();
      onClose();
      if (savedPlace) {
        onPlaceAdded(savedPlace);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to save place';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Save a Place</Text>
              <Text style={styles.sheetSubtitle}>Pin spots, hotels, viewpoints & cafes</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* GPS Auto-fill Button */}
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              activeOpacity={0.8}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFDF9" />
              ) : (
                <>
                  <Feather name="navigation" size={16} color="#FFFDF9" />
                  <Text style={styles.gpsButtonText}>Use Current GPS Location</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Place Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Place Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Cafe del Sol, Uluwatu Cliff, Airbnb"
                placeholderTextColor={Colors.rooms.mutedText}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Category Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      onPress={() => setCategory(cat.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address / Landmark</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 14 Sunset Blvd, Seminyak"
                placeholderTextColor={Colors.rooms.mutedText}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Coordinates Row */}
            <View style={styles.coordRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Latitude *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. -8.7205"
                  placeholderTextColor={Colors.rooms.mutedText}
                  keyboardType="numeric"
                  value={latitude}
                  onChangeText={setLatitude}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>Longitude *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 115.1693"
                  placeholderTextColor={Colors.rooms.mutedText}
                  keyboardType="numeric"
                  value={longitude}
                  onChangeText={setLongitude}
                />
              </View>
            </View>

            {/* Notes / Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Tips, reservation codes, opening hours, best sunset timing..."
                placeholderTextColor={Colors.rooms.mutedText}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFDF9" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Place</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 60, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#E8D9C8',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EADBCB',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBE2D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollContent: {
    paddingBottom: 16,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.rooms.forestGreen,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  gpsButtonText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E0D2C1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.rooms.darkText,
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D2C1',
  },
  categoryChipSelected: {
    backgroundColor: '#EAE1D3',
    borderColor: Colors.rooms.forestGreen,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  categoryChipTextSelected: {
    color: Colors.rooms.forestGreen,
    fontWeight: '700',
  },
  coordRow: {
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#EBE2D5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8C9B7',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#C96A25',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#C96A25',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
  },
});
