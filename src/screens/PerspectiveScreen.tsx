import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Perspective } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Perspective'>;
type Route = RouteProp<RootStackParamList, 'Perspective'>;

const { width, height } = Dimensions.get('window');
const HP = width * 0.05;

function parseCharacters(scenario: string): string[] {
  const chars = scenario
    .split('\n')
    .filter(line => line.trim().startsWith('→'))
    .map(line => {
      const content = line.replace(/^→\s*/, '').trim();
      const match = content.match(/^(.+?)\s+입장/);
      return match ? match[1].trim() : content.split(/\s+/).slice(0, 2).join(' ');
    })
    .filter(Boolean);

  return chars.length > 0 ? chars : ['관점 A', '관점 B', '관점 C'];
}

function getPreviewLine(scenario: string): string {
  const lines = scenario.split('\n').map(l => l.trim()).filter(Boolean);
  const sitIdx = lines.findIndex(l => l.includes('📽️'));
  if (sitIdx !== -1 && sitIdx + 1 < lines.length) return lines[sitIdx + 1];
  return lines.find(l => !l.startsWith('🎬') && !l.startsWith('─') && !l.startsWith('💭')) ?? scenario;
}

export default function PerspectiveScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const { scenario } = route.params;
  const characters = parseCharacters(scenario);
  const [opinions, setOpinions] = useState<string[]>(characters.map(() => ''));
  const [modalVisible, setModalVisible] = useState(false);

  const setOpinion = (i: number, text: string) => {
    setOpinions(prev => { const next = [...prev]; next[i] = text; return next; });
  };

  const canSubmit = opinions.some(o => o.trim().length > 0);

  const handleSubmit = () => {
    const perspectives: Perspective[] = characters.map((char, i) => ({
      character: char,
      opinion: opinions[i].trim(),
    }));
    navigation.navigate('Chat', { scenario, perspectives });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>각 입장 생각해보기</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 상황 요약 배너 — 탭하면 전체 보기 */}
      <TouchableOpacity
        style={styles.scenarioBanner}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerLabel}>🎬 오늘의 상황</Text>
          <Text style={styles.bannerPreview} numberOfLines={1} ellipsizeMode="tail">
            {getPreviewLine(scenario)}
          </Text>
        </View>
        <Text style={styles.expandIcon}>전체보기</Text>
      </TouchableOpacity>

      {/* 입장별 입력 카드 */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {characters.map((char, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardLabel}>{char}</Text>
              <Text style={styles.cardSub}>이 입장에서는 어떻게 생각할까요?</Text>
              <TextInput
                style={styles.input}
                placeholder="자유롭게 적어보세요..."
                placeholderTextColor="#475569"
                value={opinions[i]}
                onChangeText={text => setOpinion(i, text)}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          ))}
          <View style={{ height: height * 0.02 }} />
        </ScrollView>

        {/* 하단 버튼 */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>생각 완료</Text>
            <Text style={styles.submitArrow}>→</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>하나만 적어도 괜찮아요</Text>
        </View>
      </KeyboardAvoidingView>

      {/* 전체 상황 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>오늘의 상황 전체</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBody}>{scenario}</Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },

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

  scenarioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: HP,
    paddingVertical: height * 0.018,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: width * 0.02,
  },
  bannerLeft: { flex: 1, gap: height * 0.005 },
  bannerLabel: {
    fontSize: width * 0.028,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  bannerPreview: {
    fontSize: width * 0.036,
    color: '#94A3B8',
    lineHeight: width * 0.052,
  },
  expandIcon: {
    fontSize: width * 0.03,
    color: '#475569',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: width * 0.025,
    paddingVertical: height * 0.005,
    borderRadius: width * 0.02,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: HP,
    paddingTop: height * 0.025,
    gap: height * 0.018,
  },

  card: {
    backgroundColor: '#1E293B',
    borderRadius: width * 0.04,
    padding: width * 0.05,
    borderWidth: 1,
    borderColor: '#334155',
    gap: height * 0.008,
  },
  cardLabel: {
    fontSize: width * 0.042,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  cardSub: {
    fontSize: width * 0.033,
    color: '#64748B',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingTop: height * 0.014,
    paddingBottom: height * 0.014,
    fontSize: width * 0.038,
    color: '#F1F5F9',
    minHeight: height * 0.13,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: height * 0.008,
  },

  bottomArea: {
    paddingHorizontal: HP,
    paddingTop: height * 0.016,
    paddingBottom: height * 0.018,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: height * 0.01,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: width * 0.035,
    paddingVertical: height * 0.022,
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
  submitDisabled: {
    backgroundColor: '#1E293B',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: { fontSize: width * 0.045, fontWeight: '700', color: '#FFFFFF' },
  submitArrow: { fontSize: width * 0.045, color: '#FFFFFF', fontWeight: '700' },
  hint: {
    textAlign: 'center',
    fontSize: width * 0.033,
    color: '#334155',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: HP,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: width * 0.05,
    padding: width * 0.055,
    width: '100%',
    maxHeight: height * 0.72,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.018,
    paddingBottom: height * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: { fontSize: width * 0.042, fontWeight: '700', color: '#F1F5F9' },
  modalClose: { fontSize: width * 0.04, color: '#64748B' },
  modalBody: {
    fontSize: width * 0.038,
    color: '#E2E8F0',
    lineHeight: width * 0.065,
  },
});
