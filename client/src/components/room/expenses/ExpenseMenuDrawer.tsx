import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import type { BalanceBreakdownItem, ExpenseItem, SettlementRow } from '../ExpensesTab';

export type ExpenseDrawerView = 'menu' | 'my' | 'all' | 'everyone' | 'breakdown' | 'tags' | 'receipts';

interface ExpenseMenuDrawerProps {
  visible: boolean;
  view?: ExpenseDrawerView;
  expenses: ExpenseItem[];
  breakdown: BalanceBreakdownItem[];
  settlements: SettlementRow[];
  currentUserId?: string;
  isOwner?: boolean;
  onClose: () => void;
  onExpensePress: (expense: ExpenseItem) => void;
  onSettle: (settlement: SettlementRow) => void;
}

const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const menuItems: { key: ExpenseDrawerView; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'my', label: 'My expenses', icon: 'user' },
  { key: 'all', label: 'All expenses', icon: 'list' },
  { key: 'everyone', label: 'Everyone', icon: 'users' },
  { key: 'breakdown', label: 'Spending breakdown', icon: 'pie-chart' },
  { key: 'tags', label: 'Tags', icon: 'hash' },
  { key: 'receipts', label: 'Receipts', icon: 'file-text' },
];

export const ExpenseMenuDrawer: React.FC<ExpenseMenuDrawerProps> = ({
  visible,
  view = 'menu',
  expenses,
  breakdown,
  settlements,
  currentUserId,
  isOwner,
  onClose,
  onExpensePress,
  onSettle,
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
    return normalized ? expenses.filter((expense) => expense.title.toLowerCase().includes(normalized)) : expenses;
  }, [expenses, query]);

  const myExpenses = expenses.filter((expense) => {
    const payerId = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy;
    return payerId === currentUserId;
  });

  const categoryTotals = useMemo(() => expenses.reduce<Record<string, number>>((totals, expense) => {
    const category = expense.category || 'other';
    totals[category] = (totals[category] || 0) + expense.amount;
    return totals;
  }, {}), [expenses]);

  const tagTotals = useMemo(() => expenses.reduce<Record<string, number>>((totals, expense) => {
    (expense.tags?.length ? expense.tags : ['general']).forEach((tag) => {
      totals[tag] = (totals[tag] || 0) + expense.amount;
    });
    return totals;
  }, {}), [expenses]);

  const goBack = () => activeView === 'menu' ? onClose() : setActiveView('menu');
  const title = activeView === 'menu' ? 'Money views' : menuItems.find((item) => item.key === activeView)?.label || 'Money views';

  const renderExpenseRows = (items: ExpenseItem[]) => (
    <View style={styles.list}>
      {items.map((expense) => {
        const payer = typeof expense.paidBy === 'object' ? expense.paidBy.name : 'Someone';
        return (
          <TouchableOpacity key={expense._id} style={styles.expenseRow} onPress={() => onExpensePress(expense)}>
            <View style={styles.rowIcon}><Feather name="file-text" size={16} color={Colors.rooms.forestGreen} /></View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>{expense.title}</Text>
              <Text style={styles.rowMeta}>Paid by {payer} · {expense.splitCount || 0} sharing</Text>
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
            <TouchableOpacity key={item.key} style={styles.menuItem} onPress={() => setActiveView(item.key)}>
              <View style={styles.menuIcon}><Feather name={item.icon} size={17} color={Colors.rooms.forestGreen} /></View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={17} color={Colors.rooms.mutedText} />
            </TouchableOpacity>
          ))}
          {isOwner && <View style={styles.ownerDivider}><Text style={styles.ownerLabel}>OWNER</Text><Text style={styles.ownerHint}>Trip budget controls can be added here.</Text></View>}
        </View>
      );
    }

    if (activeView === 'my') {
      const paid = myExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      return <>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>You paid</Text><Text style={styles.metricValue}>{formatCurrency(paid)}</Text><Text style={styles.rowMeta}>{myExpenses.length} payments</Text></View>
        {renderExpenseRows(myExpenses)}
      </>;
    }

    if (activeView === 'all') {
      return <><View style={styles.searchBox}><Feather name="search" size={16} color={Colors.rooms.mutedText} /><TextInput value={query} onChangeText={setQuery} placeholder="Search expenses" placeholderTextColor="#A89E91" style={styles.searchInput} /></View>{renderExpenseRows(filteredExpenses)}</>;
    }

    if (activeView === 'everyone') {
      return <View style={styles.list}>{breakdown.map((person) => {
        const personSettlements = settlements.filter((settlement) => settlement.from._id === person.user._id || settlement.to._id === person.user._id);
        const expanded = expandedPerson === person.user._id;
        return <View key={person.user._id} style={styles.personCard}>
          <TouchableOpacity style={styles.personHeader} onPress={() => setExpandedPerson(expanded ? null : person.user._id)}>
            <View style={styles.rowIcon}><Feather name="user" size={16} color={Colors.rooms.forestGreen} /></View>
            <View style={styles.rowBody}><Text style={styles.rowTitle}>{person.user._id === currentUserId ? 'You' : person.user.name}</Text><Text style={styles.rowMeta}>Paid {formatCurrency(person.totalPaid)} · Share {formatCurrency(person.totalOwed)}</Text></View>
            <Text style={[styles.netValue, person.netBalance < 0 && styles.negative]}>{person.netBalance < 0 ? 'Owes ' : 'Owed '}{formatCurrency(Math.abs(person.netBalance))}</Text><Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.rooms.mutedText} />
          </TouchableOpacity>
          {expanded && <View style={styles.personDetails}>{personSettlements.length ? personSettlements.map((settlement) => <View key={`${settlement.from._id}-${settlement.to._id}`} style={styles.debtRow}><Text style={styles.rowMeta}>{settlement.from.name} → {settlement.to.name}</Text><Text style={styles.rowAmount}>{formatCurrency(settlement.amount)}</Text>{settlement.from._id === currentUserId && <TouchableOpacity style={styles.paidButton} onPress={() => onSettle(settlement)}><Text style={styles.paidText}>Paid</Text></TouchableOpacity>}</View>) : <Text style={styles.rowMeta}>No outstanding transfers.</Text>}</View>}
        </View>;
      })}</View>;
    }

    if (activeView === 'breakdown') return <View style={styles.list}>{Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([category, amount]) => <View key={category} style={styles.simpleRow}><Text style={styles.rowTitle}>{category[0].toUpperCase() + category.slice(1)}</Text><Text style={styles.rowAmount}>{formatCurrency(amount)}</Text></View>)}</View>;
    if (activeView === 'tags') return <View style={styles.list}>{Object.entries(tagTotals).sort(([, a], [, b]) => b - a).map(([tag, amount]) => <View key={tag} style={styles.simpleRow}><Text style={styles.rowTitle}>#{tag}</Text><Text style={styles.rowAmount}>{formatCurrency(amount)}</Text></View>)}</View>;
    return <View style={styles.receiptGrid}>{expenses.filter((expense) => expense.receiptUrl || expense.receiptUrls?.length).map((expense) => <TouchableOpacity key={expense._id} onPress={() => onExpensePress(expense)}><ExpoImage source={{ uri: expense.receiptUrls?.[0] || expense.receiptUrl }} style={styles.receiptTile} contentFit="cover" /></TouchableOpacity>)}</View>;
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><View style={styles.header}><View><Text style={styles.eyebrow}>Expenses</Text><Text style={styles.title}>{title}</Text></View><TouchableOpacity style={styles.closeButton} onPress={goBack}><Feather name={activeView === 'menu' ? 'x' : 'arrow-left'} size={19} color={Colors.rooms.darkText} /></TouchableOpacity></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{renderView()}</ScrollView></View></View></Modal>;
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,37,31,0.48)' },
  sheet: { maxHeight: '90%', backgroundColor: '#FBF8F1', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
  eyebrow: { fontSize: 11, color: Colors.rooms.planningOrange, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 23, color: Colors.rooms.darkText, fontWeight: '800', marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E8' },
  content: { paddingBottom: 24 },
  menuList: { gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCC', borderRadius: 12 },
  menuIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E8' },
  menuLabel: { flex: 1, color: Colors.rooms.darkText, fontSize: 14, fontWeight: '700' },
  ownerDivider: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E5D8C4' },
  ownerLabel: { fontSize: 10, color: Colors.rooms.planningOrange, fontWeight: '800', letterSpacing: 1 },
  ownerHint: { fontSize: 12, color: Colors.rooms.mutedText, marginTop: 5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 42, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E5D8C4', borderRadius: 11, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.rooms.darkText },
  list: { gap: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCC', borderRadius: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E8', marginRight: 10 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: Colors.rooms.darkText },
  rowMeta: { fontSize: 11.5, color: Colors.rooms.mutedText, marginTop: 3 },
  rowAmount: { fontSize: 14, fontWeight: '800', color: Colors.rooms.darkText, marginLeft: 8 },
  empty: { textAlign: 'center', color: Colors.rooms.mutedText, paddingVertical: 30 },
  metricCard: { padding: 14, marginBottom: 10, backgroundColor: '#F1F6F0', borderWidth: 1, borderColor: '#C9DAC8', borderRadius: 12 },
  metricLabel: { fontSize: 12, color: Colors.rooms.mutedText, fontWeight: '700' },
  metricValue: { fontSize: 24, color: Colors.rooms.darkText, fontWeight: '900', marginTop: 3 },
  personCard: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCC', borderRadius: 12, overflow: 'hidden' },
  personHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  netValue: { fontSize: 12, color: '#3F6B52', fontWeight: '800', marginRight: 7 },
  negative: { color: '#B7602C' },
  personDetails: { padding: 11, borderTopWidth: 1, borderTopColor: '#E8DDCC', gap: 8 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paidButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.rooms.forestGreen },
  paidText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  simpleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, backgroundColor: '#FFFDF8', borderBottomWidth: 1, borderBottomColor: '#E8DDCC' },
  receiptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  receiptTile: { width: 104, height: 104, borderRadius: 12, backgroundColor: '#E8DDCC' },
});

export default ExpenseMenuDrawer;
