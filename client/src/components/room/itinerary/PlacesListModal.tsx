import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/theme';
import { SavedPlace } from './itineraryTypes';

interface PlacesListModalProps {
  visible: boolean;
  places: SavedPlace[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onOpenAddPlace: () => void;
  onDeletePlace: (placeId: string) => void;
  onSelectPlaceForActivity?: (place: SavedPlace) => void;
}

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'food', label: '🍽️ Food' },
  { key: 'beach', label: '🏖️ Beach' },
  { key: 'stay', label: '🏨 Stay' },
  { key: 'sights', label: '🏛️ Sights' },
  { key: 'nightlife', label: '🍸 Drinks' },
  { key: 'activity', label: '🎯 Adventure' },
  { key: 'other', label: '📍 Other' },
];

const getCategoryEmoji = (category?: string): string => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'restaurant':
      return '🍽️';
    case 'beach':
      return '🏖️';
    case 'stay':
    case 'hotel':
      return '🏨';
    case 'nightlife':
    case 'drinks':
      return '🍸';
    case 'activity':
    case 'adventure':
      return '🎯';
    case 'sights':
    case 'sightseeing':
      return '🏛️';
    default:
      return '📍';
  }
};

// Haversine formula to calculate distance in km between two lat/lng coordinates
const calculateHaversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const PlacesListModal: React.FC<PlacesListModalProps> = ({
  visible,
  places,
  currentUserId,
  isOwnerOrAdmin,
  onClose,
  onOpenAddPlace,
  onDeletePlace,
  onSelectPlaceForActivity,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (visible) {
      checkUserLocation();
    }
  }, [visible]);

  const checkUserLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    } catch (err) {
      // Non-blocking location enhancement
    } finally {
      setLocating(false);
    }
  };

  const handleOpenMaps = (place: SavedPlace) => {
    const lat = place.latitude;
    const lng = place.longitude;
    const label = encodeURIComponent(place.name);

    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;

    const webFallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webFallbackUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webFallbackUrl);
      });
  };

  const handleDeletePrompt = (place: SavedPlace) => {
    Alert.alert(
      'Remove Place',
      `Delete "${place.name}" from room saved places?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeletePlace(place._id),
        },
      ]
    );
  };

  const filteredPlaces = places
    .filter((p) => selectedCategory === 'all' || p.category === selectedCategory)
    .map((p) => {
      let distanceKm: number | null = null;
      if (userLocation && p.latitude && p.longitude) {
        distanceKm = calculateHaversineKm(
          userLocation.latitude,
          userLocation.longitude,
          p.latitude,
          p.longitude
        );
      }
      return { ...p, distanceKm };
    });

  const renderPlaceItem = ({ item }: { item: SavedPlace & { distanceKm: number | null } }) => {
    const canDelete =
      isOwnerOrAdmin ||
      (item.addedBy &&
        (item.addedBy._id === currentUserId ||
          (item.addedBy as any) === currentUserId));

    return (
      <View style={styles.placeCard}>
        <View style={styles.placeHeaderRow}>
          <View style={styles.placeEmojiContainer}>
            <Text style={styles.placeEmojiText}>{getCategoryEmoji(item.category)}</Text>
          </View>

          <View style={styles.placeInfoCol}>
            <Text style={styles.placeTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {item.address ? (
              <Text style={styles.placeAddress} numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}
            {item.distanceKm !== null && (
              <View style={styles.distanceBadge}>
                <Feather name="navigation" size={10} color={Colors.rooms.forestGreen} />
                <Text style={styles.distanceText}>
                  {item.distanceKm < 1
                    ? `${Math.round(item.distanceKm * 1000)} m away`
                    : `${item.distanceKm.toFixed(1)} km away`}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={styles.mapsBtn}
              onPress={() => handleOpenMaps(item)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="map" size={16} color={Colors.rooms.forestGreen} />
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePrompt(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={15} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.placeNotes} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {onSelectPlaceForActivity && (
          <TouchableOpacity
            style={styles.selectPlaceBtn}
            onPress={() => {
              onSelectPlaceForActivity(item);
              onClose();
            }}
            activeOpacity={0.75}
          >
            <Feather name="calendar" size={12} color={Colors.rooms.forestGreen} />
            <Text style={styles.selectPlaceBtnText}>Schedule into Itinerary</Text>
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
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Saved Places</Text>
              <Text style={styles.sheetSubtitle}>
                {places.length} {places.length === 1 ? 'place' : 'places'} pinned for this trip
              </Text>
            </View>

            <View style={styles.headerRightRow}>
              <TouchableOpacity
                style={styles.addPlaceBtn}
                onPress={() => {
                  onClose();
                  onOpenAddPlace();
                }}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#FFFDF9" />
                <Text style={styles.addPlaceBtnText}>New Place</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={Colors.rooms.darkText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter Chips */}
          <View style={styles.categoryFilterContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORY_FILTERS}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.categoryFiltersScroll}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.key;
                return (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(item.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Places List or Empty State */}
          {filteredPlaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>No places found</Text>
              <Text style={styles.emptySubtitle}>
                Pin beaches, cafes, hotels, and sights so everyone knows where to meet.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  onClose();
                  onOpenAddPlace();
                }}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={16} color="#FFFDF9" />
                <Text style={styles.emptyActionBtnText}>Pin First Place</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredPlaces}
              keyExtractor={(item) => item._id}
              renderItem={renderPlaceItem}
              contentContainerStyle={styles.placesListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
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
    height: '82%',
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addPlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C96A25',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#C96A25',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addPlaceBtnText: {
    color: '#FFFDF9',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBE2D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterContainer: {
    marginBottom: 12,
  },
  categoryFiltersScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D5C3',
  },
  filterChipSelected: {
    backgroundColor: Colors.rooms.forestGreen,
    borderColor: Colors.rooms.forestGreen,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  filterChipTextSelected: {
    color: '#FFFDF9',
    fontWeight: '700',
  },
  placesListContent: {
    paddingBottom: 30,
  },
  placeCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  placeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeEmojiContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5ECE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E6D7C5',
  },
  placeEmojiText: {
    fontSize: 18,
  },
  placeInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  placeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  placeAddress: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EBE2D5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DFD2C2',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeNotes: {
    fontSize: 12,
    color: '#60584F',
    marginTop: 8,
    lineHeight: 16,
    paddingLeft: 48,
  },
  selectPlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3EDE4',
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E4D7C7',
  },
  selectPlaceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyActionBtnText: {
    color: '#FFFDF9',
    fontSize: 13,
    fontWeight: '700',
  },
});
