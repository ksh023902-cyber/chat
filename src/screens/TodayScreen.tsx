import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayStackParamList, RootStackParamList, StreakData } from '../types';
import { fetchTodayQuestion, getTodayDayNumber, QuestionRecord } from '../services/supabase';
import { spacing, fontSize } from '../constants/tokens';
import { TODAY_SCREEN, streakLabel } from '../constants/strings';

// Write(같은 탭 내부 스택)뿐 아니라 Alarm(루트 스택, 다른 탭 밖 레거시 화면)으로도
// 이동해야 해서 두 네비게이터를 합성한 타입이 필요하다.
type Nav = CompositeNavigationProp<
  StackNavigationProp<TodayStackParamList, 'Today'>,
  StackNavigationProp<RootStackParamList>
>;

type TodayQuestion = Pick<QuestionRecord, 'situation' | 'question'> & { id: string };

// questions 테이블에 아직 이 day_number 행이 없을 때 쓰는 폴백 — 화면은 이걸로 완성해둔다.
const FALLBACK_QUESTION: TodayQuestion = {
  id: 'fallback',
  situation: '친한 친구가 처음 쓴 소설을 보여줬어요.\n솔직히, 재미가 없었어요.',
  question: '당신이라면 뭐라고 할까요?',
};

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function TodayScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [question, setQuestion] = useState<TodayQuestion>(FALLBACK_QUESTION);
  const [streakCount, setStreakCount] = useState(0);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    (async () => {
      const q = await fetchTodayQuestion(getTodayDayNumber());
      if (q) setQuestion({ id: q.id, situation: q.situation, question: q.question });
    })();

    (async () => {
      try {
        const raw = await AsyncStorage.getItem('streak');
        if (raw) {
          const { count } = JSON.parse(raw) as StreakData;
          setStreakCount(count ?? 0);
        }
      } catch {
        // 스트릭 없어도 0으로 표시, 화면은 계속 진행
      }
    })();
  }, []);

  const webStyle = Platform.OS === 'web'
    ? { paddingTop: insets.top, paddingBottom: insets.bottom } as const
    : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, webStyle]}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{TODAY_SCREEN.headerTitle}</Text>
            {/* 캘린더는 이제 하단 탭으로 이동 가능 — 여기는 독립 기능인 알람 설정 진입점 */}
            <TouchableOpacity onPress={() => navigation.navigate('Alarm')}>
              <Text style={styles.calendarIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerDate}>{todayLabel()}</Text>
            {streakCount > 0 && <Text style={styles.streak}>{streakLabel(streakCount)}</Text>}
          </View>
        </View>

        <View style={styles.center}>
          <Text style={styles.situation}>{question.situation}</Text>
          <Text style={styles.question}>{question.question}</Text>
        </View>

        <Text style={styles.guide}>{TODAY_SCREEN.guide}</Text>

        <TouchableOpacity
          style={styles.writeBtn}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Write', {
              questionId: question.id,
              situation: question.situation,
              question: question.question,
            })
          }
        >
          <Text style={styles.writeBtnText}>{TODAY_SCREEN.writeButton}</Text>
        </TouchableOpacity>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  calendarIcon: {
    fontSize: fontSize.title,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerDate: {
    fontSize: fontSize.sub,
    color: '#64748B',
  },
  streak: {
    fontSize: fontSize.sub,
    color: '#FBBF24',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  situation: {
    fontSize: fontSize.body,
    color: '#CBD5E1',
    lineHeight: fontSize.body * 1.6,
  },
  question: {
    fontSize: fontSize.title,
    color: '#F1F5F9',
    fontWeight: '700',
    lineHeight: fontSize.title * 1.4,
  },
  guide: {
    fontSize: fontSize.sub,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  writeBtn: {
    backgroundColor: '#6366F1',
    borderRadius: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  writeBtnText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
