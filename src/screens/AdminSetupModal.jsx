import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { openLockerDoor } from '../native/LockerBridge';
import { saveMachineConfig } from '../services/storage';
import { syncStationConfig } from '../services/api';

// ==============================================================================
// REACT NATIVE COMPONENT: AdminSetupModal
// Commercial Laundry Locker Settings & Hardware Diagnostics Portal.
// Theme: Safety Orange (#ea580c) & High-Contrast Slate neutrals.
// Typography: Plus Jakarta Sans uniformly across all components.
// ==============================================================================

const MASTER_PIN = '999999';

const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  android: 'sans-serif',
  ios: 'system-ui',
  default: 'sans-serif',
});

export function AdminSetupModal(props) {
  const visible = Boolean(props.visible);
  const onClose = props.onClose;
  const currentConfig = props.currentConfig || {
    stationId: 'SLL-2016',
    stationName: 'Central Mall Hub Locker 1',
    totalDoors: 16,
  };
  const onConfigUpdated = props.onConfigUpdated;

  // View state: 'AUTH' | 'SETUP'
  const [viewState, setViewState] = useState('AUTH');
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Navigation Tab: 'identity' | 'capacity' | 'relays' | 'hardware' | 'network'
  const [activeTab, setActiveTab] = useState('identity');

  // Configuration form fields
  const [stationId, setStationId] = useState(currentConfig.stationId || 'SLL-2016');
  const [stationName, setStationName] = useState(currentConfig.stationName || 'Central Mall Hub Locker 1');
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
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState('');
  const [simulationFallback, setSimulationFallback] = useState(true);

  // Network Ping State
  const [pingStatus, setPingStatus] = useState('');
  const [isPinging, setIsPinging] = useState(false);

  // Authenticate Master PIN
  function handlePinSubmit() {
    if (pinInput === MASTER_PIN) {
      setViewState('SETUP');
      setPinInput('');
      setAuthError('');
    } else {
      setAuthError('Incorrect Master Admin PIN. Access denied.');
      setPinInput('');
    }
  }

  // Generate Permanent Locker ID: "SLL-${randomNumbers}"
  function handleGenerateLockerId() {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
    const generatedId = `SLL-${randomNum}`;
    setStationId(generatedId);
  }

  // Set individual door size
  function handleSetDoorSize(doorNum, size) {
    setDoorSizes(function(prev) {
      const next = { ...prev };
      next[doorNum] = size;
      return next;
    });
  }

  // Bulk set all doors to a specific size
  function handleSetAllSizes(size) {
    setDoorSizes(function(prev) {
      const next = { ...prev };
      for (let i = 1; i <= totalDoors; i++) {
        next[i] = size;
      }
      return next;
    });
  }

  // Smart balanced distribution based on total doors (approx 25% Small, 60% Medium, 15% Large)
  function handleSetBalancedDistribution() {
    setDoorSizes(function(prev) {
      const next = { ...prev };
      const smallCount = Math.max(1, Math.round(totalDoors * 0.25));
      const largeCount = Math.max(1, Math.round(totalDoors * 0.15));
      for (let i = 1; i <= totalDoors; i++) {
        if (i <= smallCount) {
          next[i] = 'small';
        } else if (i <= totalDoors - largeCount) {
          next[i] = 'medium';
        } else {
          next[i] = 'large';
        }
      }
      return next;
    });
  }

  // Calculate live door size breakdown
  const smallDoorCount = Array.from({ length: totalDoors }, (_, i) => i + 1).filter(
    (n) => (doorSizes[n] || 'medium') === 'small'
  ).length;
  const mediumDoorCount = Array.from({ length: totalDoors }, (_, i) => i + 1).filter(
    (n) => (doorSizes[n] || 'medium') === 'medium'
  ).length;
  const largeDoorCount = Array.from({ length: totalDoors }, (_, i) => i + 1).filter(
    (n) => (doorSizes[n] || 'medium') === 'large'
  ).length;

  // Save Configuration to SharedPreferences & PostgreSQL Database
  async function handleSaveConfig() {
    if (isSavingDb) return;
    setIsSavingDb(true);
    setSaveStatusText('Saving to PostgreSQL Database...');

    const newConfig = {
      stationId: stationId.trim().toUpperCase(),
      stationName: stationName.trim(),
      totalDoors: Number(totalDoors),
      locationTag: locationTag.trim(),
      doorSizes: doorSizes,
    };

    // 1. Save locally to Android SharedPreferences & Local Storage
    await saveMachineConfig(newConfig);

    // 2. Synchronize station profile and compartment door sizes directly to PostgreSQL DB
    try {
      const syncResult = await syncStationConfig(newConfig);
      setIsSavedFeedback(true);
      if (syncResult && syncResult.success) {
        setSaveStatusText(`Saved to Database (${newConfig.stationId})`);
      } else if (syncResult && syncResult.isOfflineMode) {
        setSaveStatusText('Saved to Locker (Offline Mode)');
      } else {
        setSaveStatusText('Saved to Locker (DB Sync Pending)');
      }
    } catch (err) {
      console.warn('[AdminModal] Database sync failed:', err.message);
      setIsSavedFeedback(true);
      setSaveStatusText('Saved Locally to Locker');
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
    if (testingDoor !== null) return;
    setTestingDoor(doorNumber);
    setTestStatusMessage(`Sending 0x04 unlock pulse to Lock Board 1, Door #${doorNumber}...`);

    try {
      await openLockerDoor(1, doorNumber);
      setTestStatusMessage(`Success: Door #${doorNumber} solenoid actuated (200ms pulse).`);
    } catch (err) {
      setTestStatusMessage(`Hardware Error on Door #${doorNumber}: ${err.message}`);
    } finally {
      setTimeout(() => {
        setTestingDoor(null);
      }, 1500);
    }
  }

  // Ping Backend API
  async function handlePingApi() {
    setIsPinging(true);
    setPingStatus('Pinging Render Cloud API...');
    try {
      const res = await fetch('https://smart-laundry-locker-api.onrender.com/api/stations/CMH-01/status');
      if (res.ok) {
        setPingStatus('Online: Connected to PostgreSQL Render Backend (HTTP 200)');
      } else {
        setPingStatus(`Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      setPingStatus(`Connection failed: ${err.message}`);
    } finally {
      setIsPinging(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* ========================================================= */}
          {/* TOP BAR: Title & Close Button (No segment switch)         */}
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
          {/* VIEW 1: PIN AUTHENTICATION                                */}
          {/* ========================================================= */}
          {viewState === 'AUTH' ? (
            <View style={styles.authContainer}>
              <View style={styles.lockIconCircle}>
                <Text style={styles.lockIconText}>🔒</Text>
              </View>
              <Text style={styles.authTitle}>Master Security PIN</Text>
              <Text style={styles.authSub}>
                Enter the 6-digit Master Technician PIN to access hardware diagnostics and locker settings.
              </Text>

              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Enter PIN (Default: 999999)"
                placeholderTextColor={COLORS.slate400}
                keyboardType="numeric"
                secureTextEntry={true}
                maxLength={6}
                onSubmitEditing={handlePinSubmit}
              />

              {Boolean(authError) && (
                <Text style={styles.authErrorText}>{authError}</Text>
              )}

              <TouchableOpacity
                style={styles.authSubmitBtn}
                onPress={handlePinSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.authSubmitBtnText}>Unlock Admin Panel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ========================================================= */
            /* VIEW 2: TWO-COLUMN SETTINGS (LEFT NAVBAR + RIGHT CONTENT) */
            /* ========================================================= */
            <View style={styles.mainContainer}>
              
              {/* ------------------------------------------------------- */}
              {/* LEFT COLUMN: NAVIGATION BAR (ALL CHECKS REMOVED)       */}
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
                      activeTab === 'hardware' && styles.navItemActive,
                    ]}
                    onPress={() => setActiveTab('hardware')}
                  >
                    <Text
                      style={[
                        styles.navItemText,
                        activeTab === 'hardware' && styles.navItemTextActive,
                      ]}
                    >
                      Hardware & Serial
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      activeTab === 'network' && styles.navItemActive,
                    ]}
                    onPress={() => setActiveTab('network')}
                  >
                    <Text
                      style={[
                        styles.navItemText,
                        activeTab === 'network' && styles.navItemTextActive,
                      ]}
                    >
                      Network & Cloud
                    </Text>
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
                
                {/* PANEL HEADER WITH SECTION TITLE (DUPLICATE SAVE REMOVED) */}
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelTitle}>
                    {activeTab === 'identity' && 'Locker Identity'}
                    {activeTab === 'capacity' && 'Capacity & Compartment Door Sizes'}
                    {activeTab === 'relays' && 'Relay Actuation Diagnostics'}
                    {activeTab === 'hardware' && 'Serial Port & RS485 Controller'}
                    {activeTab === 'network' && 'Cloud API & Synchronization'}
                  </Text>
                </View>

                {/* ----------------------------------------------------- */}
                {/* TAB 1: LOCKER IDENTITY                                */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'identity' && (
                  <View style={styles.settingsGroup}>
                    
                    {/* Locker ID with Integrated Generator */}
                    <View style={styles.fieldBlock}>
                      <View style={styles.labelWithHintRow}>
                        <Text style={styles.fieldLabel}>Locker ID</Text>
                        <Text style={styles.labelHintText}>Format: SLL-&#123;randomNumbers&#125;</Text>
                      </View>
                      <View style={styles.idInputGroup}>
                        <TextInput
                          style={styles.idInputField}
                          value={stationId}
                          onChangeText={setStationId}
                          placeholder="e.g. SLL-36641"
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
                        placeholder="e.g. Level 1, East Entrance (Beside Hypermarket)"
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

                    {/* Compartment Door Size Configurator Header & Summary */}
                    <View style={styles.doorSizeHeaderCard}>
                      <View style={styles.doorSizeHeaderTop}>
                        <View style={styles.doorSizeHeaderTexts}>
                          <Text style={styles.doorSizeHeaderTitle}>
                            Set Compartment Door Size Each
                          </Text>
                          <Text style={styles.doorSizeHeaderSub}>
                            Configure physical size (Small, Medium, Large) for each locker door
                          </Text>
                        </View>
                        
                        {/* Live Counts Breakdown Chips */}
                        <View style={styles.liveSummaryRow}>
                          <View style={styles.summaryChipSmall}>
                            <Text style={styles.summaryChipSmallText}>
                              {smallDoorCount} Small
                            </Text>
                          </View>
                          <View style={styles.summaryChipMedium}>
                            <Text style={styles.summaryChipMediumText}>
                              {mediumDoorCount} Medium
                            </Text>
                          </View>
                          <View style={styles.summaryChipLarge}>
                            <Text style={styles.summaryChipLargeText}>
                              {largeDoorCount} Large
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Quick Bulk Presets */}
                      <View style={styles.quickPresetBar}>
                        <Text style={styles.quickPresetLabel}>Quick Setup:</Text>
                        <TouchableOpacity
                          style={styles.quickPresetPill}
                          onPress={handleSetBalancedDistribution}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.quickPresetPillText}>Balanced Split</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickPresetPill}
                          onPress={() => handleSetAllSizes('small')}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.quickPresetPillText}>All Small</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickPresetPill}
                          onPress={() => handleSetAllSizes('medium')}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.quickPresetPillText}>All Medium</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickPresetPill}
                          onPress={() => handleSetAllSizes('large')}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.quickPresetPillText}>All Large</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Interactive Compartment Doors Grid */}
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
                    <Text style={styles.sectionSubtitle}>
                      Direct RS485 Solenoid Test (Click any door to pop lock)
                    </Text>

                    {Boolean(testStatusMessage) && (
                      <View style={styles.statusBanner}>
                        <Text style={styles.statusBannerText}>{testStatusMessage}</Text>
                      </View>
                    )}

                    <View style={styles.doorRelayGrid}>
                      {Array.from({ length: totalDoors }, (_, i) => i + 1).map((doorNum) => (
                        <TouchableOpacity
                          key={doorNum}
                          style={[
                            styles.doorRelayBtn,
                            testingDoor === doorNum && styles.doorRelayBtnActive,
                          ]}
                          onPress={() => handleTestDoor(doorNum)}
                          disabled={testingDoor !== null}
                          activeOpacity={0.8}
                        >
                          {testingDoor === doorNum ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <>
                              <Text style={[
                                styles.doorRelayNum,
                                testingDoor === doorNum && styles.doorRelayNumActive
                              ]}>
                                {doorNum < 10 ? `0${doorNum}` : doorNum}
                              </Text>
                              <Text style={styles.doorRelayLabel}>Pop Lock</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* ----------------------------------------------------- */}
                {/* TAB 4: HARDWARE & SERIAL                              */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'hardware' && (
                  <View style={styles.settingsGroup}>
                    <View style={styles.twoColRow}>
                      <View style={styles.colHalf}>
                        <Text style={styles.fieldLabel}>Serial Port Path</Text>
                        <TextInput
                          style={styles.readOnlyInput}
                          value="/dev/ttyS3"
                          editable={false}
                        />
                      </View>
                      <View style={styles.colHalf}>
                        <Text style={styles.fieldLabel}>Baud Rate</Text>
                        <TextInput
                          style={styles.readOnlyInput}
                          value="9600 bps"
                          editable={false}
                        />
                      </View>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={styles.colHalf}>
                        <Text style={styles.fieldLabel}>Lock Board ID</Text>
                        <TextInput
                          style={styles.readOnlyInput}
                          value="1 (0x01)"
                          editable={false}
                        />
                      </View>
                      <View style={styles.colHalf}>
                        <Text style={styles.fieldLabel}>Board Protocol Type</Text>
                        <TextInput
                          style={styles.readOnlyInput}
                          value="ATAT (Standard)"
                          editable={false}
                        />
                      </View>
                    </View>

                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextCol}>
                        <Text style={styles.toggleTitle}>Demo / Offline Fallback</Text>
                        <Text style={styles.toggleSub}>
                          Simulate successful unlock when running on desktop or emulator without physical RS485.
                        </Text>
                      </View>
                      <Switch
                        value={simulationFallback}
                        onValueChange={setSimulationFallback}
                        trackColor={{ false: COLORS.slate300, true: COLORS.orange }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  </View>
                )}

                {/* ----------------------------------------------------- */}
                {/* TAB 5: NETWORK & CLOUD                                */}
                {/* ----------------------------------------------------- */}
                {activeTab === 'network' && (
                  <View style={styles.settingsGroup}>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Cloud API Base URL</Text>
                      <TextInput
                        style={styles.readOnlyInput}
                        value="https://smart-laundry-locker-api.onrender.com/api"
                        editable={false}
                      />
                    </View>

                    <View style={styles.pingCard}>
                      <View style={styles.pingStatusRow}>
                        <View style={styles.statusDotLive} />
                        <Text style={styles.pingStatusText}>
                          {pingStatus || 'Render Cloud API & PostgreSQL Ready'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.pingBtn}
                        onPress={handlePingApi}
                        disabled={isPinging}
                        activeOpacity={0.8}
                      >
                        {isPinging ? (
                          <ActivityIndicator size="small" color={COLORS.orange} />
                        ) : (
                          <Text style={styles.pingBtnText}>Test API Connectivity</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </ScrollView>
            </View>
          )}

          {/* ========================================================= */}
          {/* BOTTOM BAR: PRIMARY ACTION BUTTON (SAFETY ORANGE)         */}
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
                ) : (
                  <Text style={styles.primarySubmitBtnText}>
                    {saveStatusText || (isSavedFeedback ? 'Saved to Database & Locker!' : 'Save & Apply Locker Settings')}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 780,
    height: 610,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 20,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  titleGroup: {
    gap: 2,
  },
  topBarTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate500,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate500,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockIconText: {
    fontSize: 28,
  },
  authTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 8,
  },
  authSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: COLORS.slate500,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
    marginBottom: 20,
  },
  pinInput: {
    fontFamily: FONT_FAMILY,
    width: '100%',
    maxWidth: 320,
    height: 52,
    backgroundColor: COLORS.slate50,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate900,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 12,
  },
  authErrorText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 12,
  },
  authSubmitBtn: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSubmitBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftNavbar: {
    width: 210,
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
  navItemText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  navItemTextActive: {
    fontWeight: '800',
    color: COLORS.orange,
  },
  sessionCard: {
    padding: 10,
    backgroundColor: COLORS.slate50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
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
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  panelTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: -0.2,
  },
  settingsGroup: {
    gap: 16,
    paddingBottom: 20,
  },
  fieldBlock: {
    gap: 6,
  },
  labelWithHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelHintText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate400,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  idInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 10,
    overflow: 'hidden',
    height: 44,
  },
  idInputField: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: 0.5,
  },
  idGenerateBtn: {
    height: '100%',
    paddingHorizontal: 18,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idGenerateBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  textInput: {
    fontFamily: FONT_FAMILY,
    height: 44,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate900,
  },
  textInputBold: {
    fontFamily: FONT_FAMILY,
    height: 44,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: 0.5,
  },
  readOnlyInput: {
    fontFamily: FONT_FAMILY,
    height: 44,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.slate50,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    marginTop: 4,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  toggleSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate500,
    marginBottom: 4,
  },
  doorSizeHeaderCard: {
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  doorSizeHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  doorSizeHeaderTexts: {
    flex: 1,
    minWidth: 200,
  },
  doorSizeHeaderTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  doorSizeHeaderSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
  liveSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  summaryChipSmall: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  summaryChipSmallText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  summaryChipMedium: {
    backgroundColor: COLORS.orangeSubtle,
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  summaryChipMediumText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.orange,
  },
  summaryChipLarge: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  summaryChipLargeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: '#7e22ce',
  },
  quickPresetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    paddingTop: 10,
  },
  quickPresetLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate500,
    marginRight: 2,
  },
  quickPresetPill: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickPresetPillText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slate700,
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
  doorRelayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  doorRelayBtn: {
    width: 72,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorRelayBtnActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  doorRelayNum: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  doorRelayNumActive: {
    color: COLORS.white,
  },
  doorRelayLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.slate500,
    marginTop: 2,
  },
  statusBanner: {
    backgroundColor: COLORS.emeraldSubtle,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusBannerText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.emeraldDark,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colHalf: {
    flex: 1,
    gap: 6,
  },
  pingCard: {
    backgroundColor: COLORS.slate50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    gap: 10,
  },
  pingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDotLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.emerald,
  },
  pingStatusText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  pingBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate300,
  },
  pingBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
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
