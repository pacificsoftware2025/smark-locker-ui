import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { COLORS, FONTS } from '../theme';

// ==============================================================================
// REACT NATIVE COMPONENT: IncomingPairingModal
// Industrial Kiosk Terminal Hardware Pairing Handshake Dialog:
// - Displays incoming remote binding requests from the Operator Dashboard
// - Enforces on-site physical presence confirmation
// - Strictly zero emojis across all UI elements
// ==============================================================================
export function IncomingPairingModal(props) {
  const visible = Boolean(props.visible);
  const requestData = props.requestData || {};
  const onApprove = props.onApprove;
  const onDecline = props.onDecline;
  const isApproving = Boolean(props.isApproving);

  if (!visible) return null;

  const stationName = requestData.stationName || 'Laundry Depot Station';
  const address = requestData.address || 'Assigned Location';
  const stationId = requestData.stationId || 'SLL-12901';
  const pairingCode = requestData.pairingCode || '849201';

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* TOP ACCENT HEADER */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>INCOMING PAIRING REQUEST</Text>
            </View>
            <Text style={styles.title}>Hardware Station Binding</Text>
            <Text style={styles.subtitle}>
              An operator from Central Management is requesting to remotely pair and provision this physical kiosk.
            </Text>
          </View>

          {/* STATION PROFILE DETAILS */}
          <View style={styles.detailsBlock}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned Machine ID:</Text>
              <Text style={styles.detailValuePrimary}>{stationId}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Station Display Name:</Text>
              <Text style={styles.detailValue}>{stationName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location / Branch:</Text>
              <Text style={styles.detailValue}>{address}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Capacity Configuration:</Text>
              <Text style={styles.detailValue}>16 Compartment Doors</Text>
            </View>

            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Security Verification Key</Text>
              <Text style={styles.codeValue}>{pairingCode}</Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onDecline}
              style={styles.declineBtn}
              disabled={isApproving}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onApprove}
              style={styles.approveBtn}
              disabled={isApproving}
            >
              <Text style={styles.approveBtnText}>
                {isApproving ? 'Authorizing...' : 'Approve & Bind Station'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    gap: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ea580c',
  },
  badgeText: {
    fontFamily: FONTS.family,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: FONTS.family,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: FONTS.family,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  detailsBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: FONTS.family,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontFamily: FONTS.family,
    fontSize: 12.5,
    color: '#1e293b',
    fontWeight: '800',
  },
  detailValuePrimary: {
    fontFamily: FONTS.family,
    fontSize: 14,
    color: '#ea580c',
    fontWeight: '900',
  },
  codeBox: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    gap: 4,
  },
  codeLabel: {
    fontFamily: FONTS.family,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeValue: {
    fontFamily: FONTS.family,
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  declineBtnText: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  approveBtn: {
    flex: 2,
    minHeight: 52,
    backgroundColor: '#ea580c',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  approveBtnText: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
});
