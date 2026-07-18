import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'StartChat'>;
};

const { width, height } = Dimensions.get('window');
const HP = width * 0.06;

export default function StartChatScreen({ navigation }: Props) {
  const [userName, setUserName] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const canStart = userName.trim().length > 0 && topic.trim().length > 0;

  const startChat = () => {
    if (!canStart) return;
    navigation.navigate('Chat', {
      userName: userName.trim(),
      topic: topic.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.eyebrow}>비판적 사고 대화</Text>
          <Text style={styles.title}>생각의{'\n'}대화실</Text>
          <Text style={styles.subtitle}>
            이름과 주제를 적으면, AI가 먼저 질문을 건넵니다.{'\n'}
            정답이 아니라 사고의 깊이가 목표예요.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="어떻게 부를까요?"
              placeholderTextColor="#475569"
              value={userName}
              onChangeText={setUserName}
              returnKeyType="next"
              maxLength={40}
              autoCapitalize="words"
            />

            <Text style={[styles.label, styles.labelGap]}>대화하고 싶은 주제</Text>
            <TextInput
              style={[styles.input, styles.topicInput]}
              placeholder="예: 자유와 책임, 공정함이란 무엇일까"
              placeholderTextColor="#475569"
              value={topic}
              onChangeText={setTopic}
              returnKeyType="go"
              onSubmitEditing={startChat}
              blurOnSubmit
              maxLength={200}
              multiline
            />

            <TouchableOpacity
              style={[styles.button, !canStart && styles.buttonDisabled]}
              onPress={startChat}
              disabled={!canStart}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>대화 시작</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </TouchableOpacity>
          </View>
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
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: HP,
    paddingTop: height * 0.08,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#818CF8',
    letterSpacing: 0.5,
    marginBottom: height * 0.015,
  },
  title: {
    fontSize: width * 0.1,
    fontWeight: '800',
    color: '#F1F5F9',
    lineHeight: width * 0.12,
    marginBottom: height * 0.02,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: height * 0.05,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  labelGap: {
    marginTop: height * 0.025,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: width * 0.04,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5F9',
  },
  topicInput: {
    minHeight: height * 0.1,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: height * 0.04,
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1E293B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
