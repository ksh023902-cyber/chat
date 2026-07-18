import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Message } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  message: Message;
  userName?: string;
}

export default function MessageBubble({ message, userName = '나' }: Props) {
  const isUser = message.role === 'user';
  const label = isUser ? userName : 'AI';

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAi,
        message.isCrisis && styles.crisisBorder,
      ]}
    >
      <Text style={[styles.sender, isUser ? styles.userSender : styles.aiSender]}>{label}</Text>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: width * 0.035,
    maxWidth: width * 0.82,
  },
  rowUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowAi: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  crisisBorder: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    paddingLeft: width * 0.02,
  },
  sender: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userSender: {
    color: '#818CF8',
  },
  aiSender: {
    color: '#94A3B8',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.03,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#F1F5F9',
  },
});
