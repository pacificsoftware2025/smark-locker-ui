import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ScrollView, 
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { COLORS, FONTS } from '../theme';
import { LAUNDRY_SERVICES, LOAD_SIZES } from '../constants/laundry';

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
  const stationId = props.stationId || 'CMH-01';
  const assignedBox = props.assignedBox || '03';

  // Selected Service Options States
  const [selectedService, setSelectedService] = useState('Wash, Dry & Fold');
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [temperature, setTemperature] = useState('Cold'); // 'Cold' | 'Warm'
  const [fabricSoftener, setFabricSoftener] = useState(true); // true = Yes, false = No
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Solenoid door actuation spinner state
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Triggered when user taps "Save Preference & Unlock Locker"
  function handleUnlockPress() {
    setIsUnlocking(true);

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

    // Simulate 1.2s hardware relay energize state, then call parent callback
    setTimeout(function () {
      setIsUnlocking(false);
      onSaveAndUnlock(orderPreferences);
    }, 1200);
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
                  <Text style={styles.boxText}>Compartment #{assignedBox}</Text>
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
                  return (
                    <TouchableOpacity
                      key={size.id}
                      activeOpacity={0.8}
                      onPress={function () { setSelectedSize(size.label); }}
                      style={[
                        styles.sizeBtn,
                        isSizeActive && styles.sizeBtnActive,
                      ]}
                    >
                      <Text style={[styles.sizeLabel, isSizeActive && styles.sizeLabelActive]}>
                        {size.label}
                      </Text>
                      <Text style={[styles.sizeKg, isSizeActive && styles.sizeKgActive]}>
                        {size.maxKg}
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
              disabled={isUnlocking}
              style={[styles.unlockBtn, isUnlocking && styles.unlockBtnDisabled]}
            >
              {isUnlocking ? (
                <View style={styles.unlockingRow}>
                  <ActivityIndicator color={COLORS.white} size="small" />
                  <Text style={styles.unlockBtnText}>Opening Box #{assignedBox}...</Text>
                </View>
              ) : (
                <View style={styles.unlockingRow}>
                  <Text style={styles.unlockBtnText}>Save Preference & Unlock Locker</Text>
                  <Text style={styles.unlockBtnArrow}>→</Text>
                </View>
              )}
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
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
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
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  modalTitle: {
    fontFamily: FONTS.family,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  modalSub: {
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: 0.5,
  },
  weighedTag: {
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  tileDesc: {
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
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
  sizeLabel: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  sizeLabelActive: {
    color: COLORS.orange,
  },
  sizeKg: {
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  instructionInput: {
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  noticeSub: {
    fontFamily: FONTS.family,
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
    fontFamily: FONTS.family,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
  },
  unlockBtnText: {
    fontFamily: FONTS.family,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
