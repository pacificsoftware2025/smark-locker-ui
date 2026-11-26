import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ENV } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: OrderSummaryScreen
// Step 2C: Pre-Unlock Laundry Order Summary & Confirmation Screen.
// Displays customer details and selected wash preferences before actuating the
// physical solenoid door latch.
// Strictly zero emojis across all UI states and feedback labels.
// ==============================================================================

const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

export function OrderSummaryScreen(props) {
  const orderData = props.orderData || {};
  const stationId = props.stationId || ENV.stationId;
  const onConfirmAndUnlock = props.onConfirmAndUnlock;
  const onEditPreferences = props.onEditPreferences;
  const onCancel = props.onCancel;
  const isSubmitting = Boolean(props.isSubmitting);

  const customerName = orderData.customerName || 'Customer';
  const customerEmail = orderData.email || orderData.customerEmail || '';

  // Clean formatting for Philippine mobile number (+639XXXXXXXXX or 09XXXXXXXXX)
  let rawPhone = String(orderData.contactNumber || '').trim();
  let formattedPhone = rawPhone;
  if (rawPhone.length === 13 && rawPhone.startsWith('+63')) {
    formattedPhone = `+63 ${rawPhone.slice(3, 6)} ${rawPhone.slice(6, 9)} ${rawPhone.slice(9)}`;
  } else if (rawPhone.length === 11 && rawPhone.startsWith('09')) {
    formattedPhone = `${rawPhone.slice(0, 4)} ${rawPhone.slice(4, 7)} ${rawPhone.slice(7)}`;
  } else if (!rawPhone) {
    formattedPhone = 'Not provided';
  }

  const serviceTier = orderData.serviceTier || 'Wash, Dry & Fold';
  const serviceSize = orderData.serviceSize || 'Medium';
  const temperature = orderData.temperature || 'Cold';
  const fabricSoftener = orderData.fabricSoftener ? 'Included (Gentle Care)' : 'None (Fragrance-Free)';
  const specialInstructions = orderData.specialInstructions || 'Standard care';

  return (
    <View style={styles.container}>
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP BAR: Station Indicator & Exit Action                   */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.topBar}>
        <View style={styles.stationBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.stationText}>Smart Locker / {stationId}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCancel}
          style={styles.cancelBtn}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 2. SCROLLABLE SUMMARY CONTENT                                 */}
      {/* ------------------------------------------------------------- */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <View style={styles.headerBlock}>
          <Text style={styles.headline}>Review Order Summary</Text>
          <Text style={styles.subline}>
            Please verify your laundry preferences before opening the locker compartment.
          </Text>
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          <View style={[styles.cardRow, !customerEmail && styles.noBorder]}>
            <Text style={styles.label}>Mobile Number</Text>
            <Text style={styles.valueHighlight}>{formattedPhone}</Text>
          </View>
          {Boolean(customerEmail) && (
            <View style={[styles.cardRow, styles.noBorder]}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{customerEmail}</Text>
            </View>
          )}
        </View>

        {/* Laundry Service & Wash Preferences Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Selected Laundry Service</Text>
            <View style={styles.badgeOrange}>
              <Text style={styles.badgeOrangeText}>{serviceTier}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Compartment / Load Size</Text>
            <Text style={styles.valueBold}>{serviceSize}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Water Temperature</Text>
            <Text style={styles.value}>{temperature} Wash</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Fabric Softener</Text>
            <Text style={styles.value}>{fabricSoftener}</Text>
          </View>

          <View style={[styles.cardRow, styles.noBorder]}>
            <Text style={styles.label}>Special Instructions</Text>
            <Text style={styles.valueItalic}>{specialInstructions}</Text>
          </View>
        </View>

        {/* Facility Notice Card */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <View style={styles.noticeDot} />
            <Text style={styles.noticeTitle}>Billing & Drop-off Notice</Text>
          </View>
          <Text style={styles.noticeText}>
            Your laundry bag will be weighed and billed accurately upon arrival at our central facility. An SMS with your tracking receipt and claim PIN will be transmitted to {formattedPhone}.{Boolean(customerEmail) ? ` Order status updates will also be emailed to ${customerEmail}.` : ''}
          </Text>
        </View>
      </ScrollView>

      {/* ------------------------------------------------------------- */}
      {/* 3. FIXED BOTTOM ACTIONS (CTA BUTTONS)                         */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onConfirmAndUnlock}
          disabled={isSubmitting}
          style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
        >
          {isSubmitting ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color={COLORS.white} size="small" />
              <Text style={styles.confirmBtnText}>Allocating & Opening Locker Door...</Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Text style={styles.confirmBtnText}>Open Locker Door & Deposit</Text>
              <Text style={styles.btnArrow}>→</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEditPreferences}
          disabled={isSubmitting}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>← Change Preferences</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'space-between',
  },

  // -------------------------------------------------------------
  // TOP BAR
  // -------------------------------------------------------------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  stationText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  // -------------------------------------------------------------
  // CONTENT AREA
  // -------------------------------------------------------------
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  headerBlock: {
    marginBottom: 4,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subline: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeOrange: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  badgeOrangeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  noBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  value: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  valueBold: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  valueHighlight: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orange,
  },
  valueItalic: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#475569',
    maxWidth: '55%',
    textAlign: 'right',
  },

  // Notice card
  noticeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  noticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  noticeTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  noticeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },

  // -------------------------------------------------------------
  // FOOTER ACTIONS
  // -------------------------------------------------------------
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: COLORS.orange,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  btnArrow: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  editBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  editBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
