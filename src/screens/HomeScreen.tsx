import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Category } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const CATEGORIES: { label: Category; emoji: string; description: string; color: string; glow: string }[] = [
  {
    label: '독서',
    emoji: '📖',
    description: '책 속 아이디어를 깊이 탐구',
    color: '#7C3AED',
    glow: '#7C3AED',
  },
  {
    label: '정치',
    emoji: '🏛️',
    description: '사회와 권력의 구조를 사고',
    color: '#0F766E',
    glow: '#0F766E',
  },
  {
    label: '경제',
    emoji: '📊',
    description: '가치와 선택의 원리를 분석',
    color: '#B45309',
    glow: '#B45309',
  },
  {
    label: '인간관계',
    emoji: '🤝',
    description: '관계의 본질을 비판적으로 성찰',
    color: '#BE185D',
    glow: '#BE185D',
  },
];

export default function HomeScreen({ navigation }: Props) {
  const scales = useRef(CATEGORIES.map(() => new Animated.Value(1))).current;

  const handlePress = (category: Category, index: number) => {
    Animated.sequence([
      Animated.timing(scales[index], {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scales[index], {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Setup', { category });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>생각의 대화</Text>
          <Text style={styles.subtitle}>탐구할 주제의 카테고리를 선택하세요</Text>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map((cat, index) => (
            <Animated.View
              key={cat.label}
              style={[styles.cardWrapper, { transform: [{ scale: scales[index] }] }]}
            >
              <TouchableOpacity
                style={[styles.card, { borderColor: cat.color }]}
                onPress={() => handlePress(cat.label, index)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '22' }]}>
                  <Text style={styles.emoji}>{cat.emoji}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{cat.label}</Text>
                  <Text style={styles.cardDescription}>{cat.description}</Text>
                </View>
                <View style={[styles.arrow, { backgroundColor: cat.color }]}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.hint}>AI가 비판적 사고를 함께 탐구합니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  cardWrapper: {
    width: '48%',
    aspectRatio: 2.4,
  },
  card: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 14,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 1,
  },
  cardDescription: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 13,
  },
  arrow: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  arrowText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#334155',
    marginTop: 20,
  },
});
