import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { HomeScreen } from './HomeScreen';
import { ContactDetailsScreen } from './ContactDetailsScreen';
import { ServicePreferenceModal } from './ServicePreferenceModal';
import { OrderSummaryScreen } from './OrderSummaryScreen';
import { DoorOpenScreen } from './DoorOpenScreen';
import { PickupScreen } from './PickupScreen';
import { PickupPaymentModal } from './PickupPaymentModal';
import { AdminSetupModal } from './AdminSetupModal';
import { IncomingPairingModal } from './IncomingPairingModal';
import { openLockerDoor } from '../native/LockerBridge';
import { submitDropoffOrder, fetchStationAvailability, pollPairingStatus, confirmPairingHandshake } from '../services/api';
import { loadMachineConfig, saveMachineConfig, getTerminalHardwareId } from '../services/storage';
import { COLORS } from '../theme/colors';
import { ENV, IS_WEB_STATIC_DEMO } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: KioskView
// The main orchestrator managing the state machine for the physical locker kiosk.
// Follows workflow.md strictly:
//   HOME -> DROPOFF_CONTACT -> DROPOFF_PREFERENCES -> DOOR_OPENED -> HOME
//   HOME -> PICKUP_PIN -> DOOR_OPENED -> HOME
// ==============================================================================
export function KioskView() {
  // Dynamic Station Profile (uses temporary static web station ONLY if IS_WEB_STATIC_DEMO is true)
  const [machineConfig, setMachineConfig] = useState({
    stationId: IS_WEB_STATIC_DEMO ? ENV.webStaticStationId : (ENV.stationId || 'SETUP REQUIRED'),
    stationName: IS_WEB_STATIC_DEMO ? ENV.webStaticStationName : (ENV.stationName || 'Unprovisioned Locker Station'),
    totalDoors: 16,
    hardwareId: IS_WEB_STATIC_DEMO ? ENV.webStaticStationId : getTerminalHardwareId(),
    bindingStatus: IS_WEB_STATIC_DEMO ? 'BOUND_ACTIVE' : 'UNBOUND',
  });

  const stationId = machineConfig.stationId;

  // Admin Fleet Setup Modal state
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);

  // Incoming Remote Hardware Pairing Handshake state
  const [incomingPairingRequest, setIncomingPairingRequest] = useState(null);
  const [isApprovingPairing, setIsApprovingPairing] = useState(false);

  // Load persisted machine profile on boot
  useEffect(function () {
    loadMachineConfig().then(function (cfg) {
      if (cfg && cfg.stationId) {
        setMachineConfig(cfg);
      }
    });
  }, []);

  // Background polling for remote pairing handshake
  useEffect(function () {
    const activeTerminalId = (machineConfig.stationId && machineConfig.stationId !== 'SETUP REQUIRED')
      ? machineConfig.stationId
      : (machineConfig.hardwareId || getTerminalHardwareId());

    if (!activeTerminalId || activeTerminalId === 'SETUP REQUIRED') return;

    let isMounted = true;

    async function checkIncomingPairing() {
      try {
        const res = await pollPairingStatus(activeTerminalId);
        if (isMounted && res && res.success) {
          // 1. If station was completely deleted/truncated from database, reset kiosk
          // (Skipped when temporary web static demo mode is enabled)
          if ((res.exists === false || res.bindingStatus === 'UNREGISTERED') && !IS_WEB_STATIC_DEMO) {
            if (machineConfig.stationId && machineConfig.stationId !== 'SETUP REQUIRED') {
              console.log('[KioskView] Station not found in database. Auto-resetting kiosk to SETUP REQUIRED.');
              const resetConfig = {
                stationId: 'SETUP REQUIRED',
                hardwareId: machineConfig.hardwareId || getTerminalHardwareId(),
                stationName: 'Unprovisioned Station',
                totalDoors: 16,
                locationTag: 'Level 1, Main Entrance',
                doorSizes: null,
                bindingStatus: 'UNBOUND',
              };
              await saveMachineConfig(resetConfig);
              setMachineConfig(resetConfig);
              return;
            }
          }

          // 2. Synchronize live binding status from PostgreSQL
          if (res.bindingStatus === 'BOUND_ACTIVE' && machineConfig.bindingStatus !== 'BOUND_ACTIVE') {
            const updated = {
              ...machineConfig,
              bindingStatus: 'BOUND_ACTIVE',
              operatorName: res.operatorName || 'Carlos Test',
            };
            await saveMachineConfig(updated);
            setMachineConfig(updated);
          } else if (res.bindingStatus === 'UNBOUND' && machineConfig.bindingStatus === 'BOUND_ACTIVE') {
            const updated = {
              ...machineConfig,
              bindingStatus: 'UNBOUND',
            };
            await saveMachineConfig(updated);
            setMachineConfig(updated);
          }

          // 3. Incoming pairing request from operator
          if (res.bindingStatus === 'PENDING_CONFIRMATION') {
            setIncomingPairingRequest({
              stationId: activeTerminalId,
              stationName: res.stationName || `Station ${activeTerminalId}`,
              address: res.address || 'Assigned Branch Location',
              pairingCode: res.pairingCode || '849201',
              totalDoors: res.totalDoors || res.total_compartments || 4,
              operatorName: res.operatorName || 'Carlos Test',
            });
          }
        }
      } catch (err) {
        // Quiet fail on network hiccups
      }
    }

    checkIncomingPairing();
    const interval = setInterval(checkIncomingPairing, 3000);

    return function () {
      isMounted = false;
      clearInterval(interval);
    };
  }, [machineConfig.stationId, machineConfig.hardwareId]);

  async function handleApprovePairing() {
    if (!incomingPairingRequest || isApprovingPairing) return;
    setIsApprovingPairing(true);

    try {
      await confirmPairingHandshake(
        incomingPairingRequest.stationId,
        incomingPairingRequest.pairingCode
      );

      const newConfig = {
        stationId: incomingPairingRequest.stationId,
        hardwareId: incomingPairingRequest.stationId,
        stationName: incomingPairingRequest.stationName,
        totalDoors: Number(incomingPairingRequest.totalDoors) || 4,
        locationTag: incomingPairingRequest.address,
        doorSizes: null,
        bindingStatus: 'BOUND_ACTIVE',
        operatorName: incomingPairingRequest.operatorName || 'Carlos Test',
      };

      await saveMachineConfig(newConfig);
      setMachineConfig(newConfig);
      setIncomingPairingRequest(null);
      Alert.alert(
        'Station Provisioned Successfully',
        `This locker kiosk is now paired and active as ${newConfig.stationId} (${newConfig.stationName}). Customer drop-off is now unlocked.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Pairing Error', err.message || 'Could not confirm pairing handshake.');
    } finally {
      setIsApprovingPairing(false);
    }
  }

  function handleDeclinePairing() {
    setIncomingPairingRequest(null);
  }

  // Current screen state
  // In Vanilla JS: let currentStep = 'HOME';
  const [currentStep, setCurrentStep] = useState('HOME');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Cashless QRPH Payment Gate state
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(null);

  // Order state accumulated across the customer session
  const [sessionOrder, setSessionOrder] = useState({
    customerName: '',
    contactNumber: '',
    email: '',
    customerEmail: '',
    assignedBox: '03',
    compartmentNumber: '03',
  });

  // Global 60-second inactivity timer reference
  // In Vanilla JS: let idleTimer = null;
  const idleTimerRef = useRef(null);

  // Live locker station availability state (determines if station is FULL and per-size capacity)
  const [stationAvailability, setStationAvailability] = useState({
    totalAvailable: 16,
    isStationFull: false,
    sizeAvailability: { small: 4, medium: 8, large: 4 },
  });

  // Query live box availability whenever customer is on HOME or DROPOFF_PREFERENCE screen
  useEffect(function () {
    if (currentStep === 'HOME' || currentStep === 'DROPOFF_PREFERENCE') {
      fetchStationAvailability(stationId).then(function (res) {
        if (res && res.success) {
          setStationAvailability({
            totalAvailable: res.totalAvailable,
            isStationFull: res.isStationFull,
            sizeAvailability: res.sizeAvailability || { small: 4, medium: 8, large: 4 },
          });
        }
      });
    }
  }, [currentStep, stationId]);

  // Resets the 60-second idle timer
  function resetIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Only run idle countdown when NOT on HOME or DOOR_OPENED screens
    if (currentStep !== 'HOME' && currentStep !== 'DOOR_OPENED') {
      idleTimerRef.current = setTimeout(function () {
        console.log(`Kiosk idle timeout reached (${ENV.sessionIdleTimeout}s). Returning to HOME.`);
        handleResetToHome();
      }, ENV.sessionIdleTimeout * 1000);
    }
  }

  // Set up timer trigger on step change
  useEffect(function () {
    resetIdleTimer();

    return function () {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [currentStep]);

  // Handler to clear state and return to Home Screen
  function handleResetToHome() {
    setCurrentStep('HOME');
    setIsSubmittingOrder(false);
    setSessionOrder({
      customerName: '',
      contactNumber: '',
      email: '',
      customerEmail: '',
      assignedBox: '03',
      compartmentNumber: '03',
    });
  }

  // 1. Customer taps "DROP OFF LAUNDRY"
  function handleStartDropoff() {
    setCurrentStep('DROPOFF_CONTACT');
  }

  // 2. Customer completes contact form, advances to Laundry Preferences
  function handleContactComplete(contactData) {
    setSessionOrder(function (prev) {
      return {
        ...prev,
        customerName: contactData.customerName,
        contactNumber: contactData.contactNumber,
        rawPhone: contactData.rawPhone || '',
        email: contactData.email || '',
        customerEmail: contactData.customerEmail || contactData.email || '',
        privacyAccepted: Boolean(contactData.privacyAccepted),
      };
    });
    setCurrentStep('DROPOFF_PREFERENCE');
  }

  // 3. Customer confirms laundry preferences -> Advance to Order Summary Screen
  function handlePreferenceComplete(orderPreferences) {
    setSessionOrder(function (prev) {
      return {
        ...prev,
        serviceTier: orderPreferences.serviceTier,
        serviceSize: orderPreferences.serviceSize,
        temperature: orderPreferences.temperature,
        fabricSoftener: orderPreferences.fabricSoftener,
        specialInstructions: orderPreferences.specialInstructions,
        compartmentNumber: orderPreferences.compartmentNumber || prev.compartmentNumber || '03',
        assignedBox: orderPreferences.assignedBox || prev.assignedBox || '03',
      };
    });
    setCurrentStep('DROPOFF_SUMMARY');
  }

  // 3B. Customer navigates back to preferences from summary screen
  function handleBackToPreferences() {
    setCurrentStep('DROPOFF_PREFERENCE');
  }

  // 3C. Customer confirms order summary -> Submit order, actuate physical solenoid door, and show DoorOpenScreen
  async function handleConfirmAndOpenLocker() {
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const customerOrderPayload = {
      customerName: sessionOrder.customerName,
      contactNumber: sessionOrder.contactNumber,
      email: sessionOrder.email || '',
      customerEmail: sessionOrder.customerEmail || sessionOrder.email || '',
      stationId: stationId,
      serviceTier: sessionOrder.serviceTier,
      serviceSize: sessionOrder.serviceSize,
      temperature: sessionOrder.temperature,
      fabricSoftener: sessionOrder.fabricSoftener,
      specialInstructions: sessionOrder.specialInstructions,
      createdAt: new Date().toISOString(),
    };

    console.log('[KioskView] Submitting Drop-off Order to API:', customerOrderPayload);

    try {
      // Call Backend API with automatic dynamic box allocation
      const apiResponse = await submitDropoffOrder(customerOrderPayload);

      // Fail-safe: If server rejected order (e.g. all lockers full), do NOT open door or advance screen
      if (!apiResponse || !apiResponse.success) {
        Alert.alert(
          'Station Full',
          apiResponse?.message || 'All locker compartments are currently occupied. Please try again later.',
          [{ text: 'OK', onPress: handleResetToHome }]
        );
        return;
      }

      const assignedCompartment = apiResponse.compartmentNumber || '01';
      const boxNumber = parseInt(assignedCompartment, 10);
      const boardId = 1;

      try {
        // Trigger native Java hardware bridge via React Native NativeModules
        // Note: openLockerDoor, 9600 baud, /dev/ttyS3, 200ms pulse remain strictly untouched
        await openLockerDoor(boardId, boxNumber);
      } catch (err) {
        console.error('Failed to actuate locker door:', err);
      }

      setSessionOrder(function (prev) {
        return {
          ...prev,
          orderId: apiResponse?.orderId || 'ORD-NEW',
          assignedBox: assignedCompartment,
          compartmentNumber: assignedCompartment,
        };
      });

      setCurrentStep('DOOR_OPENED');
    } catch (err) {
      console.error('[KioskView] Error submitting drop-off order:', err);
      Alert.alert(
        'Submission Error',
        err.message || 'Unable to submit your laundry order. Please check network connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  // 4. Customer taps "PICKUP LAUNDRY"
  function handleStartPickup() {
    setCurrentStep('PICKUP_PIN');
  }

  // 5. Customer enters valid PIN code -> Checks if payment is required
  function handlePickupUnlocked(pickupData) {
    // If order has an unpaid balance, present the Dynamic QRPH Payment Gate
    if (!pickupData.isPaid) {
      setPendingPaymentOrder(pickupData);
      setIsPaymentModalVisible(true);
      return;
    }

    // If already paid, release compartment immediately
    executeDoorUnlock(pickupData);
  }

  // Actuates physical solenoid and completes pickup
  async function executeDoorUnlock(orderData) {
    const boxNumber = parseInt(orderData.assignedBox || '5', 10);
    const boardId = 1;

    try {
      // Trigger native Java hardware bridge (untouched & identical)
      await openLockerDoor(boardId, boxNumber);
    } catch (err) {
      console.error('Failed to unlock pickup box:', err);
    }

    setSessionOrder(function (prev) {
      return {
        ...prev,
        orderId: orderData.orderId || prev.orderId || '',
        assignedBox: orderData.assignedBox || '05',
        customerName: orderData.customerName || 'Customer',
      };
    });

    setIsPaymentModalVisible(false);
    setCurrentStep('DOOR_OPENED');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* STEP 1: HOME SCREEN */}
        {currentStep === 'HOME' && (
          <HomeScreen
            stationId={stationId}
            hardwareId={machineConfig.hardwareId || getTerminalHardwareId()}
            isStationFull={stationAvailability.isStationFull}
            isStationBound={machineConfig.bindingStatus === 'BOUND_ACTIVE'}
            onStartDropoff={handleStartDropoff}
            onStartPickup={handleStartPickup}
            onOpenAdmin={() => setIsAdminModalVisible(true)}
          />
        )}

        {/* STEP 2A: CONTACT DETAILS */}
        {currentStep === 'DROPOFF_CONTACT' && (
          <ContactDetailsScreen
            onCancel={handleResetToHome}
            onNext={handleContactComplete}
            initialData={sessionOrder}
          />
        )}

        {/* STEP 2B: LAUNDRY PREFERENCE MODAL */}
        {currentStep === 'DROPOFF_PREFERENCE' && (
          <View style={styles.fill}>
            <HomeScreen
              stationId={stationId}
              isStationFull={stationAvailability.isStationFull}
              isStationBound={machineConfig.bindingStatus === 'BOUND_ACTIVE'}
              onStartDropoff={handleStartDropoff}
              onStartPickup={handleStartPickup}
              onOpenAdmin={() => setIsAdminModalVisible(true)}
            />
            <ServicePreferenceModal
              visible={true}
              onClose={handleResetToHome}
              stationId={stationId}
              assignedBox={sessionOrder.assignedBox || '03'}
              sizeAvailability={stationAvailability.sizeAvailability}
              initialPreferences={sessionOrder}
              onSaveAndUnlock={handlePreferenceComplete}
            />
          </View>
        )}

        {/* STEP 2C: PRE-UNLOCK ORDER SUMMARY SCREEN */}
        {currentStep === 'DROPOFF_SUMMARY' && (
          <OrderSummaryScreen
            stationId={stationId}
            orderData={sessionOrder}
            isSubmitting={isSubmittingOrder}
            onConfirmAndUnlock={handleConfirmAndOpenLocker}
            onEditPreferences={handleBackToPreferences}
            onCancel={handleResetToHome}
          />
        )}

        {/* STEP 2D / 3B: DOOR OPENED & DEPOSIT INSTRUCTIONS */}
        {currentStep === 'DOOR_OPENED' && (
          <DoorOpenScreen
            stationId={stationId}
            assignedBox={sessionOrder.assignedBox}
            orderId={sessionOrder.orderId}
            customerName={sessionOrder.customerName}
            onFinish={handleResetToHome}
          />
        )}

        {/* STEP 3A: PICKUP PIN ENTRY */}
        {currentStep === 'PICKUP_PIN' && (
          <PickupScreen
            onCancel={handleResetToHome}
            onUnlockSuccess={handlePickupUnlocked}
          />
        )}

        {/* STEP 3B: DYNAMIC QRPH / GCASH PAYMENT GATE */}
        <PickupPaymentModal
          visible={isPaymentModalVisible}
          order={pendingPaymentOrder}
          onClose={() => setIsPaymentModalVisible(false)}
          onPaymentSuccess={executeDoorUnlock}
        />

        {/* FLEET MANAGEMENT & TECHNICIAN ADMIN MODAL */}
        <AdminSetupModal
          visible={isAdminModalVisible}
          currentConfig={machineConfig}
          onConfigUpdated={(cfg) => {
            setMachineConfig(cfg);
          }}
          onClose={() => setIsAdminModalVisible(false)}
        />

        {/* INCOMING REMOTE BINDING MODAL */}
        <IncomingPairingModal
          visible={Boolean(incomingPairingRequest)}
          requestData={incomingPairingRequest}
          isApproving={isApprovingPairing}
          onApprove={handleApprovePairing}
          onDecline={handleDeclinePairing}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  fill: {
    flex: 1,
  },
});
