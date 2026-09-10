import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Colors, Spacing, Shadows } from '../../constants/theme';
import { RoomDetailsData } from '../../types/room';
import api from '../../services/api';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { connectSocket } from '../../services/socket';
import AddExpenseModal from './expenses/AddExpenseModal';
import { ExpenseDetailsModal } from './expenses/ExpenseDetailsModal';
import AllExpensesModal from './expenses/AllExpensesModal';
import { getTagConfig, getIconForTags } from './expenses/tagConfig';

const { width } = Dimensions.get('window');

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Date not set';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
};

const formatCurrencyWithDecimals = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
};

const formatDateTime = (isoString: string): string => {
  const d = new Date(isoString);
  const dateStr = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} · ${timeStr}`;
};

const getMemberColor = (name: string): string => {
  const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface CategoryConfig {
  icon: string;
  label: string;
  bgColor: string;
  iconColor: string;
  tagColor: string;
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  food: {
    icon: '🍽️',
    label: 'Food',
    bgColor: '#FEF3E7',
    iconColor: '#C96A25',
    tagColor: '#FDEBD0',
  },
  stay: {
    icon: '🏨',
    label: 'Stay',
    bgColor: '#E8F0E8',
    iconColor: '#648A62',
    tagColor: '#D5E8D4',
  },
  travel: {
    icon: '🚗',
    label: 'Transport',
    bgColor: '#FCE9E9',
    iconColor: '#C97935',
    tagColor: '#F8D7DA',
  },
  transport: {
    icon: '🚗',
    label: 'Transport',
    bgColor: '#FCE9E9',
    iconColor: '#C97935',
    tagColor: '#F8D7DA',
  },
  activities: {
    icon: '🎯',
    label: 'Activities',
    bgColor: '#E8F0F8',
    iconColor: '#5F745F',
    tagColor: '#D4E6F1',
  },
  shopping: {
    icon: '🛍️',
    label: 'Shopping',
    bgColor: '#F8E8F0',
    iconColor: '#E18A3A',
    tagColor: '#F5D5E8',
  },
  other: {
    icon: '💱',
    label: 'Other',
    bgColor: '#F0EDE5',
    iconColor: '#59615A',
    tagColor: '#E5DFD0',
  },
};

const getCategoryConfig = (category: string): CategoryConfig => {
  return CATEGORY_MAP[category?.toLowerCase()] || CATEGORY_MAP.other;
};

export interface ExpensePaidBy {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface ExpenseItem {
  _id: string;
  roomId: string;
  title: string;
  amount: number;
  currency?: string;
  category: string;
  paidBy: ExpensePaidBy | string;
  receiptUrl?: string;
  receiptUrls?: string[];
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  splitCount?: number;
  userShare?: number;
  commentCount?: number;
}

export interface SettlementUser {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface SettlementRow {
  from: SettlementUser;
  to: SettlementUser;
  amount: number;
}

export interface BalanceBreakdownItem {
  user: SettlementUser;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  status: 'owed' | 'owes' | 'settled';
}

export interface BalancesResponse {
  totalSpent: number;
  currentUserNet: number;
  currentUserStatus: 'owed' | 'owes' | 'settled';
  breakdown: BalanceBreakdownItem[];
  settlements: SettlementRow[];
}

export interface ExpensesResponse {
  total: number;
  totalSpent: number;
  expenses: ExpenseItem[];
}

interface ExpensesTabProps {
  data: RoomDetailsData;
  onRefresh: () => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ data, onRefresh }) => {
  const router = useRouter();
  const { room, membership, members, stats, currentUserId } = data;
  const roomId = room._id;

  const currentUserName = useMemo(() => {
    const m = members.find((x) => x.userId._id === currentUserId);
    return m?.userId.name || 'You';
  }, [members, currentUserId]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(null);
  const [balancesData, setBalancesData] = useState<BalancesResponse | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [openExpenseId, setOpenExpenseId] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [expandedSettlement, setExpandedSettlement] = useState<number | null>(null);
  const [settlingIndex, setSettlingIndex] = useState<number | null>(null);

  const memberMap: Record<string, { name: string; avatar?: string }> = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    members.forEach((m) => {
      if (m.userId) {
        map[m.userId._id] = {
          name: m.userId.name,
          avatar: m.userId.avatar,
        };
      }
    });
    return map;
  }, [members]);

  const formatHeaderDate = (): string => {
    const start = room.startDate
      ? new Date(room.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '';
    const end = room.endDate
      ? new Date(room.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    if (start && end) return `${start} – ${end}`;
    return start || end || '';
  };

  const fetchExpensesData = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      const [expensesRes, balancesRes] = await Promise.all([
        api.get(`/rooms/${roomId}/expenses`),
        api.get(`/rooms/${roomId}/expenses/balances`),
      ]);

      if (expensesRes.data?.success && expensesRes.data?.data) {
        const expData = expensesRes.data.data as ExpensesResponse;
        expData.expenses = expData.expenses.map((exp) => ({
          ...exp,
          splitCount: exp.splitCount || (exp as any).splits?.length || members?.length || 0,
        }));
        setExpensesData(expData);
      } else {
        setErrorMsg(expensesRes.data?.message || 'Could not load expenses');
      }

      if (balancesRes.data?.success && balancesRes.data?.data) {
        setBalancesData(balancesRes.data.data as BalancesResponse);
      }
    } catch (err: any) {
      console.error('Error fetching expenses data:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to load expenses.'
      );
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  const totalSpent = expensesData?.totalSpent ?? balancesData?.totalSpent ?? 0;
  const budgetAmount = (room as any).budget?.amount ?? 0;
  const budgetUsedPercent = budgetAmount > 0 ? Math.min(100, (totalSpent / budgetAmount) * 100) : 0;
  const budgetRemaining = Math.max(0, budgetAmount - totalSpent);
  const currentBalance = balancesData?.breakdown.find((item) => item.user._id === currentUserId);
  const userPaid = currentBalance?.totalPaid || 0;
  const userShare = currentBalance?.totalOwed || 0;
  const userNet = currentBalance?.netBalance || 0;
  const userImpactLabel = userNet < 0 ? 'You owe' : userNet > 0 ? "You're owed" : 'Settled';
  const userRemaining = Math.abs(userNet);

  useEffect(() => {
    let mounted = true;
    let socket: Awaited<ReturnType<typeof connectSocket>> | null = null;
    const handleSettlementUpdate = (event: { roomId: string }) => {
      if (mounted && event.roomId === roomId) fetchExpensesData();
    };
    const init = async () => {
      socket = await connectSocket();
      if (!mounted || !socket) return;
      socket.emit('join_room', { roomId });
      socket.on('expense_settlement_updated', handleSettlementUpdate);
    };
    init().catch(() => {});
    return () => {
      mounted = false;
      socket?.off('expense_settlement_updated', handleSettlementUpdate);
    };
  }, [roomId, fetchExpensesData]);

  const recentExpenses = (expensesData?.expenses || []).slice(0, 4);
  const recentSettlements = (balancesData?.settlements || []).slice(0, 4);

  const handleAddExpense = () => {
    try {
      Vibration.vibrate(20);
    } catch (e) {}
    setShowAddExpense(true);
  };

  const handleExpenseCreated = () => {
    fetchExpensesData();
    onRefresh?.();
  };

  const handleMenuPress = () => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    console.log('[ExpensesTab] Menu pressed - TODO: open expenses menu bottom sheet');
  };

  const handleBackPress = () => {
    try {
      Vibration.vibrate(10);
    } catch (e) {}
    router.back();
  };

  const handleExpensePress = (expense: ExpenseItem) => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    setOpenExpenseId(expense._id);
  };

  const handleSettlementPress = (settlement: SettlementRow) => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    console.log(
      '[ExpensesTab] Settlement pressed:',
      settlement.from?.name,
      '→',
      settlement.to?.name,
      settlement.amount
    );
  };

  const handleViewAllSettlements = () => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    setExpandedSettlement(null);
  };

  const settleDebt = async (settlement: SettlementRow, index: number) => {
    try {
      setSettlingIndex(index);
      const response = await api.put(`/rooms/${roomId}/expenses/settlements/settle`, {
        fromUserId: settlement.from._id,
        toUserId: settlement.to._id,
        amount: settlement.amount,
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Could not mark as paid');
      await fetchExpensesData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || error.message || 'Could not mark settlement as paid');
    } finally {
      setSettlingIndex(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.rooms.forestGreen} />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  if (errorMsg && !expensesData) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-triangle" size={38} color={Colors.rooms.planningOrange} />
        <Text style={styles.errorTitle}>Could not load expenses</Text>
        <Text style={styles.errorSubtitle}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchExpensesData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════ TOP HEADER (Compact, Chat-tab style) ═══════════════ */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={26} color="#243C32" />
          </TouchableOpacity>

          {/* Room Thumbnail / Logo (small like ChatTab) */}
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
              {members.length} members · {formatHeaderDate()}
            </Text>
          </View>

          {/* Right: 3-Dots Drawer */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={handleMenuPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="more-vertical" size={21} color="#243C32" />
          </TouchableOpacity>
        </View>

        {/* Body Content */}
        <View style={styles.bodyContent}>
          {/* Expenses Page Title (compact inline) */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Expenses</Text>
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryAmountBlock}>
                <Text style={styles.summaryAmountSpent}>
                  {formatCurrency(totalSpent)}
                  <Text style={styles.summarySpentLabel}> spent</Text>
                </Text>
                {budgetAmount > 0 && (
                  <Text style={styles.summaryBudgetText}>
                    of {formatCurrency(budgetAmount)} budget
                  </Text>
                )}
              </View>
              {budgetAmount > 0 && (
                <TouchableOpacity
                  style={styles.summaryMenuDot}
                  activeOpacity={0.6}
                  onPress={() => {
                    try { Vibration.vibrate(10); } catch (e) {}
                  }}
                >
                  <Feather name="more-vertical" size={18} color={Colors.rooms.mutedText} />
                </TouchableOpacity>
              )}
            </View>

            {budgetAmount > 0 && (
              <>
                <View style={styles.budgetPercentRow}>
                  <Text style={styles.budgetPercentText}>
                    {budgetUsedPercent.toFixed(1)}% used
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(2, budgetUsedPercent)}%`,
                        backgroundColor:
                          budgetUsedPercent >= 100
                            ? Colors.status.error
                            : budgetUsedPercent >= 80
                            ? Colors.rooms.burntOrange
                            : Colors.rooms.forestGreen,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.remainingText}>
                  {formatCurrency(budgetRemaining)} remaining
                </Text>
              </>
            )}

            {!budgetAmount && (
              <Text style={styles.summaryBudgetText}>Total spent</Text>
            )}
            <View style={styles.personalSummaryRow}>
              <View><Text style={styles.personalSummaryLabel}>You paid</Text><Text style={styles.personalSummaryValue}>{formatCurrency(userPaid)}</Text></View>
              <View><Text style={styles.personalSummaryLabel}>Your share</Text><Text style={styles.personalSummaryValue}>{formatCurrency(userShare)}</Text></View>
              <View><Text style={styles.personalSummaryLabel}>{userImpactLabel}</Text><Text style={styles.personalSummaryValue}>{formatCurrency(userRemaining)}</Text></View>
            </View>
          </View>

          {/* Recent Expenses Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => setShowAllExpenses(true)} activeOpacity={0.7}>
                <Text style={styles.seeAllLink}>See all ›</Text>
              </TouchableOpacity>
            </View>

            {recentExpenses.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyEmoji}>💸</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the + button below to add your first expense.
                </Text>
              </View>
            ) : (
              <View style={styles.expenseList}>
                {recentExpenses.map((expense, idx) => {
                const tags: string[] = (expense as any).tags?.length
                  ? (expense as any).tags
                  : expense.category
                    ? [expense.category.toLowerCase()]
                    : ['general'];
                const tagIcon = getIconForTags(tags);
                const firstTagCfg = getTagConfig(tags[0] || 'general');
                const payerObj = expense.paidBy;
                const payerIdFromExpense = typeof payerObj === 'object' ? payerObj._id : payerObj;
                const payerInfo =
                  typeof payerObj === 'object'
                    ? payerObj
                    : { _id: payerIdFromExpense, ...memberMap[payerIdFromExpense as string] };
                const payerName = payerInfo?.name || 'Someone';
                const hasReceipt = !!expense.receiptUrl || ((expense as any).receiptUrls?.length ?? 0) > 0;
                const receiptCount = ((expense as any).receiptUrls?.length ?? 0) + (!!expense.receiptUrl && ((expense as any).receiptUrls?.length ?? 0) === 0 ? 1 : 0);
                const hasNotes = !!(expense.notes || (expense as any).description)?.trim();

                return (
                  <TouchableOpacity
                    key={expense._id || idx}
                    style={styles.expenseCard}
                    activeOpacity={0.8}
                    onPress={() => handleExpensePress(expense)}
                  >
                    <View
                      style={[
                        styles.expenseIconCircle,
                        { backgroundColor: tagIcon.bgColor },
                      ]}
                    >
                      <Text style={styles.expenseIconText}>{tagIcon.emoji}</Text>
                    </View>

                    <View style={styles.expenseBody}>
                      <View style={styles.expenseTitleRow}>
                        <Text style={styles.expenseTitle} numberOfLines={1}>
                          {expense.title}
                        </Text>
                        <Text style={styles.expenseAmount}>
                          {formatCurrency(expense.amount)}
                        </Text>
                      </View>

                      <View style={styles.expenseMetaRow}>
                        <Text style={styles.expenseMeta}>
                          {formatDateTime(expense.createdAt)}
                        </Text>
                        {hasNotes && (
                          <View style={styles.notesDot}>
                            <Feather name="align-left" size={11} color="#78716C" />
                          </View>
                        )}
                        {hasReceipt && receiptCount > 1 ? (
                          <View style={styles.notesDot}>
                            <Feather
                              name="camera"
                              size={11}
                              color={Colors.rooms.forestGreen}
                            />
                            <Text style={styles.receiptCountBadge}>{receiptCount}</Text>
                          </View>
                        ) : hasReceipt ? (
                          <View style={styles.notesDot}>
                            <Feather
                              name="camera"
                              size={11}
                              color={Colors.rooms.forestGreen}
                            />
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.expensePayerRow}>
                        <Text style={styles.expensePayerText}>
                          Paid by{' '}
                          <Text style={styles.expensePayerName}>
                            {payerInfo?._id === currentUserId ? 'You' : payerName}
                          </Text>
                        </Text>
                        <Text style={styles.expenseSharedCount}>
                          Shared by {expense.splitCount || members?.length || 0}
                        </Text>
                      </View>

                      <View style={styles.cardFooterRow}>
                        {tags.length > 0 && (
                          <View style={styles.tagRow}>
                            {tags.slice(0, 3).map((tag, ti) => {
                              const cfg = ti === 0 ? firstTagCfg : getTagConfig(tag);
                              return (
                                <View
                                  key={ti}
                                  style={[
                                    styles.tagPill,
                                    { backgroundColor: cfg.pillBg },
                                  ]}
                                >
                                  <Text style={{ fontSize: 10.5, marginRight: 2 }}>{cfg.emoji}</Text>
                                  <Text style={[styles.tagText, { color: cfg.textColor }]}>#{tag}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        <View style={styles.commentCountRow}>
                          <Feather name="message-circle" size={13} color={Colors.rooms.mutedText} />
                          <Text style={styles.commentCountText}>{expense.commentCount || 0}</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.expenseMoreBtn}
                      activeOpacity={0.6}
                      onPress={() => {
                        try { Vibration.vibrate(10); } catch (e) {}
                        setOpenExpenseId(expense._id);
                      }}
                    >
                      <Feather
                        name="more-vertical"
                        size={16}
                        color={Colors.rooms.mutedText}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

          {/* Who Owes Whom Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Who Owes Whom</Text>
              <TouchableOpacity
                onPress={handleViewAllSettlements}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllLink}>See all ›</Text>
              </TouchableOpacity>
            </View>

            {recentSettlements.length === 0 ? (
              <View style={styles.emptyBlockSmall}>
                <Text style={styles.emptyEmojiSmall}>🤝</Text>
                <Text style={styles.emptyTitleSmall}>All settled up</Text>
                <Text style={styles.emptySubtitleSmall}>
                  No one owes anyone anything right now.
                </Text>
              </View>
            ) : (
              <View style={styles.settlementList}>
                {recentSettlements.map((settlement, idx) => {
                  const fromName = settlement.from?.name || 'User A';
                  const toName = settlement.to?.name || 'User B';
                  const fromColor = getMemberColor(fromName);
                  const toColor = getMemberColor(toName);

                  return (
                    <TouchableOpacity
                      key={`settle-${idx}`}
                      style={styles.settlementRow}
                      activeOpacity={0.8}
                      onPress={() => setExpandedSettlement(expandedSettlement === idx ? null : idx)}
                    >
                      <View style={styles.settlementUsers}>
                        <View
                          style={[
                            styles.settlementAvatar,
                            { backgroundColor: fromColor },
                          ]}
                        >
                          <Text style={styles.settlementAvatarText}>
                            {getInitials(fromName)}
                          </Text>
                        </View>
                        <Text style={styles.settlementUserName} numberOfLines={1}>
                          {fromName}
                        </Text>
                        <View style={styles.settlementArrow}>
                          <Feather
                            name="arrow-right"
                            size={14}
                            color={Colors.rooms.mutedText}
                          />
                        </View>
                        <View
                          style={[
                            styles.settlementAvatar,
                            { backgroundColor: toColor },
                          ]}
                        >
                          <Text style={styles.settlementAvatarText}>
                            {getInitials(toName)}
                          </Text>
                        </View>
                        <Text style={styles.settlementUserName} numberOfLines={1}>
                          {toName}
                        </Text>
                      </View>

                      <View style={styles.settlementRight}>
                        <Text style={styles.settlementAmount}>
                          {formatCurrencyWithDecimals(settlement.amount)}
                        </Text>
                        <Feather name={expandedSettlement === idx ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.rooms.mutedText} />
                      </View>
                      {expandedSettlement === idx && (
                        <View style={styles.settlementExpanded}>
                          <Text style={styles.settlementExplanation}>{fromName} owes {toName} {formatCurrencyWithDecimals(settlement.amount)}</Text>
                          {settlement.from?._id === currentUserId ? (
                            <TouchableOpacity style={styles.paidButton} onPress={() => settleDebt(settlement, idx)} disabled={settlingIndex === idx}>
                              <Feather name="check" size={14} color="#FFFFFF" />
                              <Text style={styles.paidButtonText}>{settlingIndex === idx ? 'Updating...' : 'Paid'}</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.bottomInset} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddExpense}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        roomId={roomId}
        currentUserId={currentUserId || ''}
        currentUserName={currentUserName}
        roomDetails={data}
        onExpenseAdded={handleExpenseCreated}
      />
      <ExpenseDetailsModal
        visible={!!openExpenseId}
        onClose={() => setOpenExpenseId(null)}
        expenseId={openExpenseId}
        data={data}
        onExpenseChanged={() => {
          fetchExpensesData();
          onRefresh?.();
        }}
        onCommentAdded={(expenseId, commentCount) => {
          setExpensesData((previous) => previous ? {
            ...previous,
            expenses: previous.expenses.map((expense) =>
              expense._id === expenseId ? { ...expense, commentCount } : expense
            ),
          } : previous);
        }}
      />
      <AllExpensesModal
        visible={showAllExpenses}
        expenses={expensesData?.expenses || []}
        onClose={() => setShowAllExpenses(false)}
        onExpensePress={(expense) => {
          setShowAllExpenses(false);
          handleExpensePress(expense);
        }}
      />
    </View>
  );
};

const CARD_PADDING = Spacing.md;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl + Spacing.six,
  },

  /* ═══ Top Header (Compact, matching ChatTab exactly) ═══ */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE5D8',
    zIndex: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  headerThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#E5D8C7',
  },
  headerThumbnailFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerThumbnailEmoji: {
    fontSize: 18,
  },
  headerTitleBlock: {
    flex: 1,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17251F',
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
    marginTop: 1,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },

  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  pageHeader: {
    marginBottom: Spacing.md,
  },
  pageSectionLabel: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.3,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginTop: 12,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13.5,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.rooms.forestGreen,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  summaryCard: {
    backgroundColor: '#F1F6F0',
    borderRadius: 16,
    padding: CARD_PADDING,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#C9DAC8',
    ...Shadows.card,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryAmountBlock: {
    flex: 1,
  },
  summaryAmountSpent: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.5,
  },
  summarySpentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  summaryBudgetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
    marginTop: 2,
  },
  personalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#C9DAC8',
  },
  personalSummaryLabel: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    fontWeight: '700',
    marginBottom: 3,
  },
  personalSummaryValue: {
    fontSize: 14,
    color: Colors.rooms.darkText,
    fontWeight: '800',
  },
  summaryMenuDot: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  budgetPercentRow: {
    marginTop: 4,
    marginBottom: 6,
  },
  budgetPercentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.rooms.greige,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  remainingText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },

  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },

  emptyBlock: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: Colors.rooms.cardCream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
  emptyBlockSmall: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.rooms.cardCream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderStyle: 'dashed',
  },
  emptyEmojiSmall: {
    fontSize: 30,
    marginBottom: 6,
  },
  emptyTitleSmall: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 2,
  },
  emptySubtitleSmall: {
    fontSize: 12.5,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },

  expenseList: {
    gap: 8,
  },
  expenseCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8DDCC',
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...Shadows.card,
  },
  expenseIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  expenseIconText: {
    fontSize: 18,
  },
  expenseBody: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  expenseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    flex: 1,
    marginRight: Spacing.sm,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.rooms.darkText,
  },
  expenseMeta: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notesDot: {
    position: 'relative',
    width: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F0E8DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCountBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: Colors.rooms.forestGreen,
    minWidth: 13,
    height: 13,
    borderRadius: 7,
    textAlign: 'center',
    overflow: 'hidden',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  expensePayerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: 6,
  },
  expensePayerText: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  expensePayerName: {
    color: Colors.rooms.darkText,
    fontWeight: '700',
  },
  expenseSharedCount: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  receiptBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.rooms.background,
    marginLeft: 4,
  },
  expenseMoreBtn: {
    padding: 4,
    marginLeft: 2,
  },
  commentCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 'auto',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
  },
  commentCountText: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    fontWeight: '700',
  },

  settlementList: {
    gap: Spacing.xs,
  },
  settlementRow: {
    backgroundColor: Colors.rooms.cardCream,
    borderRadius: 14,
    paddingHorizontal: CARD_PADDING,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settlementAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settlementUserName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginHorizontal: 6,
    maxWidth: width * 0.18,
  },
  settlementArrow: {
    marginHorizontal: 2,
    paddingHorizontal: 2,
  },
  settlementRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.rooms.darkText,
  },
  settlementExpanded: {
    width: '100%',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.rooms.sandBorder,
  },
  settlementExplanation: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    fontWeight: '600',
    marginBottom: 8,
  },
  paidButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: Colors.rooms.forestGreen,
  },
  paidButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#F0E8DB',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.rooms.mutedText,
  },

  bottomInset: {
    height: Spacing.xxl,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.rooms.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 50,
  },
});
