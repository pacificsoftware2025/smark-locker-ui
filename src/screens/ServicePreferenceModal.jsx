import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ScrollView, 
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../theme';
import { LAUNDRY_SERVICES, LOAD_SIZES } from '../constants/laundry';

// Same Plus Jakarta Sans font family used in OrderSummaryScreen
const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

// ==============================================================================
// REACT NATIVE COMPONENT: ServicePreferenceModal
// Step 2B: Laundry preferences sheet matching Image 1.
//
// In Vanilla JS:
//   function renderPreferences(stationData) {
//     let selectedTier = 'Wash, Dry & Fold';
//     let size = 'Medium';
//     saveButton.addEventListener('click', onUnlockClick);
//   }
// ==============================================================================
export function ServicePreferenceModal(props) {
  const visible = props.visible;
  const onClose = props.onClose;
  const onSaveAndUnlock = props.onSaveAndUnlock;
  const stationId = props.stationId || 'SETUP REQUIRED';
  const assignedBox = props.assignedBox || '03';
  const sizeAvailability = props.sizeAvailability || { small: 4, medium: 8, large: 4 };
  const initialPreferences = props.initialPreferences || {};

  // Helper to verify if compartments exist for a size
  function isSizeAvailable(sizeName) {
    const key = (sizeName || '').toLowerCase();
    return (sizeAvailability[key] ?? 1) > 0;
  }

  // Selected Service Options States
  const [selectedService, setSelectedService] = useState(initialPreferences.serviceTier || 'Wash, Dry & Fold');
  const [selectedSize, setSelectedSize] = useState(function () {
    if (initialPreferences.serviceSize && isSizeAvailable(initialPreferences.serviceSize)) {
      return initialPreferences.serviceSize;
    }
    if (isSizeAvailable('Medium')) return 'Medium';
    if (isSizeAvailable('Small')) return 'Small';
    if (isSizeAvailable('Large')) return 'Large';
    return 'Medium';
  });
  const [temperature, setTemperature] = useState(initialPreferences.temperature || 'Cold'); // 'Cold' | 'Warm'
  const [fabricSoftener, setFabricSoftener] = useState(initialPreferences.fabricSoftener !== undefined ? initialPreferences.fabricSoftener : true); // true = Yes, false = No
  const [specialInstructions, setSpecialInstructions] = useState(initialPreferences.specialInstructions || '');
  
  // Solenoid door actuation spinner state
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Sync initialPreferences when modal opens/changes
  useEffect(function () {
    if (visible && props.initialPreferences) {
      if (props.initialPreferences.serviceTier) setSelectedService(props.initialPreferences.serviceTier);
      if (props.initialPreferences.serviceSize) setSelectedSize(props.initialPreferences.serviceSize);
      if (props.initialPreferences.temperature) setTemperature(props.initialPreferences.temperature);
      if (props.initialPreferences.fabricSoftener !== undefined) setFabricSoftener(props.initialPreferences.fabricSoftener);
      if (props.initialPreferences.specialInstructions !== undefined) setSpecialInstructions(props.initialPreferences.specialInstructions);
    }
  }, [visible, props.initialPreferences]);

  // Auto-switch to an available size if the currently selected size becomes full
  useEffect(function () {
    if (!isSizeAvailable(selectedSize)) {
      const firstAvailable = LOAD_SIZES.find(function (s) {
        return isSizeAvailable(s.label);
      });
      if (firstAvailable) {
        setSelectedSize(firstAvailable.label);
      }
    }
  }, [sizeAvailability]);

  // Triggered when user taps "Continue to Order Summary"
  function handleUnlockPress() {
    if (!isSizeAvailable(selectedSize)) {
      Alert.alert(
        'Compartment Size Full',
        `All ${selectedSize} locker compartments are currently occupied. Please choose another size.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Prepare complete order payload
    const orderPreferences = {
      serviceTier: selectedService,
      serviceSize: selectedSize,
      temperature: temperature,
      fabricSoftener: fabricSoftener,
      specialInstructions: specialInstructions.trim() || 'Standard care',
      compartmentNumber: assignedBox, // Explicit locker compartment number
      boxNumber: assignedBox,
      assignedBox: assignedBox,
      stationId: stationId,
    };

    onSaveAndUnlock(orderPreferences);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          
          {/* ----------------------------------------------------------- */}
          {/* MODAL HEADER: Station Pill, Box Pill, Close Button          */}
          {/* ----------------------------------------------------------- */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeRow}>
                <View style={styles.stationBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.stationText}>{stationId}</Text>
                </View>
                
                <View style={styles.boxBadge}>
                  <Text style={styles.boxText}>{selectedSize} Compartment</Text>
                </View>
              </View>

              <Text style={styles.modalTitle}>Select Service & Drop Off</Text>
              <Text style={styles.modalSub}>
                Configure wash preferences before door unlocks.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              disabled={isUnlocking}
              style={styles.closeBtn}
              accessibilityLabel="Close modal"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ----------------------------------------------------------- */}
          {/* SCROLLABLE FORM BODY                                        */}
          {/* ----------------------------------------------------------- */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            
            {/* 1. LAUNDRY SERVICE TIER */}
            <View style={styles.sectionBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>LAUNDRY SERVICE TIER</Text>
                <Text style={styles.weighedTag}>Weighed at Laundry Shop</Text>
              </View>

              <View style={styles.serviceStack}>
                {LAUNDRY_SERVICES.map(function (service) {
                  const isSelected = selectedService === service.label;
                  return (
                    <TouchableOpacity
                      key={service.id}
                      activeOpacity={0.8}
                      onPress={function () { setSelectedService(service.label); }}
                      style={[
                        styles.serviceTile,
                        isSelected && styles.serviceTileSelected,
                      ]}
                    >
                      <View style={styles.tileLeft}>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <Text style={styles.radioCheckmark}>✓</Text>}
                        </View>
                        <View style={styles.tileInfo}>
                          <Text style={styles.tileName}>{service.label}</Text>
                          <Text style={styles.tileDesc}>{service.description}</Text>
                        </View>
                      </View>

                      <View style={[styles.priceChip, isSelected && styles.priceChipSelected]}>
                        <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                          {service.basePrice}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. SELECT LAUNDRY SERVICE SIZE */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>SELECT LAUNDRY SERVICE SIZE</Text>
              <View style={styles.sizeGrid}>
                {LOAD_SIZES.map(function (size) {
                  const isSizeActive = selectedSize === size.label;
                  const available = isSizeAvailable(size.label);

                  return (
                    <TouchableOpacity
                      key={size.id}
                      activeOpacity={available ? 0.8 : 1}
                      onPress={function () {
                        if (!available) {
                          Alert.alert(
                            'Size Occupied',
                            `All ${size.label} locker compartments are currently occupied. Please choose another available size.`,
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        setSelectedSize(size.label);
                      }}
                      style={[
                        styles.sizeBtn,
                        isSizeActive && styles.sizeBtnActive,
                        !available && styles.sizeBtnDisabled,
                      ]}
                    >
                      <View style={styles.sizeTitleRow}>
                        <Text style={[
                          styles.sizeLabel, 
                          isSizeActive && styles.sizeLabelActive,
                          !available && styles.sizeLabelDisabled
                        ]}>
                          {size.label}
                        </Text>
                        {!available && (
                          <View style={styles.sizeFullBadge}>
                            <Text style={styles.sizeFullBadgeText}>FULL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.sizeKg, 
                        isSizeActive && styles.sizeKgActive,
                        !available && styles.sizeKgDisabled
                      ]}>
                        {!available ? '0 Available' : size.maxKg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. WATER TEMP & FABRIC SOFTENER (2 Columns) */}
            <View style={styles.optionsTwoCol}>
              
              {/* Water Temperature */}
              <View style={styles.optionCol}>
                <Text style={styles.sectionLabel}>WATER TEMPERATURE</Text>
                <View style={styles.segmentedGroup}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={function () { setTemperature('Cold'); }}
                    style={[
                      styles.segmentBtn,
                      temperature === 'Cold' && styles.segmentBtnSlateActive,
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      temperature === 'Cold' && styles.segmentTextActive,
                    ]}>
                      Cold
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={function () { setTemperature('Warm'); }}
                    style={[
                      styles.segmentBtn,
                      temperature === 'Warm' && styles.segmentBtnOrangeActive,
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      temperature === 'Warm' && styles.segmentTextActive,
                    ]}>
                      Warm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fabric Softener */}
              <View style={styles.optionCol}>
                <Text style={styles.sectionLabel}>FABRIC SOFTENER</Text>
                <View style={styles.segmentedGroup}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={function () { setFabricSoftener(true); }}
                    style={[
                      styles.segmentBtn,
                      fabricSoftener === true && styles.segmentBtnEmeraldActive,
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      fabricSoftener === true && styles.segmentTextActive,
                    ]}>
                      Yes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={function () { setFabricSoftener(false); }}
                    style={[
                      styles.segmentBtn,
                      fabricSoftener === false && styles.segmentBtnSlateActive,
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      fabricSoftener === false && styles.segmentTextActive,
                    ]}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>

            {/* 4. SPECIAL INSTRUCTIONS */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>SPECIAL INSTRUCTIONS</Text>
              <TextInput
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline={true}
                numberOfLines={3}
                placeholder="Special instructions (e.g. delicate fabrics, separate whites, baby hypoallergenic detergent)..."
                placeholderTextColor={COLORS.slate400}
                style={styles.instructionInput}
              />
            </View>

            {/* 5. PRICING NOTICE BANNER */}
            <View style={styles.noticeCard}>
              <View style={styles.noticeDot} />
              <View style={styles.noticeTextCol}>
                <Text style={styles.noticeTitle}>No payment due right now</Text>
                <Text style={styles.noticeSub}>
                  Final invoice will be calculated and sent after verified scale weighing at the laundry shop.
                </Text>
              </View>
            </View>

          </ScrollView>

          {/* ----------------------------------------------------------- */}
          {/* PRIMARY UNLOCK CTA BUTTON (Min 56px height)                 */}
          {/* ----------------------------------------------------------- */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleUnlockPress}
              style={styles.unlockBtn}
            >
              <View style={styles.unlockingRow}>
                <Text style={styles.unlockBtnText}>Continue to Order Summary</Text>
                <Text style={styles.unlockBtnArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
    marginRight: 6,
  },
  stationText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emeraldDark,
  },
  boxBadge: {
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  boxText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  modalTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  modalSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: COLORS.slate600,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  sectionBlock: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: 0.5,
  },
  weighedTag: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
    backgroundColor: COLORS.orangeSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceStack: {
    gap: 10,
  },
  serviceTile: {
    minHeight: 64, // Touch target >= 44px
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceTileSelected: {
    backgroundColor: COLORS.orangeSubtle,
    borderColor: COLORS.orange,
    borderWidth: 2,
  },
  tileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  radioCheckmark: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },
  tileInfo: {
    flex: 1,
    gap: 2,
  },
  tileName: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  tileDesc: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.slate600,
    lineHeight: 16,
  },
  priceChip: {
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  priceChipSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.orangeBorder,
  },
  priceText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  priceTextSelected: {
    color: COLORS.orange,
  },
  sizeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeBtn: {
    flex: 1,
    minHeight: 58,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  sizeBtnActive: {
    backgroundColor: COLORS.orangeSubtle,
    borderColor: COLORS.orange,
    borderWidth: 2,
  },
  sizeBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    opacity: 0.55,
  },
  sizeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeFullBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sizeFullBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sizeLabelDisabled: {
    color: '#94a3b8',
  },
  sizeKgDisabled: {
    color: '#94a3b8',
  },
  sizeLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  sizeLabelActive: {
    color: COLORS.orange,
  },
  sizeKg: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate500,
  },
  sizeKgActive: {
    color: COLORS.slate900,
    fontWeight: '700',
  },
  optionsTwoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCol: {
    flex: 1,
    gap: 6,
  },
  segmentedGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 46, // Touch target >= 44px
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnSlateActive: {
    backgroundColor: COLORS.slate900,
  },
  segmentBtnOrangeActive: {
    backgroundColor: COLORS.orange,
  },
  segmentBtnEmeraldActive: {
    backgroundColor: COLORS.emerald,
  },
  segmentText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  instructionInput: {
    fontFamily: FONT_FAMILY,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.slate900,
    textAlignVertical: 'top',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  noticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.slate400,
    marginTop: 5,
  },
  noticeTextCol: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  noticeSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.slate600,
    lineHeight: 16,
  },
  modalFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  unlockBtn: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    borderWidth: 1,
    borderColor: COLORS.orangeHover,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  unlockBtnDisabled: {
    opacity: 0.65,
  },
  unlockingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlockBtnArrow: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
  },
  unlockBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
