import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { generateDailyScenario } from '../services/claude';

type ScenarioScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Scenario'>;

const { width, height } = Dimensions.get('window');
const HP = width * 0.07;

const SCENE_SUBTITLES = ['배경', '등장', '사건', '절정', '선택'];

function parseScenes(text: string): string[] {
  const result: string[] = [];
  const tags = ['[씬1]', '[씬2]', '[씬3]', '[씬4]', '[씬5]'];

  for (let i = 0; i < tags.length; i++) {
    const start = text.indexOf(tags[i]);
    if (start === -1) continue;
    const contentStart = start + tags[i].length;
    const end = i < tags.length - 1 ? text.indexOf(tags[i + 1]) : text.length;
    const scene = text.slice(contentStart, end === -1 ? text.length : end).trim();
    if (scene) result.push(scene);
  }

  if (result.length === 0) {
    return text.split(/\n\n+/).filter(s => s.trim().length > 0).slice(0, 5);
  }
  return result;
}

// 대화 라인 or 행동 묘사 판별
function isAction(line: string) {
  return line.startsWith('(') && line.endsWith(')');
}

function renderLines(scene: string) {
  return scene.split('\n').filter(l => l.trim().length > 0);
}

export default function ScenarioScreen({ navigation }: { navigation: ScenarioScreenNavigationProp }) {
  const [scenes, setScenes] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullScenario, setFullScenario] = useState('');
  const [error, setError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

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

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    generateDailyScenario()
      .then(text => {
        setFullScenario(text);
        const parsed = parseScenes(text);
        setScenes(parsed.length > 0 ? parsed : [text]);
        setLoading(false);
        setTimeout(animateIn, 50);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      setTimeout(animateIn, 30);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (currentIdx < scenes.length - 1) {
      setCurrentIdx(i => i + 1);
      setTimeout(animateIn, 30);
    } else {
      navigation.navigate('Chat', { scenario: fullScenario });
    }
  };

  const totalScenes = scenes.length;
  const isLastScene = currentIdx === totalScenes - 1;
  const currentScene = scenes[currentIdx] ?? '';
  const lines = renderLines(currentScene);
  const subtitle = SCENE_SUBTITLES[currentIdx] ?? '';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingLabel}>사건 불러오는 중</Text>
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingLabel}>사건을 불러오지 못했습니다</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* 상단 바 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 씬 번호 + 소제목 */}
      <Animated.View style={[styles.sceneHeader, { opacity: fadeAnim }]}>
        <Text style={styles.sceneNum}>{currentIdx + 1} / {totalScenes}</Text>
        <Text style={styles.sceneSubtitle}>{subtitle}</Text>
      </Animated.View>

      {/* 씬 내용 */}
      <Animated.View
        style={[
          styles.sceneBody,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {lines.map((line, i) => {
          const action = isAction(line);
          return (
            <Text
              key={i}
              style={[
                styles.line,
                action && styles.actionLine,
              ]}
            >
              {line}
            </Text>
          );
        })}
      </Animated.View>

      {/* 하단 */}
      <View style={styles.bottomArea}>
        {/* 진행 점 */}
        <View style={styles.progressDots}>
          {Array.from({ length: totalScenes }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === currentIdx && styles.progressDotActive,
                i < currentIdx && styles.progressDotDone,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, isLastScene && styles.lastBtn]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {isLastScene ? '생각 나눠보기' : '다음'}
          </Text>
          <Text style={styles.nextArrow}>→</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080D1A',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: height * 0.028,
  },
  loadingLabel: {
    fontSize: width * 0.038,
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
  retryBtn: {
    paddingHorizontal: width * 0.08,
    paddingVertical: height * 0.015,
    backgroundColor: '#1E293B',
    borderRadius: width * 0.03,
  },
  retryText: {
    color: '#94A3B8',
    fontSize: width * 0.038,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: HP,
    paddingTop: height * 0.01,
  },
  closeBtn: {
    width: width * 0.09,
    height: width * 0.09,
    borderRadius: width * 0.045,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: width * 0.055,
    color: '#64748B',
    lineHeight: width * 0.07,
  },
  closeText: {
    fontSize: width * 0.036,
    color: '#64748B',
  },

  sceneHeader: {
    paddingHorizontal: HP,
    paddingTop: height * 0.03,
    paddingBottom: height * 0.018,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: width * 0.025,
  },
  sceneNum: {
    fontSize: width * 0.052,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: -0.5,
  },
  sceneSubtitle: {
    fontSize: width * 0.034,
    color: '#334155',
    fontWeight: '600',
    letterSpacing: 1,
  },

  sceneBody: {
    flex: 1,
    paddingHorizontal: HP,
    paddingTop: height * 0.01,
    gap: height * 0.02,
    justifyContent: 'center',
  },
  line: {
    fontSize: width * 0.052,
    color: '#E2E8F0',
    lineHeight: width * 0.078,
    fontWeight: '500',
  },
  actionLine: {
    fontSize: width * 0.038,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: width * 0.058,
    paddingLeft: width * 0.02,
  },

  bottomArea: {
    paddingHorizontal: HP,
    paddingBottom: height * 0.045,
    paddingTop: height * 0.02,
    gap: height * 0.022,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: width * 0.022,
  },
  progressDot: {
    width: width * 0.016,
    height: width * 0.016,
    borderRadius: width * 0.008,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    width: width * 0.05,
    borderRadius: width * 0.008,
  },
  progressDotDone: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: width * 0.04,
    paddingVertical: height * 0.022,
    gap: width * 0.025,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lastBtn: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  nextText: {
    fontSize: width * 0.046,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  nextArrow: {
    fontSize: width * 0.046,
    color: '#F1F5F9',
    fontWeight: '700',
  },
});
