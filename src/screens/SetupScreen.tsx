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
import { RootStackParamList } from '../types';

type SetupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Setup'>;

interface Props {
  navigation: SetupScreenNavigationProp;
}

export default function SetupScreen({ navigation }: Props) {
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
      });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>생각의 대화</Text>
            <Text style={styles.subtitle}>
              AI와 함께 깊이 사고하는 시간
            </Text>
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
                placeholder="탐구하고 싶은 주제를 입력하세요&#10;예: 자유의지, 행복의 의미, 정의란 무엇인가..."
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
                style={[styles.button, !isReady && styles.buttonDisabled]}
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

          <Text style={styles.hint}>
            AI가 질문을 통해 당신의 사고를 깊이 탐구하도록 돕습니다
          </Text>
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
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  form: {
    flex: 1,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
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
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1E293B',
    shadowOpacity: 0,
    elevation: 0,
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
