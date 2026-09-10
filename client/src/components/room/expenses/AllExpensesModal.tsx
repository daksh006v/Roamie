import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { ExpenseItem } from '../ExpensesTab';

interface AllExpensesModalProps {
  visible: boolean;
  expenses: ExpenseItem[];
  onClose: () => void;
  onExpensePress: (expense: ExpenseItem) => void;
}

export const AllExpensesModal: React.FC<AllExpensesModalProps> = ({
  visible,
  expenses,
  onClose,
  onExpensePress,
}) => {
  const [query, setQuery] = useState('');
  const filteredExpenses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return expenses;
    return expenses.filter((expense) => expense.title.toLowerCase().includes(normalized));
  }, [expenses, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Trip ledger</Text>
              <Text style={styles.title}>All expenses</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={19} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={Colors.rooms.mutedText} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search expenses"
              placeholderTextColor="#A89E91"
            />
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {filteredExpenses.map((expense) => {
              const payer = typeof expense.paidBy === 'object' ? expense.paidBy.name : 'Someone';
              return (
                <TouchableOpacity key={expense._id} style={styles.row} onPress={() => onExpensePress(expense)} activeOpacity={0.78}>
                  <View style={styles.rowIcon}><Feather name="file-text" size={16} color={Colors.rooms.forestGreen} /></View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{expense.title}</Text>
                    <Text style={styles.rowMeta}>Paid by {payer} · {expense.splitCount || 0} sharing</Text>
                  </View>
                  <Text style={styles.rowAmount}>₹{expense.amount.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              );
            })}
            {filteredExpenses.length === 0 && <Text style={styles.empty}>No matching expenses.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,37,31,0.48)' },
  sheet: { maxHeight: '88%', backgroundColor: '#FBF8F1', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  eyebrow: { fontSize: 11, color: Colors.rooms.planningOrange, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 23, color: Colors.rooms.darkText, fontWeight: '800', marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E8' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 42, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E5D8C4', borderRadius: 11 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.rooms.darkText },
  list: { paddingTop: 12, paddingBottom: 24, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCC', borderRadius: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E8', marginRight: 10 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: Colors.rooms.darkText },
  rowMeta: { fontSize: 11.5, color: Colors.rooms.mutedText, marginTop: 3 },
  rowAmount: { fontSize: 14, fontWeight: '800', color: Colors.rooms.darkText, marginLeft: 8 },
  empty: { textAlign: 'center', color: Colors.rooms.mutedText, paddingVertical: 30 },
});

export default AllExpensesModal;
