import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  initialDate?: Date;
  minDate?: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  title,
  initialDate = new Date(),
  minDate,
  onClose,
  onSelectDate,
}) => {
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calendar matrix calculation
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleDayPress = (day: number) => {
    const chosen = new Date(currentYear, currentMonth, day);
    setSelectedDate(chosen);
  };

  const handleConfirm = () => {
    onSelectDate(selectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Feather name="chevron-left" size={20} color={Colors.rooms.forestGreen} />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Feather name="chevron-right" size={20} color={Colors.rooms.forestGreen} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Headers */}
          <View style={styles.weekRow}>
            {DAY_NAMES.map((dn, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {dn}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {days.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCell} />;
              }

              const cellDate = new Date(currentYear, currentMonth, day);
              const isSelected =
                selectedDate &&
                cellDate.getFullYear() === selectedDate.getFullYear() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getDate() === selectedDate.getDate();

              const isDisabled = minDate && cellDate < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDayCell,
                    isDisabled && styles.disabledDayCell,
                  ]}
                  disabled={!!isDisabled}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isDisabled && styles.disabledDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm CTA */}
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>Select Date</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 37, 31, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: Math.min(width - 48, 360),
    backgroundColor: Colors.rooms.background,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.rooms.darkText,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.rooms.cardCream,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  navBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rooms.sandBorder,
    paddingBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  selectedDayCell: {
    backgroundColor: Colors.rooms.forestGreen,
  },
  disabledDayCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.rooms.darkText,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledDayText: {
    color: Colors.rooms.mutedText,
  },
  confirmBtn: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
