import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import api from '../../services/api';

interface QuickEditTitleModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentTitle: string;
  onRefresh: () => void;
}

export const QuickEditTitleModal: React.FC<QuickEditTitleModalProps> = ({
  visible,
  onClose,
  roomId,
  currentTitle,
  onRefresh,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(currentTitle);
    }
  }, [visible, currentTitle]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Trip name cannot be empty.');
      return;
    }
    if (trimmed === currentTitle) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await api.put(`/rooms/${roomId}`, { name: trimmed });
      onRefresh();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update trip name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="edit-3" size={18} color="#648A62" />
            </View>
            <Text style={styles.title}>Rename Trip</Text>
          </View>

          <Text style={styles.subtitle}>
            Enter a new name for this room
          </Text>

          {/* Input Box */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Trip Name"
              placeholderTextColor={Colors.rooms.mutedText}
              autoFocus
              maxLength={50}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {title.length > 0 && (
              <TouchableOpacity
                onPress={() => setTitle('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x-circle" size={16} color={Colors.rooms.mutedText} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.charCount}>{title.length}/50</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8E2D8',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D8CEBE',
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.rooms.darkText,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3EFEA',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  saveBtn: {
    backgroundColor: '#648A62',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
