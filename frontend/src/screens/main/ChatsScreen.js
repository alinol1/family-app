import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getChats } from '../../api/chat';

import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_BASE_URL = 'ws://192.168.3.2:8000';

export default function ChatsScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = React.useRef(null);


  const connectChatsWebSocket = async () => {
    const token = await AsyncStorage.getItem('access_token');

    if (!token) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws/chats/?token=${token}`);

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Chats WebSocket подключён');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat_update') {
        setChats((prevChats) => {
          const updatedChat = data.chat;

          const exists = prevChats.some((chat) => chat.id === updatedChat.id);

          let nextChats;

          if (exists) {
            nextChats = prevChats.map((chat) =>
              chat.id === updatedChat.id ? updatedChat : chat
            );
          } else {
            nextChats = [updatedChat, ...prevChats];
          }

          return nextChats.sort((a, b) => {
            if (a.chat_type === 'family') return -1;
            if (b.chat_type === 'family') return 1;

            const aTime = a.last_message?.created_at || a.created_at;
            const bTime = b.last_message?.created_at || b.created_at;

            return new Date(bTime) - new Date(aTime);
          });
        });
      }
    };

    socket.onerror = (error) => {
      console.log('Chats WebSocket ошибка:', error);
    };

    socket.onclose = () => {
      console.log('Chats WebSocket закрыт');
    };
  };






  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadChats = async () => {
        try {
          setLoading(true);

          const data = await getChats();

          const sortedChats = data.sort((a, b) => {
            if (a.chat_type === 'family') return -1;
            if (b.chat_type === 'family') return 1;

            const aTime = a.last_message?.created_at || a.created_at;
            const bTime = b.last_message?.created_at || b.created_at;

            return new Date(bTime) - new Date(aTime);
          });

          if (isActive) {
            setChats(sortedChats);
          }

          await connectChatsWebSocket();
        } catch (error) {
          console.log('Ошибка загрузки чатов:', error.response?.data || error);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadChats();

      return () => {
        isActive = false;
        socketRef.current?.close();
      };
    }, [])
  );

  const filteredChats = chats.filter((chat) =>
    chat.chat_name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderChatItem = (chat) => {
    const isFamilyChat = chat.chat_type === 'family';
    const lastMessage = chat.last_message;

    return (
      <TouchableOpacity
        key={chat.id}
        style={styles.chatItem}
        activeOpacity={0.75}
        onPress={() => {
          navigation.navigate('ChatDetail', {
            chatId: chat.id,
            chatName: chat.chat_name,
            chatType: chat.chat_type,
            membersCount: chat.members_count || 0,
          });
        }}
      >
        <View
          style={[
            styles.chatAvatar,
            !isFamilyChat && styles.personalChatAvatar,
          ]}
        >
          <Ionicons
            name={isFamilyChat ? 'people' : 'person'}
            size={isFamilyChat ? 28 : 27}
            color={isFamilyChat ? '#FFFFFF' : '#7B7B7B'}
          />
        </View>

        <View style={styles.chatContent}>
          <Text
            style={[
              styles.chatTitle,
              !isFamilyChat && styles.personalChatTitle,
            ]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {chat.chat_name}
          </Text>

          <View style={styles.lastMessageRow}>
            {lastMessage ? (
              <>
                <Text style={styles.lastMessageSender} allowFontScaling={false}>
                  {lastMessage.sender}:
                </Text>

                <Text
                  style={styles.lastMessageText}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {lastMessage.text || 'Медиафайл'}
                </Text>
              </>
            ) : (
              <Text
                style={styles.lastMessageText}
                allowFontScaling={false}
                numberOfLines={1}
              >
                Сообщений пока нет
              </Text>
            )}
          </View>
        </View>

        <View style={styles.chatMeta}>
          <Text style={styles.chatTime} allowFontScaling={false}>
            {lastMessage
              ? new Date(lastMessage.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',  
                })
              : ''}
          </Text>

          {chat.unread_count > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText} allowFontScaling={false}>
                {chat.unread_count}
              </Text>
            </View>
          ) : (
            lastMessage && (
              <View style={styles.checksContainer}>
                <Ionicons name="checkmark-done" size={17} color="#3B3B3B" />
              </View>
            )
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <View style={styles.topBar}>
          <Text style={styles.screenTitle} allowFontScaling={false}>
            Чаты
          </Text>

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={28} color="#7B7B7B" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по чатам"
            placeholderTextColor="#8B8B8B"
            value={search}
            onChangeText={setSearch}
            allowFontScaling={false}
          />

          <Ionicons name="search-outline" size={22} color="#7D7D7D" />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#9456FE" />
          </View>
        ) : (
          <View style={styles.chatsList}>
            {filteredChats.length > 0 ? (
              filteredChats.map(renderChatItem)
            ) : (
              <Text style={styles.emptyText} allowFontScaling={false}>
                Чатов пока нет
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.addButton,
            { bottom: insets.bottom + 110 },
          ]}
          activeOpacity={0.85}
          onPress={() => {
            // Позже: navigation.navigate('CreateChat');
          }}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  screenTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  settingsButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: {
    width: '100%',
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FAFAFA',
    marginTop: 30,
    paddingLeft: 18,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    padding: 0,
    marginRight: 12,
  },

  loadingContainer: {
    marginTop: 40,
    alignItems: 'center',
  },

  chatsList: {
    marginTop: 24,
    gap: 14,
  },

  chatItem: {
    width: '100%',
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },

  chatAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  personalChatAvatar: {
    backgroundColor: '#E6E6E6',
  },

  chatContent: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },

  chatTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  personalChatTitle: {
    fontFamily: fontFamily.medium,
  },

  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    overflow: 'hidden',
  },

  lastMessageSender: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#606060',
    marginRight: 3,
  },

  lastMessageText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#959595',
  },

  chatMeta: {
    height: 58,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginLeft: 8,
    paddingTop: 3,
  },

  chatTime: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
  },

  checksContainer: {
    marginTop: 8,
    height: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 8,
  },

  unreadBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },

  emptyText: {
    marginTop: 20,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
    textAlign: 'center',
  },

  addButton: {
    position: 'absolute',
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});