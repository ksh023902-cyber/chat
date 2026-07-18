import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CalendarStackParamList } from '../types';
import { spacing, fontSize } from '../constants/tokens';
import { FontChoice, FONT_FAMILIES, FONT_LABELS, getFontChoice, setFontChoice } from '../services/fontPreference';

type Nav = StackNavigationProp<CalendarStackParamList, 'FontSelect'>;

const OPTIONS: FontChoice[] = ['default', 'serif', 'hand'];
const PREVIEW_TEXT = '오늘 하루도 여기에 남겨요';

export default function FontSelectScreen({ navigation }: { navigation: Nav }) {
  const [current, setCurrent] = useState<FontChoice>('default');

  useEffect(() => {
    getFontChoice().then(setCurrent);
  }, []);

  const handleSelect = async (choice: FontChoice) => {
    setCurrent(choice);
    await setFontChoice(choice);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>닫기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((choice) => {
          const selected = choice === current;
          return (
            <TouchableOpacity
              key={choice}
              style={[styles.option, selected && styles.optionSelected]}
              activeOpacity={0.85}
              onPress={() => handleSelect(choice)}
            >
              <Text style={styles.optionLabel}>{FONT_LABELS[choice]}</Text>
              <Text style={[styles.optionPreview, { fontFamily: FONT_FAMILIES[choice] }]}>
                {PREVIEW_TEXT}
              </Text>
              {selected && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
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
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: fontSize.sub,
    color: '#94A3B8',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  option: {
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  optionSelected: {
    borderColor: '#6366F1',
  },
  optionLabel: {
    fontSize: fontSize.sub,
    color: '#64748B',
    fontWeight: '600',
  },
  optionPreview: {
    fontSize: fontSize.body,
    color: '#F1F5F9',
  },
  checkMark: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    fontSize: fontSize.body,
    color: '#6366F1',
    fontWeight: '700',
  },
});
