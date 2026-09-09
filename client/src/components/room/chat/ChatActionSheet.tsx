import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChatMessage } from './types';
import { QUICK_EMOJIS, ALL_EMOJIS } from './helpers';
import { styles } from './chatStyles';

interface ChatActionSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedMessage: ChatMessage | null;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onCopyText: (message: ChatMessage) => void;
  onTogglePin: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  canDelete: boolean;
}

export const ChatActionSheet: React.FC<ChatActionSheetProps> = ({
  visible,
  onClose,
  selectedMessage,
  onReaction,
  onReply,
  onCopyText,
  onTogglePin,
  onDeleteMessage,
  canDelete,
}) => {
  const [showAllEmojisModal, setShowAllEmojisModal] = useState(false);

  return (
    <>
      {/* ═══════════════ LONG-PRESS ACTION SHEET MODAL (Image 3) ═══════════════ */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />

            {/* 5 Quick Emojis + Smiley button (Image 3) */}
            <View style={styles.quickEmojisRow}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.quickEmojiBtn}
                  onPress={() => {
                    if (selectedMessage) {
                      onReaction(selectedMessage._id, emoji);
                    }
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickEmojiChar}>{emoji}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.quickEmojiBtn}
                onPress={() => setShowAllEmojisModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickEmojiChar}>😊</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetHintText}>Double tap a message to ❤️</Text>

            {/* Grouped Actions List (Image 3) */}
            <View style={styles.actionsCardGroup}>
              {/* Reply */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (selectedMessage) onReply(selectedMessage);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Feather name="corner-up-left" size={19} color="#E2E8F0" style={styles.actionIcon} />
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              {/* Forward */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onClose();
                  Alert.alert('Forward', 'Forwarding to other rooms will be available in the next update!');
                }}
                activeOpacity={0.7}
              >
                <Feather name="corner-up-right" size={19} color="#E2E8F0" style={styles.actionIcon} />
                <Text style={styles.actionText}>Forward</Text>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              {/* Create Thread */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onClose();
                  Alert.alert('Thread', 'Message thread discussion will be available in the next update!');
                }}
                activeOpacity={0.7}
              >
                <Feather name="message-square" size={19} color="#E2E8F0" style={styles.actionIcon} />
                <Text style={styles.actionText}>Create Thread</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.actionsCardGroup, { marginTop: 10 }]}>
              {/* Copy Text */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (selectedMessage) onCopyText(selectedMessage);
                }}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={19} color="#E2E8F0" style={styles.actionIcon} />
                <Text style={styles.actionText}>Copy Text</Text>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              {/* Pin / Unpin Message */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (selectedMessage) onTogglePin(selectedMessage._id);
                }}
                activeOpacity={0.7}
              >
                <Feather
                  name={selectedMessage?.isPinned ? 'x-circle' : 'bookmark'}
                  size={19}
                  color={selectedMessage?.isPinned ? '#F59E0B' : '#E2E8F0'}
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>
                  {selectedMessage?.isPinned ? 'Unpin Message' : 'Pin Message'}
                </Text>
              </TouchableOpacity>

              {/* Delete Message (Author, Owner, or Admin) */}
              {canDelete && (
                <>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => {
                      if (selectedMessage) onDeleteMessage(selectedMessage._id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={19} color="#EF4444" style={styles.actionIcon} />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete Message</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════ ALL EMOJIS PICKER MODAL ═══════════════ */}
      <Modal
        visible={showAllEmojisModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllEmojisModal(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowAllEmojisModal(false)}
        >
          <View style={styles.allEmojisContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.allEmojisTitle}>React with Emoji</Text>
            <View style={styles.allEmojisGrid}>
              {ALL_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.gridEmojiItem}
                  onPress={() => {
                    if (selectedMessage) {
                      onReaction(selectedMessage._id, emoji);
                    }
                    setShowAllEmojisModal(false);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.gridEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};
