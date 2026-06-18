import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Switch,
  Alert,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import {
  AlarmSettings,
  DEFAULT_ALARM,
  loadAlarmSettings,
  saveAlarmSettings,
  requestPermissions,
  formatTime,
} from '../services/notifications';

type Nav = StackNavigationProp<RootStackParamList, 'Alarm'>;

const { width, height } = Dimensions.get('window');
const HP = width * 0.05;

const TIME_PRESETS = [
  { label: '오전 6:00', hour: 6, minute: 0 },
  { label: '오전 7:00', hour: 7, minute: 0 },
  { label: '오전 8:00', hour: 8, minute: 0 },
  { label: '오전 9:00', hour: 9, minute: 0 },
  { label: '오전 10:00', hour: 10, minute: 0 },
  { label: '오후 12:00', hour: 12, minute: 0 },
  { label: '오후 6:00', hour: 18, minute: 0 },
  { label: '오후 9:00', hour: 21, minute: 0 },
  { label: '직접 입력', hour: -1, minute: -1 },
];

const DAY_OPTIONS: { label: string; value: AlarmSettings['days'] }[] = [
  { label: '매일', value: 'daily' },
  { label: '평일', value: 'weekdays' },
  { label: '주말', value: 'weekends' },
  { label: 'N시간마다', value: 'interval' },
  { label: '직접 설정', value: 'custom' },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const THUMB_SIZE = width * 0.065;
const TRACK_WIDTH = width - HP * 2 - width * 0.1;
const USABLE_WIDTH = TRACK_WIDTH - THUMB_SIZE;

function isPresetTime(hour: number, minute: number): boolean {
  return TIME_PRESETS.some(p => p.hour === hour && p.minute === minute);
}

/* ─── 드래그 슬라이더 컴포넌트 ─── */
function IntervalSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const initialX = ((value - 1) / 23) * USABLE_WIDTH;
  const thumbX = useRef(new Animated.Value(initialX)).current;
  const thumbOffset = useRef(initialX);
  const liveHours = useRef(value);

  // value prop 변경 시 동기화 (외부에서 바뀔 때)
  useEffect(() => {
    const x = ((value - 1) / 23) * USABLE_WIDTH;
    thumbOffset.current = x;
    thumbX.setValue(x);
    liveHours.current = value;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        thumbX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(
          0,
          Math.min(USABLE_WIDTH, thumbOffset.current + gesture.dx)
        );
        thumbX.setValue(newX);
        const hours = Math.max(1, Math.min(24, Math.round((newX / USABLE_WIDTH) * 23) + 1));
        liveHours.current = hours;
        onChange(hours);
      },
      onPanResponderRelease: (_, gesture) => {
        const newX = Math.max(
          0,
          Math.min(USABLE_WIDTH, thumbOffset.current + gesture.dx)
        );
        const hours = Math.max(1, Math.min(24, Math.round((newX / USABLE_WIDTH) * 23) + 1));
        const snappedX = ((hours - 1) / 23) * USABLE_WIDTH;
        thumbOffset.current = snappedX;
        Animated.spring(thumbX, {
          toValue: snappedX,
          useNativeDriver: false,
          tension: 120,
          friction: 8,
        }).start();
        liveHours.current = hours;
        onChange(hours);
      },
    })
  ).current;

  const fillWidth = thumbX.interpolate({
    inputRange: [0, USABLE_WIDTH],
    outputRange: [THUMB_SIZE / 2, TRACK_WIDTH - THUMB_SIZE / 2],
    extrapolate: 'clamp',
  });

  return (
    <View style={sliderStyles.wrapper}>
      {/* 트랙 컨테이너 */}
      <View style={[sliderStyles.trackContainer, { width: TRACK_WIDTH }]}>
        {/* 배경 트랙 */}
        <View style={[sliderStyles.track, { width: TRACK_WIDTH }]} />
        {/* 채워진 부분 */}
        <Animated.View style={[sliderStyles.fill, { width: fillWidth }]} />
        {/* 썸 */}
        <Animated.View
          style={[sliderStyles.thumb, { transform: [{ translateX: thumbX }] }]}
          {...panResponder.panHandlers}
        />
      </View>

      {/* 눈금 레이블 */}
      <View style={[sliderStyles.labelsRow, { width: TRACK_WIDTH }]}>
        {[1, 4, 8, 12, 16, 20, 24].map(h => (
          <Text key={h} style={sliderStyles.tickLabel}>{h}h</Text>
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: height * 0.008,
    gap: height * 0.01,
  },
  trackContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  thumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#6366F1',
    borderWidth: 3,
    borderColor: '#818CF8',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  tickLabel: {
    fontSize: width * 0.028,
    color: '#475569',
  },
});

/* ─── 메인 화면 ─── */
export default function AlarmScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AlarmSettings>({ ...DEFAULT_ALARM });
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAlarmSettings().then(s => {
      setSettings(s);
      setIsCustomTime(!isPresetTime(s.hour, s.minute) && s.days !== 'interval');
    });
  }, []);

  const handleToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          '알림 권한 필요',
          '알람을 사용하려면 설정 > 앱에서 알림 권한을 켜주세요.',
          [{ text: '확인' }]
        );
        return;
      }
    }
    setSettings(prev => ({ ...prev, enabled: value }));
  };

  const handlePreset = (hour: number, minute: number) => {
    if (hour === -1) {
      setIsCustomTime(true);
      return;
    }
    setIsCustomTime(false);
    setSettings(prev => ({ ...prev, hour, minute }));
  };

  const adjustHour = (delta: number) => {
    setSettings(prev => ({ ...prev, hour: (prev.hour + delta + 24) % 24 }));
  };

  const adjustMinute = (delta: number) => {
    const minutes = [0, 30];
    const idx = minutes.indexOf(settings.minute);
    const next = (idx + delta + minutes.length) % minutes.length;
    setSettings(prev => ({ ...prev, minute: minutes[next] }));
  };

  const handleDayOption = (value: AlarmSettings['days']) => {
    setSettings(prev => ({ ...prev, days: value }));
    if (value === 'interval') setIsCustomTime(false);
  };

  const toggleCustomDay = (i: number) => {
    setSettings(prev => {
      const next = [...prev.customDays];
      next[i] = !next[i];
      if (next.every(d => !d)) return prev;
      return { ...prev, customDays: next };
    });
  };

  const handleSave = async () => {
    await saveAlarmSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const isIntervalMode = settings.days === 'interval';
  const showTimeSection = !isIntervalMode;

  const alarmSubLabel = () => {
    if (!settings.enabled) return '알람이 꺼져 있어요';
    if (isIntervalMode) return `${settings.intervalHours}시간마다 알림`;
    return `${formatTime(settings.hour, settings.minute)} 알림`;
  };

  const Wrapper = Platform.OS === 'web' ? ScrollView : SafeAreaView;
  const wrapperProps = Platform.OS === 'web'
    ? { style: styles.safeArea, contentContainerStyle: { flexGrow: 1, paddingTop: insets.top }, showsVerticalScrollIndicator: false }
    : { style: styles.safeArea };

  return (
    <Wrapper {...wrapperProps}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알람 설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 알람 ON/OFF */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleLabel}>🔔 알람</Text>
              <Text style={styles.toggleSub}>{alarmSubLabel()}</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#334155', true: '#4F46E5' }}
              thumbColor={settings.enabled ? '#818CF8' : '#64748B'}
            />
          </View>
          {!settings.enabled && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 알람을 켜두면 매일 같은 시간에 문제를 받을 수 있어요
              </Text>
            </View>
          )}
        </View>

        {/* 알람 주기 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 알람 주기</Text>
          <View style={styles.dayOptionRow}>
            {DAY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.dayOptionChip,
                  settings.days === opt.value && styles.dayOptionChipSelected,
                ]}
                onPress={() => handleDayOption(opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayOptionText,
                    settings.days === opt.value && styles.dayOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* N시간마다 — 드래그 슬라이더 */}
          {isIntervalMode && (
            <View style={styles.intervalBox}>
              <View style={styles.intervalHeader}>
                <Text style={styles.intervalValueBig}>{settings.intervalHours}</Text>
                <Text style={styles.intervalUnit}>시간마다</Text>
              </View>
              <IntervalSlider
                value={settings.intervalHours}
                onChange={v => setSettings(prev => ({ ...prev, intervalHours: v }))}
              />
            </View>
          )}

          {/* 직접 요일 선택 */}
          {settings.days === 'custom' && (
            <View style={styles.customDayRow}>
              {DAY_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCircle,
                    settings.customDays[i] && styles.dayCircleSelected,
                  ]}
                  onPress={() => toggleCustomDay(i)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayCircleText,
                      settings.customDays[i] && styles.dayCircleTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 시간 선택 — interval 모드일 때 숨김 */}
        {showTimeSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ 문제 받을 시간</Text>
            <View style={styles.timeGrid}>
              {TIME_PRESETS.map((preset, i) => {
                const isSelected =
                  preset.hour === -1
                    ? isCustomTime
                    : !isCustomTime &&
                      preset.hour === settings.hour &&
                      preset.minute === settings.minute;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                    onPress={() => handlePreset(preset.hour, preset.minute)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isCustomTime && (
              <View style={styles.customTimePicker}>
                <View style={styles.timeUnit}>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustHour(1)}>
                    <Text style={styles.adjustBtnText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>
                    {settings.hour.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustHour(-1)}>
                    <Text style={styles.adjustBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeUnit}>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustMinute(1)}>
                    <Text style={styles.adjustBtnText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>
                    {settings.minute.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustMinute(-1)}>
                    <Text style={styles.adjustBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.customTimeLabel}>
                  {formatTime(settings.hour, settings.minute)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: height * 0.02 }} />
      </ScrollView>

      {/* 저장 버튼 */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.saveButton, saved && styles.saveButtonDone]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>
            {saved ? '✓ 저장됐어요' : '저장하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HP,
    paddingVertical: height * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.025,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: width * 0.06, color: '#94A3B8', lineHeight: width * 0.075 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: width * 0.04,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerRight: { width: width * 0.08 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: HP,
    paddingTop: height * 0.025,
    gap: height * 0.025,
  },

  section: {
    backgroundColor: '#1E293B',
    borderRadius: width * 0.04,
    padding: width * 0.05,
    borderWidth: 1,
    borderColor: '#334155',
    gap: height * 0.016,
  },
  sectionTitle: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: '#E2E8F0',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: { gap: height * 0.004 },
  toggleLabel: { fontSize: width * 0.042, fontWeight: '700', color: '#F1F5F9' },
  toggleSub: { fontSize: width * 0.033, color: '#64748B' },
  infoBox: {
    backgroundColor: '#0F172A',
    borderRadius: width * 0.025,
    padding: width * 0.035,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoText: { fontSize: width * 0.034, color: '#475569', lineHeight: width * 0.054 },

  dayOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: width * 0.02,
  },
  dayOptionChip: {
    backgroundColor: '#0F172A',
    borderRadius: width * 0.025,
    paddingHorizontal: width * 0.038,
    paddingVertical: height * 0.012,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayOptionChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  dayOptionText: { fontSize: width * 0.033, color: '#94A3B8', fontWeight: '600' },
  dayOptionTextSelected: { color: '#FFFFFF' },

  /* N시간마다 슬라이더 영역 */
  intervalBox: {
    backgroundColor: '#0F172A',
    borderRadius: width * 0.03,
    padding: width * 0.04,
    borderWidth: 1,
    borderColor: '#334155',
    gap: height * 0.012,
    alignItems: 'center',
  },
  intervalHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: width * 0.015,
  },
  intervalValueBig: {
    fontSize: width * 0.12,
    fontWeight: '800',
    color: '#818CF8',
    lineHeight: width * 0.14,
  },
  intervalUnit: {
    fontSize: width * 0.04,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* 직접 요일 */
  customDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayCircleSelected: { backgroundColor: '#4F46E5', borderColor: '#6366F1' },
  dayCircleText: { fontSize: width * 0.033, color: '#64748B', fontWeight: '600' },
  dayCircleTextSelected: { color: '#FFFFFF' },

  /* 시간 선택 */
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.02 },
  timeChip: {
    backgroundColor: '#0F172A',
    borderRadius: width * 0.025,
    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.01,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeChipSelected: { backgroundColor: '#4F46E5', borderColor: '#6366F1' },
  timeChipText: { fontSize: width * 0.034, color: '#94A3B8', fontWeight: '500' },
  timeChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },

  customTimePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: width * 0.03,
    backgroundColor: '#0F172A',
    borderRadius: width * 0.03,
    borderWidth: 1,
    borderColor: '#334155',
    padding: width * 0.04,
  },
  timeUnit: { alignItems: 'center', gap: height * 0.008 },
  adjustBtn: { paddingHorizontal: width * 0.04, paddingVertical: height * 0.006 },
  adjustBtnText: { fontSize: width * 0.032, color: '#6366F1', fontWeight: '700' },
  timeValue: {
    fontSize: width * 0.07,
    fontWeight: '700',
    color: '#F1F5F9',
    minWidth: width * 0.12,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: width * 0.07,
    fontWeight: '700',
    color: '#475569',
    marginBottom: height * 0.005,
  },
  customTimeLabel: {
    fontSize: width * 0.036,
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: width * 0.02,
  },

  bottomArea: {
    paddingHorizontal: HP,
    paddingTop: height * 0.016,
    paddingBottom: height * 0.018,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: width * 0.035,
    paddingVertical: height * 0.022,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDone: { backgroundColor: '#166534', shadowColor: '#166534' },
  saveButtonText: { fontSize: width * 0.045, fontWeight: '700', color: '#FFFFFF' },
});
