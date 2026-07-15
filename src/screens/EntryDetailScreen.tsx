import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { CalendarStackParamList } from '../types';
import { updateEntryAiResponse } from '../services/supabase';
import { generateEntryReaction } from '../services/claude';
import { spacing, fontSize } from '../constants/tokens';
import { REACTION } from '../constants/strings';

type Nav = StackNavigationProp<CalendarStackParamList, 'EntryDetail'>;
type Route = RouteProp<CalendarStackParamList, 'EntryDetail'>;

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function EntryDetailScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const { entry } = route.params;
  const [reaction, setReaction] = useState<string | null>(entry.ai_response ?? null);
  const [loading, setLoading] = useState(false);

  // 버튼을 눌렀을 때만 호출된다 — 안 누르면 AI는 절대 등장하지 않는다.
  const handleReaction = async () => {
    setLoading(true);
    try {
      const { text } = await generateEntryReaction(entry.question, entry.content);
      setReaction(text);
      updateEntryAiResponse(entry.id, text);
    } catch {
      // 실패해도 화면은 그대로 유지
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerDate}>{dateLabel(entry.created_at)}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.situation}>{entry.situation}</Text>
        <Text style={styles.question}>{entry.question}</Text>
        <Text style={styles.body}>{entry.content}</Text>

        {reaction ? (
          <View style={styles.aiCard}>
            <Text style={styles.aiResponse}>{reaction}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.reactionBtn}
            activeOpacity={0.85}
            disabled={loading}
            onPress={handleReaction}
          >
            <Text style={styles.reactionBtnText}>
              {loading ? REACTION.loadingButton : REACTION.askButton}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: fontSize.title,
    color: '#94A3B8',
  },
  headerDate: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerRight: {
    width: 32,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  situation: {
    fontSize: fontSize.sub,
    color: '#64748B',
    lineHeight: fontSize.sub * 1.6,
  },
  question: {
    fontSize: fontSize.title,
    color: '#F1F5F9',
    fontWeight: '700',
    lineHeight: fontSize.title * 1.4,
  },
  body: {
    fontSize: fontSize.body,
    color: '#E2E8F0',
    lineHeight: fontSize.body * 1.6,
  },
  aiCard: {
    backgroundColor: '#1E293B',
    borderRadius: spacing.md,
    padding: spacing.lg,
  },
  aiResponse: {
    fontSize: fontSize.body,
    color: '#CBD5E1',
    lineHeight: fontSize.body * 1.6,
  },
  reactionBtn: {
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  reactionBtnText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: '#A5B4FC',
  },
});
