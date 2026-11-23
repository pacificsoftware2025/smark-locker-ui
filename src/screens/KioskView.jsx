import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { HomeScreen } from './HomeScreen';
import { ContactDetailsScreen } from './ContactDetailsScreen';
import { ServicePreferenceModal } from './ServicePreferenceModal';
import { DoorOpenScreen } from './DoorOpenScreen';
import { PickupScreen } from './PickupScreen';
import { PickupPaymentModal } from './PickupPaymentModal';
import { AdminSetupModal } from './AdminSetupModal';
import { openLockerDoor } from '../native/LockerBridge';
import { submitDropoffOrder, fetchStationAvailability } from '../services/api';
import { loadMachineConfig } from '../services/storage';
import { COLORS } from '../theme/colors';
import { ENV } from '../config/env';

// ==============================================================================
// REACT NATIVE COMPONENT: KioskView
// The main orchestrator managing the state machine for the physical locker kiosk.
// Follows workflow.md strictly:
//   HOME -> DROPOFF_CONTACT -> DROPOFF_PREFERENCES -> DOOR_OPENED -> HOME
//   HOME -> PICKUP_PIN -> DOOR_OPENED -> HOME
// ==============================================================================
export function KioskView() {
  // Dynamic Station Profile (persisted across reboots via SharedPreferences/localStorage)
  const [machineConfig, setMachineConfig] = useState({
    stationId: ENV.stationId || 'CMH-01',
    stationName: ENV.stationName || 'Central Mall Depot',
    totalDoors: 16,
  });

  const stationId = machineConfig.stationId;

  // Admin Fleet Setup Modal state
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);

  // Load persisted machine profile on boot
  useEffect(function () {
    loadMachineConfig().then(function (cfg) {
      if (cfg && cfg.stationId) {
        setMachineConfig(cfg);
      }
    });
  }, []);

  // Current screen state
  // In Vanilla JS: let currentStep = 'HOME';
  const [currentStep, setCurrentStep] = useState('HOME');

  // Cashless QRPH Payment Gate state
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(null);

  // Order state accumulated across the customer session
  const [sessionOrder, setSessionOrder] = useState({
    customerName: '',
    contactNumber: '',
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
    setSessionOrder({
      customerName: '',
      contactNumber: '',
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
      };
    });
    setCurrentStep('DROPOFF_PREFERENCE');
  }

  // 3. Customer taps "Save Preference & Unlock Locker"
  async function handlePreferenceComplete(orderData) {
    const requestedBox = orderData.compartmentNumber || orderData.assignedBox || '03';

    // Full customer order payload sent to database
    const customerOrderPayload = {
      customerName: sessionOrder.customerName,
      contactNumber: sessionOrder.contactNumber,
      stationId: stationId,
      serviceTier: orderData.serviceTier,
      serviceSize: orderData.serviceSize,
      temperature: orderData.temperature,
      fabricSoftener: orderData.fabricSoftener,
      specialInstructions: orderData.specialInstructions,
      createdAt: new Date().toISOString(),
    };

    console.log('[KioskView] Submitting Drop-off Order to API:', customerOrderPayload);

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
            isStationFull={stationAvailability.isStationFull}
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
              onSaveAndUnlock={handlePreferenceComplete}
            />
          </View>
        )}

        {/* STEP 2C / 3B: DOOR OPENED & DEPOSIT INSTRUCTIONS */}
        {currentStep === 'DOOR_OPENED' && (
          <DoorOpenScreen
            stationId={stationId}
            assignedBox={sessionOrder.assignedBox}
            orderId={sessionOrder.orderId}
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
