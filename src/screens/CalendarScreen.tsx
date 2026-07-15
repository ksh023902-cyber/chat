import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CalendarStackParamList } from '../types';
import { fetchEntries, EntryRecord } from '../services/supabase';
import { spacing, fontSize } from '../constants/tokens';
import { CALENDAR_SCREEN } from '../constants/strings';

type Nav = StackNavigationProp<CalendarStackParamList, 'Calendar'>;

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen({ navigation }: { navigation: Nav }) {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    (async () => {
      const data = await fetchEntries();
      setEntries(data);
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{CALENDAR_SCREEN.headerTitle}</Text>
      </View>

      {!loading && entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{CALENDAR_SCREEN.emptyState}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EntryDetail', { entry: item })}
            >
              <Text style={styles.rowDate}>{dateLabel(item.created_at)}</Text>
              <Text style={styles.rowQuestion} numberOfLines={1}>{item.question}</Text>
              <Text style={styles.rowPreview} numberOfLines={2}>{item.content}</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: fontSize.body * 1.6,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  row: {
    backgroundColor: '#1E293B',
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  rowDate: {
    fontSize: fontSize.sub,
    color: '#64748B',
  },
  rowQuestion: {
    fontSize: fontSize.body,
    color: '#F1F5F9',
    fontWeight: '700',
  },
  rowPreview: {
    fontSize: fontSize.sub,
    color: '#94A3B8',
    lineHeight: fontSize.sub * 1.5,
  },
});
