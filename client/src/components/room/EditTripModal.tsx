import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '../../constants/theme';
import { RoomDetailsData } from './AboutTab';
import { DatePickerModal } from '../rooms/DatePickerModal';
import api from '../../services/api';

interface EditTripModalProps {
  visible: boolean;
  onClose: () => void;
  data: RoomDetailsData;
  onRefresh: () => void;
}

const formatDate = (date: Date | null): string => {
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const EditTripModal: React.FC<EditTripModalProps> = ({
  visible,
  onClose,
  data,
  onRefresh,
}) => {
  const { room } = data;

  const [name, setName] = useState(room.name || '');
  const [destination, setDestination] = useState(room.destination || '');
  const [startDate, setStartDate] = useState<Date | null>(
    room.startDate ? new Date(room.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    room.endDate ? new Date(room.endDate) : null
  );
  const [description, setDescription] = useState(room.description || '');
  const [coverImage, setCoverImage] = useState<string | null>(room.coverImage || null);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end'>('start');
  const [saving, setSaving] = useState(false);

  // Sync state when room data changes or modal opens
  useEffect(() => {
    if (visible) {
      setName(room.name || '');
      setDestination(room.destination || '');
      setStartDate(room.startDate ? new Date(room.startDate) : null);
      setEndDate(room.endDate ? new Date(room.endDate) : null);
      setDescription(room.description || '');
      setCoverImage(room.coverImage || null);
    }
  }, [visible, room]);

  const openDatePicker = (target: 'start' | 'end') => {
    setDatePickerTarget(target);
    setDatePickerVisible(true);
  };

  const handleSelectDate = (date: Date) => {
    if (datePickerTarget === 'start') {
      setStartDate(date);
      if (endDate && endDate < date) {
        setEndDate(null);
      }
    } else {
      if (startDate && date < startDate) {
        Alert.alert('Invalid Date', 'End date cannot be earlier than start date.');
        return;
      }
      setEndDate(date);
    }
  };

  const handlePickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photos to upload a custom cover photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a trip title.');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Required', 'Please enter a destination.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Required', 'Please specify both start and end dates.');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Invalid Dates', 'Start date cannot be after end date.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/rooms/${room._id}`, {
        name: name.trim(),
        destination: destination.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description: description.trim(),
        coverImage: coverImage || '',
      });

      onRefresh();
      Alert.alert('Updated', 'Trip details updated successfully.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update trip details.');
    } finally {
      setSaving(false);
    }
  };

  // Determine cover preview source
  const coverSource = coverImage
    ? { uri: coverImage }
    : require('../../../assets/images/default_create_cover.jpg');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.screen}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.headerBtn}
            >
              <Feather name="arrow-left" size={22} color={Colors.rooms.darkText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Trip Details</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Cover Photo Section */}
            <Text style={styles.label}>Cover Photo</Text>
            <View style={styles.coverPreviewContainer}>
              <Image source={coverSource} style={styles.coverImage} resizeMode="cover" />
              <View style={styles.coverOverlay}>
                <TouchableOpacity
                  style={styles.coverActionBtn}
                  onPress={handlePickCoverImage}
                  activeOpacity={0.8}
                >
                  <Feather name="camera" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.coverActionText}>Change Photo</Text>
                </TouchableOpacity>

                {coverImage ? (
                  <TouchableOpacity
                    style={[styles.coverActionBtn, styles.coverRemoveBtn]}
                    onPress={handleRemoveCoverImage}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.coverActionText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* 2. Title / Trip Name */}
            <Text style={styles.label}>Trip Name</Text>
            <View style={styles.inputContainer}>
              <Feather name="tag" size={18} color="#648A62" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Goa Trip '26"
                placeholderTextColor={Colors.rooms.mutedText}
                maxLength={50}
              />
            </View>

            {/* 3. Destination */}
            <Text style={styles.label}>Destination</Text>
            <View style={styles.inputContainer}>
              <Feather name="map-pin" size={18} color="#648A62" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. North Goa, India"
                placeholderTextColor={Colors.rooms.mutedText}
                maxLength={60}
              />
            </View>

            {/* 4. Dates */}
            <Text style={styles.label}>Dates</Text>
            <View style={styles.datesRow}>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => openDatePicker('start')}
                activeOpacity={0.7}
              >
                <Feather name="calendar" size={16} color="#648A62" style={styles.dateIcon} />
                <View>
                  <Text style={styles.dateSubLabel}>Start Date</Text>
                  <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dateArrowWrap}>
                <Feather name="arrow-right" size={16} color={Colors.rooms.mutedText} />
              </View>

              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => openDatePicker('end')}
                activeOpacity={0.7}
              >
                <Feather name="calendar" size={16} color="#648A62" style={styles.dateIcon} />
                <View>
                  <Text style={styles.dateSubLabel}>End Date</Text>
                  <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* 5. Description */}
            <Text style={styles.label}>Description / Notes (Optional)</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Notes, plans, or guidelines for travelers..."
                placeholderTextColor={Colors.rooms.mutedText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
          </ScrollView>

          {/* Bottom Save Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        title={datePickerTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
        initialDate={
          (datePickerTarget === 'start' ? startDate : endDate) || new Date()
        }
        minDate={
          datePickerTarget === 'end' && startDate ? startDate : undefined
        }
        onSelectDate={handleSelectDate}
        onClose={() => setDatePickerVisible(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4D9',
    backgroundColor: Colors.rooms.background,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.darkText,
    marginBottom: 8,
    marginTop: 16,
  },
  coverPreviewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E8E2D8',
    backgroundColor: '#EAE4D9',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  coverActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 60, 50, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  coverRemoveBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
  },
  coverActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D8',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.rooms.darkText,
    paddingVertical: 10,
  },
  textAreaContainer: {
    minHeight: 110,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 90,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D8',
    padding: 12,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateSubLabel: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
    color: Colors.rooms.darkText,
    fontWeight: '600',
    marginTop: 2,
  },
  dateArrowWrap: {
    paddingHorizontal: 8,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#EAE4D9',
    backgroundColor: Colors.rooms.background,
  },
  saveBtn: {
    backgroundColor: '#648A62',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#648A62',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
