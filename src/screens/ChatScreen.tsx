import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message, StreakData } from '../types';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { openTeacherSession, teacherReply } from '../services/claude';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Props {
  navigation: ChatScreenNavigationProp;
  route: ChatScreenRouteProp;
}

const { width, height } = Dimensions.get('window');
const HP = width * 0.05;

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ChatScreen({ navigation, route }: Props) {
  const { scenario } = route.params;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [streakRecorded, setStreakRecorded] = useState(false);
  const [scenarioExpanded, setScenarioExpanded] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  // 교사 수업 자동 시작
  useEffect(() => {
    openTeacherSession(scenario)
      .then(opening => {
        setMessages([{
          id: generateId(),
          role: 'assistant',
          content: opening,
          timestamp: new Date(),
        }]);
      })
      .catch(() => {
        setMessages([{
          id: generateId(),
          role: 'assistant',
          content: '이 사건, 어떻게 생각하세요? 처음 떠오른 생각을 말해보세요.',
          timestamp: new Date(),
        }]);
      })
      .finally(() => setIsTyping(false));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const recordStreak = async () => {
    if (streakRecorded) return;
    setStreakRecorded(true);
    const today = todayString();
    try {
      const stored = await AsyncStorage.getItem('streak');
      let count = 1;
      if (stored) {
        const parsed: StreakData = JSON.parse(stored);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        if (parsed.lastDate === today) return;
        if (parsed.lastDate === yesterdayStr) count = parsed.count + 1;
      }
      await AsyncStorage.setItem('streak', JSON.stringify({ count, lastDate: today } as StreakData));
    } catch {}
  };

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);
    recordStreak();

    try {
      const reply = await teacherReply(scenario, updatedMessages);
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.', timestamp: new Date() },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, isTyping, scenario, streakRecorded]);

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble message={item} userName="나" />
  );

  const webStyle = Platform.OS === 'web'
    ? { paddingTop: insets.top, paddingBottom: insets.bottom } as const
    : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, webStyle]}>

      {/* 상단 — 헤더 + 시나리오 배너 */}
      <View style={styles.topArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사고력 수업</Text>
          <View style={styles.headerRight} />
        </View>

        <TouchableOpacity
          style={styles.scenarioBanner}
          onPress={() => setScenarioExpanded(v => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.bannerDot} />
          <Text
            style={styles.bannerText}
            numberOfLines={scenarioExpanded ? undefined : 2}
          >
            {scenario}
          </Text>
          <Text style={styles.bannerToggle}>{scenarioExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {/* 채팅 + 입력 */}
      <KeyboardAvoidingView
        style={styles.mainArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          style={styles.messageList}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageListContent}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="생각을 자유롭게 말해주세요..."
            placeholderTextColor="#475569"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onKeyPress={({ nativeEvent }) => {
              const event = nativeEvent as typeof nativeEvent & { shiftKey?: boolean };
              if (event.key === 'Enter' && !event.shiftKey) sendMessage();
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: !inputText.trim() || isTyping ? '#1E293B' : '#6366F1',
                ...(inputText.trim() && !isTyping && {
                  shadowColor: '#6366F1',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 4,
                }),
              },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
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

  topArea: {
    flex: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HP,
    paddingVertical: height * 0.012,
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
  backArrow: {
    fontSize: width * 0.06,
    color: '#94A3B8',
    lineHeight: width * 0.075,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: width * 0.04,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerRight: {
    width: width * 0.08,
  },

  scenarioBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: HP,
    paddingVertical: height * 0.015,
    gap: width * 0.025,
  },
  bannerDot: {
    width: width * 0.015,
    height: width * 0.015,
    borderRadius: width * 0.0075,
    backgroundColor: '#6366F1',
    marginTop: height * 0.005,
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    fontSize: width * 0.033,
    color: '#94A3B8',
    lineHeight: width * 0.052,
  },
  bannerToggle: {
    fontSize: width * 0.028,
    color: '#475569',
    flexShrink: 0,
  },

  mainArea: {
    flex: 8,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: HP,
    paddingVertical: height * 0.02,
    paddingBottom: height * 0.01,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: HP,
    paddingVertical: height * 0.015,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: width * 0.025,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: width * 0.06,
    paddingHorizontal: width * 0.045,
    paddingTop: height * 0.015,
    paddingBottom: height * 0.015,
    fontSize: width * 0.04,
    color: '#F1F5F9',
    maxHeight: height * 0.15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: width * 0.055,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: width * 0.05,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
