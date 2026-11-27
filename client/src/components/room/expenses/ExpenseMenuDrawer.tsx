import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';
import type {
  BalanceBreakdownItem,
  ExpenseItem,
  SettlementRow,
  SettledHistoryRow,
} from '../ExpensesTab';

export type ExpenseDrawerView = 'menu' | 'my' | 'all' | 'everyone' | 'receipts';

interface ExpenseMenuDrawerProps {
  visible: boolean;
  view?: ExpenseDrawerView;
  expenses: ExpenseItem[];
  breakdown: BalanceBreakdownItem[];
  settlements: SettlementRow[];
  settledHistory?: SettledHistoryRow[];
  currentUserId?: string;
  userShare?: number;
  userPaid?: number;
  onClose: () => void;
  onExpensePress: (expense: ExpenseItem) => void;
  onSettle: (settlement: SettlementRow) => void;
  onConfirm?: (settlementId: string) => void;
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const menuItems: {
  key: ExpenseDrawerView;
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  {
    key: 'my',
    label: 'My Spending',
    subtitle: 'How much & where you spent',
    icon: 'user',
  },
  {
    key: 'all',
    label: 'Expense History',
    subtitle: 'All expenses in this trip',
    icon: 'list',
  },
  {
    key: 'everyone',
    label: 'Cost Management',
    subtitle: 'Debts, descriptions & confirmations',
    icon: 'users',
  },
  {
    key: 'receipts',
    label: 'Receipts',
    subtitle: 'Uploaded bills & receipt photos',
    icon: 'file-text',
  },
];

export const ExpenseMenuDrawer: React.FC<ExpenseMenuDrawerProps> = ({
  visible,
  view = 'menu',
  expenses,
  breakdown,
  settlements,
  settledHistory = [],
  currentUserId,
  userShare = 0,
  userPaid = 0,
  onClose,
  onExpensePress,
  onSettle,
  onConfirm,
}) => {
  const [activeView, setActiveView] = useState<ExpenseDrawerView>(view);
  const [query, setQuery] = useState('');
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setActiveView(view);
      setQuery('');
      setExpandedPerson(null);
    }
  }, [visible, view]);

  const filteredExpenses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? expenses.filter((expense) => expense.title.toLowerCase().includes(normalized))
      : expenses;
  }, [expenses, query]);

  const myRelevantExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const payerId = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy;
        return payerId === currentUserId || (expense.userShare ?? 0) > 0;
      }),
    [expenses, currentUserId]
  );

  const myCategoryTotals = useMemo(
    () =>
      myRelevantExpenses.reduce<Record<string, number>>((totals, expense) => {
        const category = expense.category || 'other';
        const shareAmount = expense.userShare ?? 0;
        if (shareAmount > 0) {
          totals[category] = Math.round(((totals[category] || 0) + shareAmount) * 100) / 100;
        }
        return totals;
      }, {}),
    [myRelevantExpenses]
  );

  const receiptExpenses = useMemo(
    () => expenses.filter((expense) => expense.receiptUrl || expense.receiptUrls?.length),
    [expenses]
  );

  const goBack = () => (activeView === 'menu' ? onClose() : setActiveView('menu'));
  const title =
    activeView === 'menu'
      ? 'Expenses'
      : menuItems.find((item) => item.key === activeView)?.label || 'Expenses';

  const renderExpenseRows = (items: ExpenseItem[]) => (
    <View style={styles.list}>
      {items.map((expense) => {
        const payer = typeof expense.paidBy === 'object' ? expense.paidBy.name : 'Someone';
        return (
          <TouchableOpacity
            key={expense._id}
            style={styles.expenseRow}
            onPress={() => onExpensePress(expense)}
          >
            <View style={styles.rowIcon}>
              <Feather name="file-text" size={16} color={Colors.rooms.forestGreen} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {expense.title}
              </Text>
              <Text style={styles.rowMeta}>
                Paid by {payer} · {expense.splitCount || 0} sharing
              </Text>
            </View>
            <Text style={styles.rowAmount}>{formatCurrency(expense.amount)}</Text>
          </TouchableOpacity>
        );
      })}
      {!items.length && <Text style={styles.empty}>Nothing here yet.</Text>}
    </View>
  );

  const renderView = () => {
    if (activeView === 'menu') {
      return (
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={() => setActiveView(item.key)}
            >
              <View style={styles.menuIcon}>
                <Feather name={item.icon} size={17} color={Colors.rooms.forestGreen} />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={17} color={Colors.rooms.mutedText} />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeView === 'my') {
      const categoryEntries = Object.entries(myCategoryTotals).sort(([, a], [, b]) => b - a);
      return (
        <>
          <View style={styles.metricCard}>
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Your expense</Text>
                <Text style={styles.metricValue}>{formatCurrency(userShare)}</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>You paid</Text>
                <Text style={styles.metricValue}>{formatCurrency(userPaid)}</Text>
              </View>
            </View>
          </View>

          {categoryEntries.length > 0 && (
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>Where you spent</Text>
              <View style={styles.list}>
                {categoryEntries.map(([category, amount]) => (
                  <View key={category} style={styles.simpleRow}>
                    <Text style={styles.rowTitle}>
                      {category[0].toUpperCase() + category.slice(1)}
                    </Text>
                    <Text style={styles.rowAmount}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.subSectionTitle}>Your expenses</Text>
          {renderExpenseRows(myRelevantExpenses)}
        </>
      );
    }

    if (activeView === 'all') {
      return (
        <>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={Colors.rooms.mutedText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search expenses"
              placeholderTextColor="#A89E91"
              style={styles.searchInput}
            />
          </View>
          {renderExpenseRows(filteredExpenses)}
        </>
      );
    }

    if (activeView === 'everyone') {
      return (
        <View style={styles.list}>
          {breakdown.map((person) => {
            const personId = person.user._id;
            const expanded = expandedPerson === personId;

            const pendingOwes = settlements.filter((s) => s.from._id === personId);
            const paidOwes = settledHistory.filter((s) => s.from._id === personId);
            const pendingReceives = settlements.filter((s) => s.to._id === personId);
            const paidReceives = settledHistory.filter((s) => s.to._id === personId);

            return (
              <View key={personId} style={styles.personCard}>
                <TouchableOpacity
                  style={styles.personHeader}
                  onPress={() => setExpandedPerson(expanded ? null : personId)}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowIcon}>
                    <Feather name="user" size={16} color={Colors.rooms.forestGreen} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>
                      {personId === currentUserId ? 'You' : person.user.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      Paid {formatCurrency(person.totalPaid)} · Share {formatCurrency(person.totalOwed)}
                    </Text>
                  </View>
                  <Text style={[styles.netValue, person.netBalance < 0 && styles.negative]}>
                    {person.netBalance < -0.01
                      ? `Owes ${formatCurrency(Math.abs(person.netBalance))}`
                      : person.netBalance > 0.01
                      ? `Gets ${formatCurrency(person.netBalance)}`
                      : 'Settled'}
                  </Text>
                  <Feather
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.rooms.mutedText}
                  />
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.personDetails}>
                    {/* 1. Owes */}
                    <Text style={styles.groupHeading}>Owes</Text>
                    {pendingOwes.length === 0 && paidOwes.length === 0 ? (
                      <Text style={styles.emptySub}>Does not owe anyone.</Text>
                    ) : (
                      <>
                        {pendingOwes.map((s) => {
                          const isAwaitingConfirm = s.status === 'pending_confirmation' && !!s.pendingSettlementId;
                          const detailText = (s.details || [])
                            .map((d) => `${d.title} (${formatCurrency(d.amount)})`)
                            .join(', ');

                          return (
                            <View key={`po-${s.from._id}-${s.to._id}`} style={styles.debtBlock}>
                              <View style={styles.debtRow}>
                                <Text style={styles.debtLabel} numberOfLines={1}>
                                  To {s.to._id === currentUserId ? 'You' : s.to.name}
                                </Text>
                                <Text style={styles.rowAmount}>{formatCurrency(s.amount)}</Text>
                                {isAwaitingConfirm ? (
                                  <View style={styles.awaitingPill}>
                                    <Text style={styles.awaitingPillText}>Awaiting Confirmation</Text>
                                  </View>
                                ) : (
                                  <View style={styles.pendingPill}>
                                    <Text style={styles.pendingPillText}>Pending</Text>
                                  </View>
                                )}
                              </View>
                              {detailText ? (
                                <Text style={styles.debtDesc} numberOfLines={2}>
                                  For: {detailText}
                                </Text>
                              ) : null}
                              <View style={styles.debtActionsRow}>
                                {!isAwaitingConfirm && s.from._id === currentUserId && (
                                  <TouchableOpacity
                                    style={styles.markPaidBtn}
                                    onPress={() => onSettle(s)}
                                  >
                                    <Text style={styles.markPaidText}>Mark Paid</Text>
                                  </TouchableOpacity>
                                )}
                                {isAwaitingConfirm && s.to._id === currentUserId && s.pendingSettlementId && onConfirm && (
                                  <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={() => onConfirm(s.pendingSettlementId!)}
                                  >
                                    <Text style={styles.markPaidText}>Confirm Received</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })}
                        {paidOwes.map((s) => (
                          <View key={`do-${s._id}`} style={styles.debtRow}>
                            <Text style={styles.debtLabel} numberOfLines={1}>
                              To {s.to._id === currentUserId ? 'You' : s.to.name}
                            </Text>
                            <Text style={styles.rowAmount}>{formatCurrency(s.amount)}</Text>
                            <View style={styles.paidPill}>
                              <Text style={styles.paidPillText}>Paid</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                    {/* 2. Gets back from */}
                    <Text style={[styles.groupHeading, { marginTop: 10 }]}>Gets back from</Text>
                    {pendingReceives.length === 0 && paidReceives.length === 0 ? (
                      <Text style={styles.emptySub}>No incoming payments.</Text>
                    ) : (
                      <>
                        {pendingReceives.map((s) => {
                          const isAwaitingConfirm = s.status === 'pending_confirmation' && !!s.pendingSettlementId;
                          const detailText = (s.details || [])
                            .map((d) => `${d.title} (${formatCurrency(d.amount)})`)
                            .join(', ');

                          return (
                            <View key={`pr-${s.from._id}-${s.to._id}`} style={styles.debtBlock}>
                              <View style={styles.debtRow}>
                                <Text style={styles.debtLabel} numberOfLines={1}>
                                  From {s.from._id === currentUserId ? 'You' : s.from.name}
                                </Text>
                                <Text style={styles.rowAmount}>{formatCurrency(s.amount)}</Text>
                                {isAwaitingConfirm ? (
                                  <View style={styles.awaitingPill}>
                                    <Text style={styles.awaitingPillText}>Awaiting Confirmation</Text>
                                  </View>
                                ) : (
                                  <View style={styles.pendingPill}>
                                    <Text style={styles.pendingPillText}>Pending</Text>
                                  </View>
                                )}
                              </View>
                              {detailText ? (
                                <Text style={styles.debtDesc} numberOfLines={2}>
                                  For: {detailText}
                                </Text>
                              ) : null}
                              <View style={styles.debtActionsRow}>
                                {isAwaitingConfirm && s.to._id === currentUserId && s.pendingSettlementId && onConfirm && (
                                  <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={() => onConfirm(s.pendingSettlementId!)}
                                  >
                                    <Text style={styles.markPaidText}>Confirm Received</Text>
                                  </TouchableOpacity>
                                )}
                                {!isAwaitingConfirm && s.to._id === currentUserId && (
                                  <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={() => onSettle(s)}
                                  >
                                    <Text style={styles.markPaidText}>Confirm Received</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })}
                        {paidReceives.map((s) => (
                          <View key={`dr-${s._id}`} style={styles.debtRow}>
                            <Text style={styles.debtLabel} numberOfLines={1}>
                              From {s.from._id === currentUserId ? 'You' : s.from.name}
                            </Text>
                            <Text style={styles.rowAmount}>{formatCurrency(s.amount)}</Text>
                            <View style={styles.paidPill}>
                              <Text style={styles.paidPillText}>Paid</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    return receiptExpenses.length > 0 ? (
      <View style={styles.receiptGrid}>
        {receiptExpenses.map((expense) => {
          const uri = getOptimizedImageUrl(expense.receiptUrls?.[0] || expense.receiptUrl, {
            width: 350,
            height: 350,
            crop: 'fill',
          });
          return (
            <TouchableOpacity key={expense._id} onPress={() => onExpensePress(expense)}>
              <ExpoImage
                source={{ uri }}
                style={styles.receiptTile}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    ) : (
      <Text style={styles.empty}>No receipts uploaded yet.</Text>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Trip Money</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={goBack}>
              <Feather
                name={activeView === 'menu' ? 'x' : 'arrow-left'}
                size={19}
                color={Colors.rooms.darkText}
              />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {renderView()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,37,31,0.48)' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#FBF8F1',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    color: Colors.rooms.planningOrange,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: { fontSize: 23, color: Colors.rooms.darkText, fontWeight: '800', marginTop: 3 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1E8',
  },
  content: { paddingBottom: 24 },
  menuList: { gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DDCC',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1E8',
    marginRight: 12,
  },
  menuTextCol: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '800', color: Colors.rooms.darkText },
  menuSubtitle: { fontSize: 12, color: Colors.rooms.mutedText, marginTop: 2 },
  list: { gap: 8 },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDCC',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1E8',
    marginRight: 10,
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: Colors.rooms.darkText },
  rowMeta: { fontSize: 11.5, color: Colors.rooms.mutedText, marginTop: 2 },
  rowAmount: { fontSize: 13.5, fontWeight: '800', color: Colors.rooms.darkText, marginLeft: 8 },
  empty: { textAlign: 'center', color: Colors.rooms.mutedText, paddingVertical: 28 },
  emptySub: { fontSize: 12, color: Colors.rooms.mutedText, fontStyle: 'italic' },
  metricCard: {
    padding: 16,
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DDCC',
    marginBottom: 14,
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metricCol: { flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: Colors.rooms.mutedText },
  metricValue: { fontSize: 22, fontWeight: '800', color: Colors.rooms.darkText, marginTop: 3 },
  subSection: { marginBottom: 14 },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 42,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E5D8C4',
    borderRadius: 11,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.rooms.darkText },
  personCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E8DDCC',
    overflow: 'hidden',
  },
  personHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 6 },
  netValue: { fontSize: 12.5, fontWeight: '800', color: Colors.rooms.forestGreen },
  negative: { color: Colors.rooms.burntOrange },
  personDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0E7D8',
    gap: 6,
  },
  groupHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.rooms.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debtBlock: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE0',
    gap: 4,
  },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  debtLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.rooms.darkText },
  debtDesc: { fontSize: 11.5, color: Colors.rooms.mutedText, lineHeight: 16 },
  debtActionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  pendingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FEF3E7',
    borderWidth: 1,
    borderColor: '#F3D1AE',
  },
  pendingPillText: { fontSize: 11, fontWeight: '700', color: '#C96A25' },
  awaitingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  awaitingPillText: { fontSize: 10.5, fontWeight: '700', color: '#4338CA' },
  paidPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EAF4EA',
    borderWidth: 1,
    borderColor: '#CBE2CC',
  },
  paidPillText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  markPaidBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.rooms.forestGreen,
  },
  confirmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#C96A25',
  },
  markPaidText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDCC',
  },
  receiptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  receiptTile: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#EDE5D8',
  },
});

export default ExpenseMenuDrawer;
