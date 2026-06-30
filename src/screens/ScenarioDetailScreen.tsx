import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'ScenarioDetail'>;
type Route = RouteProp<RootStackParamList, 'ScenarioDetail'>;

const { width, height } = Dimensions.get('window');
const HP = width * 0.07;

const SCENE_SUBTITLES = ['배경', '등장', '사건', '절정', '선택'];

function parseScenes(text: string): string[] {
  const tags = ['[씬1]', '[씬2]', '[씬3]', '[씬4]', '[씬5]'];
  const result: string[] = [];

  for (let i = 0; i < tags.length; i++) {
    const start = text.indexOf(tags[i]);
    if (start === -1) continue;
    const contentStart = start + tags[i].length;
    const end = i < tags.length - 1 ? text.indexOf(tags[i + 1]) : text.length;
    const scene = text.slice(contentStart, end === -1 ? text.length : end).trim();
    if (scene) result.push(scene);
  }

  if (result.length === 0) {
    return text.split(/\n\n+/).filter(s => s.trim().length > 0);
  }
  return result;
}

function isAction(line: string) {
  return line.startsWith('(') && line.endsWith(')');
}

export default function ScenarioDetailScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const { scenario } = route.params;
  const insets = useSafeAreaInsets();
  const scenes = parseScenes(scenario);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>씬 전체보기</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + height * 0.04 }]}
        showsVerticalScrollIndicator={false}
      >
        {scenes.map((scene, idx) => {
          const lines = scene.split('\n').filter(l => l.trim().length > 0);
          const subtitle = SCENE_SUBTITLES[idx] ?? '';

          return (
            <View key={idx} style={styles.sceneCard}>
              {/* 씬 번호 + 소제목 */}
              <View style={styles.sceneHeader}>
                <Text style={styles.sceneNum}>씬 {idx + 1}</Text>
                {subtitle ? <Text style={styles.sceneSubtitle}>{subtitle}</Text> : null}
              </View>

              {/* 씬 내용 */}
              <View style={styles.sceneBody}>
                {lines.map((line, i) => (
                  <Text
                    key={i}
                    style={[styles.line, isAction(line) && styles.actionLine]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080D1A',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HP,
    paddingVertical: height * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: width * 0.09,
    height: width * 0.09,
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
  },
  headerRight: {
    width: width * 0.09,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HP,
    paddingTop: height * 0.03,
    gap: height * 0.025,
  },

  sceneCard: {
    backgroundColor: '#0F172A',
    borderRadius: width * 0.045,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  sceneHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: width * 0.025,
    paddingHorizontal: width * 0.055,
    paddingTop: height * 0.022,
    paddingBottom: height * 0.014,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sceneNum: {
    fontSize: width * 0.042,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: -0.5,
  },
  sceneSubtitle: {
    fontSize: width * 0.032,
    color: '#334155',
    fontWeight: '600',
    letterSpacing: 1,
  },

  sceneBody: {
    paddingHorizontal: width * 0.055,
    paddingVertical: height * 0.022,
    gap: height * 0.014,
  },
  line: {
    fontSize: width * 0.042,
    color: '#E2E8F0',
    lineHeight: width * 0.066,
    fontWeight: '400',
  },
  actionLine: {
    fontSize: width * 0.035,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: width * 0.054,
    paddingLeft: width * 0.02,
  },
});
