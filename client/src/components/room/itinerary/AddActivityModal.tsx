import React, { useState, useEffect } from 'react';
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
import { Colors } from '../../../constants/theme';
import api from '../../../services/api';
import { ItineraryItem, SavedPlace } from './itineraryTypes';

interface AddActivityModalProps {
  visible: boolean;
  roomId: string;
  places: SavedPlace[];
  editingItem?: ItineraryItem | null;
  defaultDate?: string;
  onClose: () => void;
  onSaveSuccess: (item: ItineraryItem, isEdit: boolean) => void;
  onOpenAddPlace: () => void;
}

const REMINDER_OPTIONS = [
  { label: 'None', minutes: null },
  { label: '15m before', minutes: 15 },
  { label: '30m before', minutes: 30 },
  { label: '1h before', minutes: 60 },
  { label: '2h before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
];

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  visible,
  roomId,
  places,
  editingItem,
  defaultDate,
  onClose,
  onSaveSuccess,
  onOpenAddPlace,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setTitle(editingItem.title);
        // Format date to YYYY-MM-DD
        const formattedDate = new Date(editingItem.date).toISOString().split('T')[0];
        setDate(formattedDate);
        setStartTime(editingItem.startTime || '');
        setEndTime(editingItem.endTime || '');
        setDescription(editingItem.description || '');
        setSelectedPlaceId(
          editingItem.placeId
            ? typeof editingItem.placeId === 'object'
              ? editingItem.placeId._id
              : editingItem.placeId
            : null
        );
        setReminderMinutes(editingItem.reminderMinutesBefore ?? null);
      } else {
        setTitle('');
        const initialDate =
          defaultDate || new Date().toISOString().split('T')[0];
        setDate(initialDate);
        setStartTime('10:00 AM');
        setEndTime('12:00 PM');
        setDescription('');
        setSelectedPlaceId(null);
        setReminderMinutes(30);
      }
    }
  }, [visible, editingItem, defaultDate]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an activity title');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Missing Date', 'Please enter a valid activity date (YYYY-MM-DD)');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: title.trim(),
        date: new Date(date.trim()).toISOString(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        description: description.trim(),
        placeId: selectedPlaceId || null,
        reminderMinutesBefore: reminderMinutes,
      };

      let savedItem: ItineraryItem;
      if (editingItem) {
        const res = await api.put(
          `/rooms/${roomId}/itinerary/${editingItem._id}`,
          payload
        );
        savedItem = res.data?.data?.item || res.data?.item;
        Alert.alert('Updated', 'Activity updated successfully');
        onSaveSuccess(savedItem, true);
      } else {
        const res = await api.post(`/rooms/${roomId}/itinerary`, payload);
        savedItem = res.data?.data?.item || res.data?.item;
        Alert.alert('Scheduled', 'Activity added to the trip itinerary');
        onSaveSuccess(savedItem, false);
      }
      onClose();
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to save activity';
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
              <Text style={styles.sheetTitle}>
                {editingItem ? 'Edit Activity' : 'Schedule Activity'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                Add to your shared group timeline
              </Text>
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
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Activity Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sunset Surf Session, Dinner at La Favela"
                placeholderTextColor={Colors.rooms.mutedText}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 2026-10-14"
                placeholderTextColor={Colors.rooms.mutedText}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Time Row */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 10:00 AM"
                  placeholderTextColor={Colors.rooms.mutedText}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 12:30 PM"
                  placeholderTextColor={Colors.rooms.mutedText}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            {/* Link Saved Place */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithAction}>
                <Text style={styles.fieldLabel}>Link Saved Place</Text>
                <TouchableOpacity
                  onPress={onOpenAddPlace}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.linkActionText}>+ Pin New Place</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.placesChipsScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.placeChip,
                    selectedPlaceId === null && styles.placeChipSelected,
                  ]}
                  onPress={() => setSelectedPlaceId(null)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.placeChipText,
                      selectedPlaceId === null && styles.placeChipTextSelected,
                    ]}
                  >
                    None / Remote
                  </Text>
                </TouchableOpacity>

                {places.map((place) => {
                  const isSelected = selectedPlaceId === place._id;
                  return (
                    <TouchableOpacity
                      key={place._id}
                      style={[
                        styles.placeChip,
                        isSelected && styles.placeChipSelected,
                      ]}
                      onPress={() => setSelectedPlaceId(place._id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.placeChipIcon}>📍</Text>
                      <Text
                        style={[
                          styles.placeChipText,
                          isSelected && styles.placeChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {place.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Reminder timing */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Push Reminder</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reminderChipsScroll}
              >
                {REMINDER_OPTIONS.map((opt) => {
                  const isSelected = reminderMinutes === opt.minutes;
                  return (
                    <TouchableOpacity
                      key={String(opt.minutes)}
                      style={[
                        styles.reminderChip,
                        isSelected && styles.reminderChipSelected,
                      ]}
                      onPress={() => setReminderMinutes(opt.minutes)}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name="bell"
                        size={12}
                        color={
                          isSelected ? '#FFFDF9' : Colors.rooms.mutedText
                        }
                      />
                      <Text
                        style={[
                          styles.reminderChipText,
                          isSelected && styles.reminderChipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Notes / Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes & Details (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What to bring, meeting point details, dress code..."
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
                  <Text style={styles.saveBtnText}>
                    {editingItem ? 'Update Activity' : 'Save Activity'}
                  </Text>
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
    maxHeight: '92%',
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
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  linkActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C96A25',
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
    height: 70,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
  },
  placesChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D2C1',
    maxWidth: 160,
  },
  placeChipSelected: {
    backgroundColor: '#EAE1D3',
    borderColor: Colors.rooms.forestGreen,
  },
  placeChipIcon: {
    fontSize: 13,
  },
  placeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  placeChipTextSelected: {
    color: Colors.rooms.forestGreen,
    fontWeight: '700',
  },
  reminderChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D2C1',
  },
  reminderChipSelected: {
    backgroundColor: '#C96A25',
    borderColor: '#C96A25',
  },
  reminderChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  reminderChipTextSelected: {
    color: '#FFFDF9',
    fontWeight: '700',
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
    backgroundColor: Colors.rooms.forestGreen,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: Colors.rooms.forestGreen,
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
