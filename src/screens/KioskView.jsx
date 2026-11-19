import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { HomeScreen } from './HomeScreen';
import { ContactDetailsScreen } from './ContactDetailsScreen';
import { ServicePreferenceModal } from './ServicePreferenceModal';
import { DoorOpenScreen } from './DoorOpenScreen';
import { PickupScreen } from './PickupScreen';
import { openLockerDoor } from '../native/LockerBridge';
import { submitDropoffOrder } from '../services/api';
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
  const stationId = ENV.stationId;

  // Current screen state
  // In Vanilla JS: let currentStep = 'HOME';
  const [currentStep, setCurrentStep] = useState('HOME');

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
      compartmentNumber: requestedBox,
      dropoffBoxNumber: requestedBox,
      serviceTier: orderData.serviceTier,
      serviceSize: orderData.serviceSize,
      temperature: orderData.temperature,
      fabricSoftener: orderData.fabricSoftener,
      specialInstructions: orderData.specialInstructions,
      createdAt: new Date().toISOString(),
    };

    console.log('[KioskView] Submitting Drop-off Order to API:', customerOrderPayload);

    // Call Backend API with automatic offline resilience
    const apiResponse = await submitDropoffOrder(customerOrderPayload);
    const assignedCompartment = apiResponse.compartmentNumber || requestedBox;
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

  // 5. Customer enters valid PIN code
  async function handlePickupUnlocked(pickupData) {
    const boxNumber = parseInt(pickupData.assignedBox || '5', 10);
    const boardId = 1;

    try {
      // Trigger native Java hardware bridge
      await openLockerDoor(boardId, boxNumber);
    } catch (err) {
      console.error('Failed to unlock pickup box:', err);
    }

    setSessionOrder(function (prev) {
      return {
        ...prev,
        assignedBox: pickupData.assignedBox || '05',
        customerName: pickupData.customerName || 'Customer',
      };
    });

    setCurrentStep('DOOR_OPENED');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* STEP 1: HOME SCREEN */}
        {currentStep === 'HOME' && (
          <HomeScreen
            stationId={stationId}
            onStartDropoff={handleStartDropoff}
            onStartPickup={handleStartPickup}
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
              onStartDropoff={handleStartDropoff}
              onStartPickup={handleStartPickup}
            />
            <ServicePreferenceModal
              visible={true}
              onClose={handleResetToHome}
              stationId={stationId}
              assignedBox={sessionOrder.assignedBox || '03'}
              onSaveAndUnlock={handlePreferenceComplete}
            />
          </View>
        )}

        {/* STEP 2C / 3B: DOOR OPENED & DEPOSIT INSTRUCTIONS */}
        {currentStep === 'DOOR_OPENED' && (
          <DoorOpenScreen
            stationId={stationId}
            assignedBox={sessionOrder.assignedBox}
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
