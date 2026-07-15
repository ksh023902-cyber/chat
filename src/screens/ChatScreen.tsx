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
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Message, StreakData } from '../types';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { loadCachedScenario, generateDailyScenario, characterReply, openCharacterSession, getScenarioCharacter } from '../services/claude';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat' | 'Ending'>;

interface Props {
  navigation: ChatScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');
const HP = width * 0.05;

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ①②③④⑤ 형식의 선택지 파싱
function parseChoices(text: string): string[] {
  const choices: string[] = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^[①②③④⑤]\s*(.+)/);
    if (match) choices.push(match[1].trim());
  }
  return choices;
}

export default function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [scenario, setScenario] = useState('');
  const [character, setCharacter] = useState<{ emoji: string; displayName: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streakRecorded, setStreakRecorded] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 로딩 애니메이션
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ])
      ).start();
    pulse(dot1, 0);
    pulse(dot2, 180);
    pulse(dot3, 360);
  }, []);

  // 마운트 시 시나리오 확보 → 캐릭터/이름 세팅 → AI 오프닝 자동발송.
  // 캐시 미스면 시나리오를 lazy 생성한다.
  // StrictMode 이중 실행 방어: mountedRef (절대 제거 금지)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    (async () => {
      let activeScenario = '';
      try {
        // 1) 시나리오 확보 (캐시 우선, 없으면 lazy 생성)
        const cached = await loadCachedScenario();
        activeScenario = cached ?? (await generateDailyScenario());
        setScenario(activeScenario);
      } catch (e) {
        console.error('[ChatScreen] 시나리오 로드/생성 실패:', e);
      } finally {
        setLoading(false);
      }

      if (!activeScenario) return; // 시나리오 없으면 입력창만 사용 가능하게 두고 종료

      // 2) 캐릭터/사람 이름 세팅 (동기, API 불필요)
      try {
        const meta = getScenarioCharacter(activeScenario);
        setCharacter({ emoji: meta.emoji, displayName: meta.displayName });
      } catch (e) {
        console.error('[ChatScreen] 캐릭터 메타 계산 실패:', e);
      }

      // 3) AI 오프닝 자동발송 — 사용자 입력 없이 첫 assistant 메시지 세팅.
      //    스트릭은 절대 건드리지 않는다 (recordStreak 호출 없음).
      setIsTyping(true);
      try {
        const opening = await openCharacterSession(activeScenario);
        if (opening && opening.trim()) {
          setMessages([
            {
              id: generateId(),
              role: 'assistant',
              content: opening,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (e) {
        // 실패 시 조용한 폴백: 오프닝 없이 넘어가고 입력창은 계속 사용 가능.
        console.error('[ChatScreen] 오프닝 자동발송 실패:', e);
      } finally {
        setIsTyping(false);
      }
    })();
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

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
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
      // 캐시 미스였던 경우 첫 메시지 전송 시점에 lazy 생성
      let activeScenario = scenario;
      if (!activeScenario) {
        activeScenario = await generateDailyScenario();
        setScenario(activeScenario);
      }
      const reply = await characterReply(activeScenario, updatedMessages);
      // LLM이 오염 패턴을 생성한 경우 isError로 마킹 → 다음 히스토리 전송에서 자동 차단
      const isContaminated = /신호가 끊겼|다시 켜봐|다시 시도해봐/.test(reply);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
          ...(isContaminated && { isError: true }),
        },
      ]);
    } catch (e) {
      console.error('[ChatScreen] 응답 실패:', e);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: e instanceof Error && e.message.startsWith('API 키 없음')
            ? `⚠️ ${e.message}`
            : e instanceof Error && e.message.includes('429')
            ? '잠깐, 신호가 끊겼어. 잠시 후 다시 시도해봐. (요청 한도 초과)'
            : '잠깐, 신호가 끊겼어. 다시 시도해봐.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, isTyping, scenario, streakRecorded]);

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      userName="나"
      characterName={character?.displayName}
      characterEmoji={character?.emoji}
    />
  );

  // 마지막 AI 메시지에서 선택지 파싱
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const choices = lastAssistantMsg && !isTyping ? parseChoices(lastAssistantMsg.content) : [];

  // 유저 메시지 3개 이상이면 결말 버튼 노출
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const canShowEnding = userMsgCount >= 3 && !loading;

  const webStyle = Platform.OS === 'web'
    ? { paddingTop: insets.top, paddingBottom: insets.bottom } as const
    : undefined;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, webStyle]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>💬</Text>
          <Text style={styles.loadingLabel}>연결 중...</Text>
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webStyle]}>

      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarDot}>
            {character?.emoji ? <Text style={styles.avatarEmoji}>{character.emoji}</Text> : null}
          </View>
          <View>
            <Text style={styles.headerName}>{character?.displayName ?? '알 수 없음'}</Text>
            <Text style={styles.headerStatus}>온라인</Text>
          </View>
        </View>
        {canShowEnding ? (
          <TouchableOpacity
            style={styles.endingBtn}
            onPress={() => navigation.navigate('Ending', { scenario, messages })}
            activeOpacity={0.8}
          >
            <Text style={styles.endingBtnText}>결말</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
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

        {/* 선택지 버튼 */}
        {choices.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.choicesScroll}
            contentContainerStyle={styles.choicesContent}
          >
            {choices.map((choice, i) => (
              <TouchableOpacity
                key={i}
                style={styles.choiceBtn}
                onPress={() => sendMessage(`${['①', '②', '③', '④', '⑤'][i]} ${choice}`)}
                activeOpacity={0.75}
              >
                <Text style={styles.choiceNum}>{['①', '②', '③', '④', '⑤'][i]}</Text>
                <Text style={styles.choiceText}>{choice}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="메시지..."
            placeholderTextColor="#475569"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onKeyPress={({ nativeEvent }) => {
              const event = nativeEvent as typeof nativeEvent & { shiftKey?: boolean; isComposing?: boolean };
              if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) sendMessage();
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
            onPress={() => sendMessage()}
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: height * 0.02,
  },
  loadingTitle: {
    fontSize: width * 0.12,
    marginBottom: height * 0.008,
  },
  loadingLabel: {
    fontSize: width * 0.036,
    color: '#475569',
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: width * 0.028,
  },
  dot: {
    width: width * 0.02,
    height: width * 0.02,
    borderRadius: width * 0.01,
    backgroundColor: '#6366F1',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HP,
    paddingVertical: height * 0.014,
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: width * 0.025,
  },
  avatarDot: {
    width: width * 0.09,
    height: width * 0.09,
    borderRadius: width * 0.045,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: width * 0.045,
  },
  headerName: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerStatus: {
    fontSize: width * 0.028,
    color: '#22C55E',
  },
  headerRight: {
    width: width * 0.08,
  },
  endingBtn: {
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.007,
    borderRadius: width * 0.025,
    borderWidth: 1,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endingBtnText: {
    fontSize: width * 0.03,
    color: '#6366F1',
    fontWeight: '700',
  },

  mainArea: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: HP,
    paddingVertical: height * 0.02,
    paddingBottom: height * 0.01,
  },

  choicesScroll: {
    maxHeight: height * 0.14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  choicesContent: {
    paddingHorizontal: HP,
    paddingVertical: height * 0.012,
    gap: width * 0.025,
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: width * 0.06,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.012,
    borderWidth: 1,
    borderColor: '#334155',
    gap: width * 0.02,
    maxWidth: width * 0.7,
  },
  choiceNum: {
    fontSize: width * 0.04,
    color: '#6366F1',
    fontWeight: '700',
    flexShrink: 0,
  },
  choiceText: {
    fontSize: width * 0.036,
    color: '#CBD5E1',
    flexShrink: 1,
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
