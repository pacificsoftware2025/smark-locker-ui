import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ENV } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: HomeScreen
// Premium, ultra-clean Kiosk Welcome Screen directly matching Image 1 aesthetic.
// Features:
//   1. Lush Safety Orange Curved Hero Header with Status Badges & Welcome Text
//   2. Floating Pure White Curved Card Container
//   3. High-Contrast Primary CTA (Drop Off) + Outlined Card CTA (Pickup)
//   4. Clean Minimal Footer
// ==============================================================================
export function HomeScreen(props) {
  const onStartDropoff = props.onStartDropoff;
  const onStartPickup = props.onStartPickup;
  const stationId = props.stationId || ENV.stationId;

  // Live digital clock (synced every second)
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
      {/* 1. TOP CURVED HERO HEADER (Image 1 Style - Safety Orange)     */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.heroSection}>
        
        {/* Top Status Bar: Clock + Live Hardware Status Pills */}
        <View style={styles.statusBarRow}>
          <Text style={styles.clockText}>{currentTime || '9:41'}</Text>
          
          <View style={styles.statusPillsWrapper}>
            <View style={styles.onlinePill}>
              <View style={styles.livePulseDot} />
              <Text style={styles.onlinePillText}>ONLINE</Text>
            </View>
            <View style={styles.stationPill}>
              <Text style={styles.stationPillText}>{stationId}</Text>
            </View>
          </View>
        </View>

        {/* Hero Welcome Typography */}
        <View style={styles.heroTextWrapper}>
          <Text style={styles.heroHeading}>Welcome Back</Text>
          <Text style={styles.heroSubheading}>
            Automated drop-off, real-time laundry tracking, & secure contact-free lockers.
          </Text>
        </View>

      </View>

      {/* ------------------------------------------------------------- */}
      {/* 2. FLOATING CURVED WHITE CARD CONTAINER                       */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.sheetCard}>
        
        {/* Pill Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.kioskPillBadge}>
            <Text style={styles.kioskPillText}>🔒 CONTACTLESS SELF-SERVICE</Text>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.actionsIntro}>
          <Text style={styles.sectionLabel}>HOW CAN WE HELP YOU TODAY?</Text>
        </View>

        {/* ----------------------------------------------------------- */}
        {/* BUTTON 1: DROP OFF LAUNDRY (Primary Safety Orange CTA)      */}
        {/* ----------------------------------------------------------- */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onStartDropoff}
          style={styles.primaryDropoffCard}
        >
          <View style={styles.cardLeft}>
            <View style={styles.dropoffIconCircle}>
              <Text style={styles.iconEmoji}>📦</Text>
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.dropoffTitle}>Drop Off Laundry</Text>
              <Text style={styles.dropoffSubtitle}>Deposit clothes for wash, dry & fold</Text>
            </View>
          </View>
          <View style={styles.arrowCircleWhite}>
            <Text style={styles.arrowTextOrange}>→</Text>
          </View>
        </TouchableOpacity>

        {/* ----------------------------------------------------------- */}
        {/* SUBTLE DIVIDER (Image 1 "─── OR ───")                       */}
        {/* ----------------------------------------------------------- */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerHairline} />
          <Text style={styles.dividerLabel}>OR</Text>
          <View style={styles.dividerHairline} />
        </View>

        {/* ----------------------------------------------------------- */}
        {/* BUTTON 2: PICK UP LAUNDRY (Clean Outlined Card from Image 1)*/}
        {/* ----------------------------------------------------------- */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onStartPickup}
          style={styles.secondaryPickupCard}
        >
          <View style={styles.cardLeft}>
            <View style={styles.pickupIconBox}>
              <Text style={styles.iconEmoji}>🔑</Text>
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.pickupTitle}>Pick Up Clean Laundry</Text>
              <Text style={styles.pickupSubtitle}>Claim clean items using your 6-digit PIN</Text>
            </View>
          </View>
          <Text style={styles.chevronGray}>→</Text>
        </TouchableOpacity>

        {/* Station Live Diagnostics Pill */}
        <View style={styles.stationHealthCard}>
          <View style={styles.healthDot} />
          <Text style={styles.healthText}>
            Locker Station Ready &bull; Touch any button to begin
          </Text>
        </View>

        {/* ----------------------------------------------------------- */}
        {/* 3. MINIMAL CLEAN FOOTER                                      */}
        {/* ----------------------------------------------------------- */}
        <View style={styles.footerSection}>
          <Text style={styles.footerBrand}>
            &copy; 2026 Smart Locker Depot &bull; Operational 24/7
          </Text>
        </View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.orange, // Deep Safety Orange #ea580c
  },

  // -------------------------------------------------------------
  // HERO BANNER SECTION (Image 1 Style)
  // -------------------------------------------------------------
  heroSection: {
    backgroundColor: COLORS.orange,
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 18,
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clockText: {
    fontFamily: FONTS.family,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  statusPillsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86efac', // Soft Emerald
  },
  onlinePillText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.6,
  },
  stationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  stationPillText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.6,
  },
  heroTextWrapper: {
    gap: 8,
    paddingTop: 8,
  },
  heroHeading: {
    fontFamily: FONTS.family,
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },
  heroSubheading: {
    fontFamily: FONTS.family,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.94)',
    lineHeight: 20,
    maxWidth: 340,
  },

  // -------------------------------------------------------------
  // FLOATING CURVED WHITE SHEET
  // -------------------------------------------------------------
  sheetCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    justifyContent: 'space-between',
    shadowColor: COLORS.slate900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  badgeRow: {
    alignItems: 'flex-start',
  },
  kioskPillBadge: {
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  kioskPillText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate600,
    letterSpacing: 0.6,
  },
  actionsIntro: {
    paddingTop: 4,
  },
  sectionLabel: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate400,
    letterSpacing: 1,
  },

  // -------------------------------------------------------------
  // BUTTON 1: DROP OFF LAUNDRY (Primary Safety Orange)
  // -------------------------------------------------------------
  primaryDropoffCard: {
    minHeight: 82, // Ergonomic touch target >= 44px
    backgroundColor: COLORS.orange,
    borderWidth: 1,
    borderColor: COLORS.orangeHover,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 5,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  dropoffIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  cardTextCol: {
    flex: 1,
    gap: 3,
  },
  dropoffTitle: {
    fontFamily: FONTS.family,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  dropoffSubtitle: {
    fontFamily: FONTS.family,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },
  arrowCircleWhite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  arrowTextOrange: {
    fontFamily: FONTS.family,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.orange,
  },

  // -------------------------------------------------------------
  // DIVIDER (OR)
  // -------------------------------------------------------------
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  dividerHairline: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.slate200,
  },
  dividerLabel: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate400,
    letterSpacing: 1.2,
  },

  // -------------------------------------------------------------
  // BUTTON 2: PICK UP LAUNDRY (Clean Outlined Card from Image 1)
  // -------------------------------------------------------------
  secondaryPickupCard: {
    minHeight: 82, // Ergonomic touch target >= 44px
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: COLORS.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pickupIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupTitle: {
    fontFamily: FONTS.family,
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: 0.2,
  },
  pickupSubtitle: {
    fontFamily: FONTS.family,
    fontSize: 12,
    color: COLORS.slate500,
    lineHeight: 16,
  },
  chevronGray: {
    fontFamily: FONTS.family,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.slate400,
    paddingRight: 6,
  },

  // -------------------------------------------------------------
  // STATION HEALTH INDICATOR
  // -------------------------------------------------------------
  stationHealthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    alignSelf: 'center',
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  healthText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate600,
  },

  // -------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------
  footerSection: {
    alignItems: 'center',
    paddingTop: 6,
  },
  footerBrand: {
    fontFamily: FONTS.family,
    fontSize: 11,
    color: COLORS.slate400,
    letterSpacing: 0.2,
  },
});
