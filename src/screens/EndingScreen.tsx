import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { generateEnding, getScenarioId } from '../services/claude';
import {
  AnswerRecord,
  fetchAnswersForScenario,
  fetchBestAnswers,
  fetchOppositePerspectiveAnswer,
} from '../services/supabase';

type EndingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Ending'>;
type EndingScreenRouteProp = RouteProp<RootStackParamList, 'Ending'>;

interface Props {
  navigation: EndingScreenNavigationProp;
  route: EndingScreenRouteProp;
}

const { width, height } = Dimensions.get('window');
const HP = width * 0.06;

const SECTION_ICONS: Record<string, string> = {
  '사실': '📋',
  '네 생각과 실제 사이': '🔍',
  '놓치기 쉬운 관점': '💡',
  '아직 남은 질문': '❓',
};

const SECTION_COLORS: Record<string, string> = {
  '사실': '#334155',
  '네 생각과 실제 사이': '#1E3A5F',
  '놓치기 쉬운 관점': '#1C3A2E',
  '아직 남은 질문': '#2D1B4E',
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseSections(text: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = [];
  const lines = text.split('\n');
  let current: { title: string; body: string } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[1].trim(), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);
  return sections.map(s => ({ ...s, body: s.body.trim() })).filter(s => s.body);
}

export default function EndingScreen({ navigation, route }: Props) {
  const { scenario, messages } = route.params;
  const insets = useSafeAreaInsets();
  const [endingText, setEndingText] = useState('');
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ])
      ).start();
    pulse(dot1, 0);
    pulse(dot2, 180);
    pulse(dot3, 360);
  }, []);

  // StrictMode 이중 실행 방어: mountedRef
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    generateEnding(scenario, messages)
      .then(text => {
        setEndingText(text);
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      })
      .catch(() => {
        setEndingText('## 사실\n결말을 불러오지 못했습니다.\n\n## 아직 남은 질문\n이 사건에서 가장 기억에 남는 순간은 무엇이었나요?');
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
  }, []);

  // 관음 섹션(관점 분포/베스트 답변/정반대 관점/다양한 관점) — 결말 생성과 독립적으로 로드.
  // Supabase 미설정·네트워크 실패는 supabase.ts가 전부 조용히 삼키므로 여기선 화면이 죽지 않는다.
  const peekMountedRef = useRef(false);
  const [allAnswers, setAllAnswers] = useState<AnswerRecord[]>([]);
  const [bestAnswers, setBestAnswers] = useState<AnswerRecord[]>([]);
  const [oppositeAnswer, setOppositeAnswer] = useState<AnswerRecord | null>(null);
  const [myTag, setMyTag] = useState<string | null>(null);
  const [oppExpanded, setOppExpanded] = useState(false);

  useEffect(() => {
    if (peekMountedRef.current) return;
    peekMountedRef.current = true;
    (async () => {
      const scenarioId = getScenarioId();
      let myPerspectiveTag: string | null = null;
      try {
        const raw = await AsyncStorage.getItem(`myPerspective:${scenarioId}`);
        if (raw) myPerspectiveTag = JSON.parse(raw)?.tag ?? null;
      } catch {
        // 없어도 나머지 섹션은 그대로 진행
      }

      const [all, best, opp] = await Promise.all([
        fetchAnswersForScenario(scenarioId),
        fetchBestAnswers(scenarioId, 3),
        myPerspectiveTag ? fetchOppositePerspectiveAnswer(scenarioId, myPerspectiveTag) : Promise.resolve(null),
      ]);

      setAllAnswers(all);
      setBestAnswers(best);
      setOppositeAnswer(opp);
      setMyTag(myPerspectiveTag);
    })();
  }, []);

  const bestIds = new Set(bestAnswers.map(a => a.answer_id));
  const diverseAnswers = shuffle(allAnswers.filter(a => !bestIds.has(a.answer_id))).slice(0, 3);
  const perspectiveGroups = allAnswers.reduce<Record<string, number>>((acc, a) => {
    acc[a.perspective_tag] = (acc[a.perspective_tag] ?? 0) + 1;
    return acc;
  }, {});
  const perspectiveTotal = allAnswers.length;

  const webStyle = Platform.OS === 'web'
    ? { paddingTop: insets.top, paddingBottom: insets.bottom } as const
    : undefined;

  const sections = parseSections(endingText);

  return (
    <SafeAreaView style={[styles.safeArea, webStyle]}>

      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>결말</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>📜</Text>
          <Text style={styles.loadingLabel}>결말 정리 중</Text>
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
            ))}
          </View>
        </View>
      ) : (
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section, i) => {
              const icon = SECTION_ICONS[section.title] ?? '•';
              const bg = SECTION_COLORS[section.title] ?? '#1E293B';
              const isLast = section.title === '아직 남은 질문';

              return (
                <View
                  key={i}
                  style={[styles.sectionCard, { backgroundColor: bg }, isLast && styles.lastCard]}
                >
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>{icon}</Text>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <Text style={[styles.sectionBody, isLast && styles.sectionBodyQuestion]}>
                    {section.body}
                  </Text>
                </View>
              );
            })}

            {/* ── 관점 분포 ── */}
            <View style={[styles.peekCard, { backgroundColor: '#1E293B' }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📊</Text>
                <Text style={styles.sectionTitle}>관점 분포</Text>
              </View>
              {perspectiveTotal === 0 ? (
                <Text style={styles.peekEmptyText}>아직 다른 사람들의 관점이 모이는 중이에요.</Text>
              ) : (
                <View style={{ gap: height * 0.01 }}>
                  {Object.entries(perspectiveGroups).map(([tag, count]) => {
                    const pct = Math.round((count / perspectiveTotal) * 100);
                    return (
                      <View key={tag}>
                        <Text style={styles.peekBarLabel}>{tag} · {pct}%</Text>
                        <View style={styles.peekBarTrack}>
                          <View style={[styles.peekBarFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── 오늘의 베스트 답변 3개 ── */}
            <View style={[styles.peekCard, { backgroundColor: '#1C3A2E' }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🏆</Text>
                <Text style={styles.sectionTitle}>오늘의 베스트 답변</Text>
              </View>
              {bestAnswers.length === 0 ? (
                <Text style={styles.peekEmptyText}>첫 답변의 주인공이 되어보세요.</Text>
              ) : (
                bestAnswers.map(a => (
                  <View key={a.answer_id} style={styles.peekAnswerRow}>
                    <Text style={styles.peekAnswerTag}>{a.perspective_tag}</Text>
                    <Text style={styles.peekAnswerContent} numberOfLines={3}>{a.content}</Text>
                  </View>
                ))
              )}
            </View>

            {/* ── 나와 정반대 관점 ── */}
            <View style={[styles.peekCard, { backgroundColor: '#1E3A5F' }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🔀</Text>
                <Text style={styles.sectionTitle}>나와 정반대 관점</Text>
              </View>
              {!myTag || !oppositeAnswer ? (
                <Text style={styles.peekEmptyText}>정반대 관점이 아직 없어요.</Text>
              ) : oppExpanded ? (
                <View style={styles.peekAnswerRow}>
                  <Text style={styles.peekAnswerTag}>{oppositeAnswer.perspective_tag}</Text>
                  <Text style={styles.peekAnswerContent}>{oppositeAnswer.content}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setOppExpanded(true)} activeOpacity={0.85}>
                  <Text style={styles.peekRevealText}>내 관점({myTag})과 다른 답변 보기 →</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── 오늘의 다양한 관점 ── */}
            {diverseAnswers.length > 0 && (
              <View style={[styles.peekCard, { backgroundColor: '#2D1B4E' }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🎲</Text>
                  <Text style={styles.sectionTitle}>오늘의 다양한 관점</Text>
                </View>
                {diverseAnswers.map(a => (
                  <View key={a.answer_id} style={styles.peekAnswerRow}>
                    <Text style={styles.peekAnswerTag}>{a.perspective_tag}</Text>
                    <Text style={styles.peekAnswerContent} numberOfLines={2}>{a.content}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 다음 사건 버튼 */}
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>다음 사건 보기</Text>
              <Text style={styles.nextArrow}>→</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080D1A',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HP,
    paddingVertical: height * 0.014,
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
  backArrow: {
    fontSize: width * 0.06,
    color: '#94A3B8',
    lineHeight: width * 0.075,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: width * 0.04,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: 1,
  },
  headerRight: {
    width: width * 0.08,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: height * 0.02,
  },
  loadingEmoji: {
    fontSize: width * 0.12,
    marginBottom: height * 0.008,
  },
  loadingLabel: {
    fontSize: width * 0.036,
    color: '#475569',
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: width * 0.028,
  },
  dot: {
    width: width * 0.02,
    height: width * 0.02,
    borderRadius: width * 0.01,
    backgroundColor: '#6366F1',
  },

  scrollContent: {
    paddingHorizontal: HP,
    paddingTop: height * 0.03,
    paddingBottom: height * 0.05,
    gap: height * 0.018,
  },

  sectionCard: {
    borderRadius: width * 0.04,
    padding: width * 0.055,
    gap: height * 0.012,
  },
  lastCard: {
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.025,
  },
  sectionIcon: {
    fontSize: width * 0.045,
  },
  sectionTitle: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: width * 0.042,
    color: '#E2E8F0',
    lineHeight: width * 0.068,
    fontWeight: '400',
  },
  sectionBodyQuestion: {
    color: '#C4B5FD',
    fontStyle: 'italic',
    fontSize: width * 0.044,
    lineHeight: width * 0.072,
  },

  peekCard: {
    borderRadius: width * 0.04,
    padding: width * 0.055,
    gap: height * 0.01,
  },
  peekEmptyText: {
    fontSize: width * 0.036,
    color: '#94A3B8',
    lineHeight: width * 0.056,
  },
  peekBarLabel: {
    fontSize: width * 0.034,
    color: '#CBD5E1',
    marginBottom: height * 0.004,
  },
  peekBarTrack: {
    height: height * 0.01,
    borderRadius: height * 0.005,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  peekBarFill: {
    height: '100%',
    borderRadius: height * 0.005,
    backgroundColor: '#6366F1',
  },
  peekAnswerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: height * 0.01,
    gap: height * 0.004,
  },
  peekAnswerTag: {
    fontSize: width * 0.032,
    color: '#A5B4FC',
    fontWeight: '700',
  },
  peekAnswerContent: {
    fontSize: width * 0.036,
    color: '#E2E8F0',
    lineHeight: width * 0.054,
  },
  peekRevealText: {
    fontSize: width * 0.036,
    color: '#93C5FD',
    fontWeight: '600',
  },

  nextBtn: {
    marginTop: height * 0.01,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: width * 0.04,
    paddingVertical: height * 0.022,
    gap: width * 0.025,
  },
  nextText: {
    fontSize: width * 0.046,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextArrow: {
    fontSize: width * 0.046,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
