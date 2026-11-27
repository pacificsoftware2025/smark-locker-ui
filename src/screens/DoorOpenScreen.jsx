import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ENV } from '../config/env';
import grabNGoLogo from '../assets/images/grabngo_logo.png';

// ==============================================================================
// REACT NATIVE COMPONENT: DoorOpenScreen (GEMINI.md Rules 1, 2, 3 & 4)
// Minimalist, user-friendly confirmation screen shown once the locker opens.
// Retains the project's 3-color theme (Safety Orange, Slate, Emerald) on a
// clean white canvas with zero visual clutter and zero emojis.
//
// In Vanilla JS:
//   let secondsRemaining = 30;
//   const timerId = setInterval(() => {
//     secondsRemaining--;
//     if (secondsRemaining <= 0) onFinish();
//   }, 1000);
// ==============================================================================

export function DoorOpenScreen(props) {
  const assignedBox = String(props.assignedBox || '03').padStart(2, '0');
  const orderId = props.orderId || '';
  const onFinish = props.onFinish;

  // useState stores the countdown seconds in memory and refreshes the text each second
  const [secondsRemaining, setSecondsRemaining] = useState(ENV.doorOpenTimeout);

  // useEffect starts a 1-second timer when this screen appears and clears it on exit
  useEffect(function () {
    const timerId = setInterval(function () {
      setSecondsRemaining(function (prev) {
        if (prev <= 1) {
          clearInterval(timerId);
          if (onFinish) {
            onFinish();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return function () {
      clearInterval(timerId);
    };
  }, [onFinish]);

  // Acts like button.addEventListener('click', ...) in Vanilla JS
  function handleDoneClick() {
    if (onFinish) {
      onFinish();
    }
  }

  return (
    <View style={styles.container}>
      {/* 1. Minimal Header: Brand Logo & Calm Countdown Pill */}
      <View style={styles.topBar}>
        <Image
          source={grabNGoLogo}
          style={styles.brandLogo}
          resizeMode="contain"
        />

        <View style={styles.timerPill}>
          <Text style={styles.timerText}>Auto-close in {secondsRemaining}s</Text>
        </View>
      </View>

      {/* 2. Clean Centered Content */}
      <View style={styles.centerContent}>
        {/* Minimalist Compartment Number Tile */}
        <View style={styles.doorBadge}>
          <Text style={styles.doorNumber}>{assignedBox}</Text>
        </View>

        <Text style={styles.title}>Door #{assignedBox} is Open</Text>
        <Text style={styles.subtitle}>
          Place or collect your laundry, then push the door shut.
        </Text>

        {/* Simple 2-Step Guide */}
        <View style={styles.stepsBox}>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.stepText}>Place your laundry bag neatly inside</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.stepText}>Push the door firmly until it clicks shut</Text>
          </View>
        </View>

        {Boolean(orderId) && (
          <Text style={styles.helperNote}>Order {orderId}</Text>
        )}
      </View>

      {/* 3. Primary Theme CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleDoneClick}
          style={styles.doneBtn}
        >
          <Text style={styles.doneBtnText}>{"I've Closed the Door"}</Text>
          <View style={styles.arrowCircle}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },

  // Minimal Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogo: {
    width: 118,
    height: 36,
  },
  timerPill: {
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  timerText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },

  // Centered Hero & Minimal Steps
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  doorBadge: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: COLORS.orangeSubtle,
    borderWidth: 2,
    borderColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  doorNumber: {
    fontFamily: FONTS.family,
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.orange,
    letterSpacing: -1,
  },
  title: {
    fontFamily: FONTS.family,
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.emerald,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 28,
  },

  // Minimal 2-Step Card
  stepsBox: {
    width: '100%',
    backgroundColor: COLORS.slate50,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  stepText: {
    fontFamily: FONTS.family,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate800,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.slate200,
    marginVertical: 12,
  },
  helperNote: {
    fontFamily: FONTS.family,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.slate400,
    textAlign: 'center',
  },

  // Bottom CTA Button
  footer: {
    paddingTop: 8,
  },
  doneBtn: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 3,
  },
  doneBtnText: {
    fontFamily: FONTS.family,
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.white,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    marginLeft: 1,
    marginTop: -1,
  },
});
