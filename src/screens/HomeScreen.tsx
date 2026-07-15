import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const { width, height } = Dimensions.get('window');
const HP = width * 0.05;

export default function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
  const insets = useSafeAreaInsets();
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 페이드인
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

    // 버튼 글로우 반복
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleStart = () => {
    // 'Chat'은 STEP 6에서 제거됨 — 이 화면 자체가 이제 도달 불가능한 레거시라
    // 혹시 열리더라도 죽지 않도록 새 진입점(Main)으로 보낸다.
    navigation.navigate('Main');
  };

  const webStyle = Platform.OS === 'web'
    ? { paddingTop: insets.top, paddingBottom: insets.bottom } as const
    : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, webStyle]}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

        {/* 알람 버튼 — 우상단 */}
        <TouchableOpacity
          style={styles.alarmButton}
          onPress={() => navigation.navigate('Alarm')}
          activeOpacity={0.7}
        >
          <Text style={styles.alarmIcon}>🔔</Text>
        </TouchableOpacity>

        {/* 중앙 타이틀 */}
        <View style={styles.titleArea}>
          <Text style={styles.eyebrow}>🔍 새 사건 파일 도착</Text>
          <Text style={styles.title}>탐정{'\n'}사무소</Text>
          <Text style={styles.subtitle}>사람들이 지나치는 이상함을{'\n'}발견하는 사람들</Text>
        </View>

        {/* 시작 버튼 */}
        <View style={styles.buttonArea}>
          <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.startText}>파일 열기</Text>
            <Text style={styles.startArrow}>→</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: HP,
  },

  alarmButton: {
    position: 'absolute',
    top: height * 0.02,
    right: HP,
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: width * 0.055,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  alarmIcon: {
    fontSize: width * 0.042,
  },

  titleArea: {
    alignItems: 'center',
    gap: height * 0.016,
    marginBottom: height * 0.1,
  },
  eyebrow: {
    fontSize: width * 0.032,
    color: '#6366F1',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    fontSize: width * 0.16,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    lineHeight: width * 0.17,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: width * 0.038,
    color: '#475569',
    textAlign: 'center',
    lineHeight: width * 0.062,
  },

  buttonArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: height * 0.1,
  },
  glowRing: {
    position: 'absolute',
    width: width * 0.82,
    height: width * 0.175,
    borderRadius: width * 0.045,
    backgroundColor: '#6366F1',
    transform: [{ scaleX: 1.04 }, { scaleY: 1.3 }],
  },
  startButton: {
    width: width * 0.8,
    backgroundColor: '#6366F1',
    borderRadius: width * 0.04,
    paddingVertical: height * 0.025,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: width * 0.03,
  },
  startText: {
    fontSize: width * 0.048,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  startArrow: {
    fontSize: width * 0.048,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
