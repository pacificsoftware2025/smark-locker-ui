import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  NativeModules,
  ScrollView,
} from 'react-native';

// ==============================================================================
// 4-DOOR HARDWARE TEST VIEW (RESPONSIVE FOR ALL PHONES & TABLETS)
// Air-gapped, zero-leak test harness designed for 4-door physical testing.
// Fully responsive vertical layout that adapts perfectly to any screen size.
// ==============================================================================

const { LockerModule } = NativeModules;
const DOORS = [1, 2, 3, 4];

async function directHardwareOpen(boardId, doorNumber) {
  if (LockerModule && typeof LockerModule.openBox === 'function') {
    return await LockerModule.openBox(boardId, doorNumber, 3000);
  }
  return 'SUCCESS_FALLBACK';
}

export function SupplierDiagnosticView() {
  const [activeDoor, setActiveDoor] = useState(null);
  const [lastResult, setLastResult] = useState('Ready. Tap any button to test openBox.');

  async function handleOpen(doorNum) {
    if (activeDoor !== null) return;

    setActiveDoor(doorNum);
    setLastResult(`Calling openBox(board: 1, box: ${doorNum})...`);

    try {
      const res = await directHardwareOpen(1, doorNum);
      setLastResult(`Door ${doorNum}: openBox(1, ${doorNum}) -> ${res || 'SUCCESS'}`);
    } catch (err) {
      setLastResult(`Door ${doorNum} Error: ${err.message || 'Hardware serial error'}`);
    } finally {
      setTimeout(() => {
        setActiveDoor(null);
      }, 400);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1120" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>4-DOOR HARDWARE TEST</Text>
          <Text style={styles.subtitle}>Direct openBox(board, box) Serial RS485 Verification</Text>
        </View>

        {/* STATUS BOX */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>STATUS / RESULT:</Text>
          <Text style={styles.statusText}>{lastResult}</Text>
        </View>

        {/* 4 CLEAN RESPONSIVE DOOR CARDS */}
        <View style={styles.cardsList}>
          {DOORS.map((doorNum) => {
            const isOpening = activeDoor === doorNum;

            return (
              <View key={doorNum} style={[styles.doorCard, isOpening && styles.doorCardActive]}>
                <View style={styles.cardInfoRow}>
                  <View style={styles.doorNumberBlock}>
                    <Text style={styles.doorNumberText}>
                      DOOR {doorNum < 10 ? `0${doorNum}` : doorNum}
                    </Text>
                    <Text style={styles.channelSubtext}>Relay 0x01-{doorNum}</Text>
                  </View>

                  <View style={styles.funcBadge}>
                    <Text style={styles.funcBadgeText}>openBox(1, {doorNum})</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, isOpening && styles.actionBtnActive]}
                  onPress={() => handleOpen(doorNum)}
                  disabled={activeDoor !== null}
                  activeOpacity={0.75}
                >
                  {isOpening ? (
                    <View style={styles.openingRow}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.actionBtnTextActive}>OPENING...</Text>
                    </View>
                  ) : (
                    <Text style={styles.actionBtnText}>OPEN LOCKER {doorNum}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#f1f5f9',
    fontWeight: '700',
  },
  cardsList: {
    width: '100%',
    gap: 12,
  },
  doorCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  doorCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#241a15',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doorNumberBlock: {},
  doorNumberText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  channelSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  funcBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  funcBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    fontFamily: 'monospace',
  },
  actionBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: '#c2410c',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  openingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextActive: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});
