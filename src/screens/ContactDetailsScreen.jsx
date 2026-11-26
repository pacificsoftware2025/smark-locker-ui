import React, { useState, useRef, useEffect } from 'react';
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
// REACT NATIVE COMPONENT: ContactDetailsScreen (GEMINI.md Rules 1, 2, 3 & 4)
// Step 2A: Customer Intake Form
//   - Built with standard beginner-friendly hooks only (useState, useRef, useEffect)
//   - Grounded with Vanilla JS / DOM comments per GEMINI.md Rule 2
//   - Large finger-friendly kiosk touch targets per GEMINI.md Rule 1
//   - Strictly zero emojis across all UI elements and feedback messages
// ==============================================================================

const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

// `props` works just like function parameters passed from parent KioskView:
// e.g., function ContactDetailsScreen({ onCancel, onNext, initialData })
export function ContactDetailsScreen(props) {
  const onCancel = props.onCancel;
  const onNext = props.onNext;
  const initialData = props.initialData || {};

  // useState stores form values in memory.
  // Think of each one like `let name = ''` in Vanilla JS, except calling `setName()`
  // automatically tells React Native to re-render the screen with the updated text.
  // Extract the 10-digit local subscriber number if returning from Step 2 (e.g. '+639171234567' -> '9171234567')
  const initialRawPhone = initialData.rawPhone
    ? String(initialData.rawPhone).replace(/^\+63/, '')
    : String(initialData.contactNumber || '').replace(/^\+63/, '');

  const [name, setName] = useState(initialData.customerName || '');
  const [phone, setPhone] = useState(initialRawPhone);
  const [phoneWarning, setPhoneWarning] = useState('');
  const [email, setEmail] = useState(initialData.email || initialData.customerEmail || '');
  const [isPrivacyChecked, setIsPrivacyChecked] = useState(Boolean(initialData.privacyAccepted));
  const [showPrivacyTooltip, setShowPrivacyTooltip] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // useRef works like a persistent Vanilla JS variable (`let scrollEl = null` or `let timerId = null`)
  // that survives screen re-renders without triggering an extra re-render when updated.
  const scrollViewRef = useRef(null);
  const tooltipTimerRef = useRef(null);

  // useEffect with `[]` runs cleanup when the user leaves this screen
  // (like clearing a `setTimeout` on `window.addEventListener('beforeunload', ...)`).
  useEffect(function () {
    return function () {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  // Shows the warning tooltip above the checkbox (like `tooltipEl.style.display = 'flex'` in Vanilla JS)
  // and scrolls the form down so the user sees it immediately.
  function showPrivacyWarningTooltip() {
    setShowPrivacyTooltip(true);

    if (scrollViewRef.current && scrollViewRef.current.scrollToEnd) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }

    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    tooltipTimerRef.current = setTimeout(function () {
      setShowPrivacyTooltip(false);
    }, 4500);
  }

  // Acts like `checkbox.addEventListener('click', ...)` in Vanilla JS
  function handleTogglePrivacyClick() {
    const nextCheckedValue = !isPrivacyChecked;
    setIsPrivacyChecked(nextCheckedValue);

    if (nextCheckedValue && showPrivacyTooltip) {
      setShowPrivacyTooltip(false);
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    }
  }

  // Opens the Privacy Policy modal when the user taps the "Privacy Policy" link.
  // `event.stopPropagation()` works just like Vanilla JS DOM events so clicking the link
  // does not bubble up and accidentally toggle the parent checkbox row.
  function handleOpenPrivacyModalClick(event) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    setShowPrivacyModal(true);
  }

  // Marks Privacy Policy as accepted and closes the modal
  function handleAcceptPrivacyModalClick() {
    setIsPrivacyChecked(true);
    setShowPrivacyTooltip(false);
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    setShowPrivacyModal(false);
  }

  // Sanitizes mobile input like `input.value.replace(/\D/g, '')` in Vanilla JS:
  // Allows up to 10 digits after "+63" and checks immediately if it starts with "9".
  function handlePhoneChange(text) {
    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length <= 10) {
      setPhone(digitsOnly);
      if (errorMessage) {
        setErrorMessage('');
      }
      if (digitsOnly.length > 0 && !digitsOnly.startsWith('9')) {
        setPhoneWarning('Enter a valid mobile number (must start with 9).');
      } else {
        setPhoneWarning('');
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

  // Validates form fields before advancing to Step 2 (Service Selection)
  function handleNextServicesClick() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!isPrivacyChecked) {
      showPrivacyWarningTooltip();
    }

    if (trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 letters).');
      return;
    }

    // Philippine +63 Standard: must be exactly 10 digits starting with 9 (e.g. +63 9171234567)
    if (trimmedPhone.length !== 10 || !trimmedPhone.startsWith('9')) {
      setPhoneWarning('Enter a valid mobile number.');
      setErrorMessage('Please enter a valid mobile number (10 digits starting with 9).');
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

    // Block advancing if Privacy Policy checklist is unchecked
    if (!isPrivacyChecked) {
      setErrorMessage('');
      return;
    }

    // Combine "+63" prefix with the 10-digit subscriber number (like `'+63' + trimmedPhone` in Vanilla JS)
    const formattedE164Phone = '+63' + trimmedPhone;

    // Pass validated customer data up to parent KioskView
    onNext({
      customerName: trimmedName,
      contactNumber: formattedE164Phone,
      rawPhone: trimmedPhone,
      email: trimmedEmail,
      customerEmail: trimmedEmail,
      privacyAccepted: true,
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
        ref={scrollViewRef}
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

        {/* 2. Philippine Mobile Number Input (PH +63 followed by 10 digits starting with 9) */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
          <View
            style={[
              styles.fieldBox,
              phoneWarning !== '' && styles.fieldBoxWarning,
            ]}
          >
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryPrefix}>PH +63</Text>
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
          {phoneWarning !== '' ? (
            <Text style={styles.phoneWarningText}>{phoneWarning}</Text>
          ) : (
            <Text style={styles.hintText}>Enter 10 digits starting with 9 (e.g. 917 123 4567).</Text>
          )}
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

        {/* 4. Privacy Policy Checklist + Floating Tooltip Warning */}
        <View style={styles.privacyChecklistWrapper}>
          {showPrivacyTooltip && !isPrivacyChecked && (
            <View style={styles.tooltipContainer}>
              <View style={styles.tooltipBubble}>
                <View style={styles.tooltipIconBadge}>
                  <Text style={styles.tooltipIconText}>!</Text>
                </View>
                <Text style={styles.tooltipText}>
                  Please check the Privacy Policy box before proceeding.
                </Text>
              </View>
              <View style={styles.tooltipArrow} />
            </View>
          )}

          <View
            style={[
              styles.privacyCheckRow,
              showPrivacyTooltip && !isPrivacyChecked && styles.privacyCheckRowWarning,
              isPrivacyChecked && styles.privacyCheckRowActive,
            ]}
          >
            {/* TouchableOpacity listens for finger taps like element.addEventListener('click', ...) */}
            {/* hitSlop expands the invisible touch area for easy physical kiosk tapping (Rule 1) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleTogglePrivacyClick}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isPrivacyChecked }}
              style={[
                styles.checkboxSquare,
                showPrivacyTooltip && !isPrivacyChecked && styles.checkboxSquareWarning,
                isPrivacyChecked && styles.checkboxSquareChecked,
              ]}
            >
              {isPrivacyChecked && <View style={styles.checkmarkIcon} />}
            </TouchableOpacity>

            <Text
              onPress={handleTogglePrivacyClick}
              style={styles.privacyCheckLabel}
            >
              I have read and agree to the{' '}
              <Text
                onPress={handleOpenPrivacyModalClick}
                style={styles.privacyHighlightText}
              >
                Privacy Policy
              </Text>
              {' '}and consent to receive locker claim codes and order updates.
            </Text>
          </View>
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
          onPress={handleNextServicesClick}
          style={[
            styles.nextBtn,
            !isPrivacyChecked && styles.nextBtnUnchecked,
          ]}
        >
          <Text style={styles.nextBtnText}>Next: Select Services</Text>
          <View style={styles.nextBtnArrowCircle}>
            <Text style={styles.nextBtnArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* PRIVACY POLICY MODAL (Acts like an HTML <dialog> overlay)     */}
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
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
              onPress={handleAcceptPrivacyModalClick}
              style={styles.modalActionBtn}
            >
              <Text style={styles.modalActionBtnText}>I Understand & Agree</Text>
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
  fieldBoxWarning: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.slate200,
  },
  countryPrefix: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: 0.3,
  },
  phoneWarningText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
    marginLeft: 4,
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
  nextBtnUnchecked: {
    opacity: 0.72,
    shadowOpacity: 0.1,
  },
  privacyChecklistWrapper: {
    position: 'relative',
    marginTop: 4,
  },
  tooltipContainer: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  tooltipBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  tooltipIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipIconText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.white,
  },
  tooltipText: {
    fontFamily: FONT_FAMILY,
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 18,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    marginLeft: 19,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0f172a',
  },
  privacyCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    backgroundColor: COLORS.slate50,
  },
  privacyCheckRowWarning: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  privacyCheckRowActive: {
    borderColor: 'rgba(234, 88, 12, 0.35)',
    backgroundColor: '#fff7ed',
  },
  checkboxSquare: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareWarning: {
    borderColor: '#ea580c',
  },
  checkboxSquareChecked: {
    borderColor: '#ea580c',
    backgroundColor: '#ea580c',
  },
  checkmarkIcon: {
    width: 11,
    height: 6,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: COLORS.white,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  privacyCheckLabel: {
    fontFamily: FONT_FAMILY,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate700,
    lineHeight: 19,
  },
  privacyHighlightText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    color: '#ea580c',
    textDecorationLine: 'underline',
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
