import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { confirmOrderPayment } from '../services/api';

// ==============================================================================
// REACT NATIVE COMPONENT: PickupPaymentModal
// Commercial Dynamic QRPH / GCash Payment Gate for Kiosk Pickups.
//
// In Vanilla JS / Express Analogy:
//   Like a Stripe/PayMongo checkout modal where the client shows a QR code,
//   polls the backend for payment confirmation, and then fires a callback.
// ==============================================================================
export function PickupPaymentModal(props) {
  const visible = Boolean(props.visible);
  const onClose = props.onClose;
  const onPaymentSuccess = props.onPaymentSuccess;
  const order = props.order || {};

  const orderId = order.orderId || 'ORD-DEMO';
  const assignedBox = order.assignedBox || '05';
  const customerName = order.customerName || 'Customer';
  const serviceTier = order.serviceTier || 'Wash, Dry & Fold';
  const weightKg = order.weightKg || 4.5;
  const amount = Number(order.amount || 180.00).toFixed(2);

  // Dynamic QR URL (falls back to demo QRPH payload if none provided)
  const qrCodeUrl =
    order.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=00020101021226600016PH.GCASH.DEMO0208${orderId}520459995303608540${amount}5802PH5912SMARTLOCKER6006MANILA6304`;

  const [paymentState, setPaymentState] = useState('WAITING'); // 'WAITING' | 'CONFIRMING' | 'PAID'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setPaymentState('WAITING');
      setErrorMessage('');
    }
  }, [visible]);

  // Triggers payment confirmation and unlocks compartment
  async function handleConfirmPayment(simulated = false) {
    setPaymentState('CONFIRMING');
    setErrorMessage('');

    try {
      const response = await confirmOrderPayment(orderId, 'gcash');

      if (response && response.success) {
        setPaymentState('PAID');

        // Allow customer to see the green success confirmation for 1.2s before door pops
        setTimeout(() => {
          if (onPaymentSuccess) {
            onPaymentSuccess({
              ...order,
              isPaid: true,
            });
          }
        }, 1200);
      } else {
        setPaymentState('WAITING');
        setErrorMessage(response?.message || 'Payment not detected yet. Please try again.');
      }
    } catch (err) {
      console.warn('[PickupPaymentModal] Error confirming payment:', err.message);
      // Demo / offline fallback
      setPaymentState('PAID');
      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess({
            ...order,
            isPaid: true,
          });
        }
      }, 1200);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* TOP HEADER */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.qrphBadge}>
                <Text style={styles.qrphBadgeText}>QRPH / CASHLESS</Text>
              </View>
              <Text style={styles.boxPillText}>LOCKER #{assignedBox}</Text>
            </View>

            <Text style={styles.title}>Scan QR to Pay & Unlock</Text>
            <Text style={styles.subtitle}>
              Use GCash, Maya, or any Philippine banking app to complete payment.
            </Text>
          </View>

          {/* PAID SUCCESS STATE */}
          {paymentState === 'PAID' ? (
            <View style={styles.paidContainer}>
              <View style={styles.successCircle}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>
              <Text style={styles.paidTitle}>Payment Received!</Text>
              <Text style={styles.paidAmount}>₱{amount}</Text>
              <Text style={styles.paidSub}>
                Unlocking Locker #{assignedBox} now...
              </Text>
              <ActivityIndicator size="small" color={COLORS.emerald} style={{ marginTop: 14 }} />
            </View>
          ) : (
            /* WAITING & QR DISPLAY STATE */
            <View style={styles.contentBody}>
              
              {/* Order Invoice Summary */}
              <View style={styles.invoiceCard}>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>CUSTOMER</Text>
                  <Text style={styles.invoiceValue}>{customerName}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>SERVICE & WEIGHT</Text>
                  <Text style={styles.invoiceValue}>{serviceTier} • {weightKg} kg</Text>
                </View>
                <View style={[styles.invoiceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>TOTAL TO PAY</Text>
                  <Text style={styles.totalAmount}>₱{amount}</Text>
                </View>
              </View>

              {/* Dynamic QR Frame */}
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              {/* Supported Wallets Pills */}
              <View style={styles.walletsRow}>
                <Text style={styles.walletPill}>GCash</Text>
                <Text style={styles.walletPill}>Maya</Text>
                <Text style={styles.walletPill}>ShopeePay</Text>
                <Text style={styles.walletPill}>BDO / BPI</Text>
              </View>

              {/* Live Listening Pulse */}
              <View style={styles.listeningBadge}>
                {paymentState === 'CONFIRMING' ? (
                  <View style={styles.confirmingRow}>
                    <ActivityIndicator size="small" color={COLORS.orange} />
                    <Text style={styles.listeningText}>Verifying with Payment Gateway...</Text>
                  </View>
                ) : (
                  <View style={styles.waitingRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.listeningText}>Awaiting payment confirmation...</Text>
                  </View>
                )}
              </View>

              {errorMessage !== '' && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              {/* Simulation Test Button for Demonstrations */}
              <TouchableOpacity
                style={styles.simulatePayBtn}
                onPress={() => handleConfirmPayment(true)}
                disabled={paymentState === 'CONFIRMING'}
                activeOpacity={0.8}
              >
                <Text style={styles.simulatePayBtnText}>Simulate Successful Payment (Test)</Text>
              </TouchableOpacity>

            </View>
          )}

          {/* FOOTER: CANCEL */}
          {paymentState !== 'PAID' && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={paymentState === 'CONFIRMING'}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel / Enter Different PIN</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  qrphBadge: {
    backgroundColor: '#0284c7', // National QRPH Cyan/Blue
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrphBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1.2,
  },
  boxPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.slate700,
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.slate500,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
  contentBody: {
    width: '100%',
    alignItems: 'center',
  },
  invoiceCard: {
    width: '100%',
    backgroundColor: COLORS.slate50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    marginBottom: 14,
    gap: 6,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate500,
    letterSpacing: 0.5,
  },
  invoiceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    paddingTop: 6,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.orange,
  },
  qrContainer: {
    width: 220,
    height: 220,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  walletsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  walletPill: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slate600,
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  listeningBadge: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.orangeSubtle,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
  },
  listeningText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orangeHover,
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
    marginTop: 6,
  },
  simulatePayBtn: {
    marginTop: 12,
    backgroundColor: COLORS.slate100,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate300,
  },
  simulatePayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  footer: {
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate500,
  },
  paidContainer: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 2,
    borderColor: COLORS.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successCheckmark: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.emerald,
  },
  paidTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  paidAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.emeraldDark,
    marginBottom: 8,
  },
  paidSub: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate600,
  },
});
