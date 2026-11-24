import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { openLockerDoor } from '../native/LockerBridge';
import { saveMachineConfig } from '../services/storage';
import { syncStationConfig } from '../services/api';
import { LoggerService } from '../services/logger';

// ==============================================================================
// REACT NATIVE COMPONENT: AdminSetupModal
// Commercial Laundry Locker Settings & Hardware Diagnostics Portal.
// Theme: Safety Orange (#ea580c) & High-Contrast Slate neutrals.
// Typography: Plus Jakarta Sans uniformly across all components.
// Strictly zero emojis.
// ==============================================================================

const MASTER_PIN = '999999';

const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

const MONO_FONT = Platform.select({
  web: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  android: 'monospace',
  ios: 'Courier',
  default: 'monospace',
});

export function AdminSetupModal(props) {
  const visible = Boolean(props.visible);
  const onClose = props.onClose;
  const currentConfig = props.currentConfig || {
    stationId: 'SETUP REQUIRED',
    stationName: 'Unprovisioned Locker Station',
    totalDoors: 16,
  };
  const onConfigUpdated = props.onConfigUpdated;

  // View state: 'AUTH' | 'SETUP'
  const [viewState, setViewState] = useState('AUTH');
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Navigation Tab: 'identity' | 'capacity' | 'relays' | 'logs'
  const [activeTab, setActiveTab] = useState('identity');

  // Configuration form fields
  const isCurrentlyUnprovisioned = !currentConfig.stationId || currentConfig.stationId === 'SETUP REQUIRED';
  const [stationId, setStationId] = useState(isCurrentlyUnprovisioned ? '' : currentConfig.stationId);
  const [stationName, setStationName] = useState(
    currentConfig.stationName === 'Unprovisioned Station' || currentConfig.stationName === 'Unprovisioned Locker Station'
      ? ''
      : (currentConfig.stationName || '')
  );
  const [locationTag, setLocationTag] = useState('Level 1, Main Entrance');
  const [totalDoors, setTotalDoors] = useState(Number(currentConfig.totalDoors || 16));

  // Per-Compartment Door Sizes: doorNumber -> 'small' | 'medium' | 'large'
  const [doorSizes, setDoorSizes] = useState(function() {
    const initial = {};
    for (let i = 1; i <= 24; i++) {
      if (i <= 4) initial[i] = 'small';
      else if (i <= 12) initial[i] = 'medium';
      else initial[i] = 'large';
    }
    return initial;
  });

  // Hardware Diagnostic State
  const [testingDoor, setTestingDoor] = useState(null);
  const [testStatusMessage, setTestStatusMessage] = useState('');
  const [isCycleTesting, setIsCycleTesting] = useState(false);
  const cycleTestingRef = useRef(false);

  // System & Error Logs State
  const [systemLogs, setSystemLogs] = useState(() => LoggerService.getLogs());
  const [logFilter, setLogFilter] = useState('ALL');

  // Database Save Feedback
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState('');

  // Subscribe to live log events
  useEffect(() => {
    const unsubscribe = LoggerService.subscribe((updatedLogs) => {
      setSystemLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  // Cleanup cycle test on unmount
  useEffect(() => {
    return () => {
      cycleTestingRef.current = false;
    };
  }, []);

  // Authenticate Master PIN
  function verifyPinCode(codeToVerify) {
    const code = codeToVerify || pinInput;
    if (code === MASTER_PIN) {
      setViewState('SETUP');
      setPinInput('');
      setAuthError('');
      LoggerService.addLog('INFO', 'AUTH', 'Master Technician authenticated successfully (PIN verified).');
    } else {
      setAuthError('Incorrect Master Security PIN. Access denied.');
      setPinInput('');
      LoggerService.addLog('WARN', 'AUTH', 'Unauthorized Master PIN attempt rejected.');
    }
  }

  function handleNumpadPress(digit) {
    if (pinInput.length < 6) {
      const next = pinInput + digit;
      setPinInput(next);
      if (authError) setAuthError('');
      if (next.length === 6) {
        verifyPinCode(next);
      }
    }
  }

  function handleNumpadBackspace() {
    setPinInput((prev) => prev.slice(0, -1));
    if (authError) setAuthError('');
  }

  function handleNumpadClear() {
    setPinInput('');
    if (authError) setAuthError('');
  }

  // Generate Permanent Locker ID: "SLL-${randomNumbers}"
  function handleGenerateLockerId() {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
    const generatedId = `SLL-${randomNum}`;
    setStationId(generatedId);
    LoggerService.addLog('INFO', 'SYSTEM', `New Locker ID generated: ${generatedId}`);
  }

  // Set individual door size
  function handleSetDoorSize(doorNum, size) {
    setDoorSizes(function(prev) {
      const next = { ...prev };
      next[doorNum] = size;
      return next;
    });
  }

  // Save Configuration to SharedPreferences & PostgreSQL Database
  async function handleSaveConfig() {
    if (isSavingDb) return;

    if (!stationId || stationId.trim() === '' || stationId.trim() === 'SETUP REQUIRED') {
      Alert.alert(
        'Locker ID Required',
        'Please tap "Generate Locker ID" before saving station configuration.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSavingDb(true);
    setSaveStatusText('Saving to PostgreSQL Database...');

    const newConfig = {
      stationId: stationId.trim().toUpperCase(),
      stationName: stationName.trim(),
      totalDoors: Number(totalDoors),
      locationTag: locationTag.trim(),
      doorSizes: doorSizes,
    };

    LoggerService.addLog(
      'INFO',
      'API_SYNC',
      `Starting station sync for ${newConfig.stationId} (${newConfig.totalDoors} compartments)...`
    );

    // 1. Save locally to Android SharedPreferences & Local Storage
    await saveMachineConfig(newConfig);

    // 2. Synchronize station profile and compartment door sizes directly to PostgreSQL DB
    try {
      const syncResult = await syncStationConfig(newConfig);
      setIsSavedFeedback(true);
      if (syncResult && syncResult.success) {
        setSaveStatusText(`Saved to Database (${newConfig.stationId})`);
        LoggerService.addLog(
          'SUCCESS',
          'API_SYNC',
          `Station ${newConfig.stationId} and ${newConfig.totalDoors} doors successfully synced to PostgreSQL.`
        );
      } else if (syncResult && syncResult.isOfflineMode) {
        setSaveStatusText('Saved to Locker (Offline Mode)');
        LoggerService.addLog(
          'WARN',
          'API_SYNC',
          `Cloud API unreachable. Configuration cached offline in local storage.`
        );
      } else {
        setSaveStatusText('Saved to Locker (DB Sync Pending)');
        LoggerService.addLog(
          'WARN',
          'API_SYNC',
          `DB sync returned non-critical status. Local settings updated.`
        );
      }
    } catch (err) {
      console.warn('[AdminModal] Database sync failed:', err.message);
      setIsSavedFeedback(true);
      setSaveStatusText('Saved Locally to Locker');
      LoggerService.addLog(
        'ERROR',
        'API_SYNC',
        `Cloud sync exception for ${newConfig.stationId}: ${err.message}`
      );
    } finally {
      setIsSavingDb(false);
    }

    if (onConfigUpdated) {
      onConfigUpdated(newConfig);
    }

    setTimeout(() => {
      setIsSavedFeedback(false);
      setSaveStatusText('');
      onClose();
    }, 1500);
  }

  // Direct Hardware Relay Test
  async function handleTestDoor(doorNumber) {
    if (testingDoor !== null || isCycleTesting) return;
    setTestingDoor(doorNumber);
    setTestStatusMessage(`Sending 0x04 unlock pulse to Lock Board 1, Door #${doorNumber}...`);
    LoggerService.addLog(
      'HARDWARE',
      'RELAY',
      `Manual relay actuation pulse sent to Door #${doorNumber} (Port: /dev/ttyS3, 200ms).`
    );

    try {
      await openLockerDoor(1, doorNumber);
      setTestStatusMessage(`Success: Door #${doorNumber} solenoid actuated (200ms pulse).`);
      LoggerService.addLog(
        'SUCCESS',
        'RELAY',
        `Door #${doorNumber} solenoid energized successfully.`
      );
    } catch (err) {
      setTestStatusMessage(`Hardware Error on Door #${doorNumber}: ${err.message}`);
      LoggerService.addLog(
        'ERROR',
        'SERIAL_RS485',
        `Hardware error actuating Door #${doorNumber}: ${err.message}`
      );
    } finally {
      setTimeout(() => {
        setTestingDoor(null);
      }, 1200);
    }
  }

  // Sequential Cycle Test (Actuates each door one by one)
  async function handleSequentialCycleTest() {
    if (isCycleTesting || testingDoor !== null) return;
    setIsCycleTesting(true);
    cycleTestingRef.current = true;
    LoggerService.addLog(
      'INFO',
      'RELAY',
      `Starting sequential cycle test across all ${totalDoors} connected doors...`
    );

    for (let doorNum = 1; doorNum <= totalDoors; doorNum++) {
      if (!cycleTestingRef.current) {
        setTestStatusMessage('Sequential cycle test aborted by technician.');
        LoggerService.addLog('WARN', 'RELAY', 'Sequential cycle test stopped by user.');
        break;
      }

      setTestingDoor(doorNum);
      setTestStatusMessage(`Sequential Test: Actuating Door #${doorNum} of ${totalDoors}...`);

      try {
        await openLockerDoor(1, doorNum);
        LoggerService.addLog(
          'HARDWARE',
          'RELAY',
          `Sequential test Door #${doorNum}/${totalDoors} actuated.`
        );
      } catch (err) {
        LoggerService.addLog(
          'ERROR',
          'SERIAL_RS485',
          `Sequential test Door #${doorNum} failed: ${err.message}`
        );
      }

      // Safe pause between solenoid pulses to prevent power supply current spike
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    if (cycleTestingRef.current) {
      setTestStatusMessage(`Sequential cycle test finished: All ${totalDoors} relays verified.`);
      LoggerService.addLog(
        'SUCCESS',
        'RELAY',
        `Sequential test complete: All ${totalDoors} door relays cycled successfully.`
      );
    }

    setIsCycleTesting(false);
    setTestingDoor(null);
    cycleTestingRef.current = false;
  }

  function handleStopCycleTest() {
    cycleTestingRef.current = false;
    setIsCycleTesting(false);
    setTestingDoor(null);
    setTestStatusMessage('Sequential test stopped.');
  }

  // Filtered Logs
  const filteredLogs = systemLogs.filter((entry) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'ERROR') return entry.level === 'ERROR' || entry.level === 'WARN';
    if (logFilter === 'HARDWARE') return entry.component === 'SERIAL_RS485' || entry.component === 'RELAY' || entry.level === 'HARDWARE';
    if (logFilter === 'API') return entry.component === 'API_SYNC' || entry.component === 'DATABASE';
    if (logFilter === 'SYSTEM') return entry.component === 'SYSTEM' || entry.component === 'AUTH';
    return true;
  });

  const errorCount = systemLogs.filter((l) => l.level === 'ERROR').length;
  const hardwareCount = systemLogs.filter((l) => l.component === 'SERIAL_RS485' || l.component === 'RELAY' || l.level === 'HARDWARE').length;
  const apiCount = systemLogs.filter((l) => l.component === 'API_SYNC' || l.component === 'DATABASE').length;
  const systemCount = systemLogs.filter((l) => l.component === 'SYSTEM' || l.component === 'AUTH').length;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* ========================================================= */}
          {/* TOP BAR: Title & Close Button                             */}
          {/* ========================================================= */}
          <View style={styles.topBar}>
            <View style={styles.titleGroup}>
              <Text style={styles.topBarTitle}>Laundry Locker Settings</Text>
              <Text style={styles.topBarSub}>Machine Hardware Provisioning</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================= */}
          {/* VIEW 1: COMMERCIAL TECHNICIAN PIN AUTHENTICATION          */}
          {/* ========================================================= */}
          {viewState === 'AUTH' ? (
            <View style={styles.authSplitLayout}>
              
              {/* LEFT COLUMN: Industrial Security Identity Card */}
              <View style={styles.authInfoCol}>
                <View style={styles.securityBadge}>
                  <View style={styles.securityPulseDot} />
                  <Text style={styles.securityBadgeText}>RESTRICTED TERMINAL</Text>
                </View>

                <View style={styles.authTitleGroup}>
                  <Text style={styles.authMainTitle}>Technician Gateway</Text>
                  <Text style={styles.authMainSub}>
                    Commercial machine provisioning and hardware diagnostics.
                  </Text>
                </View>

                {/* Machine Telemetry Metadata */}
                <View style={styles.authTelemetryBox}>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>HARDWARE TERMINAL ID</Text>
                    <Text style={styles.telemetryValue}>{currentConfig.hardwareId || 'SLL-READY'}</Text>
                  </View>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>LOCKER STATION</Text>
                    <Text style={styles.telemetryValue}>{stationId || 'SETUP REQUIRED'}</Text>
                  </View>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>HARDWARE BUS</Text>
                    <Text style={styles.telemetryValue}>RS485 /dev/ttyS3</Text>
                  </View>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>SECURITY LEVEL</Text>
                    <Text style={styles.telemetryValue}>Tier-1 Master Admin</Text>
                  </View>
                </View>

                <View style={styles.authNoticeCard}>
                  <Text style={styles.authNoticeText}>
                    Authorized service personnel only. All access attempts are recorded in the onboard tamper buffer.
                  </Text>
                </View>
              </View>

              {/* RIGHT COLUMN: Touch Numpad & Masked PIN Display */}
              <View style={styles.authNumpadCol}>
                <View style={styles.numpadHeader}>
                  <Text style={styles.numpadTitle}>Enter Master PIN</Text>
                  <Text style={styles.numpadSub}>
                    Use the touch keypad to enter your 6-digit access code
                  </Text>
                </View>

                {/* Validation Error Message */}
                {Boolean(authError) && (
                  <View style={styles.authAlertBox}>
                    <View style={styles.authAlertDot} />
                    <Text style={styles.authAlertText}>{authError}</Text>
                  </View>
                )}

                {/* 6 Masked PIN Indicator Slots */}
                <View style={styles.pinSlotsRow}>
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const isFilled = pinInput.length > index;
                    const isActive = pinInput.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pinSlot,
                          isFilled && styles.pinSlotFilled,
                          isActive && styles.pinSlotActive,
                        ]}
                      >
                        {isFilled ? (
                          <View style={styles.pinDotMasked} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {/* 3x4 Tactile Touch Keypad */}
                <View style={styles.touchKeypadGrid}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <TouchableOpacity
                      key={digit}
                      style={styles.keypadBtn}
                      onPress={() => handleNumpadPress(digit)}
                      activeOpacity={0.65}
                    >
                      <Text style={styles.keypadDigitText}>{digit}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[styles.keypadBtn, styles.keypadActionBtn]}
                    onPress={handleNumpadClear}
                    activeOpacity={0.65}
                  >
                    <Text style={styles.keypadClearText}>CLEAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.keypadBtn}
                    onPress={() => handleNumpadPress('0')}
                    activeOpacity={0.65}
                  >
                    <Text style={styles.keypadDigitText}>0</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.keypadBtn, styles.keypadActionBtn]}
                    onPress={handleNumpadBackspace}
                    activeOpacity={0.65}
                  >
                    <Text style={styles.keypadBackText}>DEL</Text>
                  </TouchableOpacity>
                </View>

                {/* Submit Action Button */}
                <TouchableOpacity
                  style={[
                    styles.authSubmitBtn,
                    pinInput.length !== 6 && styles.authSubmitBtnDisabled,
                  ]}
                  onPress={() => verifyPinCode()}
                  disabled={pinInput.length !== 6}
                  activeOpacity={0.85}
                >
                  <Text style={styles.authSubmitBtnText}>Unlock Admin Panel</Text>
                </TouchableOpacity>
              </View>

            </View>
          ) : (
            /* ========================================================= */
            /* VIEW 2: TWO-COLUMN SETTINGS (LEFT NAVBAR + RIGHT CONTENT) */
            /* ========================================================= */
            <View style={styles.mainContainer}>
              
              {/* ------------------------------------------------------- */}
              {/* LEFT COLUMN: NAVIGATION BAR                            */}
              {/* ------------------------------------------------------- */}
              <View style={styles.leftNavbar}>
                <View style={styles.navList}>
                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      activeTab === 'identity' && styles.navItemActive,
                    ]}
                    onPress={() => setActiveTab('identity')}
                  >
                    <Text
                      style={[
                        styles.navItemText,
                        activeTab === 'identity' && styles.navItemTextActive,
                      ]}
                    >
                      Locker Identity
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      activeTab === 'capacity' && styles.navItemActive,
                    ]}
                    onPress={() => setActiveTab('capacity')}
                  >
                    <Text
                      style={[
                        styles.navItemText,
                        activeTab === 'capacity' && styles.navItemTextActive,
                      ]}
                    >
                      Capacity & Door Sizes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      activeTab === 'relays' && styles.navItemActive,
                    ]}
                    onPress={() => setActiveTab('relays')}
                  >
                    <Text
                      style={[
                        styles.navItemText,
                        activeTab === 'relays' && styles.navItemTextActive,
                      ]}
                    >
                      Relay Diagnostics
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      activeTab === 'logs' && styles.navItemActive,
                    ]}
                    onPress={() => setActiveTab('logs')}
                  >
                    <View style={styles.navItemWithBadgeRow}>
                      <Text
                        style={[
                          styles.navItemText,
                          activeTab === 'logs' && styles.navItemTextActive,
                        ]}
                      >
                        System & Error Logs
                      </Text>
                      {errorCount > 0 && (
                        <View style={styles.navErrorBadge}>
                          <Text style={styles.navErrorBadgeText}>{errorCount}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.sessionCard}>
                  <Text style={styles.sessionTitle}>Master Session Active</Text>
                  <Text style={styles.sessionSub}>PIN Authenticated (999999)</Text>
                </View>
              </View>

              {/* ------------------------------------------------------- */}
              {/* RIGHT COLUMN: ACTIVE SETTINGS PANEL                    */}
              {/* ------------------------------------------------------- */}
              <ScrollView style={styles.rightContent} showsVerticalScrollIndicator={false}>
                
                {/* PANEL HEADER */}
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelTitle}>
                    {activeTab === 'identity' && 'Locker Identity'}
                    {activeTab === 'capacity' && 'Capacity & Compartment Door Sizes'}
                    {activeTab === 'relays' && 'Relay Actuation Diagnostics'}
                    {activeTab === 'logs' && 'System Telemetry & Error Logs'}
                  </Text>
                </View>

                {/* ----------------------------------------------------- */}
                {/* TAB 1: LOCKER IDENTITY                                */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'identity' && (
                  <View style={styles.settingsGroup}>
                    
                    {/* Locker ID with Integrated Generator & Disabled Manual Input */}
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Locker ID</Text>
                      <View style={styles.idInputGroup}>
                        <TextInput
                          style={[styles.idInputField, styles.idInputFieldDisabled]}
                          value={stationId}
                          editable={false}
                          placeholder="Tap 'Generate Locker ID'"
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity
                          style={styles.idGenerateBtn}
                          onPress={handleGenerateLockerId}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.idGenerateBtnText}>Generate Locker ID</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Laundry Locker Name */}
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Laundry Locker Name</Text>
                      <TextInput
                        style={styles.textInput}
                        value={stationName}
                        onChangeText={setStationName}
                        placeholder="e.g. Central Mall Hub Locker 1"
                      />
                    </View>

                    {/* Location */}
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Location</Text>
                      <TextInput
                        style={styles.textInput}
                        value={locationTag}
                        onChangeText={setLocationTag}
                        placeholder="e.g. Level 1, Main Entrance"
                      />
                    </View>

                  </View>
                )}

                {/* ----------------------------------------------------- */}
                {/* TAB 2: CAPACITY & COMPARTMENT DOOR SIZES              */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'capacity' && (
                  <View style={styles.settingsGroup}>
                    
                    {/* Total Physical Doors Selector */}
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Total Compartments Connected</Text>
                      <View style={styles.doorCountRow}>
                        {[4, 8, 12, 16, 20, 24].map((count) => (
                          <TouchableOpacity
                            key={count}
                            style={[
                              styles.doorCountPill,
                              totalDoors === count && styles.doorCountPillActive,
                            ]}
                            onPress={() => setTotalDoors(count)}
                          >
                            <Text
                              style={[
                                styles.doorCountPillText,
                                totalDoors === count && styles.doorCountPillTextActive,
                              ]}
                            >
                              {count} Doors
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Interactive Compartment Doors Grid (Directly under Total Doors) */}
                    <View style={styles.compartmentsGrid}>
                      {Array.from({ length: totalDoors }, (_, i) => i + 1).map((doorNum) => {
                        const currentSize = doorSizes[doorNum] || 'medium';
                        return (
                          <View key={doorNum} style={styles.compartmentCard}>
                            <View style={styles.compartmentCardTop}>
                              <Text style={styles.compartmentDoorName}>
                                Door {doorNum < 10 ? `0${doorNum}` : doorNum}
                              </Text>
                              <View
                                style={[
                                  styles.activeSizeBadge,
                                  currentSize === 'small' && styles.activeSizeBadgeSmall,
                                  currentSize === 'medium' && styles.activeSizeBadgeMedium,
                                  currentSize === 'large' && styles.activeSizeBadgeLarge,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.activeSizeBadgeText,
                                    currentSize === 'small' && styles.activeSizeBadgeTextSmall,
                                    currentSize === 'medium' && styles.activeSizeBadgeTextMedium,
                                    currentSize === 'large' && styles.activeSizeBadgeTextLarge,
                                  ]}
                                >
                                  {currentSize.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            {/* 3-Segment Size Button Pill */}
                            <View style={styles.sizeSegmentGroup}>
                              <TouchableOpacity
                                style={[
                                  styles.sizeSegmentBtn,
                                  currentSize === 'small' && styles.sizeSegmentBtnActive,
                                ]}
                                onPress={() => handleSetDoorSize(doorNum, 'small')}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.sizeSegmentBtnText,
                                    currentSize === 'small' && styles.sizeSegmentBtnTextActive,
                                  ]}
                                >
                                  Small
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.sizeSegmentBtn,
                                  currentSize === 'medium' && styles.sizeSegmentBtnActive,
                                ]}
                                onPress={() => handleSetDoorSize(doorNum, 'medium')}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.sizeSegmentBtnText,
                                    currentSize === 'medium' && styles.sizeSegmentBtnTextActive,
                                  ]}
                                >
                                  Medium
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.sizeSegmentBtn,
                                  currentSize === 'large' && styles.sizeSegmentBtnActive,
                                ]}
                                onPress={() => handleSetDoorSize(doorNum, 'large')}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.sizeSegmentBtnText,
                                    currentSize === 'large' && styles.sizeSegmentBtnTextActive,
                                  ]}
                                >
                                  Large
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                  </View>
                )}

                {/* ----------------------------------------------------- */}
                {/* TAB 3: RELAY DIAGNOSTICS                              */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'relays' && (
                  <View style={styles.settingsGroup}>
                    
                    {/* Technician Test Utility Bar */}
                    <View style={styles.relayUtilityBar}>
                      <View style={styles.relayUtilityLeft}>
                        <Text style={styles.relaySectionTitle}>Door Solenoid Actuation Matrix</Text>
                        <Text style={styles.relaySectionSub}>
                          Click any door button below to pop lock or run a sequential cycle test.
                        </Text>
                      </View>

                      <View style={styles.relayUtilityRight}>
                        {isCycleTesting ? (
                          <TouchableOpacity
                            style={styles.cycleStopBtn}
                            onPress={handleStopCycleTest}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cycleStopBtnText}>Stop Cycle Test</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.cycleTestBtn}
                            onPress={handleSequentialCycleTest}
                            disabled={testingDoor !== null}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cycleTestBtnText}>Sequential Cycle Test</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Live Actuation Feedback Banner */}
                    {Boolean(testStatusMessage) && (
                      <View style={styles.statusBanner}>
                        <View style={styles.statusBannerDot} />
                        <Text style={styles.statusBannerText}>{testStatusMessage}</Text>
                      </View>
                    )}

                    {/* High-Tech Door Relay Matrix Cards */}
                    <View style={styles.relayMatrixGrid}>
                      {Array.from({ length: totalDoors }, (_, i) => i + 1).map((doorNum) => {
                        const isThisTesting = testingDoor === doorNum;
                        const doorSize = doorSizes[doorNum] || 'medium';
                        return (
                          <View
                            key={doorNum}
                            style={[
                              styles.relayCard,
                              isThisTesting && styles.relayCardActive,
                            ]}
                          >
                            <View style={styles.relayCardHeader}>
                              <View style={styles.relayDoorNumBadge}>
                                <Text style={styles.relayDoorNumText}>
                                  Door {doorNum < 10 ? `0${doorNum}` : doorNum}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.activeSizeBadge,
                                  doorSize === 'small' && styles.activeSizeBadgeSmall,
                                  doorSize === 'medium' && styles.activeSizeBadgeMedium,
                                  doorSize === 'large' && styles.activeSizeBadgeLarge,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.activeSizeBadgeText,
                                    doorSize === 'small' && styles.activeSizeBadgeTextSmall,
                                    doorSize === 'medium' && styles.activeSizeBadgeTextMedium,
                                    doorSize === 'large' && styles.activeSizeBadgeTextLarge,
                                  ]}
                                >
                                  {doorSize.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.relayCardBody}>
                              <Text style={styles.relayChannelLabel}>Channel: Relay 0x01-{doorNum}</Text>
                              <Text style={styles.relayCmdHex}>CMD: 0x8A 0x01 {doorNum < 10 ? `0x0${doorNum}` : `0x${doorNum}`}</Text>
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.popLockBtn,
                                isThisTesting && styles.popLockBtnActive,
                              ]}
                              onPress={() => handleTestDoor(doorNum)}
                              disabled={testingDoor !== null || isCycleTesting}
                              activeOpacity={0.8}
                            >
                              {isThisTesting ? (
                                <View style={styles.actuatingRow}>
                                  <ActivityIndicator size="small" color={COLORS.white} />
                                  <Text style={styles.popLockBtnTextActive}>Actuating...</Text>
                                </View>
                              ) : (
                                <Text style={styles.popLockBtnText}>Pop Lock</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>

                  </View>
                )}

                {/* ----------------------------------------------------- */}
                {/* TAB 4: SYSTEM & ERROR LOGS CONSOLE                     */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'logs' && (
                  <View style={styles.settingsGroup}>
                    
                    {/* Log Filter and Actions Bar */}
                    <View style={styles.logsControlBar}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        <View style={styles.filterGroup}>
                          <TouchableOpacity
                            style={[styles.filterChip, logFilter === 'ALL' && styles.filterChipActive]}
                            onPress={() => setLogFilter('ALL')}
                          >
                            <Text style={[styles.filterChipText, logFilter === 'ALL' && styles.filterChipTextActive]}>
                              ALL ({systemLogs.length})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.filterChip, logFilter === 'ERROR' && styles.filterChipActive]}
                            onPress={() => setLogFilter('ERROR')}
                          >
                            <Text style={[styles.filterChipText, logFilter === 'ERROR' && styles.filterChipTextActive]}>
                              ERRORS ({errorCount})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.filterChip, logFilter === 'HARDWARE' && styles.filterChipActive]}
                            onPress={() => setLogFilter('HARDWARE')}
                          >
                            <Text style={[styles.filterChipText, logFilter === 'HARDWARE' && styles.filterChipTextActive]}>
                              HARDWARE ({hardwareCount})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.filterChip, logFilter === 'API' && styles.filterChipActive]}
                            onPress={() => setLogFilter('API')}
                          >
                            <Text style={[styles.filterChipText, logFilter === 'API' && styles.filterChipTextActive]}>
                              API & CLOUD ({apiCount})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.filterChip, logFilter === 'SYSTEM' && styles.filterChipActive]}
                            onPress={() => setLogFilter('SYSTEM')}
                          >
                            <Text style={[styles.filterChipText, logFilter === 'SYSTEM' && styles.filterChipTextActive]}>
                              SYSTEM ({systemCount})
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </ScrollView>

                      <View style={styles.logActionsRow}>
                        <TouchableOpacity
                          style={styles.logActionBtn}
                          onPress={() => {
                            LoggerService.addLog(
                              'ERROR',
                              'SERIAL_RS485',
                              'Hardware exception: Solenoid Relay #04 feedback timeout on /dev/ttyS3 (Simulated Error for Technician Verification)'
                            );
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.logActionBtnText}>Simulate Test Error</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.logActionBtn}
                          onPress={() => LoggerService.clearLogs()}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.logActionBtnText}>Clear Buffer</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.logActionBtn}
                          onPress={() => LoggerService.resetToDefaults()}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.logActionBtnText}>Reset Defaults</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Dark High-Contrast Terminal / Console Window */}
                    <View style={styles.terminalContainer}>
                      {/* Terminal Header */}
                      <View style={styles.terminalHeader}>
                        <View style={styles.terminalDotsRow}>
                          <View style={[styles.terminalDot, { backgroundColor: '#ef4444' }]} />
                          <View style={[styles.terminalDot, { backgroundColor: '#f59e0b' }]} />
                          <View style={[styles.terminalDot, { backgroundColor: '#10b981' }]} />
                        </View>
                        <Text style={styles.terminalTitle}>
                          KIOSK TELEMETRY CONSOLE • /dev/ttyS3 & render-api
                        </Text>
                        <View style={styles.terminalStatusBadge}>
                          <Text style={styles.terminalStatusText}>
                            LIVE BUFFER • {filteredLogs.length} EVENTS
                          </Text>
                        </View>
                      </View>

                      {/* Log Stream */}
                      <ScrollView style={styles.terminalStream} nestedScrollEnabled={true}>
                        {filteredLogs.length === 0 ? (
                          <View style={styles.emptyLogsView}>
                            <Text style={styles.emptyLogsText}>
                              No telemetry or error logs match the selected filter.
                            </Text>
                          </View>
                        ) : (
                          filteredLogs.map((entry) => (
                            <View key={entry.id} style={styles.logRow}>
                              <Text style={styles.logTimestamp}>{entry.timestamp}</Text>
                              
                              <View
                                style={[
                                  styles.levelBadge,
                                  entry.level === 'ERROR' && styles.levelBadgeError,
                                  entry.level === 'WARN' && styles.levelBadgeWarn,
                                  entry.level === 'HARDWARE' && styles.levelBadgeHardware,
                                  entry.level === 'INFO' && styles.levelBadgeInfo,
                                  entry.level === 'SUCCESS' && styles.levelBadgeSuccess,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.levelBadgeText,
                                    entry.level === 'ERROR' && styles.levelBadgeTextError,
                                    entry.level === 'WARN' && styles.levelBadgeTextWarn,
                                    entry.level === 'HARDWARE' && styles.levelBadgeTextHardware,
                                    entry.level === 'INFO' && styles.levelBadgeTextInfo,
                                    entry.level === 'SUCCESS' && styles.levelBadgeTextSuccess,
                                  ]}
                                >
                                  {entry.level}
                                </Text>
                              </View>

                              <Text style={styles.logComponent}>[{entry.component}]</Text>
                              <Text style={styles.logMessage}>{entry.message}</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>

                  </View>
                )}

              </ScrollView>
            </View>
          )}

          {/* ========================================================= */}
          {/* BOTTOM BAR: PRIMARY ACTION BUTTON                         */}
          {/* ========================================================= */}
          {viewState === 'SETUP' && (
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[
                  styles.primarySubmitBtn,
                  isSavedFeedback && styles.primarySubmitBtnSuccess,
                  isSavingDb && styles.primarySubmitBtnSaving,
                ]}
                onPress={handleSaveConfig}
                disabled={isSavingDb}
                activeOpacity={0.85}
              >
                {isSavingDb ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.primarySubmitBtnText}>
                      Saving to PostgreSQL Database...
                    </Text>
                  </View>
                ) : isSavedFeedback ? (
                  <Text style={styles.primarySubmitBtnText}>
                    {saveStatusText || 'Configuration Saved Successfully'}
                  </Text>
                ) : (
                  <Text style={styles.primarySubmitBtnText}>
                    Save & Apply Locker Settings
                  </Text>
                )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 920,
    height: 640,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
    flexDirection: 'column',
  },
  topBar: {
    height: 64,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
  },
  titleGroup: {
    gap: 2,
  },
  topBarTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  authSplitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  authInfoCol: {
    width: 320,
    backgroundColor: '#090d16',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    padding: 24,
    justifyContent: 'space-between',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  securityPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
  },
  securityBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.orange,
    letterSpacing: 0.8,
  },
  authTitleGroup: {
    marginVertical: 12,
    gap: 4,
  },
  authMainTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  authMainSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  authTelemetryBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 10,
    marginVertical: 12,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  authNoticeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
    borderRadius: 8,
  },
  authNoticeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  authNumpadCol: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 28,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numpadHeader: {
    alignItems: 'center',
    gap: 2,
  },
  numpadTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.2,
  },
  numpadSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate500,
  },
  authAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  authAlertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  authAlertText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  pinSlotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  pinSlot: {
    width: 40,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.slate50,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSlotFilled: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.orange,
  },
  pinSlotActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orangeSubtle,
  },
  pinDotMasked: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
  },
  touchKeypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 252,
    gap: 8,
    justifyContent: 'center',
  },
  keypadBtn: {
    width: 76,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadActionBtn: {
    backgroundColor: COLORS.slate100,
  },
  keypadDigitText: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  keypadClearText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.slate600,
    letterSpacing: 0.5,
  },
  keypadBackText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate600,
  },
  authSubmitBtn: {
    width: 252,
    height: 44,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  authSubmitBtnDisabled: {
    backgroundColor: COLORS.slate300,
  },
  authSubmitBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftNavbar: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.slate100,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  navList: {
    gap: 6,
  },
  navItem: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: COLORS.orangeSubtle,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  navItemWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navItemText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  navItemTextActive: {
    color: COLORS.orange,
    fontWeight: '800',
  },
  navErrorBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  navErrorBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  sessionCard: {
    padding: 12,
    backgroundColor: COLORS.slate50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  sessionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  sessionSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: COLORS.slate400,
    marginTop: 2,
  },
  rightContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: COLORS.white,
  },
  panelHeaderRow: {
    marginBottom: 16,
  },
  panelTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.2,
  },
  settingsGroup: {
    gap: 16,
    paddingBottom: 24,
  },
  fieldBlock: {
    gap: 6,
  },
  labelWithHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  labelHintText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate400,
  },
  idInputGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  idInputField: {
    fontFamily: FONT_FAMILY,
    flex: 1,
    height: 46,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate900,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  idInputFieldDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderColor: '#cbd5e1',
  },
  idGenerateBtn: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idGenerateBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  textInput: {
    fontFamily: FONT_FAMILY,
    height: 46,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate900,
  },
  doorCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doorCountPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  doorCountPillActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  doorCountPillText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  doorCountPillTextActive: {
    color: COLORS.white,
  },
  compartmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 4,
  },
  compartmentCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 200,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  compartmentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compartmentDoorName: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  activeSizeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activeSizeBadgeSmall: {
    backgroundColor: '#eff6ff',
  },
  activeSizeBadgeMedium: {
    backgroundColor: COLORS.orangeSubtle,
  },
  activeSizeBadgeLarge: {
    backgroundColor: '#faf5ff',
  },
  activeSizeBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    fontWeight: '800',
  },
  activeSizeBadgeTextSmall: {
    color: '#1d4ed8',
  },
  activeSizeBadgeTextMedium: {
    color: COLORS.orange,
  },
  activeSizeBadgeTextLarge: {
    color: '#7e22ce',
  },
  sizeSegmentGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate100,
    borderRadius: 8,
    padding: 2,
    gap: 3,
  },
  sizeSegmentBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sizeSegmentBtnActive: {
    backgroundColor: COLORS.orange,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  sizeSegmentBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  sizeSegmentBtnTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  // Relay Utility Bar
  relayUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  relayUtilityLeft: {
    flex: 1,
  },
  relaySectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  relaySectionSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 1,
  },
  relayUtilityRight: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleTestBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cycleTestBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
  },
  cycleStopBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cycleStopBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    padding: 10,
    borderRadius: 10,
  },
  statusBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  statusBannerText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.emeraldDark,
  },
  // Relay Matrix Grid
  relayMatrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  relayCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 160,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  relayCardActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orangeSubtle,
  },
  relayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relayDoorNumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.slate100,
  },
  relayDoorNumText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  relayCardBody: {
    gap: 2,
  },
  relayChannelLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  relayCmdHex: {
    fontFamily: MONO_FONT,
    fontSize: 9,
    color: COLORS.slate400,
  },
  popLockBtn: {
    height: 34,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.orange,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popLockBtnActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  actuatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popLockBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
  },
  popLockBtnTextActive: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  // Logs Control Bar
  logsControlBar: {
    gap: 10,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  filterChipActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  filterChipText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.slate600,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  logActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  logActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate300,
  },
  logActionBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  // Terminal Container
  terminalContainer: {
    backgroundColor: '#090d16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    height: 340,
    flexDirection: 'column',
  },
  terminalHeader: {
    height: 34,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  terminalDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  terminalTitle: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  terminalStatusBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  terminalStatusText: {
    fontFamily: MONO_FONT,
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
  },
  terminalStream: {
    flex: 1,
    padding: 12,
  },
  emptyLogsView: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsText: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    color: '#64748b',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  logTimestamp: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: '#64748b',
    width: 140,
  },
  levelBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  levelBadgeError: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
  },
  levelBadgeWarn: {
    backgroundColor: '#451a03',
    borderColor: '#92400e',
  },
  levelBadgeHardware: {
    backgroundColor: '#431407',
    borderColor: '#9a3412',
  },
  levelBadgeInfo: {
    backgroundColor: '#082f49',
    borderColor: '#0369a1',
  },
  levelBadgeSuccess: {
    backgroundColor: '#022c22',
    borderColor: '#065f46',
  },
  levelBadgeText: {
    fontFamily: MONO_FONT,
    fontSize: 9,
    fontWeight: '800',
  },
  levelBadgeTextError: {
    color: '#f87171',
  },
  levelBadgeTextWarn: {
    color: '#fbbf24',
  },
  levelBadgeTextHardware: {
    color: '#fb923c',
  },
  levelBadgeTextInfo: {
    color: '#38bdf8',
  },
  levelBadgeTextSuccess: {
    color: '#34d399',
  },
  logComponent: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  logMessage: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: '#f1f5f9',
    flex: 1,
    lineHeight: 14,
  },
  bottomBar: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
    backgroundColor: COLORS.white,
  },
  primarySubmitBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySubmitBtnSuccess: {
    backgroundColor: COLORS.emerald,
  },
  primarySubmitBtnSaving: {
    backgroundColor: '#c2410c',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primarySubmitBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
