import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';

// ==============================================================================
// REACT NATIVE COMPONENT: ContactDetailsScreen
// Step 2A: Captures customer name and +63 Philippine mobile number.
//
// In Vanilla JS:
//   let name = '';
//   let phone = '';
//   function onNextClick() {
//     if (!name) showError();
//     else proceed();
//   }
// ==============================================================================
export function ContactDetailsScreen(props) {
  const onCancel = props.onCancel;
  const onNext = props.onNext;
  const initialData = props.initialData || {};

  // Form input states
  // In Vanilla JS: let name = initialData.customerName || '';
  const [name, setName] = useState(initialData.customerName || '');
  const [phone, setPhone] = useState(initialData.rawPhone || '');

  // Error validation message
  const [errorMessage, setErrorMessage] = useState('');

  // Sanitizes phone number: numbers only, max 10 digits
  function handlePhoneChange(text) {
    const digitsOnly = text.replace(/\D/g, ''); // In Vanilla JS: remove non-digits
    if (digitsOnly.length <= 10) {
      setPhone(digitsOnly);
      if (errorMessage) {
        setErrorMessage('');
      }
    }
  }

  function handleNameChange(text) {
    setName(text);
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  // Validates inputs before proceeding
  function handleProceed() {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 letters).');
      return;
    }

    if (phone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number (e.g. 917 123 4567).');
      return;
    }

    if (!phone.startsWith('9')) {
      setErrorMessage('Philippine mobile numbers must start with 9.');
      return;
    }

    // Call onNext with validated data
    onNext({
      customerName: trimmedName,
      contactNumber: '+63' + phone,
      rawPhone: phone,
    });
  }

  return (
    <View style={styles.container}>
      
      {/* ------------------------------------------------------------- */}
      {/* HEADER: Back Button & Step Counter                            */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onCancel}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Home</Text>
        </TouchableOpacity>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 1 OF 2</Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* FORM BODY                                                     */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.formCard}>
        
        <View style={styles.formIntro}>
          <Text style={styles.formTitle}>Your Contact Details</Text>
          <Text style={styles.formSub}>
            We will send your locker claim code and order updates to this mobile number via SMS.
          </Text>
        </View>

        {/* Validation Error Alert */}
        {errorMessage !== '' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>{errorMessage}</Text>
          </View>
        )}

        {/* 1. Full Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldIcon}>👤</Text>
            <TextInput
              value={name}
              onChangeText={handleNameChange}
              placeholder="e.g. Maria Santos"
              placeholderTextColor={COLORS.slate400}
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* 2. Philippine Mobile Number Input (+63) */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>MOBILE NUMBER (SMS NOTIFICATIONS)</Text>
          <View style={styles.fieldBox}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryFlag}>🇵🇭</Text>
              <Text style={styles.countryPrefix}>+63</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="917 123 4567"
              placeholderTextColor={COLORS.slate400}
              style={[styles.textInput, styles.phoneInput]}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <Text style={styles.hintText}>Enter 10 digits starting with 9.</Text>
        </View>

      </View>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER BUTTONS (Min 56px Touch Targets)                       */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onCancel}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleProceed}
          style={styles.nextBtn}
        >
          <Text style={styles.nextBtnText}>Next: Select Services</Text>
          <Text style={styles.nextBtnArrow}>→</Text>
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
  stepBadge: {
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  stepBadgeText: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate500,
    letterSpacing: 0.5,
  },
  formCard: {
    paddingVertical: 16,
    gap: 18,
  },
  formIntro: {
    gap: 4,
  },
  formTitle: {
    fontFamily: FONTS.family,
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  formSub: {
    fontFamily: FONTS.family,
    fontSize: 14,
    color: COLORS.slate600,
    lineHeight: 20,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orangeSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.orangeBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    fontFamily: FONTS.family,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orangeHover,
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: 0.5,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginRight: 12,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.slate200,
    gap: 6,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryPrefix: {
    fontFamily: FONTS.family,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  textInput: {
    fontFamily: FONTS.family,
    flex: 1,
    height: 52,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  phoneInput: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  hintText: {
    fontFamily: FONTS.family,
    fontSize: 12,
    color: COLORS.slate500,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONTS.family,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  nextBtn: {
    flex: 2,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    borderWidth: 1,
    borderColor: COLORS.orangeHover,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  nextBtnText: {
    fontFamily: FONTS.family,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  nextBtnArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
});
