import React, { useRef } from 'react';
import { View, Animated, PanResponder, Vibration } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from './chatStyles';

interface SwipeableMessageRowProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
}

export const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({
  children,
  onSwipeReply,
}) => {
  const pan = useRef(new Animated.Value(0)).current;
  const triggeredRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dx > 15 && Math.abs(gesture.dy) < 10;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) {
          const clamped = Math.min(gesture.dx * 0.65, 70);
          pan.setValue(clamped);

          if (clamped >= 40 && !triggeredRef.current) {
            triggeredRef.current = true;
            try { Vibration.vibrate(12); } catch (e) {}
          } else if (clamped < 40 && triggeredRef.current) {
            triggeredRef.current = false;
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (triggeredRef.current || gesture.dx > 45) {
          onSwipeReply();
        }
        triggeredRef.current = false;
        Animated.spring(pan, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        triggeredRef.current = false;
        Animated.spring(pan, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const replyIconOpacity = pan.interpolate({
    inputRange: [0, 15, 40],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  const replyIconScale = pan.interpolate({
    inputRange: [0, 15, 40],
    outputRange: [0.5, 0.8, 1.1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeRowWrapper}>
      {/* Reply indicator revealed on the left */}
      <Animated.View
        style={[
          styles.swipeReplyIconContainer,
          {
            opacity: replyIconOpacity,
            transform: [{ scale: replyIconScale }],
          },
        ]}
      >
        <View style={styles.swipeReplyIconCircle}>
          <Feather name="corner-up-left" size={16} color="#C96A25" />
        </View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX: pan }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
};
