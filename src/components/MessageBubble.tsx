import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Message } from '../types';

interface Props {
  message: Message;
  userName: string;
}

const { width } = Dimensions.get('window');

export default function MessageBubble({ message, userName }: Props) {
  const isUser = message.role === 'user';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(width * 0.03)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.sender, isUser ? styles.userSender : styles.aiSender]}>
        {isUser ? userName : 'AI'}
      </Text>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: width * 0.015,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  sender: {
    fontSize: width * 0.028,
    fontWeight: '600',
    marginBottom: width * 0.01,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  userSender: {
    color: '#818CF8',
  },
  aiSender: {
    color: '#34D399',
  },
  bubble: {
    borderRadius: width * 0.045,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.03,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: width * 0.01,
  },
  aiBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: width * 0.01,
    borderWidth: 1,
    borderColor: '#334155',
  },
  text: {
    fontSize: width * 0.04,
    lineHeight: width * 0.065,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#E2E8F0',
  },
});
