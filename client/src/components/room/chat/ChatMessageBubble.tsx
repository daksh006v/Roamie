import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { ChatMessage } from './types';
import { formatTime, formatDateSeparator, getDateKey, getInitials, getAvatarColor } from './helpers';
import { SwipeableMessageRow } from './SwipeableMessageRow';
import { styles } from './chatStyles';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

interface ChatMessageBubbleProps {
  item: ChatMessage;
  index: number;
  prevItem: ChatMessage | null;
  currentUserId?: string;
  isHighlighted: boolean;
  getRoleColor: (userId: string, defaultColor?: string) => string;
  onSwipeReply: (message: ChatMessage) => void;
  onLongPress: (message: ChatMessage) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onScrollToReply: (messageId: string) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  item,
  prevItem,
  currentUserId,
  isHighlighted,
  getRoleColor,
  onSwipeReply,
  onLongPress,
  onReaction,
  onScrollToReply,
}) => {
  // Show date divider if first message or different day
  const showDate = !prevItem || getDateKey(prevItem.createdAt) !== getDateKey(item.createdAt);

  /* --- Date Separator --- */
  const renderDateSeparator = (dateText: string) => (
    <View style={styles.dateSeparatorContainer}>
      <View style={styles.dateSeparatorLine} />
      <Text style={styles.dateSeparatorText}>{dateText}</Text>
      <View style={styles.dateSeparatorLine} />
    </View>
  );

  /* --- System Message --- */
  if (item.type === 'system') {
    return (
      <View key={item._id}>
        {showDate && renderDateSeparator(formatDateSeparator(item.createdAt))}
        <View style={styles.systemMsgContainer}>
          <View style={styles.systemMsgPill}>
            <Feather name="user-plus" size={13} color="#59615A" style={{ marginRight: 6 }} />
            <Text style={styles.systemMsgText}>
              {item.content || item.text || 'System event'} · {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  /* --- Reactions Row --- */
  const renderReactions = () => {
    const grouped: Record<string, number> = {};
    const userReacted: Record<string, boolean> = {};

    (item.reactions || []).forEach((r) => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
      const uid = typeof r.userId === 'object' ? r.userId?._id : r.userId;
      if (uid === currentUserId) {
        userReacted[r.emoji] = true;
      }
    });

    const emojis = Object.keys(grouped);
    if (emojis.length === 0) return null;

    return (
      <View style={styles.reactionsRow}>
        {emojis.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionPill,
              userReacted[emoji] && styles.reactionPillActive,
            ]}
            onPress={() => onReaction(item._id, emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionPillEmoji}>{emoji}</Text>
            <Text
              style={[
                styles.reactionPillCount,
                userReacted[emoji] && styles.reactionPillCountActive,
              ]}
            >
              {grouped[emoji]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  /* --- Rich Attachment Card (Place / Stay card) --- */
  const renderRichCard = () => {
    const meta = item.metadata;
    const media = item.media;
    const imageUrl = meta?.imageUrl || media?.url;

    // Strict validation: Must have an explicit non-empty title, location, or placeId
    const hasValidCard = Boolean(
      meta && (
        (meta.title && meta.title.trim().length > 0) ||
        (meta.location && meta.location.trim().length > 0) ||
        (meta.details && meta.details.trim().length > 0) ||
        meta.placeId
      )
    );

    // If neither a valid rich card nor an image attachment exists, render NOTHING
    if (!hasValidCard && !imageUrl) return null;

    // Standard Photo Attachment
    if (!hasValidCard && imageUrl) {
      return (
        <View style={styles.photoAttachmentCard}>
          <ExpoImage
            source={{ uri: getOptimizedImageUrl(imageUrl, { width: 800 }) }}
            style={styles.photoAttachmentImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        </View>
      );
    }

    // Rich Stay or Place Card (only when explicitly provided)
    const isStay = meta?.type === 'stay' || meta?.title?.toLowerCase().includes('stay');

    return (
      <View style={styles.richCardContainer}>
        {imageUrl ? (
          <ExpoImage
            source={{ uri: getOptimizedImageUrl(imageUrl, { width: 400, height: 200, crop: 'fill' }) }}
            style={styles.richCardImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : null}
        <View style={styles.richCardDetails}>
          <View style={styles.richCardHeader}>
            <View style={[styles.richCardIconBadge, { backgroundColor: isStay ? '#FFF0E6' : '#E8F5E9' }]}>
              <Feather name={isStay ? 'home' : 'map-pin'} size={16} color={isStay ? '#C96A25' : '#2E7D32'} />
            </View>
            <Text style={styles.richCardTitle} numberOfLines={1}>
              {meta?.title || (isStay ? 'Our Stay' : 'Saved Place')}
            </Text>
          </View>

          {meta?.location ? (
            <Text style={styles.richCardLocation} numberOfLines={1}>
              {meta.location}
            </Text>
          ) : null}

          {meta?.details ? (
            <Text style={styles.richCardDescription} numberOfLines={2}>
              {meta.details}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.richCardActionBtn}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(meta?.title || 'Trip Item', `${meta?.location || ''}\n${meta?.details || ''}`);
            }}
          >
            <Text style={styles.richCardActionText}>
              {meta?.actionLabel || (isStay ? 'View on Map' : 'View Place')}
            </Text>
            <Feather name="chevron-right" size={13} color="#C96A25" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const sender = item.senderId;
  const senderName = sender?.name || 'Traveler';
  const roleColor = sender?._id ? getRoleColor(sender._id, getAvatarColor(senderName)) : '#243C32';

  return (
    <View key={item._id}>
      {showDate && renderDateSeparator(formatDateSeparator(item.createdAt))}

      <SwipeableMessageRow onSwipeReply={() => onSwipeReply(item)}>
        <View style={[styles.messageOuterContainer, isHighlighted && styles.messageHighlightBg]}>
          {/* In-feed reply quote (Discord style: positioned above avatar and message row) */}
          {item.replyTo ? (
            <View style={styles.inFeedReplyRow}>
              <View style={styles.inFeedReplyCurve} />
              <TouchableOpacity
                style={styles.inFeedReplySnippetBox}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.replyTo?._id) {
                    onScrollToReply(item.replyTo._id);
                  }
                }}
              >
                <Text style={styles.inFeedReplyAuthor}>
                  @{typeof item.replyTo.senderId === 'object' ? item.replyTo.senderId?.name : 'Member'}
                </Text>
                <Text style={styles.inFeedReplyText} numberOfLines={1}>
                  {item.replyTo.content || item.replyTo.text || (item.replyTo.media?.url ? '📸 Photo' : '')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.messageRow}
            onLongPress={() => onLongPress(item)}
            delayLongPress={300}
            activeOpacity={0.9}
          >
            {/* Avatar on Left (Image 1) */}
            {sender?.avatar ? (
              <ExpoImage
                source={{ uri: getOptimizedImageUrl(sender.avatar, { width: 120, height: 120, crop: 'fill' }) }}
                style={styles.avatar}
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: roleColor }]}>
                <Text style={styles.avatarInitials}>{getInitials(senderName)}</Text>
              </View>
            )}

            {/* Message Content Column */}
            <View style={styles.messageContentCol}>
              {/* Sender Name & Timestamp Header */}
              <View style={styles.senderHeaderRow}>
                <Text style={[styles.senderName, { color: roleColor }]} numberOfLines={1}>
                  {senderName}
                </Text>
                <Text style={styles.messageTimestamp}>{formatTime(item.createdAt)}</Text>
              </View>

              {/* Message Body Text */}
              {item.content || item.text ? (
                <Text style={styles.messageBodyText}>{item.content || item.text}</Text>
              ) : null}

              {/* Rich Attachment Cards / Photos */}
              {renderRichCard()}

              {/* Reaction Pills Row */}
              {renderReactions()}
            </View>
          </TouchableOpacity>
        </View>
      </SwipeableMessageRow>
    </View>
  );
};
