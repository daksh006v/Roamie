import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Vibration,
  Keyboard,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import type { Socket } from 'socket.io-client';

import { ChatMessage, ChatTabProps } from './types';
import { styles, SCREEN_WIDTH } from './chatStyles';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatActionSheet } from './ChatActionSheet';
import { TripSettingsModal } from '../TripSettingsModal';
import api from '../../../services/api';
import { connectSocket } from '../../../services/socket';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

export const ChatTab: React.FC<ChatTabProps> = ({ data, onRefresh }) => {
  const router = useRouter();
  const { room, membership, members, stats, currentUserId } = data;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [pinnedBannerIndex, setPinnedBannerIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Long-press Action Sheet states
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Role color map from room data
  const roleColors = room.roleColors || {
    owner: '#C96A25',
    admin: '#5F745F',
    member: '#59615A',
  };

  // Build memberId → role map
  const memberRoleMap = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      if (m.userId?._id) {
        map[m.userId._id] = m.role;
      }
    });
    memberRoleMap.current = map;
  }, [members]);

  const getRoleForUser = (userId: string): 'owner' | 'admin' | 'member' => {
    return (memberRoleMap.current[userId] as any) || 'member';
  };

  const getRoleColor = (userId: string, defaultColor?: string): string => {
    const role = getRoleForUser(userId);
    return (roleColors as any)[role] || defaultColor || '#243C32';
  };

  /* ─── Scroll to referenced reply message & highlight ─── */
  const scrollToMessage = useCallback(
    (targetId: string) => {
      const idx = messages.findIndex((m) => m._id === targetId);
      if (idx >= 0) {
        setHighlightedMessageId(targetId);
        flatListRef.current?.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.3,
        });
        setTimeout(() => {
          setHighlightedMessageId((curr) => (curr === targetId ? null : curr));
        }, 1800);
      } else {
        Alert.alert('Original Message', 'The referenced message was sent earlier in this trip.');
      }
    },
    [messages]
  );

  /* ─── Auto-scroll to latest message when keyboard opens ─── */
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    return () => showSub.remove();
  }, []);

  /* ─── Fetch messages via REST ─── */
  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const res = await api.get(`/rooms/${room._id}/messages`, {
          params: { page: pageNum, limit: 30 },
        });

        if (res.data?.success && res.data?.data) {
          const newMsgs: ChatMessage[] = res.data.data.messages || [];
          const sorted = [...newMsgs].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          if (append) {
            setMessages((prev) => [...sorted, ...prev]);
          } else {
            setMessages(sorted);
          }
          setHasMore(res.data.data.pagination?.hasMore ?? false);

          if (res.data.data.pinnedMessages && Array.isArray(res.data.data.pinnedMessages)) {
            setPinnedMessages(res.data.data.pinnedMessages);
          } else {
            const allMsgs = append ? [...sorted, ...messages] : sorted;
            const pinned = allMsgs.filter((m) => m.isPinned);
            if (pinned.length > 0) {
              setPinnedMessages((prev) => {
                const ids = new Set(prev.map((p) => p._id));
                const merged = [...prev];
                pinned.forEach((p) => {
                  if (!ids.has(p._id)) merged.push(p);
                });
                return merged;
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [room._id]
  );

  /* ─── Socket.IO Real-time Connection ─── */
  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      try {
        const sock = await connectSocket();
        if (!isMounted || !sock) return;
        socketRef.current = sock;

        sock.emit('join_room', { roomId: room._id }, (res: any) => {
          if (res?.success) {
            console.log(`✅ Joined socket room channel for room ${room._id}`);
          }
        });

        sock.on('new_message', (msg: ChatMessage) => {
          if (!isMounted) return;
          if (msg.roomId === room._id) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        });

        sock.on('message_deleted', ({ messageId }: { messageId: string }) => {
          if (!isMounted) return;
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
          setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));
        });

        sock.on('message_reaction_updated', ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
          if (!isMounted) return;
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
          );
        });

        sock.on('message_pinned_updated', ({ messageId, isPinned, message: updatedMsg }: { messageId: string; isPinned: boolean; message: ChatMessage }) => {
          if (!isMounted) return;
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
          );
          if (isPinned && updatedMsg) {
            setPinnedMessages((prev) => {
              if (prev.some((p) => p._id === messageId)) return prev;
              return [...prev, updatedMsg];
            });
          } else {
            setPinnedMessages((prev) => prev.filter((p) => p._id !== messageId));
          }
        });

        sock.on('user_typing', ({ userId, name, roomId }: { userId: string; name: string; roomId: string }) => {
          if (isMounted && roomId === room._id && userId !== currentUserId) {
            setTypingUsers((prev) => {
              if (prev.some((u) => u.userId === userId)) return prev;
              return [...prev, { userId, name }];
            });
          }
        });

        sock.on('user_stop_typing', ({ userId, roomId: rid }: { userId: string; roomId: string }) => {
          if (isMounted && rid === room._id) {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
          }
        });
      } catch (err) {
        console.error('Socket init error:', err);
      }
    };

    fetchMessages(1);
    initSocket();

    return () => {
      isMounted = false;
      const sock = socketRef.current;
      if (sock) {
        sock.emit('leave_room', { roomId: room._id });
        sock.off('new_message');
        sock.off('message_deleted');
        sock.off('message_reaction_updated');
        sock.off('message_pinned_updated');
        sock.off('user_typing');
        sock.off('user_stop_typing');
      }
    };
  }, [room._id, currentUserId, fetchMessages]);

  /* ─── Send message ─── */
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    const sock = socketRef.current;

    if (isTypingRef.current && sock) {
      sock.emit('stop_typing', { roomId: room._id });
      isTypingRef.current = false;
    }

    const payload: any = {
      roomId: room._id,
      content: text,
      type: 'text',
    };

    if (replyingTo) {
      payload.replyTo = replyingTo._id;
      setReplyingTo(null);
    }

    try {
      if (sock && sock.connected) {
        sock.emit('send_message', payload, (res: any) => {
          if (!res?.success) {
            api.post(`/rooms/${room._id}/messages`, payload).catch(console.error);
          }
        });
      } else {
        await api.post(`/rooms/${room._id}/messages`, payload);
      }
    } catch (err) {
      console.error('Send message error:', err);
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, room._id, replyingTo]);

  /* ─── Typing indicator ─── */
  const handleTyping = useCallback(
    (text: string) => {
      setInputText(text);
      const sock = socketRef.current;
      if (!sock || !sock.connected) return;

      if (!isTypingRef.current) {
        sock.emit('typing', { roomId: room._id });
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sock.emit('stop_typing', { roomId: room._id });
        isTypingRef.current = false;
      }, 2000);
    },
    [room._id]
  );

  /* ─── Send image message ─── */
  const handleSendImage = async (uri: string) => {
    setSending(true);

    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      _id: optimisticId,
      roomId: room._id,
      senderId: {
        _id: currentUserId || '',
        name: members.find((m) => m.userId?._id === currentUserId)?.userId?.name || 'You',
      },
      type: 'image',
      content: '',
      reactions: [],
      media: { url: uri, type: 'image' },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      let imageUrl = uri;
      try {
        const formData = new FormData();
        formData.append('images', {
          uri,
          name: 'chat_photo.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('mediaType', 'image');

        const res = await api.post(`/rooms/${room._id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.data?.[0]?.storageUrl) {
          imageUrl = res.data.data[0].storageUrl;
        }
      } catch (e) {
        // Local offline / direct preview fallback
      }

      const payload: any = {
        roomId: room._id,
        content: '',
        type: 'image',
        media: {
          url: imageUrl,
          type: 'image',
        },
      };

      const sock = socketRef.current;
      if (sock && sock.connected) {
        sock.emit('send_message', payload, (res: any) => {
          if (!res?.success) {
            api.post(`/rooms/${room._id}/messages`, payload).catch(console.error);
          }
        });
      } else {
        await api.post(`/rooms/${room._id}/messages`, payload);
      }

      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
    } catch (err) {
      console.error('Send image error:', err);
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      Alert.alert('Error', 'Could not send photo. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /* ─── Pick image from library ─── */
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access to share pictures in chat.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        handleSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  /* ─── Live Camera photo ─── */
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant camera access to take a live photo for the room.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        handleSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  const handleMicPress = () => {
    Alert.alert('Voice Note', 'Voice notes will be available in an upcoming update! 🎙️');
  };

  const handlePollPress = () => {
    setShowAttachMenu(false);
    Alert.alert('Create Poll', 'Group polls & voting will be available in the next release! 📊');
  };

  const handleLocationPress = () => {
    setShowAttachMenu(false);
    Alert.alert('Share Location', 'Pin-drop & live location sharing will be available in the next release! 📍');
  };

  /* ─── Toggle reaction ─── */
  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const sock = socketRef.current;
      if (sock && sock.connected) {
        sock.emit('add_reaction', { roomId: room._id, messageId, emoji });
      } else {
        api.post(`/rooms/${room._id}/messages/${messageId}/reactions`, { emoji }).catch(console.error);
      }
    },
    [room._id]
  );

  /* ─── Toggle pin message ─── */
  const handleTogglePin = useCallback(
    (messageId: string) => {
      setActionSheetVisible(false);
      const sock = socketRef.current;
      if (sock && sock.connected) {
        sock.emit('pin_message', { roomId: room._id, messageId }, (res: any) => {
          if (!res?.success) {
            api.post(`/rooms/${room._id}/messages/${messageId}/pin`).catch(console.error);
          }
        });
      } else {
        api.post(`/rooms/${room._id}/messages/${messageId}/pin`).catch(console.error);
      }
    },
    [room._id]
  );

  /* ─── Long Press on a message ─── */
  const handleLongPress = (message: ChatMessage) => {
    try { Vibration.vibrate(20); } catch (e) {}
    setSelectedMessage(message);
    setActionSheetVisible(true);
  };

  /* ─── Swipe to reply trigger ─── */
  const handleSwipeReply = (message: ChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  /* ─── Delete message ─── */
  const handleDeleteMessage = useCallback((messageId: string) => {
    setActionSheetVisible(false);
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message for everyone in the room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setMessages((prev) => prev.filter((m) => m._id !== messageId));
            const sock = socketRef.current;
            if (sock && sock.connected) {
              sock.emit('delete_message', { roomId: room._id, messageId }, (res: any) => {
                if (!res?.success) {
                  api.delete(`/rooms/${room._id}/messages/${messageId}`).catch(console.error);
                }
              });
            } else {
              try {
                await api.delete(`/rooms/${room._id}/messages/${messageId}`);
              } catch (err: any) {
                Alert.alert('Error', err.response?.data?.message || 'Could not delete message');
                fetchMessages(1);
              }
            }
          },
        },
      ]
    );
  }, [room._id, fetchMessages]);

  /* ─── Copy text ─── */
  const handleCopyText = useCallback(async (msg: ChatMessage) => {
    setActionSheetVisible(false);
    const textToCopy = msg.content || msg.text || '';
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  }, []);

  const canDeleteMessage = (msg: ChatMessage | null): boolean => {
    if (!msg) return false;
    const callerId = currentUserId;
    const isAuthor =
      msg.senderId &&
      (msg.senderId._id === callerId || (msg.senderId as any) === callerId);
    const isOwner = membership?.role === 'owner';
    const isAdmin = membership?.role === 'admin';
    return !!(isAuthor || isOwner || isAdmin);
  };

  /* ─── Format date header ─── */
  const formatDateHeader = (): string => {
    const start = room.startDate
      ? new Date(room.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '';
    const end = room.endDate
      ? new Date(room.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    if (start && end) return `${start} – ${end}`;
    return start || end || '';
  };

  /* --- Empty State --- */
  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👋</Text>
        <Text style={styles.emptyTitle}>Be the first one to say hi!</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation with your travel buddies in {room.name}.
        </Text>
        <View style={styles.quickPrompts}>
          {['Hey everyone! 🎉', "Who's excited?! ✈️", "Let's plan this! 🗺️"].map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={styles.quickPromptChip}
              onPress={() => setInputText(prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  /* --- Typing Indicator --- */
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map((u) => u.name.split(' ')[0]).join(', ');
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingDots}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
        <Text style={styles.typingText}>
          {names} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Subtle Contour Background Watermark */}
      <View style={styles.contourWatermark} pointerEvents="none">
        <Svg width={SCREEN_WIDTH} height={350} viewBox={`0 0 ${SCREEN_WIDTH} 350`}>
          <Path
            d={`M ${SCREEN_WIDTH * 0.45} 350 C ${SCREEN_WIDTH * 0.65} 250, ${SCREEN_WIDTH * 0.75} 180, ${SCREEN_WIDTH} 120`}
            stroke="#EADBCA"
            strokeWidth={1.2}
            fill="none"
            opacity={0.65}
          />
          <Path
            d={`M ${SCREEN_WIDTH * 0.35} 350 C ${SCREEN_WIDTH * 0.6} 240, ${SCREEN_WIDTH * 0.8} 150, ${SCREEN_WIDTH} 70`}
            stroke="#EADBCA"
            strokeWidth={1.2}
            fill="none"
            opacity={0.5}
          />
          <Path
            d={`M ${SCREEN_WIDTH * 0.25} 350 C ${SCREEN_WIDTH * 0.55} 230, ${SCREEN_WIDTH * 0.85} 120, ${SCREEN_WIDTH} 20`}
            stroke="#EADBCA"
            strokeWidth={1.2}
            fill="none"
            opacity={0.4}
          />
          <Path
            d={`M ${SCREEN_WIDTH * 0.15} 350 C ${SCREEN_WIDTH * 0.5} 210, ${SCREEN_WIDTH * 0.9} 90, ${SCREEN_WIDTH} 0`}
            stroke="#EADBCA"
            strokeWidth={1.2}
            fill="none"
            opacity={0.3}
          />
        </Svg>
      </View>

      {/* ═══════════════ TOP HEADER ═══════════════ */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={26} color="#243C32" />
        </TouchableOpacity>

        {/* Room Thumbnail */}
        {room.coverImage ? (
          <ExpoImage
            source={{ uri: getOptimizedImageUrl(room.coverImage, { width: 120, height: 120, crop: 'fill' }) }}
            style={styles.headerThumbnail}
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.headerThumbnail, styles.headerThumbnailFallback]}>
            <Text style={styles.headerThumbnailEmoji}>🏝️</Text>
          </View>
        )}

        {/* Title + Subtitle */}
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {room.name}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {stats.memberCount} members · {formatDateHeader()}
          </Text>
        </View>

        {/* Right Icons: Search & More Options */}
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <Feather name="search" size={21} color="#243C32" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIconBtn}
          activeOpacity={0.7}
          onPress={() => setSettingsVisible(true)}
        >
          <Feather name="more-vertical" size={21} color="#243C32" />
        </TouchableOpacity>
      </View>

      {/* ═══════════════ PINNED MESSAGES BANNER ═══════════════ */}
      {pinnedMessages.length > 0 && (
        <TouchableOpacity
          style={styles.nextUpBanner}
          activeOpacity={0.8}
          onPress={() => {
            if (pinnedMessages.length > 1) {
              setPinnedBannerIndex((prev) => (prev + 1) % pinnedMessages.length);
            }
            const pinned = pinnedMessages[pinnedBannerIndex];
            if (pinned) {
              const idx = messages.findIndex((m) => m._id === pinned._id);
              if (idx >= 0) {
                flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
              }
            }
          }}
        >
          <View style={styles.nextUpContent}>
            <Text style={styles.nextUpPinIcon}>📌</Text>
            <Text style={styles.nextUpText} numberOfLines={1}>
              <Text style={styles.nextUpBold}>
                {pinnedMessages[pinnedBannerIndex]?.senderId?.name || 'Member'}
              </Text>
              {': '}
              {pinnedMessages[pinnedBannerIndex]?.content ||
                pinnedMessages[pinnedBannerIndex]?.text ||
                (pinnedMessages[pinnedBannerIndex]?.media?.url ? '📸 Photo' : 'Pinned message')}
            </Text>
          </View>
          <View style={styles.pinnedCountBadge}>
            <Text style={styles.pinnedCountText}>
              {pinnedBannerIndex + 1}/{pinnedMessages.length}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#78716C" />
        </TouchableOpacity>
      )}

      {/* ═══════════════ CHAT BODY / MESSAGE FEED ═══════════════ */}
      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C96A25" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => (
              <ChatMessageBubble
                item={item}
                index={index}
                prevItem={index > 0 ? messages[index - 1] : null}
                currentUserId={currentUserId}
                isHighlighted={item._id === highlightedMessageId}
                getRoleColor={getRoleColor}
                onSwipeReply={handleSwipeReply}
                onLongPress={handleLongPress}
                onReaction={handleReaction}
                onScrollToReply={scrollToMessage}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty,
            ]}
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#C96A25" />
                </View>
              ) : null
            }
            onContentSizeChange={() => {
              if (messages.length > 0 && !loadingMore) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                if (flatListRef.current && info.index < messages.length) {
                  flatListRef.current.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.3,
                  });
                }
              }, 120);
            }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Typing indicator */}
        {renderTypingIndicator()}

        {/* ═══════════════ REPLY PREVIEW BANNER ═══════════════ */}
        {replyingTo && (
          <View style={styles.replyBannerContainer}>
            <View style={styles.replyBannerLeft}>
              <Text style={styles.replyBannerTitle} numberOfLines={1}>
                Replying to{' '}
                <Text style={styles.replyBannerAuthor}>
                  {typeof replyingTo.senderId === 'object' ? replyingTo.senderId?.name : 'Member'}
                </Text>
              </Text>
            </View>
            <View style={styles.replyBannerRight}>
              <View style={styles.mentionBadge}>
                <Text style={styles.mentionBadgeText}>@ ON</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={styles.replyCloseCircle}>
                  <Feather name="x" size={13} color="#78716C" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══════════════ BOTTOM INPUT BAR ═══════════════ */}
        <View style={styles.inputBarContainer}>
          <TouchableOpacity
            style={styles.attachCircleBtn}
            onPress={() => setShowAttachMenu(!showAttachMenu)}
            activeOpacity={0.7}
          >
            <Feather name={showAttachMenu ? 'x' : 'plus'} size={22} color="#243C32" />
          </TouchableOpacity>

          <View style={styles.inputCapsule}>
            <TextInput
              ref={inputRef}
              style={styles.textInputField}
              value={inputText}
              onChangeText={handleTyping}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={`Message ${room.name}...`}
              placeholderTextColor="#8C867A"
              multiline
              maxLength={2000}
            />
          </View>

          <View style={styles.inputRightRow}>
            <TouchableOpacity
              style={styles.inputMediaBtn}
              activeOpacity={0.7}
              onPress={handleTakePhoto}
            >
              <Feather name="camera" size={20} color="#59615A" />
            </TouchableOpacity>

            {!inputText.trim() ? (
              <TouchableOpacity
                style={styles.inputMediaBtn}
                activeOpacity={0.7}
                onPress={handleMicPress}
              >
                <Feather name="mic" size={20} color="#59615A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendCircleBtn, styles.sendCircleBtnActive]}
                onPress={handleSend}
                activeOpacity={0.7}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="arrow-up" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ═══════════════ ATTACH MENU DRAWER ═══════════════ */}
        {showAttachMenu && (
          <View style={styles.attachMenuDrawer}>
            <TouchableOpacity
              style={styles.attachMenuItem}
              activeOpacity={0.7}
              onPress={handlePickImage}
            >
              <View style={[styles.attachMenuIcon, { backgroundColor: '#E8F5E9' }]}>
                <Feather name="image" size={21} color="#2E7D32" />
              </View>
              <Text style={styles.attachMenuLabel}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachMenuItem}
              activeOpacity={0.7}
              onPress={handlePollPress}
            >
              <View style={[styles.attachMenuIcon, { backgroundColor: '#FFF3E0' }]}>
                <Feather name="bar-chart-2" size={21} color="#E65100" />
              </View>
              <Text style={styles.attachMenuLabel}>Poll</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachMenuItem}
              activeOpacity={0.7}
              onPress={handleLocationPress}
            >
              <View style={[styles.attachMenuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="map-pin" size={21} color="#1565C0" />
              </View>
              <Text style={styles.attachMenuLabel}>Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ═══════════════ ACTION SHEET MODAL ═══════════════ */}
      <ChatActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        selectedMessage={selectedMessage}
        onReaction={handleReaction}
        onReply={handleSwipeReply}
        onCopyText={handleCopyText}
        onTogglePin={handleTogglePin}
        onDeleteMessage={handleDeleteMessage}
        canDelete={canDeleteMessage(selectedMessage)}
      />

      {/* ═══════════════ TRIP SETTINGS MODAL ═══════════════ */}
      <TripSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        data={data}
        onRefresh={onRefresh}
      />
    </View>
  );
};
