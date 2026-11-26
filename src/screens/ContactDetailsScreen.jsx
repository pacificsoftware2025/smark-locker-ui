import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { COLORS } from '../theme';

// ==============================================================================
// REACT NATIVE COMPONENT: ContactDetailsScreen
// Step 2A: Customer Intake Form
//   - Uses uniform Plus Jakarta Sans typography matching AdminSetupModal
//   - Input 1: Full Name (minimum 2 letters)
//   - Input 2: Mobile Number (Philippine standard: exactly 11 digits starting with 09)
//     (SMS NOTIFICATIONS text removed as requested)
//   - Input 3: Email Address (OPTIONAL) for laundry tracking status
//   - Scrollable container so software keyboards never obscure inputs or CTAs
//   - Strictly zero emojis across all UI elements and feedback messages
// ==============================================================================

const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

export function ContactDetailsScreen(props) {
  const onCancel = props.onCancel;
  const onNext = props.onNext;
  const initialData = props.initialData || {};

  // Form input states
  const [name, setName] = useState(initialData.customerName || '');
  const [phone, setPhone] = useState(initialData.rawPhone || initialData.contactNumber || '');
  const [email, setEmail] = useState(initialData.email || initialData.customerEmail || '');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Error validation message
  const [errorMessage, setErrorMessage] = useState('');

  // Sanitizes phone number: numbers only, max 11 digits
  function handlePhoneChange(text) {
    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length <= 11) {
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

  function handleEmailChange(text) {
    setEmail(text);
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  // Validates inputs before proceeding
  function handleProceed() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 letters).');
      return;
    }

    // Philippine Standard: exactly 11 digits starting with 09
    if (trimmedPhone.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit mobile number (e.g. 0917 123 4567).');
      return;
    }

    if (!trimmedPhone.startsWith('09')) {
      setErrorMessage('Philippine mobile numbers must start with 09 (e.g. 0917 123 4567).');
      return;
    }

    // Email is optional: validate format only if provided
    if (trimmedEmail !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setErrorMessage('Please enter a valid email address (e.g. maria.santos@gmail.com).');
        return;
      }
    }

    // Call onNext with validated data
    onNext({
      customerName: trimmedName,
      contactNumber: trimmedPhone, // Standard 11-digit PH mobile number
      rawPhone: trimmedPhone,
      email: trimmedEmail,
      customerEmail: trimmedEmail,
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
      {/* SCROLLABLE FORM BODY                                          */}
      {/* ------------------------------------------------------------- */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.formCard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formIntro}>
          <Text style={styles.formTitle}>Your Contact Details</Text>
          <Text style={styles.formSub}>
            We will send your locker claim code and order updates to your contact details.
          </Text>
        </View>

        {/* Validation Error Alert */}
        {errorMessage !== '' && (
          <View style={styles.alertBox}>
            <View style={styles.alertDot} />
            <Text style={styles.alertText}>{errorMessage}</Text>
          </View>
        )}

        {/* 1. Full Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.fieldBox}>
            <TextInput
              value={name}
              onChangeText={handleNameChange}
              placeholder="Fullname"
              placeholderTextColor={COLORS.slate400}
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* 2. Philippine Mobile Number Input (PH Standard: 11 Digits, 09XXXXXXXXX) */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
          <View style={styles.fieldBox}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryPrefix}>PH</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="0917 123 4567"
              placeholderTextColor={COLORS.slate400}
              style={[styles.textInput, styles.phoneInput]}
              keyboardType="number-pad"
              maxLength={11}
            />
          </View>
          <Text style={styles.hintText}>Enter 11 digits starting with 09 (e.g. 0917 123 4567).</Text>
        </View>

        {/* 3. Optional Email Input for Laundry Tracking Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
          <View style={styles.fieldBox}>
            <TextInput
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Email Address"
              placeholderTextColor={COLORS.slate400}
              style={styles.textInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.hintText}>Optional for laundry tracking status updates.</Text>
        </View>

        {/* 4. Privacy Policy (Content to follow) */}
        <View style={styles.privacyGroup}>
          <View style={styles.privacyHeaderRow}>
            <Text style={styles.fieldLabel}>PRIVACY POLICY</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={function () { setShowPrivacyModal(true); }}
              style={styles.privacyLinkHit}
            >
              <Text style={styles.privacyLinkText}>View details</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={function () { setShowPrivacyModal(true); }}
            style={styles.privacyBox}
          >
            <Text style={styles.privacyContentText}>Content to follow.</Text>
          </TouchableOpacity>
          <Text style={styles.hintText}>By proceeding, you agree to the customer privacy terms.</Text>
        </View>

      </ScrollView>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER BUTTONS                                                */}
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
          <View style={styles.nextBtnArrowCircle}>
            <Text style={styles.nextBtnArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* PRIVACY POLICY MODAL (Content to follow)                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={function () { setShowPrivacyModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity
                onPress={function () { setShowPrivacyModal(false); }}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalNoticeBadge}>
                <Text style={styles.modalNoticeBadgeText}>DATA PRIVACY</Text>
              </View>
              <Text style={styles.modalBodyTextBold}>Privacy Policy Terms</Text>
              <Text style={styles.modalContentNotice}>Content to follow.</Text>
              <Text style={styles.modalBodyText}>
                We value your privacy. Information gathered through this kiosk (full name, Philippine contact number, and optional email) is strictly used for locker claim codes, order tracking, and receipt notifications.
              </Text>
              <Text style={styles.modalBodyText}>
                The complete formal privacy policy content will be placed here.
              </Text>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={function () { setShowPrivacyModal(false); }}
              style={styles.modalActionBtn}
            >
              <Text style={styles.modalActionBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
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
    minHeight: 44,
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
    fontFamily: FONT_FAMILY,
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
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate500,
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
  },
  formCard: {
    paddingVertical: 14,
    gap: 16,
  },
  formIntro: {
    gap: 4,
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  formSub: {
    fontFamily: FONT_FAMILY,
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
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
  },
  alertText: {
    fontFamily: FONT_FAMILY,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orangeHover,
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: 0.5,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    marginRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.slate200,
  },
  countryPrefix: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate700,
    letterSpacing: 0.5,
  },
  textInput: {
    fontFamily: FONT_FAMILY,
    flex: 1,
    height: 50,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  phoneInput: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
  hintText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate500,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  nextBtn: {
    flex: 2,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#ea580c', // Exact Image 1 Drop Off Safety Orange
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  nextBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  nextBtnArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Circular arrow badge matching Image 1
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnArrow: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    marginLeft: 1,
    marginTop: -1,
  },
  privacyGroup: {
    gap: 6,
    marginTop: 2,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLinkHit: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  privacyLinkText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
    textDecorationLine: 'underline',
  },
  privacyBox: {
    minHeight: 48,
    backgroundColor: COLORS.slate50,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  privacyContentText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  modalTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  modalBody: {
    paddingVertical: 18,
  },
  modalNoticeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.orangeSubtle,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalNoticeBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  modalBodyTextBold: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 6,
  },
  modalContentNotice: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate700,
    marginBottom: 12,
  },
  modalBodyText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: COLORS.slate600,
    lineHeight: 20,
    marginBottom: 10,
  },
  modalActionBtn: {
    minHeight: 50,
    backgroundColor: '#ea580c',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalActionBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
});
