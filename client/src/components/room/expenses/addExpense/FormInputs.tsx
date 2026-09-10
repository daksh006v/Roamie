import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Shadows } from '../../../../constants/theme';

export interface IconPillProps {
  iconNode: React.ReactNode;
  bgColor?: string;
  size?: number;
  radius?: number;
}

export const IconPill: React.FC<IconPillProps> = ({
  iconNode,
  bgColor = '#F1E9D7',
  size = 34,
  radius = 12,
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: bgColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    }}
  >
    {iconNode}
  </View>
);

export interface FormInputLivelyProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  iconBg?: string;
  iconNode?: React.ReactNode;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  textAlign?: 'left' | 'right' | 'center';
  textColor?: string;
  fontSize?: number;
  fontWeight?: '500' | '600' | '700' | '800' | '900';
  flexWidth?: number;
  containerStyle?: any;
  inputStyle?: any;
  onFocus?: () => void;
}

export const FormInputLively: React.FC<FormInputLivelyProps> = ({
  label,
  required,
  placeholder,
  value,
  onChangeText,
  iconBg,
  iconNode,
  hint,
  keyboardType,
  maxLength,
  textAlign = 'left',
  textColor = '#1C211C',
  fontSize = 15,
  fontWeight = '700',
  flexWidth,
  containerStyle,
  inputStyle,
  onFocus,
}) => {
  return (
    <View style={[styles.wrap, flexWidth !== undefined && { width: flexWidth }, containerStyle]}>
      {label !== undefined && (
        <Text style={styles.label}>
          {label}{required ? <Text style={styles.star}> *</Text> : null}
        </Text>
      )}
      <View style={styles.box}>
        {iconNode !== undefined ? (
          <IconPill iconNode={iconNode} bgColor={iconBg} />
        ) : null}
        <TextInput
          style={[
            styles.input,
            { textAlign, color: textColor, fontSize, fontWeight },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#B9AE9A"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCorrect={false}
          onFocus={onFocus}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

export interface DropdownTriggerBoxProps {
  onPress: () => void;
  iconNode: React.ReactNode;
  iconBg?: string;
  text: string;
  open: boolean;
  chevronColor?: string;
}

export const DropdownTriggerBox: React.FC<DropdownTriggerBoxProps> = ({
  onPress,
  iconNode,
  iconBg,
  text,
  open,
  chevronColor = '#7B6F5B',
}) => (
  <TouchableOpacity
    style={styles.box}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <IconPill iconNode={iconNode} bgColor={iconBg} />
    <View style={{ flex: 1 }}>
      <Text style={styles.dropText}>{text}</Text>
    </View>
    <Feather
      name={open ? 'chevron-up' : 'chevron-down'}
      size={17}
      color={chevronColor}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C211C',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  star: {
    color: '#C97935',
    fontWeight: '900',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.3,
    borderColor: '#E8DCC4',
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 10,
    ...Shadows.card,
    shadowRadius: 6,
    shadowOpacity: 0.06,
  },
  input: {
    flex: 1,
    paddingRight: 4,
    minWidth: 0,
  },
  dropText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C211C',
  },
  hint: {
    marginTop: 5,
    fontSize: 11.5,
    color: '#A89C86',
    fontWeight: '500',
  },
});

export default {};
