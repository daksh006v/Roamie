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
  Linking,
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../../constants/theme';
import api from '../../../services/api';
import { SavedPlace, LocationSearchResult } from './itineraryTypes';

interface AddPlaceModalProps {
  visible: boolean;
  roomId: string;
  roomDestination?: string;
  onClose: () => void;
  onPlaceAdded: (place: SavedPlace) => void;
}

const CATEGORIES = [
  { key: 'food', label: 'Food & Dining', icon: 'food-fork-drink', color: '#C96A25', bg: '#FDF3E7' },
  { key: 'beach', label: 'Beach & Nature', icon: 'beach', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'stay', label: 'Hotel & Stay', icon: 'bed-king', color: '#243C32', bg: '#EDF5EF' },
  { key: 'sights', label: 'Sightseeing', icon: 'camera-iris', color: '#B45309', bg: '#FEF3C7' },
  { key: 'nightlife', label: 'Nightlife', icon: 'glass-cocktail', color: '#9333EA', bg: '#F3E8FF' },
  { key: 'activity', label: 'Adventure', icon: 'hiking', color: '#059669', bg: '#D1FAE5' },
  { key: 'other', label: 'Other Spot', icon: 'map-marker-radius', color: '#64748B', bg: '#F1F5F9' },
];

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  visible,
  roomId,
  roomDestination,
  onClose,
  onPlaceAdded,
}) => {
  // Mode: 'search' (Google Maps place search) | 'link' (Paste Google Maps link/coords) | 'manual'
  const [activeMode, setActiveMode] = useState<'search' | 'link' | 'gps'>('search');

  // Search input & results
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);

  // Link paste input
  const [mapsLinkInput, setMapsLinkInput] = useState('');
  const [isParsingLink, setIsParsingLink] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('food');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedLocationSource, setSelectedLocationSource] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setActiveMode('search');
    setSearchQuery('');
    setSearchResults([]);
    setMapsLinkInput('');
    setName('');
    setCategory('food');
    setAddress('');
    setDescription('');
    setLatitude('');
    setLongitude('');
    setSelectedLocationSource(null);
    setIsLocating(false);
    setIsSubmitting(false);
  };

  /** Search any global location on Google Maps / OpenStreet via expo-location geocoding */
  const handleSearchLocation = async (overrideQuery?: string) => {
    const query = (overrideQuery || searchQuery).trim();
    if (!query) {
      Alert.alert('Search Needed', 'Type any place, hotel, cafe, beach, or landmark.');
      return;
    }

    try {
      setIsSearching(true);
      setSearchResults([]);

      // If room destination is known and query doesn't include it, append for better relevance
      const fullQuery =
        roomDestination && !query.toLowerCase().includes(roomDestination.toLowerCase())
          ? `${query}, ${roomDestination}`
          : query;

      const geocodeResults = await Location.geocodeAsync(fullQuery);

      if (!geocodeResults || geocodeResults.length === 0) {
        // Fallback to searching without room destination
        const fallbackResults = await Location.geocodeAsync(query);
        if (!fallbackResults || fallbackResults.length === 0) {
          Alert.alert(
            'Location Not Found',
            `Could not find "${query}". Try adding a city name or landmark (e.g. "${query}, ${roomDestination || 'Paris'}").`
          );
          setIsSearching(false);
          return;
        }
        processGeocodeResults(fallbackResults, query);
      } else {
        processGeocodeResults(geocodeResults, query);
      }
    } catch (err: any) {
      console.warn('Geocoding error:', err);
      Alert.alert('Search Failed', 'Could not search location. Please check spelling or connectivity.');
    } finally {
      setIsSearching(false);
    }
  };

  const processGeocodeResults = async (
    results: Location.LocationGeocodedLocation[],
    queryTitle: string
  ) => {
    const topCandidates: LocationSearchResult[] = [];

    // Limit to top 4 results
    const slices = results.slice(0, 4);
    for (const res of slices) {
      let resolvedAddress = '';
      let resolvedName = queryTitle;
      let city = '';
      let country = '';

      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: res.latitude,
          longitude: res.longitude,
        });

        if (reverse && reverse.length > 0) {
          const info = reverse[0];
          resolvedName = info.name || info.street || queryTitle;
          city = info.city || info.region || '';
          country = info.country || '';
          const parts = [info.street, info.district, info.city, info.country].filter(Boolean);
          resolvedAddress = parts.join(', ');
        }
      } catch (e) {}

      topCandidates.push({
        name: resolvedName,
        address: resolvedAddress || `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`,
        latitude: res.latitude,
        longitude: res.longitude,
        city,
        country,
      });
    }

    setSearchResults(topCandidates);

    // Auto-select if single precise result
    if (topCandidates.length === 1) {
      handleSelectSearchResult(topCandidates[0]);
    }
  };

  /** Select a candidate location from search results */
  const handleSelectSearchResult = (item: LocationSearchResult) => {
    setName(item.name);
    if (item.address) setAddress(item.address);
    setLatitude(item.latitude.toFixed(6));
    setLongitude(item.longitude.toFixed(6));
    setSelectedLocationSource(`Google Maps: ${item.name} (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)})`);
    setSearchResults([]);
  };

  /** Parse coordinates from pasted Google Maps link or raw coordinates string */
  const handleParseMapsLink = async () => {
    const raw = mapsLinkInput.trim();
    if (!raw) {
      Alert.alert('Empty Input', 'Please paste a Google Maps link or latitude, longitude coordinate.');
      return;
    }

    try {
      setIsParsingLink(true);

      // Check 1: Raw coordinate pair (e.g. "15.5491, 73.7535" or "15.5491 73.7535")
      const coordMatch = raw.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        await applyCoords(lat, lng, 'Pasted Coordinates');
        setIsParsingLink(false);
        return;
      }

      // Check 2: Google Maps @lat,lng (e.g. google.com/maps/@15.5491,73.7535,15z)
      const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        await applyCoords(lat, lng, 'Google Maps URL');
        setIsParsingLink(false);
        return;
      }

      // Check 3: Query param q=lat,lng (e.g. google.com/maps?q=15.5491,73.7535)
      const qCoordMatch = raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qCoordMatch) {
        const lat = parseFloat(qCoordMatch[1]);
        const lng = parseFloat(qCoordMatch[2]);
        await applyCoords(lat, lng, 'Google Maps URL');
        setIsParsingLink(false);
        return;
      }

      // Check 4: Query param with place name (e.g. google.com/maps/search/La+Favela+Bali)
      const searchMatch = raw.match(/maps\/(?:search|place)\/([^/?]+)/);
      if (searchMatch) {
        const decodedQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
        await handleSearchLocation(decodedQuery);
        setIsParsingLink(false);
        return;
      }

      // Fallback: If it's a short URL or raw place name, try geocoding it
      await handleSearchLocation(raw);
    } catch (err: any) {
      Alert.alert('Could Not Parse Link', 'Please provide a valid Google Maps link or coordinates.');
    } finally {
      setIsParsingLink(false);
    }
  };

  const applyCoords = async (lat: number, lng: number, sourceLabel: string) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    setSelectedLocationSource(`${sourceLabel}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    try {
      const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (reverse && reverse.length > 0) {
        const info = reverse[0];
        if (!name && (info.name || info.street)) {
          setName(info.name || info.street || '');
        }
        const full = [info.street, info.district, info.city, info.country].filter(Boolean).join(', ');
        if (!address && full) {
          setAddress(full);
        }
      }
    } catch (e) {}
  };

  /** Paste from clipboard shortcut */
  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setMapsLinkInput(text.trim());
      }
    } catch (e) {}
  };

  /** Use Current GPS Location */
  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permissions to auto-detect your current spot.'
        );
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      await applyCoords(lat, lng, 'Current GPS Spot');
    } catch (err: any) {
      Alert.alert('GPS Error', err.message || 'Could not detect current location.');
    } finally {
      setIsLocating(false);
    }
  };

  /** Open Google Maps to browse and share */
  const handleOpenGoogleMapsApp = () => {
    const url = roomDestination
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(roomDestination)}`
      : 'https://www.google.com/maps';
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps.');
    });
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
        'Location Required',
        'Please search for a location on Google Maps or provide coordinates so everyone can navigate to it.'
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
      Alert.alert('Spot Saved! 📍', `"${name.trim()}" has been pinned to the trip.`);
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
                <Text style={styles.sheetTitle}>Pin Any Spot on Google Maps</Text>
                <Text style={styles.sheetSubtitle}>
                  {roomDestination ? `Explore & save spots in ${roomDestination}` : 'Find cafes, beaches, sights & hotels'}
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

          {/* Mode Selector Tabs */}
          <View style={styles.modeTabBar}>
            <TouchableOpacity
              style={[styles.modeTab, activeMode === 'search' && styles.modeTabActive]}
              onPress={() => setActiveMode('search')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="search"
                size={14}
                color={activeMode === 'search' ? Colors.rooms.forestGreen : Colors.rooms.mutedText}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeMode === 'search' && styles.modeTabTextActive,
                ]}
              >
                Search Any Place
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, activeMode === 'link' && styles.modeTabActive]}
              onPress={() => setActiveMode('link')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name="google-maps"
                size={16}
                color={activeMode === 'link' ? '#C96A25' : Colors.rooms.mutedText}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeMode === 'link' && styles.modeTabTextActive,
                ]}
              >
                Maps Link / Coords
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, activeMode === 'gps' && styles.modeTabActive]}
              onPress={() => {
                setActiveMode('gps');
                handleUseCurrentLocation();
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name="navigate"
                size={14}
                color={activeMode === 'gps' ? Colors.rooms.forestGreen : Colors.rooms.mutedText}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeMode === 'gps' && styles.modeTabTextActive,
                ]}
              >
                My GPS
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* MODE 1: Search Any Place Worldwide */}
            {activeMode === 'search' && (
              <View style={styles.searchSection}>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search cafe, beach, temple, hotel..."
                    placeholderTextColor={Colors.rooms.mutedText}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={() => handleSearchLocation()}
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={styles.searchSubmitBtn}
                    onPress={() => handleSearchLocation()}
                    disabled={isSearching}
                    activeOpacity={0.8}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#FFFDF9" />
                    ) : (
                      <Ionicons name="search" size={17} color="#FFFDF9" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Candidate Search Results */}
                {searchResults.length > 0 && (
                  <View style={styles.searchResultsContainer}>
                    <Text style={styles.searchResultsTitle}>Pick from Google Maps matches:</Text>
                    {searchResults.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectSearchResult(item)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="location" size={16} color="#C96A25" style={styles.resPin} />
                        <View style={styles.resTextCol}>
                          <Text style={styles.resItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {item.address ? (
                            <Text style={styles.resItemAddress} numberOfLines={1}>
                              {item.address}
                            </Text>
                          ) : null}
                        </View>
                        <Feather name="chevron-right" size={14} color={Colors.rooms.mutedText} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* MODE 2: Paste Google Maps Link or Coords */}
            {activeMode === 'link' && (
              <View style={styles.linkSection}>
                <View style={styles.linkInputRow}>
                  <TextInput
                    style={styles.linkInput}
                    placeholder="Paste maps.app.goo.gl link or 15.54, 73.75..."
                    placeholderTextColor={Colors.rooms.mutedText}
                    value={mapsLinkInput}
                    onChangeText={setMapsLinkInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.pasteIconBtn}
                    onPress={handlePasteClipboard}
                    activeOpacity={0.7}
                  >
                    <Feather name="clipboard" size={15} color={Colors.rooms.forestGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.parseBtn}
                    onPress={handleParseMapsLink}
                    disabled={isParsingLink}
                    activeOpacity={0.8}
                  >
                    {isParsingLink ? (
                      <ActivityIndicator size="small" color="#FFFDF9" />
                    ) : (
                      <Text style={styles.parseBtnText}>Locate</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.openGoogleMapsBtn}
                  onPress={handleOpenGoogleMapsApp}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="google-maps" size={16} color="#C96A25" />
                  <Text style={styles.openGoogleMapsText}>
                    Open Google Maps App to copy place link
                  </Text>
                  <Feather name="external-link" size={12} color="#C96A25" />
                </TouchableOpacity>
              </View>
            )}

            {/* MODE 3: GPS Status banner */}
            {activeMode === 'gps' && (
              <View style={styles.gpsBanner}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={Colors.rooms.forestGreen} />
                ) : (
                  <Ionicons name="navigate-circle" size={20} color={Colors.rooms.forestGreen} />
                )}
                <Text style={styles.gpsBannerText}>
                  {isLocating ? 'Detecting your GPS location...' : 'Current GPS location applied'}
                </Text>
                <TouchableOpacity
                  style={styles.reLocateBtn}
                  onPress={handleUseCurrentLocation}
                  disabled={isLocating}
                >
                  <Text style={styles.reLocateBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Location Source / Coordinates Confirmation Tag */}
            {latitude && longitude ? (
              <View style={styles.locationConfirmedBox}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.rooms.forestGreen} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationConfirmedTitle}>
                    Coordinates Set: {latitude}, {longitude}
                  </Text>
                  {selectedLocationSource ? (
                    <Text style={styles.locationConfirmedSubtitle} numberOfLines={1}>
                      {selectedLocationSource}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Place Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Place Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Cafe del Mar, Uluwatu Cliff, Secret Beach"
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
                        size={16}
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

            {/* Notes / Tips */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Traveler Notes & Tips (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Reservation required, dress code, best sunset timing, must-try food..."
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
    backgroundColor: 'rgba(36, 60, 50, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#E8D9C8',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
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
    width: 38,
    height: 38,
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
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: '#EBE3D7',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: '#FFFDF9',
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  modeTabTextActive: {
    color: Colors.rooms.darkText,
    fontWeight: '700',
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollContent: {
    paddingBottom: 16,
  },
  searchSection: {
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: '#DFD2C2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.rooms.darkText,
  },
  searchSubmitBtn: {
    backgroundColor: Colors.rooms.forestGreen,
    borderRadius: 12,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsContainer: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D5C3',
    marginTop: 8,
    padding: 8,
  },
  searchResultsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
    marginBottom: 6,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4ECE1',
  },
  resPin: {
    marginRight: 8,
  },
  resTextCol: {
    flex: 1,
    marginRight: 6,
  },
  resItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  resItemAddress: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    marginTop: 1,
  },
  linkSection: {
    marginBottom: 12,
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: '#DFD2C2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.rooms.darkText,
  },
  pasteIconBtn: {
    backgroundColor: '#EBE2D5',
    padding: 10,
    borderRadius: 10,
  },
  parseBtn: {
    backgroundColor: '#C96A25',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  parseBtnText: {
    color: '#FFFDF9',
    fontSize: 13,
    fontWeight: '700',
  },
  openGoogleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  openGoogleMapsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C96A25',
  },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF5EF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4E7D8',
  },
  gpsBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
  },
  reLocateBtn: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reLocateBtnText: {
    color: '#FFFDF9',
    fontSize: 11,
    fontWeight: '700',
  },
  locationConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF5EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7E4CB',
  },
  locationConfirmedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  locationConfirmedSubtitle: {
    fontSize: 11,
    color: '#3B6B46',
    marginTop: 1,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
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
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.rooms.darkText,
  },
  textArea: {
    height: 65,
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
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    opacity: 0.6,
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
