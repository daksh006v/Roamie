import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../constants/theme';
import api from '../../services/api';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

interface JoinRoomModalProps {
  visible: boolean;
  initialCode?: string;
  onClose: () => void;
  onJoined: (roomId: string) => void;
}

interface RoomPreview {
  _id: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  memberCount: number;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  visible,
  initialCode = '',
  onClose,
  onJoined,
}) => {
  const [code, setCode] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const cleanInitial = (initialCode || '').trim().toUpperCase();
      setCode(cleanInitial);
      setPreview(null);
      setPreviewError(null);
      if (cleanInitial.length === 8) {
        fetchPreview(cleanInitial);
      }
    } else {
      setCode('');
      setPreview(null);
      setPreviewError(null);
    }
  }, [visible, initialCode]);

  const fetchPreview = async (inviteCode: string) => {
    try {
      setLoadingPreview(true);
      setPreviewError(null);
      const res = await api.get(`/rooms/invite/${inviteCode}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setPreview({
          _id: d.room?._id || d._id,
          name: d.room?.name || d.name,
          destination: d.room?.destination || d.destination,
          startDate: d.room?.startDate || d.startDate,
          endDate: d.room?.endDate || d.endDate,
          coverImage: d.room?.coverImage || d.coverImage,
          memberCount: d.memberCount || 1,
        });
      } else {
        setPreview(null);
        setPreviewError('Invite code not found');
      }
    } catch (err: any) {
      setPreview(null);
      const msg = err.response?.data?.message || 'Invalid or expired invite code';
      setPreviewError(msg);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(formatted);
    if (formatted.length === 8) {
      fetchPreview(formatted);
    } else {
      setPreview(null);
      setPreviewError(null);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        // Look for 8-char alphanumeric code or extract from roamie:// or URL
        const match = clipboardText.match(/[A-Za-z0-9]{8}/);
        const extracted = match ? match[0] : clipboardText;
        handleCodeChange(extracted);
      }
    } catch (err) {
      // Non-blocking clipboard paste fallback
    }
  };

  const handleJoin = async () => {
    if (code.length !== 8) {
      Alert.alert('Invalid Code', 'Please enter a valid 8-character invite code');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/rooms/join', {
        inviteCode: code,
      });

      const joinedRoomId =
        res.data?.data?.room?._id ||
        res.data?.data?._id ||
        preview?._id;

      if (joinedRoomId) {
        onClose();
        onJoined(joinedRoomId);
      } else {
        Alert.alert('Joined!', 'You have joined the room successfully.');
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to join room';
      // If already a member, offer direct access
      if (msg.toLowerCase().includes('already a member') && preview?._id) {
        Alert.alert('Already Joined', 'You are already a member of this trip!', [
          {
            text: 'Go to Room',
            onPress: () => {
              onClose();
              onJoined(preview._id);
            },
          },
        ]);
      } else {
        Alert.alert('Could Not Join', msg);
      }
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
              <Text style={styles.sheetTitle}>Join a Trip Room</Text>
              <Text style={styles.sheetSubtitle}>Enter the 8-character invite code</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Code Input Box */}
          <View style={styles.codeSection}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="e.g. GOAC8F6C"
                placeholderTextColor={Colors.rooms.mutedText}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
              <TouchableOpacity
                style={styles.pasteBtn}
                onPress={handlePasteClipboard}
                activeOpacity={0.7}
              >
                <Feather name="clipboard" size={15} color={Colors.rooms.forestGreen} />
                <Text style={styles.pasteBtnText}>Paste</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.charCounter}>{code.length}/8 characters</Text>
          </View>

          {/* Loading Preview */}
          {loadingPreview && (
            <View style={styles.previewLoadingBox}>
              <ActivityIndicator size="small" color={Colors.rooms.forestGreen} />
              <Text style={styles.previewLoadingText}>Checking invite code...</Text>
            </View>
          )}

          {/* Preview Error */}
          {previewError && !loadingPreview && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{previewError}</Text>
            </View>
          )}

          {/* Room Preview Card */}
          {preview && !loadingPreview && (
            <View style={styles.previewCard}>
              {preview.coverImage ? (
                <ExpoImage
                  source={{
                    uri: getOptimizedImageUrl(preview.coverImage, {
                      width: 140,
                      height: 140,
                      crop: 'fill',
                    }),
                  }}
                  style={styles.previewThumbnail}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.previewThumbnail, styles.previewFallbackThumb]}>
                  <Text style={styles.previewEmoji}>🌴</Text>
                </View>
              )}

              <View style={styles.previewInfo}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {preview.name}
                </Text>
                {preview.destination ? (
                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={12} color={Colors.rooms.forestGreen} />
                    <Text style={styles.previewDestination} numberOfLines={1}>
                      {preview.destination}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Feather name="users" size={12} color={Colors.rooms.mutedText} />
                  <Text style={styles.previewMembers}>
                    {preview.memberCount} {preview.memberCount === 1 ? 'traveler' : 'travelers'}
                  </Text>
                </View>
              </View>
            </View>
          )}

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
                styles.joinBtn,
                (code.length !== 8 || isSubmitting) && styles.joinBtnDisabled,
              ]}
              onPress={handleJoin}
              disabled={code.length !== 8 || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFDF9" />
              ) : (
                <Text style={styles.joinBtnText}>Join Room</Text>
              )}
            </TouchableOpacity>
          </View>
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
  codeSection: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: '#D8C7B3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.rooms.darkText,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBE2D5',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFD2C2',
  },
  pasteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
  },
  charCounter: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    marginTop: 5,
    textAlign: 'right',
  },
  previewLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  previewLoadingText: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    marginBottom: 16,
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  previewThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 12,
  },
  previewFallbackThumb: {
    backgroundColor: '#F5ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  previewDestination: {
    fontSize: 12,
    color: Colors.rooms.forestGreen,
    fontWeight: '600',
  },
  previewMembers: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
  joinBtn: {
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
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
  },
});
