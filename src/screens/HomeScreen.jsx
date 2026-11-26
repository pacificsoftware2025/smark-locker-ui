import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { ENV } from '../config/env';

// Official Brand Logo
import grabNGoLogo from '../assets/images/grabngo_logo.png';

// Step Illustrations (Clean transparent corners)
import step1DropoffImg from '../assets/images/step1_dropoff.png';
import step2WashDryImg from '../assets/images/step2_washdry.png';
import step3PickupImg from '../assets/images/step3_pickup.png';

// ==============================================================================
// REACT NATIVE COMPONENT: HomeScreen
// Commercial Self-Service Touchscreen Kiosk Interface:
//   - Top Bar: Official Grab 'n Go Bar Logo (with secret 5-tap Admin trigger), Live Clock, Station Badge, (i) Info Trigger
//   - Hero Header: Bold Welcome Title & Subtitle (24/7 badge removed as requested)
//   - Dual Wide Hero Action Cards: Drop Off (Safety Orange) & Pick Up (Emerald Green)
//   - "How Does This Work?" 3 Cards:
//       1. Drop Off Photo (Transparent corners, edge-to-edge fit) + "Drop Off"
//       2. Wash & Dry Care Photo (Transparent corners, edge-to-edge fit) + "Wash & Dry Care"
//       3. Pick Up Photo (Transparent corners, edge-to-edge fit) + "Pick Up"
//   - Footer: Positioned at bottom (page indicator bar removed as requested)
//   - Typography: Uniform Plus Jakarta Sans matching AdminSetupModal
//   - Fully responsive across phone, tablet, and commercial kiosk resolutions
//   - Strictly zero emojis across all UI elements and feedback messages
// ==============================================================================

const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

export function HomeScreen(props) {
  const onStartDropoff = props.onStartDropoff;
  const onStartPickup = props.onStartPickup;
  const onOpenAdmin = props.onOpenAdmin;
  const onNeedHelp = props.onNeedHelp;

  const stationId = props.stationId || ENV.stationId;
  const hardwareId = props.hardwareId || 'SLL-12901';
  const isStationFull = Boolean(props.isStationFull);
  const isStationBound = Boolean(props.isStationBound);
  const isConfigured = Boolean(stationId && stationId !== 'SETUP REQUIRED');
  const isReady = isConfigured && isStationBound;
  const isUnprovisioned = !isReady;

  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 540;

  const [currentTime, setCurrentTime] = useState('');
  const [adminTapCount, setAdminTapCount] = useState(0);
  const lastTapRef = useRef(0);

  // Live 24/7 Clock Updater
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

  // Technician Secret Gesture: 1 tap if unprovisioned, 5 taps if active
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

  // Drop-off validation handler
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
    if (onStartDropoff) {
      onStartDropoff();
    }
  }

  // Need help / info modal trigger
  function handleHelpPress() {
    if (onNeedHelp) {
      onNeedHelp();
      return;
    }
    Alert.alert(
      'Kiosk Information & Help',
      `Welcome to Grab n Go Bar Smart Laundry Locker.\n\n` +
      `How to use:\n` +
      `1. Drop Off: Deposit dirty clothes, choose wash preferences, and close the locker door.\n` +
      `2. Processing: Your clothes are washed, dried, and folded at our central facility.\n` +
      `3. Pick Up: Tap 'Pick Up' and enter the 6-digit claim PIN received via SMS.\n\n` +
      `Station ID: ${stationId}\n` +
      `Need immediate assistance? Call customer support: 0917-888-LOCK.`,
      [{ text: 'Close', style: 'cancel' }]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isCompact && styles.scrollContentCompact,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------------------------------------------------- */}
        {/* 1. TOP BAR: Official Logo, Clock, Station ID, Info Button     */}
        {/* ------------------------------------------------------------- */}
        <View style={styles.topBar}>
          
          {/* Brand Header with Official Logo (Secret 5-Tap Admin Trigger) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSecretAdminTap}
            style={styles.brandContainer}
            accessibilityLabel="Grab n Go Bar"
          >
            <Image
              source={grabNGoLogo}
              style={[styles.brandLogoImage, isCompact && styles.brandLogoImageCompact]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Top Right Controls: Clock, Station ID, Info Button */}
          <View style={styles.topRightControls}>
            <Text style={styles.clockText}>{currentTime || '12:35 PM'}</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSecretAdminTap}
              style={styles.stationBadge}
            >
              <View style={[styles.liveDot, isUnprovisioned && styles.liveDotWarning]} />
              <Text style={styles.stationBadgeText}>
                {!isConfigured ? 'SETUP' : !isStationBound ? `${stationId} (UNBOUND)` : stationId}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleHelpPress}
              style={styles.infoBtn}
              accessibilityLabel="Help and information"
            >
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ------------------------------------------------------------- */}
        {/* 2. HERO SECTION: Main Headline & Sub-headline                 */}
        {/* ------------------------------------------------------------- */}
        <View style={styles.heroSection}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            style={[styles.headline, isCompact && styles.headlineCompact]}
          >
            Welcome! How Can We Help You?
          </Text>

          <Text style={styles.subHeadline}>
            Select An Option Below To Get Started
          </Text>
        </View>

        {/* ------------------------------------------------------------- */}
        {/* 3. PRIMARY ACTION CARDS (DROP OFF & PICK UP)                  */}
        {/* ------------------------------------------------------------- */}
        <View style={[styles.cardsRow, isCompact && styles.cardsRowCompact]}>
          
          {/* CARD 1: DROP OFF LAUNDRY (Safety Orange Theme) */}
          <TouchableOpacity
            activeOpacity={isStationFull || isUnprovisioned ? 0.7 : 0.88}
            onPress={handleDropoffPress}
            style={[
              styles.actionCard,
              styles.dropoffCard,
              isCompact && styles.actionCardCompact,
              (isStationFull || isUnprovisioned) && styles.cardDisabled,
            ]}
          >
            {/* Background subtle geometric accents */}
            <View style={styles.cardAccentCircle} />

            {/* Top Icon Box */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBox}>
                <View style={styles.cardIconBasket}>
                  <View style={styles.cardIconLine} />
                  <View style={styles.cardIconArrowDown}>
                    <Text style={styles.cardIconSymbol}>↓</Text>
                  </View>
                </View>
              </View>

              {!isConfigured ? (
                <View style={styles.badgeSetup}>
                  <Text style={styles.badgeSetupText}>SETUP REQUIRED</Text>
                </View>
              ) : !isStationBound ? (
                <View style={styles.badgeUnbound}>
                  <Text style={styles.badgeUnboundText}>UNBOUND</Text>
                </View>
              ) : isStationFull ? (
                <View style={styles.badgeFull}>
                  <Text style={styles.badgeFullText}>STATION FULL</Text>
                </View>
              ) : null}
            </View>

            {/* Middle Title & Description */}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, isCompact && styles.cardTitleCompact]}>
                Drop Off Laundry
              </Text>
              <Text style={styles.cardSubtitle}>
                {!isReady
                  ? 'Technician machine setup required before accepting drop-offs.'
                  : isStationFull
                  ? 'All compartments currently occupied. Please check back later.'
                  : 'Deposit dirty clothes & set wash preferences today'}
              </Text>
            </View>

            {/* Bottom Floating Arrow Button */}
            <View style={styles.cardFooter}>
              <View style={styles.circleArrowBtn}>
                <Text style={styles.circleArrowSymbol}>›</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* CARD 2: PICK UP LAUNDRY (Emerald Green Theme) */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onStartPickup}
            style={[
              styles.actionCard,
              styles.pickupCard,
              isCompact && styles.actionCardCompact,
            ]}
          >
            {/* Background subtle geometric accents */}
            <View style={[styles.cardAccentCircle, styles.pickupAccentCircle]} />

            {/* Top Icon Box */}
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, styles.pickupIconBox]}>
                <View style={styles.cardIconBasket}>
                  <View style={styles.cardIconLine} />
                  <View style={styles.cardIconArrowDown}>
                    <Text style={[styles.cardIconSymbol, styles.pickupIconSymbol]}>↑</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Middle Title & Description */}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, isCompact && styles.cardTitleCompact]}>
                Pick Up Laundry
              </Text>
              <Text style={styles.cardSubtitle}>
                Claim clean laundry with PIN or QR code receipt
              </Text>
            </View>

            {/* Bottom Floating Arrow Button */}
            <View style={styles.cardFooter}>
              <View style={[styles.circleArrowBtn, styles.pickupCircleArrow]}>
                <Text style={[styles.circleArrowSymbol, styles.pickupCircleArrowSymbol]}>›</Text>
              </View>
            </View>
          </TouchableOpacity>

        </View>

        {/* ------------------------------------------------------------- */}
        {/* 4. "HOW DOES THIS WORK?" SECTION (CLEAN STEP CARDS)           */}
        {/* ------------------------------------------------------------- */}
        <View style={styles.guideSection}>
          
          <View style={styles.guideHeader}>
            <Text style={styles.guideTitle}>How Does This Work?</Text>
            <Text style={styles.guideSubtitle}>3 Simple Steps To Get Started</Text>
          </View>

          <View style={[styles.stepsRow, isCompact && styles.stepsRowCompact]}>
            
            {/* STEP 1: DROP OFF */}
            <View style={styles.stepCard}>
              <View style={styles.stepImageFrame}>
                <Image
                  source={step1DropoffImg}
                  style={styles.stepImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.stepCardFooter}>
                <Text style={styles.stepCardTitle}>Drop Off</Text>
              </View>
            </View>

            {/* STEP 2: WASH & DRY CARE */}
            <View style={styles.stepCard}>
              <View style={styles.stepImageFrame}>
                <Image
                  source={step2WashDryImg}
                  style={styles.stepImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.stepCardFooter}>
                <Text style={styles.stepCardTitle}>Wash & Dry Care</Text>
              </View>
            </View>

            {/* STEP 3: PICK UP */}
            <View style={styles.stepCard}>
              <View style={styles.stepImageFrame}>
                <Image
                  source={step3PickupImg}
                  style={styles.stepImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.stepCardFooter}>
                <Text style={styles.stepCardTitle}>Pick Up</Text>
              </View>
            </View>

          </View>

        </View>

        {/* ------------------------------------------------------------- */}
        {/* 5. FOOTER / QUIET STATUS BAR (MOVED DOWN TO BOTTOM)           */}
        {/* ------------------------------------------------------------- */}
        <View style={styles.footerBar}>
          <Text style={styles.footerText}>
            Grab n Go Bar &bull; Contactless 24/7 Smart Laundry Station
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  scrollContentCompact: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },

  // -------------------------------------------------------------
  // 1. TOP BAR
  // -------------------------------------------------------------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  brandLogoImage: {
    width: 130,
    height: 44,
  },
  brandLogoImageCompact: {
    width: 105,
    height: 36,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  stationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveDotWarning: {
    backgroundColor: '#f59e0b',
  },
  stationBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },

  // -------------------------------------------------------------
  // 2. HERO SECTION
  // -------------------------------------------------------------
  heroSection: {
    gap: 4,
    paddingTop: 6,
    paddingBottom: 0,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: 23,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  headlineCompact: {
    fontSize: 19,
    letterSpacing: -0.4,
  },
  subHeadline: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },

  // -------------------------------------------------------------
  // 3. PRIMARY ACTION CARDS (EQUAL TOP & BOTTOM MARGINS)
  // -------------------------------------------------------------
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  cardsRowCompact: {
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    minHeight: 180,
    borderRadius: 22,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  actionCardCompact: {
    padding: 14,
    minHeight: 160,
    borderRadius: 18,
  },
  dropoffCard: {
    backgroundColor: '#ea580c', // Safety Orange
  },
  pickupCard: {
    backgroundColor: '#059669', // Emerald Green
  },
  cardDisabled: {
    opacity: 0.65,
  },
  cardAccentCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickupAccentCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupIconBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  cardIconBasket: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconLine: {
    width: 14,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
    marginBottom: 2,
  },
  cardIconArrowDown: {
    alignItems: 'center',
  },
  cardIconSymbol: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  pickupIconSymbol: {
    color: '#ffffff',
  },
  badgeFull: {
    backgroundColor: '#b91c1c',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeFullText: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  badgeSetup: {
    backgroundColor: '#b45309',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeSetupText: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  badgeUnbound: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeUnboundText: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 4,
    marginVertical: 10,
  },
  cardTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  cardTitleCompact: {
    fontSize: 17,
  },
  cardSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  circleArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleArrowSymbol: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: -2,
    marginLeft: 1,
  },
  pickupCircleArrow: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  pickupCircleArrowSymbol: {
    color: '#ffffff',
  },

  // -------------------------------------------------------------
  // 4. "HOW DOES THIS WORK?" SECTION
  // -------------------------------------------------------------
  guideSection: {
    gap: 12,
    marginTop: 0,
    paddingTop: 0,
  },
  guideHeader: {
    gap: 2,
  },
  guideTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  guideSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  stepsRowCompact: {
    gap: 8,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  stepImageFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    padding: 0,
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  stepCardFooter: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  stepCardTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // -------------------------------------------------------------
  // 5. FOOTER (POSITIONED AT BOTTOM)
  // -------------------------------------------------------------
  footerBar: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 10,
    marginTop: 'auto',
  },
  footerText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
