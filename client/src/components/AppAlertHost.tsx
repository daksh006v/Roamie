import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type AlertListener = (request: AlertRequest) => void;

let listener: AlertListener | null = null;
const queuedRequests: AlertRequest[] = [];

export const showAppAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  const request: AlertRequest = {
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
  };

  if (listener) {
    listener(request);
  } else {
    queuedRequests.push(request);
  }
};

export const registerAppAlertListener = (nextListener: AlertListener) => {
  listener = nextListener;
  queuedRequests.splice(0).forEach(nextListener);
  return () => {
    if (listener === nextListener) listener = null;
  };
};

export const AppAlertHost: React.FC = () => {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => registerAppAlertListener(setRequest), []);

  const close = (button?: AlertButton) => {
    setRequest(null);
    button?.onPress?.();
  };

  if (!request) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close()}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        <View style={styles.dialog}>
          <View style={styles.accentBar} />
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Feather name="info" size={18} color={Colors.rooms.forestGreen} />
            </View>
            <Text style={styles.title}>{request.title}</Text>
          </View>
          {!!request.message && <Text style={styles.message}>{request.message}</Text>}
          <View style={styles.actions}>
            {request.buttons.map((button, index) => (
              <TouchableOpacity
                key={`${button.text || 'button'}-${index}`}
                style={[
                  styles.action,
                  index === request.buttons.length - 1 && styles.primaryAction,
                  button.style === 'destructive' && styles.destructiveAction,
                ]}
                activeOpacity={0.8}
                onPress={() => close(button)}
              >
                <Text
                  style={[
                    styles.actionText,
                    index === request.buttons.length - 1 && styles.primaryActionText,
                    button.style === 'destructive' && styles.destructiveText,
                  ]}
                >
                  {button.text || 'OK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(23, 37, 31, 0.58)',
  },
  dialog: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFDF8',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5D8C4',
    shadowColor: '#17251F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  accentBar: {
    height: 4,
    width: 42,
    borderRadius: 2,
    backgroundColor: Colors.rooms.planningOrange,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1E8',
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: Colors.rooms.darkText,
  },
  message: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.rooms.mutedText,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },
  action: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryAction: { backgroundColor: Colors.rooms.forestGreen },
  destructiveAction: { backgroundColor: '#FCE9E2' },
  actionText: { fontSize: 13, fontWeight: '800', color: Colors.rooms.mutedText },
  primaryActionText: { color: '#FFFFFF' },
  destructiveText: { color: '#B7602C' },
});
