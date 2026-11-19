import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ENV } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: HomeScreen
// Pure Minimalist Kiosk Screen:
//   - Generous breathing space & high typography contrast
//   - Zero emojis, zero feature clutter, zero walls of text
//   - 2 large, confident, distraction-free touch actions: Drop Off & Pick Up
// ==============================================================================
export function HomeScreen(props) {
  const onStartDropoff = props.onStartDropoff;
  const onStartPickup = props.onStartPickup;
  const stationId = props.stationId || ENV.stationId;

  const [currentTime, setCurrentTime] = useState('');

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

  return (
    <View style={styles.container}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. QUIET MINIMAL TOP BAR                                      */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.topBar}>
        <View style={styles.stationGroup}>
          <Text style={styles.brandName}>Smart Locker</Text>
          <Text style={styles.stationDivider}>/</Text>
          <Text style={styles.stationCode}>{stationId}</Text>
        </View>

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
          
          {/* Button 1: Drop Off (Safety Orange #ea580c) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onStartDropoff}
            style={styles.dropoffBtn}
          >
            <View style={styles.btnTextCol}>
              <Text style={styles.dropoffTitle}>Drop Off</Text>
              <Text style={styles.dropoffSubtitle}>Leave clothes for wash & fold</Text>
            </View>
            <Text style={styles.arrowWhite}>→</Text>
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
          Contactless 24/7 &bull; {stationId}
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
