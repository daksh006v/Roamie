import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Vibration } from 'react-native';
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

const ChatMessageBubbleComponent: React.FC<ChatMessageBubbleProps> = ({
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
  const lastTapRef = useRef<number>(0);

  const handleMessagePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      try {
        Vibration.vibrate(15);
      } catch (e) {}
      onReaction(item._id, '❤️');
    } else {
      lastTapRef.current = now;
    }
  };

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
  if (item.type === 'system' || item.messageType === 'system') {
    const sysText = (item.content || item.text || item.systemAction || '').trim();
    if (!sysText) return null;

    // Hide noisy non-membership activity messages (expenses, gallery uploads, itinerary locks)
    const lower = sysText.toLowerCase();
    if (
      lower.includes('added an expense') ||
      lower.includes('settled ₹') ||
      lower.includes('to the gallery') ||
      lower.includes('locked the itinerary') ||
      lower.includes('unlocked the itinerary')
    ) {
      return null;
    }

    return (
      <View key={item._id}>
        {showDate && renderDateSeparator(formatDateSeparator(item.createdAt))}
        <View style={styles.systemMsgContainer}>
          <View style={styles.systemMsgPill}>
            <Feather name="user-plus" size={13} color="#59615A" style={{ marginRight: 6 }} />
            <Text style={styles.systemMsgText}>
              {sysText} · {formatTime(item.createdAt)}
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

  const hasText = Boolean((item.content || item.text || '').trim());
  const hasMedia = Boolean(item.media?.url || item.mediaUrl);
  const hasMeta = Boolean(
    item.metadata &&
      ((item.metadata.title && item.metadata.title.trim()) ||
        (item.metadata.location && item.metadata.location.trim()) ||
        (item.metadata.details && item.metadata.details.trim()) ||
        item.metadata.placeId ||
        item.metadata.imageUrl)
  );
  if (!hasText && !hasMedia && !hasMeta) {
    return null;
  }

  const prevSenderId = typeof prevItem?.senderId === 'object' ? prevItem?.senderId?._id : prevItem?.senderId;
  const currSenderId = typeof sender === 'object' ? sender?._id : sender;
  const sameSender = Boolean(prevSenderId && currSenderId && prevSenderId === currSenderId);
  const timeDiffMs = prevItem
    ? Math.abs(new Date(item.createdAt).getTime() - new Date(prevItem.createdAt).getTime())
    : Infinity;
  const isGrouped = Boolean(
    prevItem &&
      !showDate &&
      prevItem.type !== 'system' &&
      !item.replyTo &&
      sameSender &&
      timeDiffMs <= 5 * 60 * 1000
  );

  return (
    <View key={item._id}>
      {showDate && renderDateSeparator(formatDateSeparator(item.createdAt))}

      <SwipeableMessageRow onSwipeReply={() => onSwipeReply(item)}>
        <View
          style={[
            styles.messageOuterContainer,
            isGrouped ? styles.messageGroupedSpacing : styles.messageGroupStartSpacing,
            isHighlighted && styles.messageHighlightBg,
          ]}
        >
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
                  {item.replyTo.content || item.replyTo.text || (item.replyTo.media?.url ? 'Photo' : '')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.messageRow}
            onPress={handleMessagePress}
            onLongPress={() => onLongPress(item)}
            delayLongPress={300}
            activeOpacity={0.85}
          >
            {/* Avatar on Left (hidden for grouped messages while preserving alignment) */}
            {isGrouped ? (
              <View style={styles.avatarSpacer} />
            ) : sender?.avatar ? (
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

            {/* Boxless Message Content Column */}
            <View style={styles.messageContentCol}>
              {/* Sender Name & Timestamp Header (only on first message in group) */}
              {!isGrouped && (
                <View style={styles.senderHeaderRow}>
                  <Text style={[styles.senderName, { color: roleColor }]} numberOfLines={1}>
                    {senderName}
                  </Text>
                  <Text style={styles.messageTimestamp}>{formatTime(item.createdAt)}</Text>
                </View>
              )}

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

export const ChatMessageBubble = React.memo(ChatMessageBubbleComponent, (prev, next) => {
  if (prev.item._id !== next.item._id) return false;
  if (prev.isHighlighted !== next.isHighlighted) return false;
  if (prev.item.isPinned !== next.item.isPinned) return false;
  if (prev.item.content !== next.item.content) return false;
  if ((prev.item.reactions?.length || 0) !== (next.item.reactions?.length || 0)) return false;
  if (prev.item.reactions !== next.item.reactions) return false;
  if (prev.prevItem?._id !== next.prevItem?._id) return false;
  if (prev.currentUserId !== next.currentUserId) return false;
  return true;
});
