import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getMessages, getChat } from '../../api/chat';
import { getProfile } from '../../api/auth';
import { getAccessToken } from '../../api/tokenStorage';

import { WS_BASE_URL } from '../../config/api';

const MAIN_COLOR = '#9456FE';

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return 'Не удалось выполнить действие. Проверьте подключение к серверу.';
  }

  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;

  if (Array.isArray(firstValue)) return firstValue[0];
  if (typeof firstValue === 'string') return firstValue;

  return 'Сервер вернул ошибку.';
}

function formatTime(dateString) {
  if (!dateString) return '';

  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMembersCount(count) {
  const number = Number(count) || 0;
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${number} участников`;
  }

  if (lastDigit === 1) {
    return `${number} участник`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${number} участника`;
  }

  return `${number} участников`;
}

export default function ChatDetailScreen({ navigation, route }) {
  const { screenPadding } = useLayout();
  const insets = useSafeAreaInsets();

  const flatListRef = useRef(null);
  const socketRef = useRef(null);

  const {
    chatId,
    chatName: initialChatName,
    chatType: initialChatType,
    membersCount: initialMembersCount = 0,
    chatSubtitle: initialChatSubtitle = '',
    isPinned: initialIsPinned = false,
    isMainFamilyChat: initialIsMainFamilyChat = false,
  } = route.params;

  const [chatInfo, setChatInfo] = useState({
    chatName: initialChatName,
    chatType: initialChatType,
    membersCount: initialMembersCount,
    chatSubtitle: initialChatSubtitle,
    isPinned: initialIsPinned,
    isMainFamilyChat: initialIsMainFamilyChat,
  });

  const isFamilyChat = chatInfo.chatType === 'family';

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const connectWebSocket = useCallback(async () => {
    const token = await getAccessToken();

    if (!token) {
      Alert.alert('Ошибка', 'Токен авторизации не найден');
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/chat/${chatId}/?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      setSocketConnected(true);
      console.log('WebSocket чата подключён');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'message') {
          setMessages((prev) => [...prev, data.message]);
          scrollToBottom();
        }
      } catch (error) {
        console.log('Ошибка обработки сообщения WebSocket:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('WebSocket ошибка:', error);
    };

    socket.onclose = () => {
      setSocketConnected(false);
      console.log('WebSocket чата закрыт');

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [chatId, scrollToBottom]);

  const loadChatInfo = useCallback(async () => {
    try {
      const chat = await getChat(chatId);

      setChatInfo({
        chatName: chat.chat_name,
        chatType: chat.chat_type,
        membersCount: chat.members_count || 0,
        chatSubtitle: chat.chat_subtitle || '',
        isPinned: chat.is_pinned,
        isMainFamilyChat: chat.is_main_family_chat,
      });
    } catch (error) {
      console.log('Ошибка обновления информации чата:', error.response?.data || error);
    }
  }, [chatId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const profile = await getProfile();
      setCurrentUserId(profile.id);

      await loadChatInfo();

      const data = await getMessages(chatId);
      setMessages(data || []);

      await connectWebSocket();
    } catch (error) {
      console.log('Ошибка загрузки чата:', error.response?.data || error);
      Alert.alert('Ошибка', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [chatId, connectWebSocket, loadChatInfo]);

  useEffect(() => {
    loadData();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadChatInfo();
    }, [loadChatInfo])
  );

  const handleSend = useCallback(() => {
    const trimmedText = text.trim();

    if (!trimmedText) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Ошибка', 'Соединение с чатом ещё не установлено');
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        text: trimmedText,
      })
    );

    setText('');
  }, [text]);

  const openSettings = useCallback(() => {
    navigation.navigate('ChatSettings', {
      chatId,
      chatType: chatInfo.chatType,
      chatName: chatInfo.chatName,
      isMainFamilyChat: chatInfo.isMainFamilyChat,
    });
  }, [navigation, chatId, chatInfo]);

  const renderMessage = ({ item }) => {
    const isMine = item.sender === currentUserId;

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isMine && isFamilyChat && (
          <View style={styles.senderAvatar}>
            {item.sender_avatar_url ? (
              <Image
                source={{ uri: item.sender_avatar_url }}
                style={styles.senderAvatarImage}
              />
            ) : (
              <Ionicons name="person" size={18} color="#FFFFFF" />
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myBubble : styles.otherBubble,
          ]}
        >
          {!isMine && isFamilyChat && (
            <Text style={styles.senderName} allowFontScaling={false}>
              {item.sender_name}
            </Text>
          )}

          <Text
            style={[
              styles.messageText,
              isMine && styles.myMessageText,
            ]}
            allowFontScaling={false}
          >
            {item.text}
          </Text>

          <View style={styles.messageMeta}>
            <Text
              style={[
                styles.messageTime,
                isMine && styles.myMessageTime,
              ]}
              allowFontScaling={false}
            >
              {formatTime(item.created_at)}
            </Text>

            {isMine && (
              <Ionicons
                name={item.is_read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color="#FFFFFF"
                style={styles.messageCheck}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const headerSubtitle = isFamilyChat
    ? (chatInfo.chatSubtitle || formatMembersCount(chatInfo.membersCount))
    : 'Личный чат';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerOuter}>
          <View style={[styles.headerInner, { paddingHorizontal: screenPadding }]}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={26} color="#858585" />
            </TouchableOpacity>

            <View style={styles.chatAvatar}>
              <Ionicons
                name={isFamilyChat ? 'people' : 'person'}
                size={22}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.headerTextBlock}>
              <Text
                style={styles.chatTitle}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {chatInfo.chatName}
              </Text>

              <Text
                style={styles.chatSubtitle}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {headerSubtitle}
              </Text>
            </View>

            <TouchableOpacity activeOpacity={0.75} onPress={openSettings}>
              <Ionicons name="settings-outline" size={25} color="#858585" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.messagesArea, { paddingHorizontal: screenPadding }]}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="small" color={MAIN_COLOR} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText} allowFontScaling={false}>
                Здесь будет ваша переписка
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => String(item.id || index)}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
            />
          )}
        </View>

        <View
          style={[
            styles.inputBarOuter,
            {
              paddingHorizontal: screenPadding,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder={socketConnected ? 'Сообщение' : 'Подключение...'}
              placeholderTextColor="#CDCDCD"
              value={text}
              onChangeText={setText}
              allowFontScaling={false}
              multiline
              editable={socketConnected}
            />

            <TouchableOpacity activeOpacity={0.75}>
              <Ionicons name="attach-outline" size={24} color="#858585" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!text.trim() || !socketConnected) && styles.sendButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSend}
              disabled={!text.trim() || !socketConnected}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  headerOuter: {
    width: '100%',
    height: 60,
    backgroundColor: '#F7F7F7',
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 18,
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  chatTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },
  chatSubtitle: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#959595',
  },
  messagesArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
  },
  messagesList: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageRow: {
    width: '100%',
    marginBottom: 10,
    flexDirection: 'row',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6E6E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    overflow: 'hidden',
  },
  senderAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '74%',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  otherBubble: {
    backgroundColor: '#F7F7F7',
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 25,
    borderTopLeftRadius: 4,
  },
  myBubble: {
    backgroundColor: MAIN_COLOR,
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderTopRightRadius: 4,
  },
  senderName: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#606060',
    marginBottom: 2,
  },
  messageText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#434343',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageMeta: {
    marginTop: 3,
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  messageTime: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A9A9A9',
  },
  myMessageTime: {
    color: '#FFFFFF',
    opacity: 0.75,
  },
  messageCheck: {
    marginLeft: 4,
  },
  inputBarOuter: {
    width: '100%',
    minHeight: 71,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
  },
  inputWrapper: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  messageInput: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: 10,
    paddingRight: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});