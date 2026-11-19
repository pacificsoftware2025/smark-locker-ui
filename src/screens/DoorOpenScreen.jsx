import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ENV } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: DoorOpenScreen
// Step 2C & 3B: Physical locker door opened confirmation screen.
//
// In Vanilla JS:
//   let countdown = 30;
//   setInterval(() => {
//     countdown--;
//     if (countdown === 0) onFinish();
//   }, 1000);
// ==============================================================================
export function DoorOpenScreen(props) {
  const assignedBox = props.assignedBox || '03';
  const stationId = props.stationId || ENV.stationId;
  const onFinish = props.onFinish;

  // Countdown before automatically returning to Home Screen
  const [secondsRemaining, setSecondsRemaining] = useState(ENV.doorOpenTimeout);

  useEffect(function () {
    const timerId = setInterval(function () {
      setSecondsRemaining(function (prev) {
        if (prev <= 1) {
          clearInterval(timerId);
          onFinish(); // Auto-reset back to Home Screen
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return function () {
      clearInterval(timerId);
    };
  }, [onFinish]);

  return (
    <View style={styles.container}>
      
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR: Station Indicator & Countdown Pill                   */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.topBar}>
        <View style={styles.stationBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.stationText}>{stationId} &bull; Compartment Active</Text>
        </View>

        <View style={styles.countdownPill}>
          <Text style={styles.countdownText}>Auto-reset in {secondsRemaining}s</Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT: Headline & 2-Step Deposit Instructions          */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.content}>
        
        {/* Compartment Number Indicator */}
        <View style={styles.boxNumberCircle}>
          <Text style={styles.boxNumberLarge}>{assignedBox}</Text>
          <Text style={styles.boxNumberSub}>OPEN</Text>
        </View>

        <Text style={styles.headline}>Compartment #{assignedBox} Is Open</Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillIcon}>✓</Text>
          <Text style={styles.statusPillText}>Solenoid Latch Released</Text>
        </View>

        {/* 2-Step Instructions Card */}
        <View style={styles.instructionsCard}>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Deposit your laundry bag</Text>
              <Text style={styles.stepDetail}>Place all items neatly inside Compartment #{assignedBox}.</Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Push door firmly closed</Text>
              <Text style={styles.stepDetail}>Push until you hear the mechanical lock click shut.</Text>
            </View>
          </View>

        </View>

        <Text style={styles.smsNote}>
          An SMS receipt with your tracking details has been sent to your phone.
        </Text>

      </View>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER BUTTON                                                 */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onFinish}
          style={styles.finishBtn}
        >
          <Text style={styles.finishBtnText}>I've Closed the Locker Door</Text>
          <Text style={styles.finishBtnArrow}>→</Text>
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
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  stationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
    marginRight: 6,
  },
  stationText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.emeraldDark,
  },
  countdownPill: {
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  countdownText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  boxNumberCircle: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 2,
    borderColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  boxNumberLarge: {
    fontFamily: FONTS.family,
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.emeraldDark,
    letterSpacing: -1,
    lineHeight: 38,
  },
  boxNumberSub: {
    fontFamily: FONTS.family,
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.emerald,
    letterSpacing: 1,
  },
  headline: {
    fontFamily: FONTS.family,
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
    marginBottom: 24,
  },
  statusPillIcon: {
    color: COLORS.emeraldDark,
    fontSize: 12,
    fontWeight: '900',
  },
  statusPillText: {
    fontFamily: FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldDark,
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: COLORS.slate50,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontFamily: FONTS.family,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.white,
  },
  stepTextCol: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontFamily: FONTS.family,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  stepDetail: {
    fontFamily: FONTS.family,
    fontSize: 13,
    color: COLORS.slate600,
    lineHeight: 18,
  },
  stepDivider: {
    height: 1,
    backgroundColor: COLORS.slate200,
  },
  smsNote: {
    fontFamily: FONTS.family,
    fontSize: 13,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  finishBtn: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: COLORS.emerald,
    borderWidth: 1,
    borderColor: COLORS.emeraldDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  finishBtnText: {
    fontFamily: FONTS.family,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
  finishBtnArrow: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
  },
});
