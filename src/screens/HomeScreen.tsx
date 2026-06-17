import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, StreakData } from '../types';
import { generateDailyScenario, getTodayProblemType } from '../services/claude';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');
const HP = width * 0.05;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen({ navigation }: Props) {
  const [scenario, setScenario] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading && scenario) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [isLoading, scenario]);

  const loadData = async () => {
    const today = todayString();
    try {
      const [scenarioContent, storedStreak] = await Promise.all([
        generateDailyScenario(),
        AsyncStorage.getItem('streak'),
      ]);

      let streakCount = 0;
      if (storedStreak) {
        const parsed: StreakData = JSON.parse(storedStreak);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (parsed.lastDate === today) {
          streakCount = parsed.count;
          setCompletedToday(true);
        } else if (parsed.lastDate === yesterdayStr) {
          streakCount = parsed.count;
        }
      }

      setScenario(scenarioContent);
      setStreak(streakCount);
    } catch {
      setScenario('오류가 발생했어요. 앱을 다시 시작해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    if (!scenario) return;
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => navigation.navigate('Perspective', { scenario }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 상단 영역 — flex 2 */}
        <View style={styles.topArea}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.appTitle}>오늘의 상황</Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakCount}>{streak}일</Text>
            </View>
          </View>
        </View>

        {/* 콘텐츠 영역 — flex 6 */}
        <View style={styles.contentArea}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>오늘의 상황을 불러오는 중...</Text>
            </View>
          ) : (
            <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.scenarioCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dot} />
                    <Text style={styles.cardLabel}>{getTodayProblemType().name}</Text>
                  </View>
                  <Text style={styles.scenarioText}>{scenario}</Text>
                </View>
                <Text style={styles.hintText}>어떤 관점이 가장 와닿으세요?</Text>
              </ScrollView>
            </Animated.View>
          )}
        </View>

        {/* 하단 버튼 영역 — flex 2 */}
        <View style={styles.bottomArea}>
          {!isLoading && (
            completedToday ? (
              <View style={styles.completedBanner}>
                <Text style={styles.completedIcon}>✓</Text>
                <Text style={styles.completedText}>오늘 완료했어요 — 내일 또 만나요</Text>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
                  <Text style={styles.startButtonText}>생각 나누기</Text>
                  <Text style={styles.startArrow}>→</Text>
                </TouchableOpacity>
              </Animated.View>
            )
          )}
          <Text style={styles.timeHint}>1~3분이면 충분해요</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    paddingHorizontal: HP,
  },

  /* 상단 영역 */
  topArea: {
    flex: 2,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: width * 0.005,
  },
  appTitle: {
    fontSize: width * 0.06,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: width * 0.035,
    color: '#64748B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.008,
    borderRadius: width * 0.05,
    gap: width * 0.01,
    borderWidth: 1,
    borderColor: '#334155',
  },
  streakFire: {
    fontSize: width * 0.04,
  },
  streakCount: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: '#F59E0B',
  },

  /* 콘텐츠 영역 */
  contentArea: {
    flex: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: height * 0.02,
  },
  loadingText: {
    color: '#64748B',
    fontSize: width * 0.04,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: height * 0.02,
    paddingBottom: height * 0.02,
  },
  scenarioCard: {
    backgroundColor: '#1E293B',
    borderRadius: width * 0.04,
    padding: width * 0.05,
    borderWidth: 1,
    borderColor: '#334155',
    gap: height * 0.016,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.02,
  },
  dot: {
    width: width * 0.02,
    height: width * 0.02,
    borderRadius: width * 0.01,
    backgroundColor: '#6366F1',
  },
  cardLabel: {
    fontSize: width * 0.03,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scenarioText: {
    fontSize: width * 0.04,
    color: '#E2E8F0',
    lineHeight: width * 0.065,
  },
  hintText: {
    textAlign: 'center',
    fontSize: width * 0.035,
    color: '#475569',
  },

  /* 하단 버튼 영역 */
  bottomArea: {
    flex: 2,
    justifyContent: 'center',
    gap: height * 0.012,
  },
  startButton: {
    backgroundColor: '#6366F1',
    borderRadius: width * 0.035,
    paddingVertical: height * 0.022,
    paddingHorizontal: width * 0.06,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: width * 0.02,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startArrow: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  completedBanner: {
    backgroundColor: '#14532D',
    borderRadius: width * 0.035,
    paddingVertical: height * 0.022,
    paddingHorizontal: width * 0.06,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: width * 0.025,
    borderWidth: 1,
    borderColor: '#166534',
  },
  completedIcon: {
    fontSize: width * 0.045,
    color: '#4ADE80',
  },
  completedText: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#4ADE80',
  },
  timeHint: {
    textAlign: 'center',
    fontSize: width * 0.035,
    color: '#334155',
  },
});
