import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Vibration,
  Dimensions,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { RoomDetailsData } from '../../../types/room';
import { SettlementUser } from '../ExpensesTab';
import api from '../../../services/api';
import { getTagConfig, getIconForTags, tagToCategory, TAG_PRESETS } from './tagConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExpenseSplitRow {
  _id: string;
  expenseId: string;
  userId: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  amount: number;
  isSettled: boolean;
  createdAt?: string;
}

interface EditSplitEntry {
  userId: string;
  name: string;
  amount: string;
}

interface ApiExpense {
  _id: string;
  roomId: string;
  title: string;
  amount: number;
  currency?: string;
  category?: string;
  tags?: string[];
  paidBy: { _id: string; name: string; email?: string; avatar?: string };
  receiptUrl?: string;
  receiptUrls?: string[];
  notes?: string;
  comments?: ExpenseCommentLocal[];
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseWithDetails {
  expense: ApiExpense;
  splits: ExpenseSplitRow[];
}

interface ExpenseCommentLocal {
  _id: string;
  userId: string | { _id: string; name: string; avatar?: string };
  userName?: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

interface ExpenseDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  expenseId: string | null;
  data: RoomDetailsData;
  onExpenseChanged?: () => void;
  onCommentAdded?: (expenseId: string, commentCount: number) => void;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  visible,
  onClose,
  expenseId,
  data,
  onExpenseChanged,
  onCommentAdded,
}) => {
  const { room, members, currentUserId } = data;
  const roomId = room._id;

  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ExpenseWithDetails | null>(null);
  const [comments, setComments] = useState<ExpenseCommentLocal[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);
  const [paidByOpen, setPaidByOpen] = useState(false);
  const [splitEveryone, setSplitEveryone] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<EditSplitEntry[]>([]);
  const [editReceiptUrls, setEditReceiptUrls] = useState<string[]>([]);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    amount: string;
    notes: string;
    tags: string[];
    paidByUserId: string;
  }>({ title: '', amount: '', notes: '', tags: ['general'], paidByUserId: '' });
  const scrollRef = useRef<ScrollView>(null);

  const memberMap = useMemo(() => {
    const m: Record<string, { name: string; avatar?: string }> = {};
    members.forEach((mem) => {
      if (mem.userId) m[mem.userId._id] = { name: mem.userId.name, avatar: mem.userId.avatar };
    });
    return m;
  }, [members]);

  const roomMembers = useMemo(() => members.map((member) => ({
    _id: member.userId._id,
    name: member.userId.name,
    avatar: member.userId.avatar,
  })), [members]);

  useEffect(() => {
    if (visible && expenseId) {
      fetchDetails();
    } else {
      setDetails(null);
      setIsEditing(false);
      setComments([]);
      setCommentText('');
    }
  }, [visible, expenseId, roomId]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const currentMemberRole = useMemo(() => {
    const cm = members.find((m) => m.userId._id === currentUserId);
    return cm?.role || 'member';
  }, [members, currentUserId]);

  const fetchDetails = async () => {
    if (!expenseId) return;
    try {
      setLoading(true);
      const res = await api.get(`/rooms/${roomId}/expenses/${expenseId}`);
      if (res.data?.success) {
        const d: ExpenseWithDetails = {
          expense: res.data.data.expense,
          splits: res.data.data.splits || [],
        };
        setComments((d.expense.comments || []).map((comment) => ({
          ...comment,
          userName: typeof comment.userId === 'object' ? comment.userId.name : 'Member',
          userAvatar: typeof comment.userId === 'object' ? comment.userId.avatar : undefined,
          userId: typeof comment.userId === 'object' ? comment.userId._id : comment.userId,
        })));
        const expenseTags: string[] = (d.expense.tags && d.expense.tags.length > 0)
          ? d.expense.tags
          : ['general'];
        setDetails(d);
        setEditDraft({
          title: d.expense.title,
          amount: String(d.expense.amount),
          notes: d.expense.notes || '',
          tags: expenseTags,
          paidByUserId: d.expense.paidBy._id,
        });
        setEditReceiptUrls(d.expense.receiptUrls?.length ? d.expense.receiptUrls : (d.expense.receiptUrl ? [d.expense.receiptUrl] : []));
        const splitIds = d.splits.map((split) => split.userId._id);
        setSelectedSplitIds(splitIds);
        setSplitEveryone(splitIds.length === roomMembers.length);
        setSplitMode('equal');
        setCustomSplits(d.splits.map((split) => ({
          userId: split.userId._id,
          name: split.userId.name,
          amount: String(split.amount),
        })));
      }
    } catch (e: any) {
      console.warn('Fetch expense details error:', e?.message || e);
      Alert.alert('Error', 'Could not load expense details.');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = !!details && (details.expense.paidBy._id === currentUserId || currentMemberRole === 'owner');

  const expenseTags = useMemo(() => {
    if (!details?.expense) return ['general'];
    if (details.expense.tags && details.expense.tags.length > 0) {
      return details.expense.tags;
    }
    return ['general'];
  }, [details?.expense]);

  const displayTags = useMemo(() => (isEditing ? editDraft.tags : expenseTags), [isEditing, editDraft.tags, expenseTags]);

  const effectiveSplitIds = splitEveryone
    ? roomMembers.map((member) => member._id)
    : selectedSplitIds;
  const editAmount = parseFloat(editDraft.amount) || 0;
  const customTotal = customSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  const equalShare = effectiveSplitIds.length > 0 ? editAmount / effectiveSplitIds.length : 0;

  const iconInfo = useMemo(() => getIconForTags(displayTags), [displayTags]);

  const allReceipts = useMemo(() => {
    const urls: string[] = [];
    if (details?.expense?.receiptUrls && details.expense.receiptUrls.length > 0) {
      details.expense.receiptUrls.forEach((u) => u && urls.push(u));
    } else if (details?.expense?.receiptUrl) {
      urls.push(details.expense.receiptUrl);
    }
    return Array.from(new Set(urls)).filter(Boolean);
  }, [details?.expense?.receiptUrls, details?.expense?.receiptUrl]);

  const currentShare = details?.splits.find((split) => split.userId?._id === currentUserId)?.amount || 0;
  const currentUserPaid = details?.expense.paidBy._id === currentUserId;
  const amountOwedToUser = currentUserPaid ? Math.max(0, (details?.expense.amount || 0) - currentShare) : 0;

  const formatCurrency = (n: number): string =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
  const formatCurrencyWithDecimals = (n: number): string =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

  const formatFullDate = (iso: string): string => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date} · ${time}`;
  };

  const getMemberColor = (name: string): string => {
    const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  };
  const getInitials = (name: string): string =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderAvatar = (name: string, avatar?: string, size: number = 32) => {
    const sizeStyle = { width: size, height: size, borderRadius: size / 2 };
    if (avatar) {
      return <ExpoImage source={{ uri: avatar }} style={sizeStyle} cachePolicy="memory-disk" />;
    }
    return (
      <View style={[sizeStyle, { backgroundColor: getMemberColor(name), alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#FFFFFF', fontSize: Math.round(size * 0.38), fontWeight: '800' }}>
          {getInitials(name)}
        </Text>
      </View>
    );
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      Vibration.vibrate(12);
      const res = await api.post(`/rooms/${roomId}/expenses/${expenseId}/comments`, { text });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not add comment');
      const saved = res.data.data.comment;
      const savedUser = saved.userId;
      const newComment: ExpenseCommentLocal = {
        _id: saved._id,
        userId: typeof savedUser === 'object' ? savedUser._id : savedUser,
        userName: typeof savedUser === 'object' ? savedUser.name : 'You',
        userAvatar: typeof savedUser === 'object' ? savedUser.avatar : undefined,
        text: saved.text,
        createdAt: saved.createdAt,
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      onCommentAdded?.(details?.expense._id || expenseId || '', comments.length + 1);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    } catch (e) {
      Alert.alert('Could not add comment', 'Please try again.');
    }
  };

  const saveEdit = async () => {
    if (!details) return;
    try {
      Vibration.vibrate(15);
      setSubmittingEdit(true);
      const finalTags = editDraft.tags.length > 0 ? editDraft.tags : ['general'];
      const payload: any = {
        title: editDraft.title.trim() || details.expense.title,
        amount: editAmount > 0 ? editAmount : details.expense.amount,
        paidBy: editDraft.paidByUserId,
        notes: editDraft.notes?.trim() || '',
        tags: finalTags,
        receiptUrls: editReceiptUrls,
      };
      if (splitMode === 'custom') {
        if (Math.abs(customTotal - editAmount) > 0.01 || customSplits.length === 0) {
          throw new Error('Custom split amounts must equal the expense total.');
        }
        payload.splits = customSplits.map((split) => ({
          userId: split.userId,
          amount: Number(split.amount),
        }));
      } else {
        payload.splitMembers = effectiveSplitIds;
      }
      const res = await api.put(`/rooms/${roomId}/expenses/${details.expense._id}`, payload);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Backend PUT endpoint not available yet');
      }
      setIsEditing(false);
      Alert.alert('Updated ✅', 'Expense changes have been saved.');
      onExpenseChanged?.();
      fetchDetails();
    } catch (e: any) {
      Alert.alert(
        'Could not save changes',
        e?.response?.data?.message || e?.message || 'Only the person who paid or the room owner can edit this expense.'
      );
    } finally {
      setSubmittingEdit(false);
    }
  };

  const pickEditReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Library access is required to add a receipt.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.78,
        selectionLimit: 1,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || `receipt_${Date.now()}.jpg`;
      const form = new FormData();
      form.append('images', { uri: asset.uri, name: filename, type: 'image/jpeg' } as any);
      form.append('mediaType', 'receipt');
      const response = await api.post(`/rooms/${roomId}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploaded = response.data?.data?.media?.[0];
      const url = uploaded?.url || uploaded?.secureUrl || uploaded?.uri;
      if (url) setEditReceiptUrls([url]);
    } catch (error) {
      Alert.alert('Could not add receipt', 'Please try again.');
    }
  };

  const deleteExpense = () => {
    if (!details) return;
    Alert.alert(
      'Delete Expense?',
      `This will permanently remove "${details.expense.title}" and recalculate balances.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Vibration.vibrate(20);
              const res = await api.delete(`/rooms/${roomId}/expenses/${details.expense._id}`);
              if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete');
              Alert.alert('Deleted', 'Expense removed.');
              onExpenseChanged?.();
              onClose();
            } catch (e: any) {
              console.warn('Delete expense error:', e);
              Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not delete.');
            }
          },
        },
      ]
    );
  };

  const toggleEditTag = (tagKey: string) => {
    try { Vibration.vibrate(8); } catch (e) {}
    setEditDraft((prev) => {
      const has = prev.tags.includes(tagKey);
      let next = has ? prev.tags.filter((t) => t !== tagKey) : [...prev.tags, tagKey];
      next = next.slice(0, 5);
      if (next.length === 0) {
        return { ...prev, tags: ['general'] };
      }
      if (next.includes('general') && next.length > 1) {
        next = next.filter((t) => t !== 'general');
      }
      return { ...prev, tags: next };
    });
  };

  const toggleEditMember = (userId: string) => {
    setSplitEveryone(false);
    setSelectedSplitIds((previous) => {
      const next = previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId];
      if (next.length === roomMembers.length) {
        setSplitEveryone(true);
      }
      if (splitMode === 'custom') {
        setCustomSplits((current) => next.map((id) => {
          const existing = current.find((split) => split.userId === id);
          const member = roomMembers.find((item) => item._id === id);
          return existing || { userId: id, name: member?.name || 'Member', amount: '' };
        }));
      }
      return next;
    });
  };

  const beginEditing = () => {
    if (!details) return;
    const splitIds = details.splits.map((split) => split.userId._id);
    setSelectedSplitIds(splitIds);
    setSplitEveryone(splitIds.length === roomMembers.length);
    setSplitMode('equal');
    setCustomSplits(details.splits.map((split) => ({
      userId: split.userId._id,
      name: split.userId.name,
      amount: String(split.amount),
    })));
    setIsEditing(true);
  };

  const renderEditForm = () => (
    <View style={styles.editForm}>
      <Text style={styles.editSectionTitle}>Basic info</Text>
      <Text style={styles.editFieldLabel}>Title *</Text>
      <TextInput
        style={styles.editInput}
        value={editDraft.title}
        onChangeText={(title) => setEditDraft((previous) => ({ ...previous, title }))}
        placeholder="Expense title"
        placeholderTextColor="#A89E91"
        maxLength={120}
      />

      <Text style={styles.editFieldLabel}>Amount *</Text>
      <View style={styles.editAmountInput}>
        <Text style={styles.editRupee}>₹</Text>
        <TextInput
          style={styles.editAmountText}
          value={editDraft.amount}
          onChangeText={(amount) => setEditDraft((previous) => ({ ...previous, amount: amount.replace(/[^0-9.]/g, '') }))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#A89E91"
        />
      </View>

      <Text style={styles.editFieldLabel}>Paid by *</Text>
      <TouchableOpacity style={styles.editSelect} onPress={() => setPaidByOpen((open) => !open)}>
        <Text style={styles.editSelectText}>
          {roomMembers.find((member) => member._id === editDraft.paidByUserId)?.name || 'Select member'}
        </Text>
        <Feather name={paidByOpen ? 'chevron-up' : 'chevron-down'} size={17} color="#78716C" />
      </TouchableOpacity>
      {paidByOpen && (
        <View style={styles.editPickerList}>
          {roomMembers.map((member) => (
            <TouchableOpacity
              key={member._id}
              style={styles.editPickerItem}
              onPress={() => {
                setEditDraft((previous) => ({ ...previous, paidByUserId: member._id }));
                setPaidByOpen(false);
              }}
            >
              <Text style={styles.editPickerText}>{member._id === currentUserId ? `You (${member.name})` : member.name}</Text>
              {member._id === editDraft.paidByUserId && <Feather name="check" size={16} color="#3F6B52" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.editLabelRow}>
        <Text style={styles.editFieldLabel}>Tags</Text>
        <Text style={styles.editHint}>Tap a tag to remove</Text>
      </View>
      <View style={styles.editTagRow}>
        {editDraft.tags.map((tag) => {
          const config = getTagConfig(tag);
          return (
            <TouchableOpacity key={tag} style={[styles.tagPill, { backgroundColor: config.pillBg }]} onPress={() => toggleEditTag(tag)}>
              <Text style={[styles.tagPillText, { color: config.textColor }]}>#{tag}  x</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.addTagButton} onPress={() => setTagPickerVisible(true)}>
          <Feather name="plus" size={14} color="#3F6B52" />
          <Text style={styles.addTagText}>Add tag</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.editSectionTitle}>Split with</Text>
      <TouchableOpacity style={[styles.everyoneEditRow, splitEveryone && styles.everyoneEditRowActive]} onPress={() => {
        setSplitEveryone(true);
        setSelectedSplitIds(roomMembers.map((member) => member._id));
        if (splitMode === 'custom') {
          setCustomSplits(roomMembers.map((member) => ({ userId: member._id, name: member.name, amount: '' })));
        }
      }}>
        <Feather name={splitEveryone ? 'check-circle' : 'circle'} size={20} color={splitEveryone ? '#3F6B52' : '#A89E91'} />
        <Text style={styles.everyoneEditText}>Everyone</Text>
        <Text style={styles.editHint}>{roomMembers.length} people</Text>
      </TouchableOpacity>
      <View style={styles.memberChipGrid}>
        {roomMembers.map((member) => {
          const selected = splitEveryone || selectedSplitIds.includes(member._id);
          return (
            <TouchableOpacity key={member._id} style={[styles.memberEditChip, selected && styles.memberEditChipActive]} onPress={() => toggleEditMember(member._id)}>
              <Text style={[styles.memberEditChipText, selected && styles.memberEditChipTextActive]}>{member._id === currentUserId ? 'You' : member.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.editFieldLabel}>How should it be split?</Text>
      <View style={styles.editSplitSegment}>
        {(['equal', 'custom'] as const).map((mode) => (
          <TouchableOpacity key={mode} style={[styles.editSplitButton, splitMode === mode && styles.editSplitButtonActive]} onPress={() => {
            setSplitMode(mode);
            if (mode === 'custom') {
              setCustomSplits(effectiveSplitIds.map((id) => {
                const existing = customSplits.find((split) => split.userId === id);
                const member = roomMembers.find((item) => item._id === id);
                return existing || { userId: id, name: member?.name || 'Member', amount: '' };
              }));
            }
          }}>
            <Feather name={mode === 'equal' ? 'users' : 'sliders'} size={15} color={splitMode === mode ? '#FFFFFF' : '#3F6B52'} />
            <Text style={[styles.editSplitButtonText, splitMode === mode && styles.editSplitButtonTextActive]}>{mode === 'equal' ? 'Equally' : 'Custom'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {splitMode === 'equal' ? (
        <View style={styles.editSplitSummary}>
          <Text style={styles.editHint}>₹{editAmount.toLocaleString('en-IN')} ÷ {effectiveSplitIds.length} people</Text>
          <Text style={styles.editShareAmount}>₹{equalShare.toLocaleString('en-IN', { maximumFractionDigits: 2 })} each</Text>
        </View>
      ) : (
        <View style={styles.customEditList}>
          {customSplits.map((split, index) => (
            <View key={split.userId} style={styles.customEditRow}>
              <Text style={styles.customEditName}>{split.userId === currentUserId ? 'You' : split.name}</Text>
              <View style={styles.customEditAmount}>
                <Text style={styles.editRupee}>₹</Text>
                <TextInput
                  style={styles.customEditInput}
                  value={split.amount}
                  onChangeText={(amount) => setCustomSplits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: amount.replace(/[^0-9.]/g, '') } : item))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#A89E91"
                />
              </View>
            </View>
          ))}
          <Text style={Math.abs(customTotal - editAmount) < 0.01 ? styles.editValidText : styles.editInvalidText}>
            ₹{customTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} assigned {Math.abs(customTotal - editAmount) < 0.01 ? '✓' : `· ₹${Math.max(0, editAmount - customTotal).toFixed(2)} remaining`}
          </Text>
        </View>
      )}

      <Text style={styles.editSectionTitle}>Additional details</Text>
      <Text style={styles.editFieldLabel}>Description</Text>
      <TextInput
        style={[styles.editInput, styles.editDescription]}
        value={editDraft.notes}
        onChangeText={(notes) => setEditDraft((previous) => ({ ...previous, notes }))}
        placeholder="Optional description"
        placeholderTextColor="#A89E91"
        multiline
        maxLength={250}
      />
      <Text style={styles.editFieldLabel}>Receipt</Text>
      {editReceiptUrls.length > 0 ? (
        <View style={styles.editReceiptRow}>
          <ExpoImage source={{ uri: editReceiptUrls[0] }} style={styles.editReceiptThumb} contentFit="cover" />
          <TouchableOpacity style={styles.receiptActionButton} onPress={pickEditReceipt}>
            <Text style={styles.receiptActionText}>Replace</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.receiptActionButton} onPress={() => setEditReceiptUrls([])}>
            <Text style={styles.receiptRemoveText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addReceiptButton} onPress={pickEditReceipt}>
          <Feather name="plus" size={15} color="#3F6B52" />
          <Text style={styles.addTagText}>Add receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.fullSheet, keyboardHeight > 0 && {
          height: Math.max(360, SCREEN_HEIGHT - keyboardHeight - (Platform.OS === 'ios' ? 12 : 0)),
        }]}>
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.navIconBtn}
              activeOpacity={0.7}
              onPress={() => { try { Vibration.vibrate(10); } catch (e) {} onClose(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={22} color="#17251F" />
            </TouchableOpacity>
            <Text style={styles.navTitle} numberOfLines={1}>
              {isEditing ? 'Edit Expense' : 'Expense Details'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {canEdit && !isEditing && (
                <TouchableOpacity
                  style={styles.navIconBtn}
                  activeOpacity={0.7}
                  onPress={() => { try { Vibration.vibrate(10); } catch (e) {} beginEditing(); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="edit-2" size={18} color="#17251F" />
                </TouchableOpacity>
              )}
              {canEdit && (
                <TouchableOpacity
                  style={styles.navIconBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    try { Vibration.vibrate(10); } catch (e) {}
                    if (isEditing) {
                      setIsEditing(false);
                    } else {
                      deleteExpense();
                    }
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={isEditing ? 'x' : 'trash-2'}
                    size={18}
                    color={isEditing ? '#17251F' : '#C96A25'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <Text style={styles.loadingDot}>⏳</Text>
              <Text style={styles.centerText}>Loading expense details...</Text>
            </View>
          ) : !details ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.centerText}>Could not load this expense.</Text>
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                  {isEditing ? renderEditForm() : (
                  <>
                  <View style={styles.heroSummaryCard}>
                  <View style={styles.heroRow1}>
                    <View style={[styles.heroIconPill, { backgroundColor: iconInfo.bgColor }]}>
                      <Text style={styles.heroIconEmoji}>{iconInfo.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {isEditing ? (
                        <TextInput
                          style={styles.heroTitleEdit}
                          value={editDraft.title}
                          onChangeText={(v) => setEditDraft((p) => ({ ...p, title: v }))}
                          maxLength={120}
                        />
                      ) : (
                        <Text style={styles.heroTitle} numberOfLines={2}>
                          {details.expense.title}
                        </Text>
                      )}
                      <Text style={styles.heroMeta}>
                        {formatFullDate(details.expense.createdAt)}
                      </Text>
                    </View>
                    {isEditing ? (
                      <View style={styles.heroAmountEditWrap}>
                        <Text style={styles.rupeeInline}>₹</Text>
                        <TextInput
                          style={styles.heroAmountEdit}
                          keyboardType="numeric"
                          value={editDraft.amount}
                          onChangeText={(v) =>
                            setEditDraft((p) => ({ ...p, amount: v.replace(/[^0-9.]/g, '') }))
                          }
                          maxLength={12}
                        />
                      </View>
                    ) : (
                      <Text style={styles.heroAmount}>
                        {formatCurrency(details.expense.amount)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.financialImpactCard}>
                    <View style={styles.financialImpactHeader}>
                      <Feather name="activity" size={16} color="#C97935" />
                      <Text style={styles.financialImpactTitle}>Your financial impact</Text>
                    </View>
                    <View style={styles.financialImpactGrid}>
                      <View style={styles.financialMetric}>
                        <Text style={styles.financialMetricLabel}>Your share</Text>
                        <Text style={styles.financialMetricAmount}>{formatCurrency(currentShare)}</Text>
                      </View>
                      <View style={styles.financialMetric}>
                        <Text style={styles.financialMetricLabel}>{currentUserPaid ? 'You paid' : 'Paid by'}</Text>
                        <Text style={styles.financialMetricAmount} numberOfLines={1}>
                          {currentUserPaid ? formatCurrency(details.expense.amount) : details.expense.paidBy.name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.financialOutcome}>
                      <Text style={styles.financialOutcomeLabel}>{currentUserPaid ? 'Others owe you' : 'You owe'}</Text>
                      <Text style={styles.financialOutcomeAmount}>{formatCurrency(currentUserPaid ? amountOwedToUser : currentShare)}</Text>
                    </View>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaRow}>
                    <Feather name="user" size={16} color="#78716C" />
                    <Text style={styles.metaText}>
                      Paid by{' '}
                      <Text style={{ fontWeight: '800', color: '#17251F' }}>
                        {details.expense.paidBy._id === currentUserId
                          ? `You (${details.expense.paidBy.name})`
                          : details.expense.paidBy.name}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Feather name="users" size={16} color="#78716C" />
                    <Text style={styles.metaText}>
                      {details.splits.length === 1
                        ? `Shared by ${details.splits[0]?.userId?._id === currentUserId ? 'You' : details.splits[0]?.userId?.name || 'one person'}`
                        : `Shared by ${details.splits.length} people`}
                      {details.splits.length > 0 && (
                        <>
                          {' '}
                          (
                          <Text style={{ fontWeight: '800' }}>
                            {formatCurrencyWithDecimals(
                              details.expense.amount / details.splits.length
                            )}{' '}
                            each
                          </Text>
                          )
                        </>
                      )}
                    </Text>
                  </View>

                  <View style={styles.tagRow}>
                    {displayTags.map((t) => {
                      const cfg = getTagConfig(t);
                      return (
                        <View
                          key={t}
                          style={styles.metadataTag}
                        >
                          <Text style={[styles.metadataTagText, { color: cfg.textColor }]}>#{t}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {isEditing && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={[styles.keyLabel, { marginBottom: 8 }]}>Edit tags</Text>
                      <View style={styles.tagEditGrid}>
                        {TAG_PRESETS.slice(0, 18).map((p) => {
                          const selected = editDraft.tags.includes(p.key);
                          return (
                            <TouchableOpacity
                              key={p.key}
                              activeOpacity={0.8}
                              onPress={() => toggleEditTag(p.key)}
                              style={[
                                styles.tagEditChip,
                                selected
                                  ? { backgroundColor: p.bgColor, borderColor: p.textColor, borderWidth: 1.5 }
                                  : { backgroundColor: '#F5F0E6', borderColor: '#E2D7C8', borderWidth: 1 },
                              ]}
                            >
                              <Text style={{ fontSize: 13 }}>{p.emoji}</Text>
                              <Text
                                style={[
                                  styles.tagEditChipText,
                                  { color: selected ? p.textColor : '#59615A' },
                                ]}
                              >
                                {p.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <View style={styles.metaDivider} />

                  <View style={styles.detailBlock}>
                    <Text style={styles.detailBlockLabel}>Description</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.valEdit}
                        placeholder="Add a short description..."
                        placeholderTextColor="#A89E91"
                        multiline
                        maxLength={250}
                        value={editDraft.notes}
                        onChangeText={(v) => setEditDraft((p) => ({ ...p, notes: v }))}
                      />
                    ) : (
                      <Text style={styles.detailBlockValue}>
                        {details.expense.notes?.trim() || (
                          <Text style={styles.mutedDetailText}>No description added</Text>
                        )}
                      </Text>
                    )}
                  </View>

                  <View style={styles.detailBlock}>
                    <Text style={styles.detailBlockLabel}>Receipts</Text>
                    {allReceipts.length === 0 ? (
                      <Text style={styles.mutedDetailText}>No receipt added</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 10, paddingTop: 8, paddingRight: 4 }}
                      >
                        {allReceipts.map((uri, i) => (
                          <View key={i} style={styles.receiptImageTile}>
                            <ExpoImage
                              source={{ uri }}
                              style={{ width: '100%', height: '100%', borderRadius: 14 }}
                              contentFit="cover"
                            />
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>

                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Split Breakdown</Text>
                  <Text style={styles.sectionSub}>
                    {details.splits.length} {details.splits.length === 1 ? 'person' : 'people'}
                  </Text>
                </View>

                <View style={styles.breakdownCard}>
                  {details.splits.map((s) => {
                    const uName = s.userId?.name || 'Member';
                    const isPaidBy = s.userId?._id === details.expense.paidBy._id;
                    return (
                      <View key={s._id} style={styles.breakdownRow}>
                        {renderAvatar(uName, s.userId?.avatar, 34)}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.breakdownName}>
                            {s.userId?._id === currentUserId ? 'You' : uName}
                          </Text>
                          <Text style={[
                            styles.breakdownNet,
                            { color: isPaidBy ? '#648A62' : '#C97935' },
                          ]}>
                            {isPaidBy ? `Paid ${formatCurrency(details.expense.amount)}` : 'Their share'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.breakdownAmount}>
                            {formatCurrencyWithDecimals(s.amount)}
                          </Text>
                          {s.isSettled && (
                            <View style={styles.settledPill}>
                              <Feather name="check" size={10} color="#FFFFFF" />
                              <Text style={styles.settledText}>Settled</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Comments</Text>
                  <Text style={styles.sectionSub}>
                    {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>

                  <View style={styles.commentsCard}>
                  {comments.length === 0 ? (
                    <View style={styles.emptyComments}>
                      <Feather name="message-circle" size={28} color="#BFAE95" />
                      <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                      <Text style={styles.emptyCommentsSub}>
                        Add context, receipts notes, or confirm splits with your travelmates.
                      </Text>
                    </View>
                  ) : (
                    comments.map((c) => {
                      const isMe = c.userId === currentUserId;
                      return (
                        <View key={c._id} style={styles.commentRow}>
                          {renderAvatar(c.userName || 'Member', c.userAvatar, 32)}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                              <Text style={styles.commentAuthor}>
                                {isMe ? 'You' : c.userName || 'Member'}
                              </Text>
                              <Text style={styles.commentTime}>
                                {formatFullDate(c.createdAt)}
                              </Text>
                            </View>
                            <Text style={styles.commentText}>{c.text}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
                  </>
                  )}
              </ScrollView>

              <View style={styles.inputBarWrapper}>
                {isEditing ? (
                  <View style={styles.editFooterRow}>
                    <TouchableOpacity style={styles.cancelEditButton} onPress={() => setIsEditing(false)}>
                      <Text style={styles.cancelEditBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveEditBtn, styles.saveEditFooterButton, submittingEdit && { opacity: 0.6 }]}
                      activeOpacity={submittingEdit ? 1 : 0.8}
                      onPress={saveEdit}
                      disabled={submittingEdit}
                    >
                      <Text style={styles.saveEditBtnText}>{submittingEdit ? 'Saving...' : 'Save Changes'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.commentInputBar}>
                    {renderAvatar(
                      memberMap[currentUserId || '']?.name || 'You',
                      memberMap[currentUserId || '']?.avatar,
                      32
                    )}
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add a comment..."
                      placeholderTextColor="#A89E91"
                      value={commentText}
                      onChangeText={setCommentText}
                      onSubmitEditing={submitComment}
                      returnKeyType="send"
                      blurOnSubmit
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendCommentBtn,
                        !commentText.trim() && { opacity: 0.4 },
                      ]}
                      activeOpacity={commentText.trim() ? 0.7 : 1}
                      onPress={submitComment}
                      disabled={!commentText.trim()}
                    >
                      <Feather name="send" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
      <Modal visible={tagPickerVisible} transparent animationType="fade" onRequestClose={() => setTagPickerVisible(false)}>
        <View style={styles.tagPickerOverlay}>
          <View style={styles.tagPickerSheet}>
            <View style={styles.tagPickerHeader}>
              <Text style={styles.editSectionTitle}>Add tag</Text>
              <TouchableOpacity onPress={() => setTagPickerVisible(false)}>
                <Feather name="x" size={20} color="#59615A" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.tagPickerGrid} showsVerticalScrollIndicator={false}>
              {TAG_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.key}
                  style={[styles.tagPickerChip, editDraft.tags.includes(preset.key) && { backgroundColor: preset.bgColor, borderColor: preset.textColor }]}
                  onPress={() => toggleEditTag(preset.key)}
                >
                  <Text style={styles.tagPickerChipText}>#{preset.label}</Text>
                  {editDraft.tags.includes(preset.key) && <Feather name="check" size={13} color={preset.textColor} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.tagPickerDone} onPress={() => setTagPickerVisible(false)}>
              <Text style={styles.saveEditBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const SHEET_MAX = SCREEN_HEIGHT * 0.96;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 30, 25, 0.48)',
  },
  fullSheet: {
    ...Platform.select({
      ios: { marginTop: 0, height: SCREEN_HEIGHT },
      android: { marginTop: 0, height: SCREEN_HEIGHT },
    }),
    backgroundColor: '#FBF8F1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SHEET_MAX,
    overflow: 'hidden',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#FBF8F1',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE5D8',
    zIndex: 5,
  },
  navIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF1E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#17251F',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 180,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  loadingDot: { fontSize: 30 },
  emptyEmoji: { fontSize: 40 },
  centerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#59615A',
    textAlign: 'center',
  },
  heroSummaryCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5D8C4',
    ...Shadows.card,
  },
  heroRow1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIconPill: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconEmoji: { fontSize: 22 },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17251F',
    lineHeight: 22,
  },
  heroTitleEdit: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17251F',
    lineHeight: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#B9CCB8',
    minHeight: 32,
  },
  heroMeta: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
    marginTop: 4,
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17251F',
    marginLeft: 6,
  },
  heroAmountEditWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8ED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E7C899',
    marginLeft: 6,
  },
  rupeeInline: { fontSize: 17, fontWeight: '800', color: '#78716C' },
  heroAmountEdit: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17251F',
    minWidth: 70,
    textAlign: 'right',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F0E8DB',
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13.5,
    color: '#59615A',
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metadataTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F0E9',
  },
  metadataTagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5EEE2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryEmoji: { fontSize: 13 },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#59615A',
  },
  keyValRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 10,
  },
  detailBlock: {
    marginTop: 14,
  },
  detailBlockLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#59615A',
    marginBottom: 6,
  },
  detailBlockValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#17251F',
    lineHeight: 20,
  },
  mutedDetailText: {
    color: '#A89E91',
    fontWeight: '500',
  },
  financialImpactCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F1F6F0',
    borderWidth: 1,
    borderColor: '#C9DAC8',
    borderRadius: 14,
  },
  financialImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  financialImpactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#243C32',
  },
  financialImpactGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  financialMetric: {
    flex: 1,
    padding: 10,
    backgroundColor: '#FFFDF8',
    borderRadius: 10,
  },
  financialMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 4,
  },
  financialMetricAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17251F',
  },
  financialOutcome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#C9DAC8',
  },
  financialOutcomeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3F6B52',
  },
  financialOutcomeAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2A4E3A',
  },
  keyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
    width: 80,
  },
  valText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#17251F',
    textAlign: 'right',
    lineHeight: 19,
  },
  valEdit: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#17251F',
    textAlign: 'right',
    backgroundColor: '#FAF7F2',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2D7C8',
    minHeight: 32,
  },
  receiptsSectionWrap: {
    width: '100%',
    marginTop: 10,
  },
  receiptImageTile: {
    width: 180,
    height: 130,
    borderRadius: 14,
    backgroundColor: '#EFE7D7',
    borderWidth: 1,
    borderColor: '#E2D7C8',
    overflow: 'hidden',
    ...Shadows.card,
  },
  receiptImage: {
    width: 180,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D7C8',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#17251F',
    letterSpacing: -0.1,
    borderLeftWidth: 3,
    borderLeftColor: '#C97935',
    paddingLeft: 8,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  breakdownCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#B9CCB8',
    gap: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17251F',
  },
  breakdownNet: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#17251F',
  },
  settledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: '#648A62',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  settledText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  commentsCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DDCC',
    gap: 10,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    gap: 6,
  },
  emptyCommentsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17251F',
    marginTop: 4,
  },
  emptyCommentsSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
    textAlign: 'center',
    paddingHorizontal: 14,
    lineHeight: 17,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  commentAuthor: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#17251F',
  },
  commentTime: {
    fontSize: 10.5,
    color: '#A89E91',
    fontWeight: '600',
  },
  commentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#243C32',
    lineHeight: 18,
    marginTop: 2,
  },
  inputBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: '#EDE5D8',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '500',
    color: '#17251F',
    borderWidth: 1,
    borderColor: '#C7D5C4',
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C97935',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  saveEditBtn: {
    width: '100%',
    backgroundColor: '#243C32',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEditBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelEditBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#59615A',
    textDecorationLine: 'underline',
  },
  editForm: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  editSectionTitle: { fontSize: 15, fontWeight: '800', color: '#243C32', marginTop: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#C97935', paddingLeft: 9 },
  editFieldLabel: { fontSize: 12.5, fontWeight: '700', color: '#59615A', marginBottom: 6, marginTop: 10 },
  editInput: { minHeight: 42, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5D8C4', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontSize: 15, color: '#17251F' },
  editAmountInput: { flexDirection: 'row', alignItems: 'center', minHeight: 42, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E7C899', borderRadius: 10, paddingHorizontal: 11 },
  editRupee: { fontSize: 16, fontWeight: '800', color: '#3F6B52', marginRight: 6 },
  editAmountText: { flex: 1, fontSize: 17, fontWeight: '800', color: '#17251F', paddingVertical: 8 },
  editSelect: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#B9CCB8', borderRadius: 10 },
  editSelectText: { fontSize: 14, fontWeight: '600', color: '#17251F' },
  editPickerList: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2D7C8', borderRadius: 10, marginTop: 4 },
  editPickerItem: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0E8DB' },
  editPickerText: { fontSize: 13.5, color: '#17251F', fontWeight: '600' },
  editLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  editHint: { fontSize: 11.5, color: '#A89E91', fontWeight: '600' },
  editTagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  addTagButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#8DAA96', borderRadius: 10 },
  addTagText: { fontSize: 12, color: '#3F6B52', fontWeight: '700' },
  everyoneEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2D7C8', backgroundColor: '#FFFFFF' },
  everyoneEditRowActive: { borderColor: '#8DAA96', backgroundColor: '#F1F6F0' },
  everyoneEditText: { flex: 1, fontSize: 13.5, color: '#17251F', fontWeight: '700' },
  memberChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  memberEditChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#E2D7C8', backgroundColor: '#FFFFFF' },
  memberEditChipActive: { backgroundColor: '#E6EEE6', borderColor: '#8DAA96' },
  memberEditChipText: { fontSize: 12, color: '#59615A', fontWeight: '600' },
  memberEditChipTextActive: { color: '#2A4E3A', fontWeight: '800' },
  editSplitSegment: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 12, backgroundColor: '#EAF1E8' },
  editSplitButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  editSplitButtonActive: { backgroundColor: '#3F6B52' },
  editSplitButtonText: { fontSize: 13, color: '#3F6B52', fontWeight: '700' },
  editSplitButtonTextActive: { color: '#FFFFFF' },
  editSplitSummary: { paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderRadius: 10, backgroundColor: '#F1F6F0' },
  editShareAmount: { fontSize: 17, color: '#2A4E3A', fontWeight: '800', marginTop: 3 },
  customEditList: { marginTop: 8, padding: 10, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCC', borderRadius: 12, gap: 8 },
  customEditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customEditName: { fontSize: 13, color: '#17251F', fontWeight: '700' },
  customEditAmount: { flexDirection: 'row', alignItems: 'center', width: 105, borderBottomWidth: 1, borderBottomColor: '#DCCFBF' },
  customEditInput: { flex: 1, textAlign: 'right', fontSize: 14, color: '#17251F', paddingVertical: 5 },
  editValidText: { fontSize: 12, color: '#3F6B52', fontWeight: '700', marginTop: 4 },
  editInvalidText: { fontSize: 12, color: '#B7602C', fontWeight: '700', marginTop: 4 },
  editDescription: { minHeight: 72, textAlignVertical: 'top' },
  editFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  cancelEditButton: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  saveEditFooterButton: { flex: 1, width: undefined },
  editReceiptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editReceiptThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#EFE7D7' },
  receiptActionButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#E6EEE6' },
  receiptActionText: { fontSize: 12, color: '#2A4E3A', fontWeight: '700' },
  receiptRemoveText: { fontSize: 12, color: '#B7602C', fontWeight: '700' },
  addReceiptButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#8DAA96', borderRadius: 10 },
  tagPickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 30, 25, 0.4)' },
  tagPickerSheet: { maxHeight: SCREEN_HEIGHT * 0.72, backgroundColor: '#FAF7F2', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  tagPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  tagPickerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: '#E2D7C8', backgroundColor: '#FFFFFF' },
  tagPickerChipText: { fontSize: 12, color: '#59615A', fontWeight: '600' },
  tagPickerDone: { alignItems: 'center', backgroundColor: '#2A4E3A', borderRadius: 11, paddingVertical: 11, marginTop: 6 },
  tagEditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  tagEditChipText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
