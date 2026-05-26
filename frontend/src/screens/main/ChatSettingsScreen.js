import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as ImagePicker from 'expo-image-picker';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import {
  getChatSettings,
  updateChat,
  addChatMembers,
  removeChatMember,
  deleteChat,
  uploadChatPhoto,
  deleteChatPhoto,
} from '../../api/chat';

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

function getInitials(name) {
  const parts = String(name || 'Без имени').split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(name || '?').slice(0, 1).toUpperCase();
}

export default function ChatSettingsScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const {
    chatId,
    chatType,
    isMainFamilyChat = false,
  } = route.params;

  const [chat, setChat] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);

  const [title, setTitle] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);


  const [photoUploading, setPhotoUploading] = useState(false);


  const isFamilyChat = chatType === 'family';
  const canManageGroup = isFamilyChat && !isMainFamilyChat && !chat?.is_main_family_chat;

  const currentMemberIds = useMemo(() => {
    return new Set((chat?.members || []).map((member) => member.user_id));
  }, [chat]);

  const availableToAdd = useMemo(() => {
    return familyMembers.filter((member) => !currentMemberIds.has(member.user_id));
  }, [familyMembers, currentMemberIds]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getChatSettings(chatId);

      setChat(data.chat);
      setFamilyMembers(Array.isArray(data.family_members) ? data.family_members : []);
      setTitle(data.chat?.title || data.chat?.chat_name || '');
    } catch (error) {
      Alert.alert('Настройки чата', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const saveTitle = useCallback(async () => {
    if (!canManageGroup) return;

    try {
      setSavingTitle(true);

      const updatedChat = await updateChat(chatId, {
        title: title.trim() || 'Групповой чат',
      });

      setChat(updatedChat);
      setTitle(updatedChat.title || updatedChat.chat_name || '');

      Alert.alert('Настройки чата', 'Название изменено.');
    } catch (error) {
      Alert.alert('Настройки чата', getApiErrorMessage(error));
    } finally {
      setSavingTitle(false);
    }
  }, [chatId, title, canManageGroup]);

  const toggleAddMember = useCallback((userId) => {
    setSelectedToAdd((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  }, []);

  const submitAddMembers = useCallback(async () => {
    if (!canManageGroup) return;

    if (selectedToAdd.length === 0) {
      Alert.alert('Участники', 'Выберите хотя бы одного участника.');
      return;
    }

    try {
      setSavingMembers(true);

      const updatedChat = await addChatMembers(chatId, selectedToAdd);

      setChat(updatedChat);
      setSelectedToAdd([]);

      Alert.alert('Участники', 'Участники добавлены.');
    } catch (error) {
      Alert.alert('Участники', getApiErrorMessage(error));
    } finally {
      setSavingMembers(false);
    }
  }, [chatId, selectedToAdd, canManageGroup]);

  const confirmRemoveMember = useCallback((member) => {
    if (!canManageGroup) return;

    Alert.alert(
      'Удалить участника?',
      `${member.full_name || 'Участник'} будет удалён из этого чата.`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingMembers(true);

              const updatedChat = await removeChatMember(chatId, member.user_id);

              if (updatedChat?.id) {
                setChat(updatedChat);
              } else {
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Участники', getApiErrorMessage(error));
            } finally {
              setSavingMembers(false);
            }
          },
        },
      ]
    );
  }, [chatId, navigation, canManageGroup]);



  const pickChatPhoto = useCallback(async () => {
  if (!canManageGroup) return;

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Нет доступа',
        'Разрешите доступ к галерее, чтобы выбрать фото чата.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const image = result.assets?.[0];

    if (!image?.uri) {
      Alert.alert('Фото чата', 'Не удалось получить выбранное изображение.');
      return;
    }

    setPhotoUploading(true);

    const updatedChat = await uploadChatPhoto(chatId, image);

    setChat(updatedChat);

    Alert.alert('Фото чата', 'Фото обновлено.');
  } catch (error) {
    Alert.alert('Фото чата', getApiErrorMessage(error));
  } finally {
    setPhotoUploading(false);
  }
}, [chatId, canManageGroup]);

const removeChatPhoto = useCallback(() => {
  if (!canManageGroup) return;

  Alert.alert(
    'Удалить фото чата?',
    'Фото будет удалено из группового чата.',
    [
      {
        text: 'Отмена',
        style: 'cancel',
      },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            setPhotoUploading(true);

            const updatedChat = await deleteChatPhoto(chatId);

            setChat(updatedChat);

            Alert.alert('Фото чата', 'Фото удалено.');
          } catch (error) {
            Alert.alert('Фото чата', getApiErrorMessage(error));
          } finally {
            setPhotoUploading(false);
          }
        },
      },
    ]
  );
}, [chatId, canManageGroup]);


  const confirmDeleteChat = useCallback(() => {
    if (chat?.is_main_family_chat) {
      Alert.alert('Чат закреплён', 'Основной семейный чат удалить нельзя.');
      return;
    }

    Alert.alert(
      'Удалить чат?',
      'Чат будет удалён. Это действие нельзя отменить.',
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
              setDeletingChat(true);

              await deleteChat(chatId);

              navigation.navigate('MainTabs');
            } catch (error) {
              Alert.alert('Удаление чата', getApiErrorMessage(error));
            } finally {
              setDeletingChat(false);
            }
          },
        },
      ]
    );
  }, [chatId, chat, navigation]);

  const renderAvatar = (name, avatarUrl, size = 42) => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatarImage,
            {
              width: size,
              height: size,
              borderRadius: Math.round(size / 3),
            },
          ]}
        />
      );
    }

    return (
      <View
        style={[
          styles.avatarPlaceholder,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size / 3),
          },
        ]}
      >
        <Text style={styles.avatarText} allowFontScaling={false}>
          {getInitials(name)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={26} color="#858585" />
            </TouchableOpacity>

            <Text style={styles.headerTitle} allowFontScaling={false}>
              Настройки чата
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="small" color={MAIN_COLOR} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.chatPreviewCard}>
                <TouchableOpacity
                    style={styles.chatPreviewAvatar}
                    activeOpacity={0.82}
                    onPress={canManageGroup ? pickChatPhoto : undefined}
                    disabled={!canManageGroup || photoUploading}
                    >
                    {chat?.photo_url ? (
                        <Image
                        source={{ uri: chat.photo_url }}
                        style={styles.chatPreviewAvatarImage}
                        />
                    ) : (
                        <Ionicons
                        name={isFamilyChat ? 'people' : 'person'}
                        size={30}
                        color="#FFFFFF"
                        />
                    )}

                    {canManageGroup && (
                        <View style={styles.chatPhotoEditBadge}>
                        {photoUploading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
                        )}
                        </View>
                    )}
                    </TouchableOpacity>

                <View style={styles.chatPreviewTextBlock}>
                  <Text
                    style={styles.chatPreviewTitle}
                    allowFontScaling={false}
                    numberOfLines={1}
                  >
                    {chat?.chat_name}
                  </Text>

                  <Text
                    style={styles.chatPreviewSubtitle}
                    allowFontScaling={false}
                    numberOfLines={2}
                  >
                    {chat?.chat_subtitle || (isFamilyChat ? 'Групповой чат' : 'Личный чат')}
                  </Text>
                </View>
              </View>

              {canManageGroup && (
                <View style={styles.photoActions}>
                    <TouchableOpacity
                    style={styles.photoButton}
                    activeOpacity={0.82}
                    onPress={pickChatPhoto}
                    disabled={photoUploading}
                    >
                    <Ionicons name="image-outline" size={19} color={MAIN_COLOR} />

                    <Text style={styles.photoButtonText} allowFontScaling={false}>
                        Выбрать фото чата
                    </Text>
                    </TouchableOpacity>

                    {!!chat?.photo_url && (
                    <TouchableOpacity
                        style={styles.photoDeleteButton}
                        activeOpacity={0.82}
                        onPress={removeChatPhoto}
                        disabled={photoUploading}
                    >
                        <Ionicons name="trash-outline" size={19} color="#EF4444" />

                        <Text style={styles.photoDeleteButtonText} allowFontScaling={false}>
                        Удалить
                        </Text>
                    </TouchableOpacity>
                    )}
                </View>
                )}

              {isFamilyChat && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} allowFontScaling={false}>
                    Название группового чата
                  </Text>

                  <View style={styles.titleRow}>
                    <TextInput
                      style={[
                        styles.titleInput,
                        !canManageGroup && styles.titleInputDisabled,
                      ]}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Название чата"
                      placeholderTextColor="#A1A1A1"
                      editable={canManageGroup}
                      allowFontScaling={false}
                    />

                    {canManageGroup && (
                      <TouchableOpacity
                        style={[
                          styles.saveTitleButton,
                          savingTitle && styles.buttonDisabled,
                        ]}
                        activeOpacity={0.82}
                        onPress={saveTitle}
                        disabled={savingTitle}
                      >
                        {savingTitle ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {chat?.is_main_family_chat && (
                    <Text style={styles.lockedHint} allowFontScaling={false}>
                      Основной семейный чат закреплён и не редактируется.
                    </Text>
                  )}
                </View>
              )}

              {isFamilyChat && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} allowFontScaling={false}>
                    Участники чата
                  </Text>

                  {(chat?.members || []).map((member) => (
                    <View key={member.user_id} style={styles.memberItem}>
                      {renderAvatar(member.full_name, member.avatar_url)}

                      <View style={styles.memberTextBlock}>
                        <Text
                          style={styles.memberName}
                          allowFontScaling={false}
                          numberOfLines={1}
                        >
                          {member.full_name}
                        </Text>

                        <Text style={styles.memberRole} allowFontScaling={false}>
                          Участник чата
                        </Text>
                      </View>

                      {canManageGroup && (
                        <TouchableOpacity
                          style={styles.removeMemberButton}
                          activeOpacity={0.75}
                          onPress={() => confirmRemoveMember(member)}
                          disabled={savingMembers}
                        >
                          <Ionicons name="close" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {canManageGroup && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} allowFontScaling={false}>
                    Добавить участников
                  </Text>

                  {availableToAdd.length === 0 ? (
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      Все участники семьи уже находятся в этом чате.
                    </Text>
                  ) : (
                    availableToAdd.map((member) => {
                      const isSelected = selectedToAdd.includes(member.user_id);

                      return (
                        <TouchableOpacity
                          key={member.user_id}
                          style={[
                            styles.memberItem,
                            isSelected && styles.memberItemSelected,
                          ]}
                          activeOpacity={0.78}
                          onPress={() => toggleAddMember(member.user_id)}
                        >
                          {renderAvatar(member.full_name, member.avatar_url)}

                          <View style={styles.memberTextBlock}>
                            <Text
                              style={styles.memberName}
                              allowFontScaling={false}
                              numberOfLines={1}
                            >
                              {member.full_name}
                            </Text>

                            <Text style={styles.memberRole} allowFontScaling={false}>
                              Участник семьи
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {availableToAdd.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.addMembersButton,
                        (selectedToAdd.length === 0 || savingMembers) && styles.buttonDisabled,
                      ]}
                      activeOpacity={0.85}
                      onPress={submitAddMembers}
                      disabled={selectedToAdd.length === 0 || savingMembers}
                    >
                      {savingMembers ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="person-add-outline" size={21} color="#FFFFFF" />
                      )}

                      <Text style={styles.addMembersButtonText} allowFontScaling={false}>
                        Добавить выбранных
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  Опасная зона
                </Text>

                <TouchableOpacity
                  style={[
                    styles.deleteChatButton,
                    deletingChat && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={confirmDeleteChat}
                  disabled={deletingChat}
                >
                  {deletingChat ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={21} color="#EF4444" />
                  )}

                  <Text style={styles.deleteChatButtonText} allowFontScaling={false}>
                    Удалить чат
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 56,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleS,
    color: '#262626',
  },
  headerSpacer: {
    width: 26,
  },
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 34,
  },
  chatPreviewCard: {
    minHeight: 96,
    borderRadius: 26,
    backgroundColor: '#F7F7F7',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  chatPreviewAvatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  chatPreviewTextBlock: {
    flex: 1,
  },
  chatPreviewTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },
  chatPreviewSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS,
    color: '#858585',
    lineHeight: 19,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },
  titleRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  titleInputDisabled: {
    color: '#999999',
  },
  saveTitleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  lockedHint: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
    lineHeight: 18,
  },
  memberItem: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F7F7F7',
  },
  memberItemSelected: {
    borderColor: MAIN_COLOR,
    backgroundColor: '#F3ECFF',
  },
  avatarPlaceholder: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  avatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },
  memberTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  memberName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  memberRole: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },
  removeMemberButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF1F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: MAIN_COLOR,
    borderColor: MAIN_COLOR,
  },
  addMembersButton: {
    minHeight: 54,
    borderRadius: 24,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addMembersButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
  deleteChatButton: {
    minHeight: 54,
    borderRadius: 24,
    backgroundColor: '#FFF1F1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteChatButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#EF4444',
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
    lineHeight: 21,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  chatPreviewAvatarImage: {
  width: 62,
  height: 62,
  borderRadius: 22,
},

chatPhotoEditBadge: {
  position: 'absolute',
  right: -4,
  bottom: -4,
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: MAIN_COLOR,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 3,
  borderColor: '#F7F7F7',
},

photoActions: {
  flexDirection: 'row',
  gap: 10,
  marginTop: -10,
  marginBottom: 22,
},

photoButton: {
  flex: 1,
  minHeight: 48,
  borderRadius: 22,
  backgroundColor: '#F3ECFF',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
},

photoButtonText: {
  marginLeft: 7,
  fontFamily: fontFamily.medium,
  fontSize: fontSize.bodyM,
  color: MAIN_COLOR,
},

photoDeleteButton: {
  minHeight: 48,
  borderRadius: 22,
  backgroundColor: '#FFF1F1',
  paddingHorizontal: 16,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
},

photoDeleteButtonText: {
  marginLeft: 7,
  fontFamily: fontFamily.medium,
  fontSize: fontSize.bodyM,
  color: '#EF4444',
},

  
});