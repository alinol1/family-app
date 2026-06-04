import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import CachedAvatar from '../../components/CachedAvatar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getChats, createChat, deleteChat } from '../../api/chat';
import { getMyFamily } from '../../api/family';
import { getAccessToken } from '../../api/tokenStorage';

import { WS_BASE_URL } from '../../config/api';


export default function ChatsScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [chatName, setChatName] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const screenActiveRef = useRef(false);

  const sortChats = (chatsList) => {
    return [...chatsList].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      if (a.chat_type === 'family' && b.chat_type !== 'family') return -1;
      if (b.chat_type === 'family' && a.chat_type !== 'family') return 1;

      const aTime = a.last_message?.created_at || a.updated_at || a.created_at;
      const bTime = b.last_message?.created_at || b.updated_at || b.created_at;

      return new Date(bTime) - new Date(aTime);
    });
  };

  const mergeChatUpdate = useCallback((updatedChat) => {
    if (!updatedChat?.id) return;

    setChats((prevChats) => {
      const exists = prevChats.some((chat) => chat.id === updatedChat.id);

      const nextChats = exists
        ? prevChats.map((chat) =>
            chat.id === updatedChat.id
              ? {
                  ...chat,
                  ...updatedChat,
                  last_message: updatedChat.last_message ?? chat.last_message,
                }
              : chat
          )
        : [updatedChat, ...prevChats];

      return sortChats(nextChats);
    });
  }, []);

  const connectChatsWebSocket = useCallback(async () => {
    const token = await getAccessToken();

    if (!token || !screenActiveRef.current) {
      return;
    }

    if (
      socketRef.current &&
      (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/chats/?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Chats WebSocket подключён');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'chat_update' && data.chat) {
          mergeChatUpdate(data.chat);
        }
      } catch (error) {
        console.log('Ошибка обработки обновления чатов:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('Chats WebSocket ошибка:', error);
    };

    socket.onclose = () => {
      console.log('Chats WebSocket закрыт');

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (screenActiveRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          connectChatsWebSocket();
        }, 1500);
      }
    };
  }, [mergeChatUpdate]);

  const loadChats = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const data = await getChats();
      const sortedChats = sortChats(data || []);

      if (screenActiveRef.current) {
        setChats(sortedChats);
      }

      await connectChatsWebSocket();
    } catch (error) {
      console.log('Ошибка загрузки чатов:', error.response?.data || error);
    } finally {
      if (!silent && screenActiveRef.current) {
        setLoading(false);
      }
    }
  }, [connectChatsWebSocket]);

  useFocusEffect(
    useCallback(() => {
      screenActiveRef.current = true;

      loadChats({
        silent: chats.length > 0,
      });

      return () => {
        screenActiveRef.current = false;

        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }

        socketRef.current?.close();
        socketRef.current = null;
      };
    }, [loadChats, chats.length])
  );

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return chats;
    }

    return chats.filter((chat) =>
      chat.chat_name?.toLowerCase().includes(query)
    );
  }, [chats, search]);

  const openCreateChatModal = async () => {
    setCreateModalVisible(true);
    setChatName('');
    setSelectedMembers([]);

    try {
      setMembersLoading(true);

      const data = await getMyFamily();
      const familyMembers = Array.isArray(data?.members) ? data.members : [];

      setMembers(
        familyMembers.filter((member) => !member.is_current_user)
      );
    } catch (error) {
      console.log(
        'Ошибка загрузки участников семьи:',
        error.response?.data || error
      );

      Alert.alert('Ошибка', 'Не удалось загрузить участников семьи');
    } finally {
      setMembersLoading(false);
    }
  };

  const closeCreateChatModal = () => {
    if (creatingChat) {
      return;
    }

    setCreateModalVisible(false);
    setChatName('');
    setSelectedMembers([]);
  };

  const toggleMember = (memberId) => {
    if (!memberId) {
      return;
    }

    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const handleCreateChat = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('Выберите участников', 'Добавьте хотя бы одного участника');
      return;
    }

    try {
      setCreatingChat(true);

      const createdChat = await createChat({
        user_ids: selectedMembers,
        chat_name: chatName.trim(),
      });

      if (!createdChat?.id) {
        Alert.alert('Ошибка', 'Сервер не вернул данные созданного чата');
        return;
      }

      setChats((prevChats) => {
        const exists = prevChats.some((chat) => chat.id === createdChat.id);

        if (exists) {
          return sortChats(
            prevChats.map((chat) =>
              chat.id === createdChat.id ? createdChat : chat
            )
          );
        }

        return sortChats([createdChat, ...prevChats]);
      });

      setCreateModalVisible(false);
      setChatName('');
      setSelectedMembers([]);

      navigation.navigate('ChatDetail', {
        chatId: createdChat.id,
        chatName: createdChat.chat_name,
        chatType: createdChat.chat_type,
        membersCount: createdChat.members_count || 0,
        chatSubtitle: createdChat.chat_subtitle,
        isPinned: createdChat.is_pinned,
        isMainFamilyChat: createdChat.is_main_family_chat,
      });
    } catch (error) {
      console.log('Ошибка создания чата:', error.response?.data || error);

      Alert.alert(
        'Ошибка',
        error.response?.data?.error ||
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Не удалось создать чат'
      );
    } finally {
      setCreatingChat(false);
    }
  };

  const handleDeleteChat = (chat) => {
    if (chat.is_main_family_chat) {
      Alert.alert('Чат закреплён', 'Основной семейный чат удалить нельзя.');
      return;
    }

    Alert.alert(
      'Удалить чат?',
      `Чат «${chat.chat_name || 'Без названия'}» будет удалён. Вы уверены?`,
      [
        {
          text: 'Нет',
          style: 'cancel',
        },
        {
          text: 'Да, удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chat.id);

              setChats((prevChats) =>
                prevChats.filter((item) => item.id !== chat.id)
              );
            } catch (error) {
              Alert.alert(
                'Ошибка',
                error.response?.data?.error ||
                  error.response?.data?.detail ||
                  'Не удалось удалить чат'
              );
            }
          },
        },
      ]
    );
  };

  const getMemberName = (member) => {
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();

    return (
      fullName ||
      member.full_name ||
      member.name ||
      member.username ||
      'Участник семьи'
    );
  };

  const getMemberSubtitle = (member) => {
    if (member.role === 'admin') {
      return 'Администратор семьи';
    }

    if (member.role === 'adult') {
      return 'Взрослый участник';
    }

    if (member.role === 'child') {
      return 'Ребёнок';
    }

    return member.phone || member.email || 'Член семьи';
  };

  const getChatSubtitle = (chat) => {
    if (chat.chat_subtitle) {
      return chat.chat_subtitle;
    }

    if (chat.chat_type === 'family' || chat.chat_type === 'group') {
      if (Array.isArray(chat.members) && chat.members.length > 0) {
        const names = chat.members
          .map((member) => member.full_name)
          .filter(Boolean);

        if (names.length <= 3) {
          return names.join(', ');
        }

        return `${names.slice(0, 3).join(', ')} и ещё ${names.length - 3}`;
      }

      return `${chat.members_count || 0} участников`;
    }

    return null;
  };

  const renderMemberItem = ({ item }) => {
    const memberId = item.user_id;
    const isSelected = selectedMembers.includes(memberId);

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isSelected && styles.memberItemSelected,
        ]}
        activeOpacity={0.8}
        onPress={() => toggleMember(memberId)}
      >
        <View style={styles.memberAvatar}>
          <Ionicons name="person" size={24} color="#7B7B7B" />
        </View>

        <View style={styles.memberInfo}>
          <Text style={styles.memberName} allowFontScaling={false}>
            {getMemberName(item)}
          </Text>

          <Text style={styles.memberRole} allowFontScaling={false}>
            {getMemberSubtitle(item)}
          </Text>
        </View>

        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

    const getPersonalChatAvatarUrl = (chat) => {
    if (chat.chat_type !== 'personal') {
      return null;
    }

    if (!Array.isArray(chat.members)) {
      return null;
    }

    const otherMember =
      chat.members.find((member) => member.full_name === chat.chat_name) ||
      chat.members.find((member) => member.avatar_url);

    return otherMember?.avatar_url || null;
  };

  const renderChatItem = (chat) => {
    const isFamilyChat = chat.chat_type === 'family';
    const isGroupChat = chat.chat_type === 'group';
    const isPersonalChat = chat.chat_type === 'personal';
    const lastMessage = chat.last_message;
    const personalAvatarUrl = getPersonalChatAvatarUrl(chat);

    return (
      <TouchableOpacity
        key={chat.id}
        style={styles.chatItem}
        activeOpacity={0.75}
        onLongPress={() => handleDeleteChat(chat)}
        onPress={() => {
          navigation.navigate('ChatDetail', {
            chatId: chat.id,
            chatName: chat.chat_name,
            chatType: chat.chat_type,
            membersCount: chat.members_count || 0,
            chatSubtitle: chat.chat_subtitle,
            isPinned: chat.is_pinned,
            isMainFamilyChat: chat.is_main_family_chat,
          });
        }}
      >
        <View
          style={[
            styles.chatAvatar,
            isPersonalChat && styles.personalChatAvatar,
          ]}
        >
          {isPersonalChat ? (
            <CachedAvatar
              uri={personalAvatarUrl}
              size={58}
              backgroundColor="#E6E6E6"
              icon="person"
              iconSize={27}
              iconColor="#7B7B7B"
            />
          ) : chat.photo_url ? (
            <CachedAvatar
              uri={chat.photo_url}
              size={58}
              backgroundColor="#9452FE"
              icon="people"
              iconSize={28}
              iconColor="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="people"
              size={28}
              color="#FFFFFF"
            />
          )}
        </View>

        <View style={styles.chatContent}>
          <Text
            style={[
              styles.chatTitle,
              isPersonalChat && styles.personalChatTitle,
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
          <View style={styles.chatTimeRow}>
            {chat.is_pinned && (
              <Ionicons
                name="pin"
                size={13}
                color="#A4A4A4"
                style={styles.pinIcon}
              />
            )}

            <Text style={styles.chatTime} allowFontScaling={false}>
              {lastMessage
                ? new Date(lastMessage.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>
          </View>

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
          <ScrollView
            style={styles.chatsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatsListContent}
          >
            {filteredChats.length > 0 ? (
              filteredChats.map(renderChatItem)
            ) : (
              <Text style={styles.emptyText} allowFontScaling={false}>
                Чатов пока нет
              </Text>
            )}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[
            styles.addButton,
            { bottom: insets.bottom + 110 },
          ]}
          activeOpacity={0.85}
          onPress={openCreateChatModal}
        >
          <Ionicons name="add" size={34} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeCreateChatModal}
      >
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeCreateChatModal}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  Новый чат
                </Text>

                <Text style={styles.modalSubtitle} allowFontScaling={false}>
                  Выберите участников семьи
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.8}
                onPress={closeCreateChatModal}
              >
                <Ionicons name="close" size={24} color="#7B7B7B" />
              </TouchableOpacity>
            </View>

            <View style={styles.chatNameInputContainer}>
              <TextInput
                style={styles.chatNameInput}
                placeholder="Название чата"
                placeholderTextColor="#9B9B9B"
                value={chatName}
                onChangeText={setChatName}
                allowFontScaling={false}
              />
            </View>

            <View style={styles.selectedInfo}>
              <Text style={styles.selectedInfoText} allowFontScaling={false}>
                Выбрано: {selectedMembers.length}
              </Text>
            </View>

            {membersLoading ? (
              <View style={styles.membersLoadingContainer}>
                <ActivityIndicator size="small" color="#9456FE" />
              </View>
            ) : (
              <FlatList
                data={members}
                keyExtractor={(item) => String(item.user_id)}
                renderItem={renderMemberItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.membersList}
                ListEmptyComponent={
                  <Text style={styles.emptyMembersText} allowFontScaling={false}>
                    Участники семьи не найдены
                  </Text>
                }
              />
            )}

            <TouchableOpacity
              style={[
                styles.createChatButton,
                (selectedMembers.length === 0 || creatingChat) &&
                  styles.createChatButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={selectedMembers.length === 0 || creatingChat}
              onPress={handleCreateChat}
            >
              {creatingChat ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createChatButtonText} allowFontScaling={false}>
                  Создать чат
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    marginBottom: 8,
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
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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

  chatSubtitle: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS || 13,
    color: '#8A8A8A',
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

  chatTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pinIcon: {
    marginRight: 4,
    transform: [{ rotate: '35deg' }],
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
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9452FE',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 9,
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },

  modalContent: {
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E2E2E2',
    alignSelf: 'center',
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  modalSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#8A8A8A',
  },

  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatNameInputContainer: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FAFAFA',
    marginTop: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },

  chatNameInput: {
    width: '100%',
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    padding: 0,
  },

  selectedInfo: {
    marginTop: 14,
    marginBottom: 8,
  },

  selectedInfoText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#9452FE',
  },

  membersLoadingContainer: {
    paddingVertical: 35,
    alignItems: 'center',
  },

  membersList: {
    paddingBottom: 12,
    gap: 10,
  },

  memberItem: {
    minHeight: 66,
    borderRadius: 22,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  memberItemSelected: {
    backgroundColor: '#F5EEFF',
    borderColor: '#DCC7FF',
  },

  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDEDED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },

  memberName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  memberRole: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS || 13,
    color: '#8A8A8A',
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D8D8D8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#9452FE',
    borderColor: '#9452FE',
  },

  emptyMembersText: {
    paddingVertical: 24,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
    textAlign: 'center',
  },

  createChatButton: {
    width: '100%',
    height: 56,
    borderRadius: 20,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  createChatButtonDisabled: {
    opacity: 0.55,
  },

  createChatButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  chatsListContent: {
    paddingBottom: 170,
  },


  chatAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
});