import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '../constants/theme';
import api from '../services/api';
import { DatePickerModal } from '../components/rooms/DatePickerModal';

const { width } = Dimensions.get('window');

const formatDate = (date: Date | null): string => {
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function CreateRoomScreen() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverSource, setCoverSource] = useState<any>(
    require('../../assets/images/default_create_cover.jpg')
  );

  // Modals & loading state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** Open date picker for start or end date */
  const openDatePicker = (target: 'start' | 'end') => {
    setDatePickerTarget(target);
    setDatePickerVisible(true);
  };

  /** Handle date selection from DatePickerModal */
  const handleSelectDate = (date: Date) => {
    if (datePickerTarget === 'start') {
      setStartDate(date);
      // If end date is earlier than new start date, reset end date
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

  /** Open device image library to pick a cover photo */
  const handlePickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photos to upload a cover image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCoverImage(uri);
        setCoverSource({ uri });
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  /** Handle cover selection from suggested photos modal */
  /** Submit form to POST /api/rooms */
  const handleSubmit = async () => {
    setErrorMsg(null);

    // Form validation
    if (!name.trim()) {
      setErrorMsg('Please enter a room name');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Please enter a destination');
      return;
    }
    if (!startDate) {
      setErrorMsg('Please select a start date');
      return;
    }
    if (!endDate) {
      setErrorMsg('Please select an end date');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('Start date cannot be after end date');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        destination: destination.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description: description.trim(),
        coverImage: coverImage || '',
      };

      const res = await api.post('/rooms', payload);
      if (res.data?.success) {
        // Successfully created room -> navigate back to rooms list
        router.replace('/rooms');
      } else {
        setErrorMsg(res.data?.message || 'Failed to create room. Please try again.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Network error. Please make sure the backend is running.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Navigation Bar: Back Button + Centered Roamie Brand Logo */}
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="chevron-left" size={28} color={Colors.rooms.darkText} />
            </TouchableOpacity>

            <Image
              source={require('../../assets/images/roamie_brand_logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />

            <View style={styles.topNavRightPlaceholder} />
          </View>

          {/* Screen Title & Subtitle */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create a Room</Text>
            <Text style={styles.subtitle}>
              Plan a trip. Bring your people. Make new stories.
            </Text>
          </View>

          {/* Section 1: Room Cover (Optional) */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>
              Room Cover <Text style={styles.optionalLabel}>(Optional)</Text>
            </Text>

            <View style={styles.coverBoxContainer}>
              <Image source={coverSource} style={styles.coverImg} />
              <LinearGradient
                colors={['rgba(30, 48, 42, 0.2)', 'rgba(30, 48, 42, 0.65)']}
                style={styles.coverOverlay}
              />

              {/* Center Action Button */}
              <TouchableOpacity
                style={styles.addCoverCenterBtn}
                onPress={handlePickCoverImage}
                activeOpacity={0.8}
              >
                <View style={styles.iconCircle}>
                  <Feather name="image" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.addCoverText}>
                  {coverImage ? 'Change cover photo' : 'Add a cover photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Room Name */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Room Name</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIconEmoji}>⛺</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Goa '26"
                placeholderTextColor={Colors.rooms.mutedText}
                value={name}
                onChangeText={setName}
                maxLength={40}
              />
              <Text style={styles.charCount}>{name.length}/40</Text>
            </View>
          </View>

          {/* Section 3: Destination */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Destination</Text>
            <View style={styles.inputContainer}>
              <Feather name="map-pin" size={17} color={Colors.rooms.forestGreen} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Goa, India"
                placeholderTextColor={Colors.rooms.mutedText}
                value={destination}
                onChangeText={setDestination}
              />
            </View>
          </View>

          {/* Section 4: Start Date & End Date side-by-side */}
          <View style={styles.datesRow}>
            {/* Start Date */}
            <View style={[styles.fieldSection, { flex: 1, marginRight: 6 }]}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => openDatePicker('start')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={17} color={Colors.rooms.forestGreen} style={styles.inputIcon} />
                <Text
                  style={[
                    styles.dateBtnText,
                    !startDate && styles.placeholderDateText,
                  ]}
                  numberOfLines={1}
                >
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View style={[styles.fieldSection, { flex: 1, marginLeft: 6 }]}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => openDatePicker('end')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={17} color={Colors.rooms.forestGreen} style={styles.inputIcon} />
                <Text
                  style={[
                    styles.dateBtnText,
                    !endDate && styles.placeholderDateText,
                  ]}
                  numberOfLines={1}
                >
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 5: Description (Optional) */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>
              Description <Text style={styles.optionalLabel}>(Optional)</Text>
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Feather
                name="file-text"
                size={17}
                color={Colors.rooms.forestGreen}
                style={[styles.inputIcon, { marginTop: 14 }]}
              />
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="e.g. Sun, beaches and our kind of chaos."
                placeholderTextColor={Colors.rooms.mutedText}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={styles.descCharCount}>{description.length}/200</Text>
            </View>
          </View>

          {/* Error Message banner */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Section 6: Create Room CTA Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.88}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Create Room</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.submitArrow} />
              </>
            )}
          </TouchableOpacity>

          {/* Section 7: Bottom Mountain & Rustic Signpost Illustration */}
          <View style={styles.footerIllustrationContainer}>
            <Image
              source={require('../../assets/images/create_room_footer_signpost.png')}
              style={styles.footerIllustration}
              resizeMode="cover"
            />
            {/* Top gradient fade to emerge seamlessly with the parchment background */}
            <LinearGradient
              colors={['#F4EBDD', 'rgba(244, 235, 221, 0.7)', 'rgba(244, 235, 221, 0)']}
              locations={[0, 0.35, 1]}
              style={styles.footerTopFade}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        title={datePickerTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
        initialDate={datePickerTarget === 'start' ? (startDate || new Date()) : (endDate || startDate || new Date())}
        minDate={datePickerTarget === 'end' ? (startDate || undefined) : undefined}
        onClose={() => setDatePickerVisible(false)}
        onSelectDate={handleSelectDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  /* Top Navigation Bar */
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 120,
    height: 42,
    alignSelf: 'center',
  },
  topNavRightPlaceholder: {
    width: 40,
    height: 40,
  },

  /* Header Section */
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: Colors.rooms.mutedText,
    marginTop: 4,
    fontWeight: '400',
  },

  /* Form Fields */
  fieldSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 7,
  },
  optionalLabel: {
    fontWeight: '400',
    color: Colors.rooms.mutedText,
    fontSize: 13,
  },

  /* Cover Box */
  coverBoxContainer: {
    width: '100%',
    height: 148,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
  },
  coverImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  addCoverCenterBtn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  addCoverText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Inputs */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputIconEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.rooms.darkText,
    paddingVertical: 0,
  },
  charCount: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginLeft: 8,
  },

  /* Dates row */
  datesRow: {
    flexDirection: 'row',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  dateBtnText: {
    fontSize: 13.5,
    color: Colors.rooms.darkText,
    fontWeight: '500',
    flex: 1,
  },
  placeholderDateText: {
    color: Colors.rooms.mutedText,
    fontWeight: '400',
  },

  /* Description Text Area */
  textAreaContainer: {
    height: 110,
    alignItems: 'flex-start',
    position: 'relative',
    paddingBottom: 24,
  },
  textAreaInput: {
    height: 80,
    paddingTop: 12,
  },
  descCharCount: {
    position: 'absolute',
    bottom: 8,
    right: 14,
    fontSize: 11,
    color: Colors.rooms.mutedText,
  },

  /* Error Box */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  /* Submit CTA Button */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.rooms.forestGreen,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
    height: 54,
    borderRadius: 27,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  submitArrow: {
    marginLeft: 10,
  },

  /* Footer Illustration */
  footerIllustrationContainer: {
    width: '100%',
    height: 180,
    marginTop: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  footerIllustration: {
    width: '100%',
    height: '100%',
  },
  footerTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});
