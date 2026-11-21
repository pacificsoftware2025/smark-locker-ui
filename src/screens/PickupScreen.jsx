import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { verifyPickupPin } from '../services/api';

// ==============================================================================
// REACT NATIVE COMPONENT: PickupScreen
// Step 3A: Allows customer to enter their 6-digit SMS claim PIN code.
// Built with an on-screen tactile touch numpad for physical kiosk screens.
// ==============================================================================
export function PickupScreen(props) {
  const onCancel = props.onCancel;
  const onUnlockSuccess = props.onUnlockSuccess;

  // 6-digit claim PIN code state
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Numpad key tap handler
  function handleKeyPress(digit) {
    if (pin.length < 6) {
      setPin(function (prev) {
        return prev + digit;
      });
      if (errorMessage) {
        setErrorMessage('');
      }
    }
  }

  function handleBackspace() {
    setPin(function (prev) {
      return prev.slice(0, -1);
    });
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function handleClear() {
    setPin('');
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  // Verifies the entered PIN with the backend API
  async function handleVerifyAndUnlock() {
    if (pin.length < 4) {
      setErrorMessage('Please enter your complete claim PIN code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const response = await verifyPickupPin(pin);
      setIsVerifying(false);

      if (response.success) {
        // Successfully verified -> passes full order & payment data
        onUnlockSuccess({
          orderId: response.orderId,
          assignedBox: response.assignedBox || '05',
          customerName: response.customerName || 'Customer',
          serviceTier: response.serviceTier,
          weightKg: response.weightKg,
          amount: response.amount,
          isPaid: response.isPaid,
          qrCodeUrl: response.qrCodeUrl,
        });
      } else {
        setErrorMessage(response.message || 'Invalid claim PIN. Please verify and try again.');
      }
    } catch (err) {
      setIsVerifying(false);
      setErrorMessage('Communication error. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      
      {/* ------------------------------------------------------------- */}
      {/* HEADER: Back Button & Title Badge                             */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onCancel}
          disabled={isVerifying}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Home</Text>
        </TouchableOpacity>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>LAUNDRY PICKUP</Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* PIN ENTRY & TOUCH NUMPAD                                      */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.body}>
        
        <View style={styles.titleGroup}>
          <Text style={styles.mainTitle}>Enter Claim PIN</Text>
          <Text style={styles.subTitle}>
            Enter the 4 to 6-digit security PIN sent to your phone via SMS.
          </Text>
        </View>

        {/* Validation Error Banner */}
        {errorMessage !== '' && (
          <View style={styles.alertBox}>
            <View style={styles.alertDot} />
            <Text style={styles.alertText}>{errorMessage}</Text>
          </View>
        )}

        {/* 6 Digit Display Boxes */}
        <View style={styles.pinBoxesRow}>
          {[0, 1, 2, 3, 4, 5].map(function (index) {
            const digit = pin[index];
            const isFilled = digit !== undefined;
            return (
              <View
                key={index}
                style={[styles.pinDigitBox, isFilled && styles.pinDigitBoxFilled]}
              >
                <Text style={styles.pinDigitText}>{isFilled ? digit : ''}</Text>
              </View>
            );
          })}
        </View>

        {/* Tactile Onscreen Kiosk Numpad (3x4 Grid) */}
        <View style={styles.numpadGrid}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (digit) {
            return (
              <TouchableOpacity
                key={digit}
                activeOpacity={0.7}
                onPress={function () { handleKeyPress(digit); }}
                disabled={isVerifying}
                style={styles.numpadKey}
              >
                <Text style={styles.numpadDigit}>{digit}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClear}
            disabled={isVerifying}
            style={[styles.numpadKey, styles.numpadKeyAction]}
          >
            <Text style={styles.actionClearText}>CLEAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={function () { handleKeyPress('0'); }}
            disabled={isVerifying}
            style={styles.numpadKey}
          >
            <Text style={styles.numpadDigit}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBackspace}
            disabled={isVerifying}
            style={[styles.numpadKey, styles.numpadKeyAction]}
          >
            <Text style={styles.actionBackspaceText}>⌫</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* ------------------------------------------------------------- */}
      {/* SUBMIT BUTTON (Min 56px Touch Target)                         */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleVerifyAndUnlock}
          disabled={pin.length < 4 || isVerifying}
          style={[
            styles.claimBtn,
            (pin.length < 4 || isVerifying) && styles.claimBtnDisabled,
          ]}
        >
          {isVerifying ? (
            <View style={styles.verifyingRow}>
              <ActivityIndicator color={COLORS.white} size="small" />
              <Text style={styles.claimBtnText}>Verifying with Locker...</Text>
            </View>
          ) : (
            <View style={styles.verifyingRow}>
              <Text style={styles.claimBtnText}>Unlock Locker Box</Text>
              <Text style={styles.claimBtnArrow}>→</Text>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 12,
  },
  backBtnArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate800,
    marginRight: 6,
  },
  backBtnText: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  headerBadge: {
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  headerBadgeText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate600,
    letterSpacing: 0.5,
  },
  body: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 4,
  },
  mainTitle: {
    fontFamily: FONTS.family,
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontFamily: FONTS.family,
    fontSize: 14,
    color: COLORS.slate600,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orangeSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.orangeBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    maxWidth: 320,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
  },
  alertText: {
    fontFamily: FONTS.family,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orangeHover,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  pinDigitBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    backgroundColor: COLORS.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigitBoxFilled: {
    borderColor: COLORS.slate900,
    backgroundColor: COLORS.white,
  },
  pinDigitText: {
    fontFamily: FONTS.family,
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.slate900,
  },
  numpadGrid: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  numpadKey: {
    width: '30%',
    minHeight: 58, // Touch target >= 44px
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadDigit: {
    fontFamily: FONTS.family,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  numpadKeyAction: {
    backgroundColor: COLORS.slate50,
  },
  actionClearText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.slate600,
    letterSpacing: 0.5,
  },
  actionBackspaceText: {
    fontFamily: FONTS.family,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.slate700,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  claimBtn: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    borderWidth: 1,
    borderColor: COLORS.orangeHover,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  claimBtnDisabled: {
    opacity: 0.45,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  claimBtnArrow: {
    fontFamily: FONTS.family,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
  },
  claimBtnText: {
    fontFamily: FONTS.family,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
