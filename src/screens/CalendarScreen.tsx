import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CalendarStackParamList } from '../types';
import { fetchEntries, EntryRecord } from '../services/supabase';
import { spacing, fontSize } from '../constants/tokens';
import { CALENDAR_SCREEN } from '../constants/strings';

type Nav = StackNavigationProp<CalendarStackParamList, 'Calendar'>;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type GridCell = { day: number; dateKey: string } | null;

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// month: 0-indexed. 앞뒤 빈 칸을 채워 7의 배수(주 단위) 그리드를 만든다.
function buildMonthGrid(year: number, month: number): GridCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: GridCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateKey: dateKey(year, month, d) });
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function entryDateKey(iso: string): string {
  const d = new Date(iso);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarScreen({ navigation }: { navigation: Nav }) {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

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

  const entriesByDate = new Map<string, EntryRecord>();
  entries.forEach((e) => {
    const key = entryDateKey(e.created_at);
    if (!entriesByDate.has(key)) entriesByDate.set(key, e); // 하루 여러 건이면 최신(정렬 기준 첫 항목)만
  });

  const grid = buildMonthGrid(viewYear, viewMonth);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{CALENDAR_SCREEN.headerTitle}</Text>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goPrevMonth} hitSlop={8}>
          <Text style={styles.monthNavArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{viewYear}년 {viewMonth + 1}월</Text>
        <TouchableOpacity onPress={goNextMonth} hitSlop={8}>
          <Text style={styles.monthNavArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekLabel}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((cell, i) => {
          if (!cell) return <View key={i} style={styles.cell} />;
          const entry = entriesByDate.get(cell.dateKey);
          const isToday = cell.dateKey === todayKey;
          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              activeOpacity={entry ? 0.7 : 1}
              disabled={!entry}
              onPress={() => entry && navigation.navigate('EntryDetail', { entry })}
            >
              <View style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{cell.day}</Text>
              </View>
              {entry && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {!loading && entries.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{CALENDAR_SCREEN.emptyState}</Text>
        </View>
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthNavArrow: {
    fontSize: fontSize.title * 1.4,
    color: '#94A3B8',
    paddingHorizontal: spacing.sm,
  },
  monthLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#F1F5F9',
    minWidth: 110,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.sub,
    color: '#64748B',
    paddingBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    backgroundColor: '#6366F1',
  },
  dayText: {
    fontSize: fontSize.sub,
    color: '#CBD5E1',
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FBBF24',
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
});
