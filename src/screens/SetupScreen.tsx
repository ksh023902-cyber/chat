import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type SetupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Setup'>;
type SetupScreenRouteProp = RouteProp<RootStackParamList, 'Setup'>;

interface Props {
  navigation: SetupScreenNavigationProp;
  route: SetupScreenRouteProp;
}

const CATEGORY_COLORS: Record<string, string> = {
  독서: '#7C3AED',
  정치: '#0F766E',
  경제: '#B45309',
  인간관계: '#BE185D',
};

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  독서: '예: 데미안의 자아 찾기, 총균쇠의 논리...',
  정치: '예: 민주주의의 한계, 권력의 정당성...',
  경제: '예: 기본소득, 자본주의의 미래...',
  인간관계: '예: 진정한 우정이란, 갈등을 대하는 방식...',
};

export default function SetupScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const color = CATEGORY_COLORS[category] ?? '#6366F1';

  const [userName, setUserName] = useState('');
  const [topic, setTopic] = useState('');
  const topicInputRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const isReady = userName.trim().length > 0 && topic.trim().length > 0;

  const handleStart = () => {
    if (!isReady) return;

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Chat', {
        userName: userName.trim(),
        topic: topic.trim(),
        category,
      });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: color + '22', borderColor: color }]}>
              <Text style={[styles.categoryText, { color }]}>{category}</Text>
            </View>
            <Text style={styles.title}>대화 설정</Text>
            <Text style={styles.subtitle}>이름과 탐구할 주제를 입력해주세요</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이름</Text>
              <TextInput
                style={styles.input}
                placeholder="당신의 이름을 입력하세요"
                placeholderTextColor="#9CA3AF"
                value={userName}
                onChangeText={setUserName}
                returnKeyType="next"
                onSubmitEditing={() => topicInputRef.current?.focus()}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>대화 주제</Text>
              <TextInput
                ref={topicInputRef}
                style={[styles.input, styles.topicInput]}
                placeholder={CATEGORY_PLACEHOLDERS[category] ?? '탐구하고 싶은 주제를 입력하세요'}
                placeholderTextColor="#9CA3AF"
                value={topic}
                onChangeText={setTopic}
                returnKeyType="done"
                onSubmitEditing={handleStart}
                multiline
                numberOfLines={3}
              />
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: isReady ? color : '#1E293B' },
                  isReady && { shadowColor: color },
                ]}
                onPress={handleStart}
                disabled={!isReady}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, !isReady && styles.buttonTextDisabled]}>
                  대화 시작하기
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={styles.hint}>AI가 비판적 사고를 함께 탐구합니다</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#94A3B8',
    lineHeight: 26,
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  form: {
    flex: 1,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  buttonTextDisabled: {
    color: '#475569',
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginTop: 24,
  },
});
