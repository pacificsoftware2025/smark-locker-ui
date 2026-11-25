import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ENV } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: HomeScreen
// Pure Minimalist Kiosk Screen:
//   - Generous breathing space & high typography contrast
//   - Zero emojis, zero feature clutter, zero walls of text
//   - 2 large, confident, distraction-free touch actions: Drop Off & Pick Up
//   - Smart capacity detection: Fades Drop Off when all lockers are occupied
//   - Secret 5-tap Admin Fleet Setup trigger on station title
// ==============================================================================
export function HomeScreen(props) {
  const onStartDropoff = props.onStartDropoff;
  const onStartPickup = props.onStartPickup;
  const onOpenAdmin = props.onOpenAdmin;
  const stationId = props.stationId || ENV.stationId;
  const hardwareId = props.hardwareId || 'SLL-12901';
  const isStationFull = Boolean(props.isStationFull);
  const isStationBound = Boolean(props.isStationBound);
  const isConfigured = Boolean(stationId && stationId !== 'SETUP REQUIRED');
  const isReady = isConfigured && isStationBound;
  const isUnprovisioned = !isReady;

  const [currentTime, setCurrentTime] = useState('');
  const [adminTapCount, setAdminTapCount] = useState(0);
  const lastTapRef = useRef(0);

  useEffect(function () {
    function updateClock() {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(timeString);
    }

    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return function () {
      clearInterval(timerId);
    };
  }, []);

  // Technician gesture on Station Name (1 tap if unprovisioned, 5 taps if active)
  function handleSecretAdminTap() {
    if (isUnprovisioned) {
      if (onOpenAdmin) onOpenAdmin();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 2500) {
      const nextTaps = adminTapCount + 1;
      setAdminTapCount(nextTaps);
      if (nextTaps >= 5) {
        setAdminTapCount(0);
        if (onOpenAdmin) {
          onOpenAdmin();
        }
      }
    } else {
      setAdminTapCount(1);
    }
    lastTapRef.current = now;
  }

  function handleDropoffPress() {
    if (isUnprovisioned) {
      if (!isStationBound && isConfigured) {
        Alert.alert(
          'Remote Pairing Required',
          `Station ${stationId} is set up locally but has not been paired by Central Management yet. Please complete pairing in the Operator Dashboard.`,
          [{ text: 'OK' }]
        );
        return;
      }
      Alert.alert(
        'Machine Setup Required',
        'This locker station has not been provisioned yet. Please contact a technician or tap "Open Setup" to configure.',
        [
          { text: 'Open Setup', onPress: () => { if (onOpenAdmin) onOpenAdmin(); } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    if (isStationFull) {
      Alert.alert(
        'Station Full',
        'All locker compartments are currently occupied. Please check back later once customer laundry has been picked up.',
        [{ text: 'OK' }]
      );
      return;
    }
    onStartDropoff();
  }

  return (
    <View style={styles.container}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. QUIET MINIMAL TOP BAR                                      */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSecretAdminTap}
          style={styles.stationGroup}
        >
          <Text style={styles.brandName}>Smart Locker</Text>
          <Text style={styles.stationDivider}>/</Text>
          {!isConfigured ? (
            <View style={styles.unprovisionedBadge}>
              <Text style={styles.unprovisionedBadgeText}>SETUP REQUIRED</Text>
            </View>
          ) : !isStationBound ? (
            <View style={styles.stationGroup}>
              <Text style={styles.stationCode}>{stationId}</Text>
              <View style={[styles.unprovisionedBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.unprovisionedBadgeText, { color: '#b45309' }]}>UNBOUND</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.stationCode}>{stationId}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.statusGroup}>
          <View style={styles.liveDot} />
          <Text style={styles.clockText}>{currentTime || '09:41'}</Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 2. CENTER CONTENT: MINIMALIST DISPLAY & 2 TOUCH ACTIONS       */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.centerContent}>
        
        {/* Clean Headline */}
        <View style={styles.headingBlock}>
          <Text style={styles.headline}>
            Clean laundry,{'\n'}made simple.
          </Text>
          <Text style={styles.subline}>
            Tap an option below to begin.
          </Text>
        </View>

        {/* 2 Focused Minimalist Buttons */}
        <View style={styles.actionsContainer}>
          
          {/* Button 1: Drop Off (Safety Orange #ea580c, or Faded Slate if Full/Unprovisioned) */}
          <TouchableOpacity
            activeOpacity={isStationFull || isUnprovisioned ? 0.7 : 0.85}
            onPress={handleDropoffPress}
            style={[styles.dropoffBtn, (isStationFull || isUnprovisioned) && styles.dropoffBtnDisabled]}
          >
            <View style={styles.btnTextCol}>
              <View style={styles.titleRow}>
                <Text style={styles.dropoffTitle}>Drop Off</Text>
                {!isConfigured ? (
                  <View style={styles.setupRequiredActionBadge}>
                    <Text style={styles.setupRequiredActionBadgeText}>SETUP REQUIRED</Text>
                  </View>
                ) : !isStationBound ? (
                  <View style={[styles.setupRequiredActionBadge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.setupRequiredActionBadgeText, { color: '#b45309' }]}>PAIRING REQUIRED</Text>
                  </View>
                ) : isStationFull ? (
                  <View style={styles.fullBadge}>
                    <Text style={styles.fullBadgeText}>STATION FULL</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.dropoffSubtitle, (isStationFull || isUnprovisioned) && styles.dropoffSubtitleDisabled]}>
                {!isConfigured
                  ? 'Machine setup required by technician'
                  : !isStationBound
                  ? 'Awaiting Central Operator remote pairing'
                  : isStationFull
                  ? 'All compartments currently occupied'
                  : 'Leave clothes for wash & fold'}
              </Text>
            </View>
            <Text style={[styles.arrowWhite, (isStationFull || isUnprovisioned) && styles.arrowDisabled]}>→</Text>
          </TouchableOpacity>

          {/* Button 2: Pick Up (Crisp Slate Border) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onStartPickup}
            style={styles.pickupBtn}
          >
            <View style={styles.btnTextCol}>
              <Text style={styles.pickupTitle}>Pick Up</Text>
              <Text style={styles.pickupSubtitle}>Claim clean laundry with PIN</Text>
            </View>
            <Text style={styles.arrowSlate}>→</Text>
          </TouchableOpacity>

        </View>

      </View>

      {/* ------------------------------------------------------------- */}
      {/* 3. QUIET MINIMAL FOOTER                                       */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Contactless 24/7 &bull; {isUnprovisioned ? 'Smartbox Laundry Locker' : stationId}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },

  // -------------------------------------------------------------
  // TOP BAR
  // -------------------------------------------------------------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  stationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontFamily: FONTS.family,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: -0.2,
  },
  stationDivider: {
    fontFamily: FONTS.family,
    fontSize: 14,
    color: COLORS.slate300,
  },
  stationCode: {
    fontFamily: FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate500,
  },
  unprovisionedBadge: {
    backgroundColor: '#fff7ed', // Amber/Orange-50
    borderColor: '#ea580c',     // Safety Orange
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unprovisionedBadgeText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  clockText: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate700,
  },

  // -------------------------------------------------------------
  // CENTER CONTENT
  // -------------------------------------------------------------
  centerContent: {
    gap: 36,
    paddingVertical: 12,
  },
  headingBlock: {
    gap: 10,
  },
  headline: {
    fontFamily: FONTS.family,
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  subline: {
    fontFamily: FONTS.family,
    fontSize: 16,
    color: COLORS.slate500,
  },

  // -------------------------------------------------------------
  // ACTIONS CONTAINER (2 Minimalist Buttons)
  // -------------------------------------------------------------
  actionsContainer: {
    gap: 16,
  },
  dropoffBtn: {
    minHeight: 90,
    backgroundColor: COLORS.orange,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  dropoffBtnDisabled: {
    backgroundColor: '#94a3b8', // Faded slate-400
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.72,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullBadge: {
    backgroundColor: '#dc2626', // Red-600 alert badge
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullBadgeText: {
    fontFamily: FONTS.family,
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  setupRequiredActionBadge: {
    backgroundColor: '#d97706', // Amber-600 alert badge
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  setupRequiredActionBadgeText: {
    fontFamily: FONTS.family,
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  dropoffSubtitleDisabled: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  arrowDisabled: {
    opacity: 0.5,
  },
  pickupBtn: {
    minHeight: 90,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: COLORS.slate200,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    shadowColor: COLORS.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  btnTextCol: {
    gap: 4,
  },
  dropoffTitle: {
    fontFamily: FONTS.family,
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  dropoffSubtitle: {
    fontFamily: FONTS.family,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
  },
  pickupTitle: {
    fontFamily: FONTS.family,
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.4,
  },
  pickupSubtitle: {
    fontFamily: FONTS.family,
    fontSize: 13,
    color: COLORS.slate500,
  },
  arrowWhite: {
    fontFamily: FONTS.family,
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  arrowSlate: {
    fontFamily: FONTS.family,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.slate400,
  },

  // -------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------
  footer: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  footerText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    color: COLORS.slate400,
    letterSpacing: 0.5,
  },
});
