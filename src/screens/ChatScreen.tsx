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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message, Perspective, StreakData } from '../types';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { commentOnAnswer } from '../services/claude';

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

function formatPerspectives(perspectives: Perspective[]): string {
  const filled = perspectives.filter(p => p.opinion);
  return filled.map(p => `${p.character} 입장: ${p.opinion}`).join('\n');
}

export default function ChatScreen({ navigation, route }: Props) {
  const { scenario, perspectives } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streakRecorded, setStreakRecorded] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    if (!perspectives || perspectives.every(p => !p.opinion)) return;

    const perspText = formatPerspectives(perspectives);
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: perspText,
      timestamp: new Date(),
    };
    setMessages([userMsg]);
    setIsTyping(true);
    setStreakRecorded(true);

    recordStreak();

    commentOnAnswer(scenario, [userMsg])
      .then(reply => {
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'assistant', content: reply, timestamp: new Date() },
        ]);
      })
      .catch(() => {
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.', timestamp: new Date() },
        ]);
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
      const reply = await commentOnAnswer(scenario, updatedMessages);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: '오류가 발생했습니다. 다시 시도해주세요.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, isTyping, scenario, streakRecorded]);

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble message={item} userName="나" />
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* 상단 영역 — flex 2 */}
      <View style={styles.topArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>오늘의 생각</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.scenarioBanner}>
          <View style={styles.bannerDot} />
          <Text style={styles.bannerText} numberOfLines={4}>{scenario}</Text>
        </View>
      </View>

      {/* 콘텐츠 + 하단 입력 — flex 8 */}
      <KeyboardAvoidingView
        style={styles.mainArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 메시지 목록 — flex 6 */}
        <FlatList
          ref={flatListRef}
          style={styles.messageList}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageListContent}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* 하단 입력 — flex 2 */}
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

  /* 상단 영역 */
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
    fontSize: width * 0.035,
    color: '#94A3B8',
    lineHeight: width * 0.055,
  },

  /* 콘텐츠 + 입력 영역 */
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
