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
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message } from '../types';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { startCriticalChat, continueCriticalChat } from '../services/claude';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

const { width } = Dimensions.get('window');

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function ChatScreen({ navigation, route }: Props) {
  const { userName, topic } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      setIsTyping(true);
      try {
        const { text, isCrisis } = await startCriticalChat(userName, topic);
        if (cancelled || !mountedRef.current) return;
        if (text) {
          setMessages([
            {
              id: generateId(),
              role: 'assistant',
              content: text,
              timestamp: new Date(),
              isCrisis,
            },
          ]);
        }
      } catch {
        if (cancelled || !mountedRef.current) return;
        setMessages([
          {
            id: generateId(),
            role: 'assistant',
            content: '첫 질문을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        if (!cancelled && mountedRef.current) setIsTyping(false);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [userName, topic]);

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    setInputText('');
    setIsTyping(true);

    try {
      const history = updated.map((m) => ({ role: m.role, content: m.content }));
      const { text: reply, isCrisis } = await continueCriticalChat(userName, topic, history);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: reply || '응답을 받지 못했어요. 다시 말해 볼래요?',
          timestamp: new Date(),
          isCrisis,
        },
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
  }, [inputText, messages, isTyping, userName, topic]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {topic}
          </Text>
          <Text style={styles.headerSub}>{userName}님과의 대화</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble message={item} userName={userName} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="생각을 적어주세요..."
            placeholderTextColor="#475569"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
            editable={!isTyping}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: !inputText.trim() || isTyping ? '#1E293B' : '#6366F1' },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.03,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
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
  headerCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerSub: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: width * 0.04,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: width * 0.04,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: '#F1F5F9',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
