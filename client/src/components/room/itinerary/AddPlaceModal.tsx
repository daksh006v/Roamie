import React, { useState, useEffect, useRef } from 'react';
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
  Vibration,
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, Region, MapPressEvent } from 'react-native-maps';
import { Colors } from '../../../constants/theme';
import api from '../../../services/api';
import { SavedPlace } from './itineraryTypes';

interface AddPlaceModalProps {
  visible: boolean;
  roomId: string;
  roomDestination?: string;
  onClose: () => void;
  onPlaceAdded: (place: SavedPlace) => void;
}

const CATEGORIES = [
  { key: 'other', label: 'Other', icon: 'map-marker-radius', color: '#64748B', bg: '#F1F5F9' },
  { key: 'food', label: 'Dining', icon: 'food-fork-drink', color: '#C96A25', bg: '#FDF3E7' },
  { key: 'beach', label: 'Beach', icon: 'beach', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'stay', label: 'Stay', icon: 'bed-king', color: '#243C32', bg: '#EDF5EF' },
  { key: 'sights', label: 'Sights', icon: 'camera-iris', color: '#B45309', bg: '#FEF3C7' },
  { key: 'nightlife', label: 'Nightlife', icon: 'glass-cocktail', color: '#9333EA', bg: '#F3E8FF' },
  { key: 'activity', label: 'Adventure', icon: 'hiking', color: '#059669', bg: '#D1FAE5' },
];

// Default fallback location (Goa, India)
const DEFAULT_COORDS = {
  latitude: 15.5491,
  longitude: 73.7535,
};

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  visible,
  roomId,
  roomDestination,
  onClose,
  onPlaceAdded,
}) => {
  const mapRef = useRef<MapView | null>(null);

  // Search input
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Map Region & Pin Position (internal only, not shown to user as raw numbers)
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [region, setRegion] = useState<Region>({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });

  // User-facing inputs: Name, Address, Category (defaults to 'other'), Notes
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('other'); // Default to 'other'
  const [description, setDescription] = useState('');

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When modal opens, center on room destination or current position
  useEffect(() => {
    if (visible) {
      resetForm();
      initializeMapLocation();
    }
  }, [visible, roomDestination]);

  const resetForm = () => {
    setSearchQuery('');
    setName('');
    setAddress('');
    setCategory('other');
    setDescription('');
    setSelectedCoords(null);
    setIsSearching(false);
    setIsLocating(false);
    setIsSubmitting(false);
  };

  /** Center the map on the destination city or fallback */
  const initializeMapLocation = async () => {
    try {
      if (roomDestination && roomDestination.trim()) {
        const results = await Location.geocodeAsync(roomDestination.trim());
        if (results && results.length > 0) {
          const target = {
            latitude: results[0].latitude,
            longitude: results[0].longitude,
          };
          updateMapPosition(target.latitude, target.longitude, false);
          return;
        }
      }

      // If no destination or failed, try user current position
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        updateMapPosition(position.coords.latitude, position.coords.longitude, false);
      }
    } catch (e) {
      // Non-blocking fallback
    }
  };

  /** Smoothly move map and drop/update pin */
  const updateMapPosition = async (
    lat: number,
    lng: number,
    autoFillDetails: boolean = true
  ) => {
    const coords = { latitude: lat, longitude: lng };
    setSelectedCoords(coords);

    const newRegion: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setRegion(newRegion);

    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 600);
    }

    if (autoFillDetails) {
      try {
        Vibration.vibrate(10);
      } catch (e) {}

      // Reverse geocode to suggest place name & formatted address
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        if (reverseResults && reverseResults.length > 0) {
          const info = reverseResults[0];
          const fullAddressParts = [
            info.name,
            info.street,
            info.district,
            info.city,
            info.country,
          ].filter(Boolean);

          const formatted = fullAddressParts.join(', ');
          if (formatted) setAddress(formatted);

          // If user hasn't typed a custom name, auto-fill it
          if (info.name || info.street || info.city) {
            setName(info.name || info.street || `${info.city} Spot`);
          }
        }
      } catch (err) {
        // Fallback
      }
    }
  };

  /** User taps anywhere on the interactive map */
  const handleMapPress = (e: MapPressEvent) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    updateMapPosition(lat, lng, true);
  };

  /** Search place, landmark or parse pasted Google Maps link */
  const handleSearchOrLink = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setIsSearching(true);

      // Check if user pasted coordinates or Google Maps link
      const coordMatch = query.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        await updateMapPosition(lat, lng, true);
        setIsSearching(false);
        return;
      }

      const atMatch = query.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        await updateMapPosition(lat, lng, true);
        setIsSearching(false);
        return;
      }

      // Otherwise standard geocoding search
      const fullSearch =
        roomDestination && !query.toLowerCase().includes(roomDestination.toLowerCase())
          ? `${query}, ${roomDestination}`
          : query;

      let results = await Location.geocodeAsync(fullSearch);
      if (!results || results.length === 0) {
        results = await Location.geocodeAsync(query);
      }

      if (results && results.length > 0) {
        const { latitude: lat, longitude: lng } = results[0];
        setName(query);
        await updateMapPosition(lat, lng, true);
      } else {
        Alert.alert(
          'Location Not Found',
          `Could not locate "${query}". Try tapping directly on the map to pick the exact spot.`
        );
      }
    } catch (err) {
      Alert.alert('Search Error', 'Could not search location. Please try tapping on the map.');
    } finally {
      setIsSearching(false);
    }
  };

  /** "My GPS" quick shortcut */
  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Location permission is required to detect your GPS spot.');
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await updateMapPosition(position.coords.latitude, position.coords.longitude, true);
    } catch (err: any) {
      Alert.alert('GPS Error', err.message || 'Could not find current location.');
    } finally {
      setIsLocating(false);
    }
  };

  /** Paste link shortcut from clipboard */
  const handlePasteLink = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setSearchQuery(text.trim());
      }
    } catch (e) {}
  };

  /** Submit & Pin Spot */
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please give this spot a name (e.g. "Sunset Point").');
      return;
    }

    if (!selectedCoords) {
      Alert.alert(
        'Pick on Map',
        'Please tap on the map or search to choose where this spot is located.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post(`/rooms/${roomId}/places`, {
        name: name.trim(),
        category: category || 'other',
        address: address.trim(),
        description: description.trim(),
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
      });

      const savedPlace: SavedPlace = res.data?.data?.place || res.data?.place;
      Alert.alert('Spot Pinned!', `"${name.trim()}" has been saved to the trip.`);
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
            <View style={styles.sheetHeaderLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="map" size={18} color="#C96A25" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Pin Spot on Map</Text>
                <Text style={styles.sheetSubtitle}>
                  Tap anywhere on the map or search to choose a location
                </Text>
              </View>
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Unified Clean Search Bar (NO clutter tabs!) */}
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={16} color={Colors.rooms.mutedText} />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="Search place, beach, cafe or paste link..."
                  placeholderTextColor={Colors.rooms.mutedText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchOrLink}
                  returnKeyType="search"
                />
                {searchQuery.length === 0 ? (
                  <TouchableOpacity
                    style={styles.pasteIconBtn}
                    onPress={handlePasteLink}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="clipboard" size={13} color={Colors.rooms.mutedText} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.searchSubmitBtn}
                    onPress={handleSearchOrLink}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#FFFDF9" />
                    ) : (
                      <Text style={styles.searchSubmitBtnText}>Go</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Interactive Map Picker Container */}
            <View style={styles.mapCard}>
              <MapView
                ref={mapRef}
                style={styles.map}
                region={region}
                onPress={handleMapPress}
              >
                {selectedCoords && (
                  <Marker
                    coordinate={selectedCoords}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                      updateMapPosition(lat, lng, true);
                    }}
                    title={name || 'Selected Spot'}
                    description={address || 'Tap to save'}
                  />
                )}
              </MapView>

              {/* Floating Helper Banner on top of Map */}
              <View style={styles.mapOverlayPill}>
                <Ionicons name="finger-print" size={12} color="#FFFFFF" />
                <Text style={styles.mapOverlayText}>
                  {selectedCoords
                    ? 'Spot selected · Tap anywhere or drag pin to adjust'
                    : 'Tap anywhere on the map to drop pin'}
                </Text>
              </View>

              {/* "My GPS" Floating Button inside Map */}
              <TouchableOpacity
                style={styles.floatingGpsBtn}
                onPress={handleUseCurrentLocation}
                disabled={isLocating}
                activeOpacity={0.8}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color={Colors.rooms.forestGreen} />
                ) : (
                  <Ionicons name="locate" size={18} color={Colors.rooms.forestGreen} />
                )}
              </TouchableOpacity>
            </View>

            {/* Place Name (Clean & Auto-filled from Map) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Spot Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Uluwatu Cliff, Secret Sunset Cafe"
                placeholderTextColor={Colors.rooms.mutedText}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Address / Landmark (Auto-filled from Map) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address / Landmark</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Auto-filled when you tap on the map"
                placeholderTextColor={Colors.rooms.mutedText}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Category Selector (DEFAULTS TO 'OTHER') */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Category</Text>
                <Text style={styles.subtleDefaultLabel}>(Defaults to Other)</Text>
              </View>
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
                        isSelected && {
                          backgroundColor: cat.bg,
                          borderColor: cat.color,
                        },
                      ]}
                      onPress={() => setCategory(cat.key)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={15}
                        color={isSelected ? cat.color : Colors.rooms.mutedText}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && { color: cat.color, fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Notes / Tips */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes / Tips (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Opening hours, dress code, reservation notes, must-try food..."
                placeholderTextColor={Colors.rooms.mutedText}
                multiline
                numberOfLines={2}
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
                style={[
                  styles.saveBtn,
                  (!name.trim() || !selectedCoords || isSubmitting) && styles.saveBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!name.trim() || !selectedCoords || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFDF9" />
                ) : (
                  <View style={styles.saveBtnContent}>
                    <Ionicons name="bookmark" size={15} color="#FFFDF9" />
                    <Text style={styles.saveBtnText}>Pin Spot</Text>
                  </View>
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
    backgroundColor: 'rgba(36, 60, 50, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: '#E8D9C8',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EADBCB',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FDF0E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F8DFC9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    color: Colors.rooms.mutedText,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  searchBarWrapper: {
    marginBottom: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#E0D2C1',
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.rooms.darkText,
    padding: 0,
  },
  pasteIconBtn: {
    padding: 4,
  },
  searchSubmitBtn: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchSubmitBtnText: {
    color: '#FFFDF9',
    fontSize: 11,
    fontWeight: '700',
  },
  mapCard: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#DFD2C2',
    marginBottom: 14,
    position: 'relative',
    backgroundColor: '#EAE1D3',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapOverlayPill: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(36, 60, 50, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapOverlayText: {
    color: '#FFFDF9',
    fontSize: 10.5,
    fontWeight: '700',
  },
  floatingGpsBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DFD2C2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtleDefaultLabel: {
    fontSize: 10.5,
    color: Colors.rooms.mutedText,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E0D2C1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: Colors.rooms.darkText,
  },
  textArea: {
    height: 55,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D2C1',
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
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
    justifyContent: 'center',
    shadowColor: '#C96A25',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
  },
});
