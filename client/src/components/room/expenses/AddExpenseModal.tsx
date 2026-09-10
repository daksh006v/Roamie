import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Keyboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import api from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { RoomDetailsData } from '../../../types/room';
import { SettlementUser } from '../ExpensesTab';
import {
  TAG_PRESETS,
  GENERAL_TAG,
  tagToCategory,
  getTagConfig,
} from './tagConfig';
import { FormInputLively } from './addExpense/FormInputs';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.92;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 20 : 12;

interface PendingReceipt {
  uri: string;
  uploading?: boolean;
  uploadError?: boolean;
}

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  roomDetails: RoomDetailsData | null;
  onExpenseAdded?: () => void;
}

interface CustomSplitEntry {
  userId: string;
  name: string;
  amount: string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  roomId,
  currentUserId,
  currentUserName,
  roomDetails,
  onExpenseAdded,
}) => {
  const membersList: SettlementUser[] = useMemo(() => {
    if (!roomDetails?.members) return [];
    return roomDetails.members.map((m) => ({
      _id: m.userId._id,
      name: m.userId.name,
      avatar: m.userId.avatar,
      email: m.userId.email,
      role: m.role,
    }));
  }, [roomDetails]);

  const [submitting, setSubmitting] = useState(false);
  const [paidByOpen, setPaidByOpen] = useState(false);
  const paidByDropdownRef = useRef<View>(null);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [customTagText, setCustomTagText] = useState('');
  const formScrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [draft, setDraft] = useState<{
    title: string;
    amount: string;
    paidByUserId: string;
    paidByName: string;
    tags: string[];
    splitEveryone: boolean;
    splitUserIds: string[];
    splitMode: 'equal' | 'custom';
    customSplits: CustomSplitEntry[];
    description: string;
    pendingReceipts: PendingReceipt[];
    comment: string;
  }>({
    title: '',
    amount: '',
    paidByUserId: currentUserId,
    paidByName: currentUserName,
    tags: [GENERAL_TAG.key],
    splitEveryone: true,
    splitUserIds: [],
    splitMode: 'equal',
    customSplits: [],
    description: '',
    pendingReceipts: [],
    comment: '',
  });

  useEffect(() => {
    if (visible) {
      setDraft({
        title: '',
        amount: '',
        paidByUserId: currentUserId,
        paidByName: currentUserName,
        tags: [GENERAL_TAG.key],
        splitEveryone: true,
        splitUserIds: [],
        splitMode: 'equal',
        customSplits: [],
        description: '',
        pendingReceipts: [],
        comment: '',
      });
      setAdditionalOpen(false);
      setTagSearch('');
      setCustomTagText('');
      setPaidByOpen(false);
    }
  }, [visible, currentUserId, currentUserName]);

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

  const effectiveSplitIds = useMemo(() => {
    if (draft.splitEveryone) return membersList.map((m) => m._id);
    return draft.splitUserIds.filter((uid) => membersList.some((m) => m._id === uid));
  }, [draft.splitEveryone, draft.splitUserIds, membersList]);

  useEffect(() => {
    if (draft.splitMode === 'custom' && effectiveSplitIds.length > 0) {
      setDraft((prev) => {
        const existing = new Map(prev.customSplits.map((s) => [s.userId, s]));
        const newSplits = effectiveSplitIds.map((uid) => {
          const m = membersList.find((x) => x._id === uid);
          const prev = existing.get(uid);
          return {
            userId: uid,
            name: m?.name || uid,
            amount: prev ? prev.amount : '',
          };
        });
        return { ...prev, customSplits: newSplits };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSplitIds.length, draft.splitMode]);

  const splitCount = effectiveSplitIds.length;
  const amountNum = parseFloat(draft.amount.replace(/,/g, '')) || 0;
  const eachShare = splitCount > 0 ? Math.round((amountNum / splitCount) * 100) / 100 : 0;

  const customTotal = useMemo(() => {
    if (draft.splitMode !== 'custom') return 0;
    return draft.customSplits.reduce((sum, s) => sum + (parseFloat(s.amount.replace(/,/g, '')) || 0), 0);
  }, [draft.customSplits, draft.splitMode]);

  const tagsValid = draft.tags.length > 0;
  const formValid = !submitting
    && draft.title.trim().length > 0
    && amountNum > 0
    && splitCount > 0
    && tagsValid
    && (draft.splitMode !== 'custom' || Math.abs(customTotal - amountNum) < 0.01);

  const formatCurrency = (n: number): string =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
  const formatCurrency2 = (n: number): string =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

  const updateDraft = (patch: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const toggleEveryone = () => {
    try { Vibration.vibrate(10); } catch (e) {}
    setDraft((prev) => {
      if (prev.splitEveryone) {
        return { ...prev, splitEveryone: false, splitUserIds: [] };
      }
      return { ...prev, splitEveryone: true, splitUserIds: [] };
    });
  };

  const toggleMember = (userId: string) => {
    try { Vibration.vibrate(8); } catch (e) {}
    setDraft((prev) => {
      if (prev.splitEveryone) {
        const allExcept = membersList.filter((m) => m._id !== userId).map((m) => m._id);
        return { ...prev, splitEveryone: false, splitUserIds: allExcept };
      }
      let nextIds = prev.splitUserIds.includes(userId)
        ? prev.splitUserIds.filter((id) => id !== userId)
        : [...prev.splitUserIds, userId];
      const all = membersList.map((m) => m._id);
      if (nextIds.length === all.length) {
        return { ...prev, splitEveryone: true, splitUserIds: [] };
      }
      return { ...prev, splitUserIds: nextIds };
    });
  };

  const togglePickerTag = (tagKey: string) => {
    try { Vibration.vibrate(6); } catch (e) {}
    setDraft((prev) => {
      let next = prev.tags.includes(tagKey)
        ? prev.tags.filter((t) => t !== tagKey)
        : [...prev.tags, tagKey];
      next = next.slice(0, 5);
      if (next.length === 0) next = [GENERAL_TAG.key];
      if (next.includes(GENERAL_TAG.key) && next.length > 1) {
        next = next.filter((t) => t !== GENERAL_TAG.key);
      }
      return { ...prev, tags: next };
    });
  };

  const addCustomTag = () => {
    let val = customTagText.trim().toLowerCase().replace(/^#/, '');
    if (!val) return;
    val = val.slice(0, 15);
    // Already in presets: treat like togglePickerTag
    if (TAG_PRESETS.some((p) => p.key === val)) {
      if (!draft.tags.includes(val)) {
        togglePickerTag(val);
      } else {
        setCustomTagText('');
      }
      return;
    }
    // Already in draft tags: skip
    if (draft.tags.includes(val)) {
      setCustomTagText('');
      return;
    }
    try { Vibration.vibrate(10); } catch (e) {}
    setDraft((prev) => {
      let next = [...prev.tags, val].slice(0, 5);
      if (next.includes(GENERAL_TAG.key) && next.length > 1) next = next.filter((t) => t !== GENERAL_TAG.key);
      return { ...prev, tags: next };
    });
    setCustomTagText('');
  };

  const removeTagFromDraft = (tagKey: string) => {
    try { Vibration.vibrate(6); } catch (e) {}
    setDraft((prev) => {
      const next = prev.tags.filter((t) => t !== tagKey);
      if (next.length === 0) return { ...prev, tags: [GENERAL_TAG.key] };
      return { ...prev, tags: next };
    });
  };

  const ensurePickerPerms = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          Alert.alert('Permission needed', 'Camera permission is required to take a photo of the receipt.');
          return false;
        }
      }
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libPerm.granted) {
        Alert.alert('Permission needed', 'Library access is required to pick a photo.');
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const pickReceipt = async (source: 'camera' | 'gallery') => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    const ok = await ensurePickerPerms(source);
    if (!ok) return;
    try {
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: source === 'gallery',
        quality: 0.78,
        selectionLimit: source === 'gallery' ? 10 : 1,
        exif: false,
      };
      let res;
      if (source === 'camera') {
        res = await ImagePicker.launchCameraAsync({ ...opts, allowsMultipleSelection: false });
      } else {
        res = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (res.canceled) return;
      const assets = 'assets' in res ? res.assets : [];
      const uris: string[] = (assets || []).map((a) => a.uri).filter(Boolean);
      if (uris.length === 0) return;
      setDraft((prev) => {
        const combined = [...prev.pendingReceipts, ...uris.map((uri) => ({ uri }))];
        return { ...prev, pendingReceipts: combined.slice(0, 10) };
      });
    } catch (e: any) {
      console.warn('receipt pick error', e);
      Alert.alert('Could not pick image', e?.message || 'Something went wrong.');
    }
  };

  const removePendingReceipt = (idx: number) => {
    try { Vibration.vibrate(6); } catch (e) {}
    setDraft((prev) => ({
      ...prev,
      pendingReceipts: prev.pendingReceipts.filter((_, i) => i !== idx),
    }));
  };

  const uploadPendingReceipts = async (): Promise<string[]> => {
    if (draft.pendingReceipts.length === 0) return [];
    const uploadedUrls: string[] = [];
    for (let i = 0; i < draft.pendingReceipts.length; i++) {
      const rec = draft.pendingReceipts[i];
      try {
        setDraft((prev) => {
          const next = [...prev.pendingReceipts];
          next[i] = { ...next[i], uploading: true, uploadError: false };
          return { ...prev, pendingReceipts: next };
        });
        const filename = rec.uri.split('/').pop() || `receipt_${Date.now()}_${i}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const form = new FormData();
        form.append('images', {
          uri: rec.uri,
          name: filename,
          type: mime,
        } as any);
        form.append('mediaType', 'receipt');
        form.append('notes', draft.title || 'expense receipt');
        const res = await api.post(`/rooms/${roomId}/media`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });
        const list = res?.data?.data?.media || [];
        if (list && list.length > 0) {
          const first = list[0];
          const url = first.url || first.secureUrl || first.uri;
          if (url) uploadedUrls.push(url);
        }
        setDraft((prev) => {
          const next = [...prev.pendingReceipts];
          next[i] = { ...next[i], uploading: false };
          return { ...prev, pendingReceipts: next };
        });
      } catch (err: any) {
        console.warn('receipt upload failed', err);
        setDraft((prev) => {
          const next = [...prev.pendingReceipts];
          next[i] = { ...next[i], uploading: false, uploadError: true };
          return { ...prev, pendingReceipts: next };
        });
      }
    }
    return uploadedUrls;
  };

  const submitExpense = async () => {
    if (!formValid) return;
    try { Vibration.vibrate(20); } catch (e) {}
    try {
      setSubmitting(true);
      const receiptUrls = await uploadPendingReceipts();
      const finalTags = draft.tags.length > 0 ? draft.tags : [GENERAL_TAG.key];
      const payload: any = {
        title: draft.title.trim(),
        amount: amountNum,
        currency: 'INR',
        paidBy: draft.paidByUserId,
        splitMembers: effectiveSplitIds,
        notes: draft.description?.trim() || '',
        tags: finalTags,
        category: tagToCategory(finalTags),
        receiptUrls,
        receiptUrl: receiptUrls[0] || '',
        comment: draft.comment?.trim() || undefined,
      };
      if (draft.splitMode === 'custom' && draft.customSplits.length > 0) {
        delete payload.splitMembers;
        payload.splits = draft.customSplits
          .filter((s) => (parseFloat(s.amount.replace(/,/g, '')) || 0) > 0)
          .map((s) => ({
            userId: s.userId,
            amount: Math.round((parseFloat(s.amount.replace(/,/g, '')) || 0) * 100) / 100,
          }));
      }
      const res = await api.post(`/rooms/${roomId}/expenses`, payload);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to add expense');
      }
      Alert.alert('Expense added ✅', `${draft.title.trim()} — ${formatCurrency(amountNum)}`, [{
        text: 'Nice',
        onPress: () => {
          onExpenseAdded?.();
          onClose();
        },
      }]);
    } catch (e: any) {
      console.warn('add expense error', e);
      Alert.alert('Could not add expense', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const memberInitials = (name: string) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');

  const renderAvatar = (name: string, avatar?: string | null, size = 28) => {
    if (avatar) {
      return (
        <ExpoImage
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ECE3D2' }}
          contentFit="cover"
        />
      );
    }
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E9E0CF',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: size * 0.38, color: '#6B6050', fontWeight: '700' }}>
          {memberInitials(name)}
        </Text>
      </View>
    );
  };

  const filteredTagsForPicker = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return TAG_PRESETS;
    return TAG_PRESETS.filter((p) =>
      p.key.includes(q) || p.label.toLowerCase().includes(q)
    );
  }, [tagSearch]);

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        onRequestClose={() => !submitting && onClose()}
        transparent
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !submitting && onClose()}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable
              style={[
                styles.sheetRoot,
                keyboardHeight > 0 && {
                  height: Math.max(360, SCREEN_HEIGHT - keyboardHeight - (Platform.OS === 'ios' ? 12 : 0)),
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
                {/* HEADER — LIVELY STYLE */}
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetGrabber} />
                  <View style={styles.sheetHeaderRow}>
                    <View style={styles.heroIconSquare}>
                      <Text style={{ fontSize: 30 }}>💰</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.sheetTitleBig}>Add Expense</Text>
                      <Text style={styles.sheetSubtitle}>Log a new trip expense</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.closeBtnBig}
                      activeOpacity={0.75}
                      disabled={submitting}
                      onPress={() => { try { Vibration.vibrate(8); } catch (e) {} onClose(); }}
                    >
                      <Feather name="x" size={22} color="#59615A" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* SCROLLABLE BODY */}
                <ScrollView
                  ref={formScrollRef}
                  style={{ flex: 1, backgroundColor: '#FAF7F2' }}
                  contentContainerStyle={styles.scrollBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Title + Amount Row — LIVELY STYLE WITH ICONS */}
                  <View style={styles.rowTwoBig}>
                    <FormInputLively
                      label="Title"
                      required
                      placeholder="e.g. Dinner"
                      value={draft.title}
                      onChangeText={(v) => updateDraft({ title: v })}
                      onFocus={() => formScrollRef.current?.scrollTo({ y: 0, animated: true })}
                      iconBg="#E7EEF7"
                      iconNode={<Feather name="file-text" size={16} color="#526B86" />}
                      hint="What was this for?"
                      maxLength={60}
                      flexWidth={undefined}
                      containerStyle={{ flex: 1, marginRight: 12 }}
                      inputStyle={{ fontSize: 15, fontWeight: '600' }}
                    />
                    <FormInputLively
                      label="Amount"
                      required
                      placeholder="0"
                      value={draft.amount}
                      onChangeText={(v) => updateDraft({ amount: v.replace(/[^0-9.]/g, '') })}
                      onFocus={() => formScrollRef.current?.scrollTo({ y: 0, animated: true })}
                      iconBg="#E6EEE6"
                      iconNode={<Text style={{ fontSize: 16, color: '#3F6B52', fontWeight: '800' }}>₹</Text>}
                      keyboardType="decimal-pad"
                      containerStyle={{ width: 142 }}
                      inputStyle={{ fontSize: 18, fontWeight: '800', textAlign: 'right' }}
                    />
                  </View>

                  {/* PAID BY — INLINE DROPDOWN (NO MODAL) */}
                  <View style={[styles.fieldBlock, { zIndex: paidByOpen ? 100 : 1 }]}>
                    <Text style={styles.fieldLabelBig}>
                      Paid by <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View ref={paidByDropdownRef}>
                      <TouchableOpacity
                        style={styles.paidByDropdownBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          try { Vibration.vibrate(8); } catch (e) {}
                          setPaidByOpen((v) => !v);
                        }}
                      >
                        <View style={[styles.inputIconPill, { backgroundColor: '#FCE9E2' }]}>
                          <Feather name="dollar-sign" size={16} color="#B7602C" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.paidByDropdownText}>
                            {draft.paidByUserId === currentUserId
                              ? `You (${draft.paidByName})`
                              : draft.paidByName}
                          </Text>
                        </View>
                        <Feather
                          name={paidByOpen ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#7B6F5B"
                        />
                      </TouchableOpacity>

                      {paidByOpen && (
                        <>
                          <Pressable
                            style={StyleSheet.absoluteFill}
                            pointerEvents="box-none"
                            onPress={() => setPaidByOpen(false)}
                          />
                          <View style={styles.paidByDropdownList}>
                            <View>
                              {membersList.map((m) => {
                                const selected = draft.paidByUserId === m._id;
                                return (
                                  <TouchableOpacity
                                    key={m._id}
                                    style={[
                                      styles.paidByDropdownItem,
                                      selected && { backgroundColor: '#E6EEE6' },
                                    ]}
                                    activeOpacity={0.75}
                                    onPress={() => {
                                      try { Vibration.vibrate(8); } catch (e) {}
                                      updateDraft({ paidByUserId: m._id, paidByName: m.name });
                                      setPaidByOpen(false);
                                    }}
                                  >
                                    {renderAvatar(m.name, m.avatar, 32)}
                                    <Text
                                      style={[
                                        styles.paidByDropdownItemText,
                                        selected && { color: '#2A4E3A', fontWeight: '800' },
                                      ]}
                                    >
                                      {m._id === currentUserId ? `You (${m.name})` : m.name}
                                    </Text>
                                    {selected && (
                                      <View style={styles.paidByCheckCircle}>
                                        <Feather name="check" size={12} color="#FFFFFF" />
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  {/* TAGS (compact) */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabelBig}>
                        Tags <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <Text style={styles.fieldHint}>{draft.tags.length}/5</Text>
                    </View>
                    <View style={styles.tagPillsRow}>
                      {draft.tags.map((t) => {
                        const cfg = getTagConfig(t);
                        return (
                          <TouchableOpacity
                            key={t}
                            activeOpacity={0.8}
                            onPress={() => removeTagFromDraft(t)}
                            style={[styles.tagChip, { backgroundColor: cfg.pillBg }]}
                          >
                            <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
                            <Text style={[styles.tagChipText, { color: cfg.textColor }]}>#{t}</Text>
                            <Feather name="x" size={12} color={cfg.textColor} style={{ marginLeft: 2, opacity: 0.65 }} />
                          </TouchableOpacity>
                        );
                      })}
                      {draft.tags.length < 5 && (
                        <TouchableOpacity
                          style={styles.addTagChip}
                          activeOpacity={0.75}
                          onPress={() => {
                            try { Vibration.vibrate(10); } catch (e) {}
                            setTagSearch('');
                            setTagPickerVisible(true);
                          }}
                        >
                          <Feather name="plus" size={13} color="#3F6B52" />
                          <Text style={styles.addTagChipText}>Add tag</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* SPLIT WITH */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabelBig}>
                        Split with <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <Text style={styles.fieldHint}>{splitCount} selected</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.everyonePillBig,
                        draft.splitEveryone && styles.everyonePillBigSelected,
                      ]}
                      activeOpacity={0.78}
                      onPress={toggleEveryone}
                    >
                      <View style={[
                        styles.everyoneCheckBig,
                        draft.splitEveryone && { backgroundColor: '#3F6B52', borderColor: '#3F6B52' },
                      ]}>
                        {draft.splitEveryone ? (
                          <Feather name="check" size={16} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.everyoneTitleBig, draft.splitEveryone && { color: '#2A4E3A' }]}>
                          Everyone
                        </Text>
                        <Text style={[styles.everyoneSub, draft.splitEveryone && { color: '#578068' }]}>
                          Split the bill evenly between all {membersList.length} people
                        </Text>
                      </View>
                      <View style={[styles.everyoneCountBadgeBig, draft.splitEveryone && { backgroundColor: '#2A4E3A' }]}>
                        <Text style={[styles.everyoneCountTextBig, draft.splitEveryone && { color: '#FFFFFF' }]}>
                          {membersList.length}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.splitChipsWrap}>
                      {membersList.map((m) => {
                        const isSelected = draft.splitEveryone
                          ? true
                          : draft.splitUserIds.includes(m._id);
                        const isMuted = draft.splitEveryone;
                        return (
                          <TouchableOpacity
                            key={m._id}
                            activeOpacity={0.8}
                            onPress={() => toggleMember(m._id)}
                            style={[
                              styles.splitChip,
                              isSelected && !isMuted && styles.splitChipSelected,
                              isMuted && styles.splitChipMuted,
                            ]}
                          >
                            {renderAvatar(m.name, m.avatar, 22)}
                            <Text
                              style={[
                                styles.splitChipText,
                                isSelected && !isMuted && { color: '#2A4E3A' },
                                isMuted && { color: '#6B6050', opacity: 0.55 },
                              ]}
                              numberOfLines={1}
                            >
                              {m._id === currentUserId ? 'You' : m.name}
                            </Text>
                            {!isMuted && isSelected && (
                              <Feather name="check" size={11} color="#2A4E3A" style={{ marginLeft: 2 }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* SPLIT TYPE — LIVELY, BIG ICON VERSION */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabelBig}>
                      How should it be split? <Text style={styles.requiredStar}>*</Text>
                    </Text>

                    {/* Segmented pill container with ICONS */}
                    <View style={styles.splitModeBigSeg}>
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => { try { Vibration.vibrate(8); } catch (e) {} updateDraft({ splitMode: 'equal' }); }}
                        style={[
                          styles.segBtnBig,
                          draft.splitMode === 'equal' && styles.segBtnBigActive,
                        ]}
                      >
                          <Feather name="users" size={17} color={draft.splitMode === 'equal' ? '#FFFFFF' : '#3F6B52'} style={{ marginRight: 8 }} />
                        <Text
                          style={[
                            styles.segBtnBigText,
                            draft.splitMode === 'equal' && { color: '#FFFFFF' },
                          ]}
                        >
                          Equally
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => { try { Vibration.vibrate(8); } catch (e) {} updateDraft({ splitMode: 'custom' }); }}
                        style={[
                          styles.segBtnBig,
                          draft.splitMode === 'custom' && styles.segBtnBigActiveCustom,
                        ]}
                      >
                        <Feather name="sliders" size={17} color={draft.splitMode === 'custom' ? '#FFFFFF' : '#B7602C'} style={{ marginRight: 8 }} />
                        <Text
                          style={[
                            styles.segBtnBigText,
                            draft.splitMode === 'custom' && { color: '#FFFFFF' },
                          ]}
                        >
                          Custom
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {draft.splitMode === 'equal' && amountNum > 0 && splitCount > 0 && (
                      <View style={styles.equalSummary}>
                        <Text style={styles.equalFormula}>
                          {formatCurrency(amountNum)} ÷ {splitCount} people
                        </Text>
                        <Text style={styles.equalShare}>{formatCurrency(eachShare)} each</Text>
                      </View>
                    )}

                    {draft.splitMode === 'custom' && (
                      <View style={styles.customSplitCard}>
                        {draft.customSplits.map((s, idx) => {
                          const assigned = parseFloat(s.amount.replace(/,/g, '')) || 0;
                          const avatarColor = ['#F5C78B', '#E18A3A', '#C97935', '#8AB58F', '#648A62', '#5F745F'];
                          const colorIdx = Math.abs(
                            s.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                          ) % avatarColor.length;
                          return (
                            <View
                              key={s.userId}
                              style={[
                                styles.customSplitRowBig,
                                idx === draft.customSplits.length - 1 && { borderBottomWidth: 0 },
                              ]}
                            >
                              <View style={[
                                styles.customAvatarBig,
                                { backgroundColor: avatarColor[colorIdx] },
                              ]}>
                                <Text style={styles.customAvatarInitialBig}>{memberInitials(s.name)}</Text>
                              </View>
                              <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.customRowNameBig}>
                                  {s.userId === currentUserId ? 'You' : s.name}
                                </Text>
                              </View>
                              <View style={styles.customInputBoxBig}>
                                <Text style={styles.customInputRupee}>₹</Text>
                                <TextInput
                                  style={styles.customInputLively}
                                  placeholder="0"
                                  placeholderTextColor="#C9BFA9"
                                  keyboardType="decimal-pad"
                                  value={s.amount}
                                  onChangeText={(v) => {
                                    const clean = v.replace(/[^0-9.]/g, '');
                                    setDraft((prev) => {
                                      const next = [...prev.customSplits];
                                      next[idx] = { ...next[idx], amount: clean };
                                      return { ...prev, customSplits: next };
                                    });
                                  }}
                                />
                              </View>
                            </View>
                          );
                        })}

                        {/* Bottom total row inside card */}
                        <View style={styles.customSplitFooter}>
                          <Text style={styles.customAssignedText}>
                            {formatCurrency2(customTotal)} assigned
                          </Text>
                          {Math.abs(customTotal - amountNum) < 0.01 && amountNum > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Feather name="check" size={16} color="#3F6B52" style={{ marginRight: 5 }} />
                              <Text style={styles.customMatchText}>Matches total</Text>
                            </View>
                          ) : amountNum > 0 ? (
                            <Text style={styles.customRemainingText}>
                              {formatCurrency2(Math.max(0, amountNum - customTotal))} remaining
                            </Text>
                          ) : (
                            <Text style={{ color: '#A89C86', fontSize: 13, fontWeight: '700' }}>
                              Enter amount first
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* ADDITIONAL DETAILS ACCORDION */}
                  <View style={styles.additionalSection}>
                    <TouchableOpacity
                      style={styles.additionalHeader}
                      activeOpacity={0.8}
                      onPress={() => {
                        try { Vibration.vibrate(8); } catch (e) {}
                        setAdditionalOpen((o) => !o);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="more-horizontal" size={16} color="#7B6F5B" />
                        <Text style={styles.additionalTitle}>Additional details</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {(draft.description?.trim() || draft.pendingReceipts.length > 0 || draft.comment?.trim()) && (
                          <View style={styles.additionalDot} />
                        )}
                        <Feather
                          name={additionalOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#7B6F5B"
                        />
                      </View>
                    </TouchableOpacity>

                    {additionalOpen && (
                      <View style={styles.additionalBody}>
                        {/* Description */}
                        <View style={styles.additionalField}>
                          <Text style={styles.fieldLabelAlt}>Description</Text>
                          <TextInput
                            style={styles.descInput}
                            placeholder="Optional: What was this for?"
                            placeholderTextColor="#A89C86"
                            value={draft.description}
                            onChangeText={(v) => updateDraft({ description: v })}
                            multiline
                            textAlignVertical="top"
                            maxLength={300}
                          />
                        </View>

                        {/* Receipt (multi) */}
                        <View style={styles.additionalField}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.fieldLabelAlt}>Receipts</Text>
                            {draft.pendingReceipts.length > 0 && (
                              <Text style={styles.fieldHintAlt}>{draft.pendingReceipts.length}/10 photos</Text>
                            )}
                          </View>

                          <View style={styles.receiptBtnRow}>
                            <TouchableOpacity
                              style={styles.receiptBtnPrimary}
                              activeOpacity={0.78}
                              onPress={() => pickReceipt('camera')}
                            >
                              <Feather name="camera" size={14} color="#FFFFFF" />
                              <Text style={styles.receiptBtnPrimaryText}>Take Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.receiptBtnSecondary}
                              activeOpacity={0.78}
                              onPress={() => pickReceipt('gallery')}
                            >
                              <Feather name="image" size={14} color="#3F6B52" />
                              <Text style={styles.receiptBtnSecondaryText}>Gallery</Text>
                            </TouchableOpacity>
                          </View>

                          {draft.pendingReceipts.length > 0 && (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{ gap: 10, paddingTop: 12, paddingRight: 4 }}
                            >
                              {draft.pendingReceipts.map((r, i) => (
                                <View key={i} style={styles.receiptPreviewTile}>
                                  <ExpoImage
                                    source={{ uri: r.uri }}
                                    style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                    contentFit="cover"
                                  />
                                  {r.uploading && (
                                    <View style={styles.uploadOverlay}>
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                    </View>
                                  )}
                                  {r.uploadError && (
                                    <View style={[styles.uploadOverlay, { backgroundColor: 'rgba(180,70,60,0.78)' }]}>
                                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Failed</Text>
                                    </View>
                                  )}
                                  <TouchableOpacity
                                    style={styles.removeReceiptBtn}
                                    activeOpacity={0.8}
                                    onPress={() => removePendingReceipt(i)}
                                  >
                                    <Feather name="x" size={11} color="#FFFFFF" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </ScrollView>
                          )}
                        </View>

                        {/* Comment */}
                        <View style={styles.additionalField}>
                          <Text style={styles.fieldLabelAlt}>Comment</Text>
                          <TextInput
                            style={[styles.descInput, { minHeight: 56 }]}
                            placeholder="Optional: Add a comment for the group…"
                            placeholderTextColor="#A89C86"
                            value={draft.comment}
                            onChangeText={(v) => updateDraft({ comment: v })}
                            multiline
                            textAlignVertical="top"
                            maxLength={240}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={{ height: 110 }} />
                </ScrollView>

                {/* STICKY CTA */}
                <View style={styles.ctaFooter}>
                  <TouchableOpacity
                    activeOpacity={formValid ? 0.82 : 1}
                    onPress={formValid ? submitExpense : undefined}
                    style={[styles.ctaBtn, !formValid && styles.ctaBtnDisabled]}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Add Expense</Text>
                        <Feather name="arrow-right" size={17} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* =========================================================
          TAG PICKER MODAL  (with DONE button)
         ========================================================= */}
      <Modal
        visible={tagPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTagPickerVisible(false)}
      >
        <Pressable
          style={styles.dimBackdrop}
          onPress={() => setTagPickerVisible(false)}
        >
          <Pressable
            style={[styles.innerSheet, { maxHeight: SCREEN_HEIGHT * 0.85 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.innerSheetGrabber} />
            <View style={styles.pickerHeaderRow}>
              <Text style={styles.innerSheetTitle}>Choose tags</Text>
              <TouchableOpacity
                style={styles.closeBtnSm}
                activeOpacity={0.75}
                onPress={() => setTagPickerVisible(false)}
              >
                <Feather name="x" size={16} color="#59615A" />
              </TouchableOpacity>
            </View>

            <View style={styles.tagSearchBox}>
              <Feather name="search" size={14} color="#7B6F5B" style={{ marginRight: 6 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#393D39' }}
                placeholder="Search tags…"
                placeholderTextColor="#A89C86"
                value={tagSearch}
                onChangeText={setTagSearch}
                autoCorrect={false}
              />
            </View>

            <ScrollView style={{ marginTop: 14, maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={styles.tagGrid}>
                {filteredTagsForPicker.map((p) => {
                  const selected = draft.tags.includes(p.key);
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.gridTag,
                        selected && {
                          backgroundColor: p.bgColor,
                          borderColor: p.textColor,
                          borderWidth: 1.5,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => togglePickerTag(p.key)}
                    >
                      <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
                      <Text
                        style={[
                          styles.gridTagText,
                          selected && { color: p.textColor, fontWeight: '800' },
                        ]}
                      >
                        {p.label}
                      </Text>
                      {selected && (
                        <Feather name="check" size={11} color={p.textColor} style={{ marginLeft: 2 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                {filteredTagsForPicker.length === 0 && (
                  <Text style={{ padding: 18, color: '#7B6F5B', fontSize: 13 }}>
                    No matches. Create a custom tag below.
                  </Text>
                )}
              </View>
            </ScrollView>

            {draft.tags.length < 5 && (
              <View style={styles.customTagRow}>
                <View style={styles.customTagInputBox}>
                  <Text style={{ fontSize: 14, color: '#7B6F5B', marginRight: 4 }}>#</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: '#393D39' }}
                    placeholder="Create custom tag"
                    placeholderTextColor="#A89C86"
                    value={customTagText}
                    onChangeText={setCustomTagText}
                    autoCorrect={false}
                    onSubmitEditing={addCustomTag}
                  />
                </View>
                <TouchableOpacity
                  style={styles.createTagBtn}
                  activeOpacity={0.78}
                  onPress={addCustomTag}
                >
                  <Feather name="plus" size={13} color="#FFFFFF" />
                  <Text style={styles.createTagBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* DONE BUTTON — sticky footer of tag picker */}
            <View style={styles.tagPickerDoneRow}>
              <TouchableOpacity
                style={styles.tagPickerDoneBtn}
                activeOpacity={0.8}
                onPress={() => {
                  try { Vibration.vibrate(12); } catch (e) {}
                  setTagPickerVisible(false);
                }}
              >
                <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.tagPickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

/* ═══════════════════════ STYLES ═══════════════════════ */
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  sheetRoot: {
    backgroundColor: '#FAF7F2',
    width: '100%',
    height: SHEET_HEIGHT,
    maxHeight: SCREEN_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 24 },
    }),
  },
  sheetHeader: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123,111,91,0.08)',
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 46,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#D7CCB7',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E9F0E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleBig: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C211C',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#7B6F5B',
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtnBig: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFE7D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
  },
  rowTwoBig: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  fieldLabelBig: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C211C',
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  fieldLabelAlt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#595043',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12.5,
    color: '#7B6F5B',
    fontWeight: '600',
  },
  fieldHintAlt: {
    fontSize: 11.5,
    color: '#7B6F5B',
    fontWeight: '600',
  },
  requiredStar: {
    color: '#C97935',
    fontWeight: '900',
  },
  inputHelper: {
    marginTop: 6,
    fontSize: 12,
    color: '#A89C86',
    fontWeight: '500',
  },
  inputLivelyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8DCC4',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.06,
  },
  inputIconPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  inputLivelyText: {
    flex: 1,
    fontSize: 15,
    color: '#1C211C',
    fontWeight: '700',
    paddingRight: 4,
  },
  amountInputLively: {
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '800',
    color: '#2A4E3A',
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  /* ========= PAID BY INLINE DROPDOWN ========= */
  paidByDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8DCC4',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.06,
  },
  paidByDropdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C211C',
  },
  paidByDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3D7C0',
    paddingVertical: 8,
    zIndex: 999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 14 },
    }),
  },
  paidByDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 14,
  },
  paidByDropdownItemText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#393D39',
  },
  paidByCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3F6B52',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* TAGS COMPACT */
  tagPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  addTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(63,107,82,0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(63,107,82,0.05)',
  },
  addTagChipText: {
    fontSize: 13,
    color: '#3F6B52',
    fontWeight: '800',
  },

  /* SPLIT WITH */
  everyonePillBig: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E3D7C0',
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.06,
  },
  everyonePillBigSelected: {
    backgroundColor: '#E6EEE6',
    borderColor: '#6FA07D',
  },
  everyoneCheckBig: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#B8AB90',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  everyoneTitleBig: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C211C',
  },
  everyoneSub: {
    marginTop: 3,
    fontSize: 11.5,
    color: '#7B6F5B',
    fontWeight: '500',
  },
  everyoneCountBadgeBig: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1E9D7',
    minWidth: 38,
    alignItems: 'center',
  },
  everyoneCountTextBig: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7B6F5B',
  },
  splitChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 14,
  },
  splitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3D7C0',
    maxWidth: 160,
  },
  splitChipSelected: {
    backgroundColor: '#E6EEE6',
    borderColor: '#6FA07D',
  },
  splitChipMuted: {
    opacity: 0.55,
  },
  splitChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#393D39',
  },

  /* SPLIT MODE — LIVELY BIG ICON VERSION */
  splitModeBigSeg: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: '#E8DCC4',
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.06,
  },
  segBtnBig: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  segBtnBigActive: {
    backgroundColor: '#2A4E3A',
    ...Platform.select({
      ios: { shadowColor: '#2A4E3A', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  segBtnBigActiveCustom: {
    backgroundColor: '#3F6B52',
    ...Platform.select({
      ios: { shadowColor: '#3F6B52', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  segBtnBigText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7B6F5B',
  },
  equalSummary: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8DCC4',
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.05,
  },
  equalFormula: {
    fontSize: 13.5,
    color: '#7B6F5B',
    fontWeight: '600',
  },
  equalShare: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: '#2A4E3A',
  },

  /* CUSTOM SPLIT — BIG CARD STYLE */
  customSplitCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderWidth: 1.5,
    borderColor: '#E8DCC4',
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.06,
  },
  customSplitRowBig: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E9D7',
  },
  customAvatarBig: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAvatarInitialBig: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  customRowNameBig: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C211C',
  },
  customInputBoxBig: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 108,
    borderWidth: 1,
    borderColor: '#EEE3CC',
  },
  customInputRupee: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7B6F5B',
    marginRight: 6,
  },
  customInputLively: {
    minWidth: 52,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '700',
    color: '#2A4E3A',
  },
  customSplitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1E9D7',
  },
  customAssignedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#595043',
  },
  customMatchText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#3F6B52',
  },
  customRemainingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C97935',
  },

  /* ADDITIONAL DETAILS ACCORDION */
  additionalSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(123,111,91,0.12)',
  },
  additionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  additionalTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#595043',
  },
  additionalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C97935',
    marginRight: 10,
  },
  additionalBody: {
    paddingBottom: 20,
    gap: 20,
  },
  additionalField: {
    marginTop: 4,
  },
  descInput: {
    minHeight: 78,
    borderWidth: 1.5,
    borderColor: '#E3D7C0',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2C322C',
  },

  /* RECEIPTS */
  receiptBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  receiptBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#3F6B52',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 0,
  },
  receiptBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  receiptBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6C7AA',
    minWidth: 0,
  },
  receiptBtnSecondaryText: {
    color: '#3F6B52',
    fontSize: 13,
    fontWeight: '800',
  },
  receiptPreviewTile: {
    width: 108,
    height: 108,
    borderRadius: 14,
    backgroundColor: '#EFE7D7',
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.card,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(42,78,58,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* STICKY CTA */
  ctaFooter: {
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: SAFE_BOTTOM + 12,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(123,111,91,0.08)',
  },
  ctaBtn: {
    backgroundColor: '#3F6B52',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    ...Platform.select({
      ios: { shadowColor: '#3F6B52', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  ctaBtnDisabled: {
    backgroundColor: '#BFC5B8',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* INNER PICKER MODAL */
  dimBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  innerSheet: {
    width: '100%',
    backgroundColor: '#FBF8F0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: SAFE_BOTTOM + 16,
  },
  innerSheetGrabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#D7CCB7',
    marginBottom: 14,
  },
  innerSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C211C',
    marginBottom: 4,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  closeBtnSm: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFE7D7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* TAG PICKER */
  tagSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E3D7C0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    paddingBottom: 10,
  },
  gridTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E3D7C0',
  },
  gridTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#393D39',
    textTransform: 'capitalize',
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(123,111,91,0.08)',
  },
  customTagInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E3D7C0',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3F6B52',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
  },
  createTagBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* TAG PICKER DONE BUTTON */
  tagPickerDoneRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(123,111,91,0.08)',
  },
  tagPickerDoneBtn: {
    backgroundColor: '#2A4E3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#2A4E3A', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  tagPickerDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default AddExpenseModal;
