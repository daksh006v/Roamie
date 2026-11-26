import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
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
  { key: 'food', label: 'Dining' },
  { key: 'beach', label: 'Beach' },
  { key: 'stay', label: 'Stay' },
  { key: 'sights', label: 'Sights' },
  { key: 'nightlife', label: 'Nightlife' },
  { key: 'activity', label: 'Adventure' },
  { key: 'other', label: 'Other' },
];

const getCategoryStyle = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'restaurant':
      return { icon: 'food-fork-drink', color: '#C96A25', bg: '#FDF3E7', label: 'Food & Dining' };
    case 'beach':
      return { icon: 'beach', color: '#0284C7', bg: '#E0F2FE', label: 'Beach & Sea' };
    case 'stay':
    case 'hotel':
      return { icon: 'bed-king', color: '#243C32', bg: '#EDF5EF', label: 'Hotel & Stay' };
    case 'nightlife':
    case 'drinks':
      return { icon: 'glass-cocktail', color: '#9333EA', bg: '#F3E8FF', label: 'Nightlife' };
    case 'activity':
    case 'activities':
      return { icon: 'hiking', color: '#059669', bg: '#D1FAE5', label: 'Adventure' };
    case 'sights':
    case 'sightseeing':
      return { icon: 'camera-iris', color: '#B45309', bg: '#FEF3C7', label: 'Sightseeing' };
    default:
      return { icon: 'map-marker-radius', color: '#64748B', bg: '#F1F5F9', label: 'Saved Spot' };
  }
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      checkUserLocation();
      setSearchQuery('');
    }
  }, [visible]);

  const checkUserLocation = async () => {
    try {
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
    } catch (err) {}
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

  const filteredPlaces = useMemo(() => {
    return places
      .filter((p) => {
        const matchesCategory =
          selectedCategory === 'all' || p.category === selectedCategory;
        const matchesQuery =
          !searchQuery.trim() ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesCategory && matchesQuery;
      })
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
  }, [places, selectedCategory, searchQuery, userLocation]);

  const renderPlaceItem = ({ item }: { item: SavedPlace & { distanceKm: number | null } }) => {
    const canDelete =
      isOwnerOrAdmin ||
      (item.addedBy &&
        (item.addedBy._id === currentUserId ||
          (item.addedBy as any) === currentUserId));

    const catStyle = getCategoryStyle(item.category);

    return (
      <View style={styles.placeCard}>
        <View style={styles.placeHeaderRow}>
          <View style={[styles.placeIconBox, { backgroundColor: catStyle.bg }]}>
            <MaterialCommunityIcons
              name={catStyle.icon as any}
              size={20}
              color={catStyle.color}
            />
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
                <Ionicons name="navigate-outline" size={10} color={Colors.rooms.forestGreen} />
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
              <Ionicons name="map-outline" size={16} color={Colors.rooms.forestGreen} />
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePrompt(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={14} color="#EF4444" />
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
            <Ionicons name="calendar-outline" size={13} color={Colors.rooms.forestGreen} />
            <Text style={styles.selectPlaceBtnText}>Schedule into Daily Itinerary</Text>
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
            <View style={styles.sheetHeaderLeft}>
              <View style={styles.headerIconCircle}>
                <MaterialCommunityIcons name="google-maps" size={20} color="#C96A25" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Pinned Spots</Text>
                <Text style={styles.sheetSubtitle}>
                  {places.length} {places.length === 1 ? 'place' : 'places'} on Google Maps
                </Text>
              </View>
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
                <Ionicons name="add" size={16} color="#FFFDF9" />
                <Text style={styles.addPlaceBtnText}>Pin Spot</Text>
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

          {/* Search Filter Box */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={15} color={Colors.rooms.mutedText} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search saved spots..."
              placeholderTextColor={Colors.rooms.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={14} color={Colors.rooms.mutedText} />
              </TouchableOpacity>
            )}
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
              <Feather name="map" size={38} color={Colors.rooms.mutedText} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching spots' : 'No places saved yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with a different keyword or clear the search query.'
                  : 'Search any cafe, beach, or landmark from Google Maps to save it for everyone.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  onClose();
                  onOpenAddPlace();
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="google-maps" size={16} color="#FFFDF9" />
                <Text style={styles.emptyActionBtnText}>Search & Pin on Map</Text>
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
    height: '84%',
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addPlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2D5C3',
    marginBottom: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.rooms.darkText,
    padding: 0,
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
  placeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    fontWeight: '700',
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
