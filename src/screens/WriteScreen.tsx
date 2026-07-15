import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayStackParamList, StreakData } from '../types';
import { submitEntry, updateEntryAiResponse } from '../services/supabase';
import { generateEntryReaction } from '../services/claude';
import { spacing, fontSize } from '../constants/tokens';
import { WRITE_SCREEN, REACTION, streakLabel } from '../constants/strings';

type Nav = StackNavigationProp<TodayStackParamList, 'Write'>;
type Route = RouteProp<TodayStackParamList, 'Write'>;

// ChatScreen의 기존 recordStreak 로직을 그대로 이관 — "기록 저장"이 새 트리거다.
// 압박·상실 문구 없이: 오늘 이미 기록했으면 조용히 유지, 어제 안 했으면 1로 리셋(자책 문구 없음).
async function recordStreakOnSave(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const stored = await AsyncStorage.getItem('streak');
    let count = 1;
    if (stored) {
      const parsed: StreakData = JSON.parse(stored);
      if (parsed.lastDate === today) return parsed.count;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      if (parsed.lastDate === yesterdayStr) count = parsed.count + 1;
    }
    await AsyncStorage.setItem('streak', JSON.stringify({ count, lastDate: today } as StreakData));
    return count;
  } catch {
    return 1;
  }
}

export default function WriteScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const { questionId, situation, question } = route.params;
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [newStreak, setNewStreak] = useState(0);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState('');
  const [reaction, setReaction] = useState<string | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);

  const canSave = content.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const trimmed = content.trim();
    setSavedContent(trimmed);

    // entries 저장은 기록 자체와 달리 결과(id)가 필요해서(반응 붙이기용) 여기선 기다린다.
    const id = await submitEntry({ questionId, situation, question, content: trimmed });
    setEntryId(id);

    const count = await recordStreakOnSave();
    setNewStreak(count);
    setSaving(false);
    setDone(true);
  };

  // 버튼을 눌렀을 때만 호출된다 — 안 누르면 AI는 절대 등장하지 않는다.
  const handleReaction = async () => {
    setReactionLoading(true);
    try {
      const { text } = await generateEntryReaction(question, savedContent);
      setReaction(text);
      if (entryId) updateEntryAiResponse(entryId, text);
    } catch {
      // 실패해도 화면은 그대로 — 반응 없이 완료 화면 유지
    } finally {
      setReactionLoading(false);
    }
  };

  const webStyle = Platform.OS === 'web'
    ? { paddingTop: insets.top, paddingBottom: insets.bottom } as const
    : undefined;

  if (done) {
    return (
      <SafeAreaView style={[styles.safeArea, webStyle]}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneTitle}>{WRITE_SCREEN.completeTitle}</Text>
          <Text style={styles.doneStreak}>{streakLabel(newStreak)}</Text>

          {reaction ? (
            <View style={styles.reactionCard}>
              <Text style={styles.reactionText}>{reaction}</Text>
            </View>
          ) : (
            entryId && (
              <TouchableOpacity
                style={styles.reactionBtn}
                activeOpacity={0.85}
                disabled={reactionLoading}
                onPress={handleReaction}
              >
                <Text style={styles.reactionBtnText}>
                  {reactionLoading ? REACTION.loadingButton : REACTION.askButton}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Today')}
          >
            <Text style={styles.backBtnText}>{WRITE_SCREEN.backToToday}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webStyle]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerSituation}>{situation}</Text>
          <Text style={styles.headerQuestion}>{question}</Text>
        </View>

        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder={WRITE_SCREEN.placeholder}
          placeholderTextColor="#475569"
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          activeOpacity={0.85}
          disabled={!canSave}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {saving ? WRITE_SCREEN.savingButton : WRITE_SCREEN.saveButton}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  headerSituation: {
    fontSize: fontSize.sub,
    color: '#64748B',
    lineHeight: fontSize.sub * 1.5,
  },
  headerQuestion: {
    fontSize: fontSize.body,
    color: '#F1F5F9',
    fontWeight: '700',
  },
  input: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontSize: fontSize.body,
    color: '#E2E8F0',
    lineHeight: fontSize.body * 1.6,
  },
  saveBtn: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: '#6366F1',
    borderRadius: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#334155',
  },
  saveBtnText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  doneTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  doneStreak: {
    fontSize: fontSize.body,
    color: '#FBBF24',
    fontWeight: '600',
  },
  backBtn: {
    marginTop: spacing.lg,
    backgroundColor: '#6366F1',
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  backBtnText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reactionBtn: {
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  reactionBtnText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: '#A5B4FC',
  },
  reactionCard: {
    backgroundColor: '#1E293B',
    borderRadius: spacing.md,
    padding: spacing.lg,
  },
  reactionText: {
    fontSize: fontSize.body,
    color: '#E2E8F0',
    lineHeight: fontSize.body * 1.6,
  },
});
