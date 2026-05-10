import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getDocumentById,
  updateDocument,
  deleteDocument,
} from '../../api/documents';

function getDocumentImage(document) {
  if (document?.file_url) {
    return { uri: document.file_url };
  }

  if (document?.file) {
    return { uri: document.file };
  }

  return require('../../../assets/images/document-placeholder.png');
}

export default function DocumentViewScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const documentId = route?.params?.documentId || route?.params?.document?.id;
  const initialDocument = route?.params?.document || null;
  const sourceType = route?.params?.sourceType || null;

  const [document, setDocument] = useState(initialDocument);
  const [title, setTitle] = useState(initialDocument?.title || 'Документ');
  const [draftTitle, setDraftTitle] = useState(initialDocument?.title || '');

  const [isLoading, setIsLoading] = useState(!initialDocument);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [accessVisible, setAccessVisible] = useState(false);

  const isSharedDocument = sourceType === 'shared';
  const isFamilyDocument = document?.is_family_doc === true;

  const canEditDocument = !isSharedDocument;

  const loadDocument = async (showLoader = true) => {
    if (!documentId) {
      Alert.alert('Ошибка', 'Документ не найден');
      navigation.goBack();
      return;
    }

    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getDocumentById(documentId);

      setDocument(data);
      setTitle(data?.title || 'Документ');
      setDraftTitle(data?.title || '');
    } catch (error) {
      console.log(
        'Ошибка загрузки документа:',
        error.response?.data || error
      );

      if (error.response?.status === 403) {
        Alert.alert(
          'Нет доступа',
          'У вас нет прав на просмотр этого документа',
          [{ text: 'Ок', onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (error.response?.status === 404) {
        Alert.alert(
          'Документ не найден',
          'Возможно, документ был удалён',
          [{ text: 'Ок', onPress: () => navigation.goBack() }]
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocument(!initialDocument);
  }, [documentId]);

  useFocusEffect(
    useCallback(() => {
      loadDocument(false);
    }, [documentId])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDocument(false);
  };

  const openEditModal = () => {
    if (!canEditDocument) {
      Alert.alert(
        'Недоступно',
        'Вы можете только просматривать документ, который вам предоставили'
      );
      return;
    }

    setDraftTitle(title);
    setEditVisible(true);
  };

  const openAccessModal = () => {
    if (!canEditDocument) {
      Alert.alert(
        'Недоступно',
        'Вы не можете изменять доступ к чужому документу'
      );
      return;
    }

    if (isFamilyDocument) {
      Alert.alert(
        'Общий документ',
        'Этот документ уже доступен всей семье'
      );
      return;
    }

    setAccessVisible(true);
  };

  const saveTitle = async () => {
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Название документа не может быть пустым');
      return;
    }

    try {
      setIsSaving(true);

      const updatedDocument = await updateDocument(documentId, {
        title: trimmedTitle,
      });

      setDocument(updatedDocument);
      setTitle(updatedDocument.title);
      setDraftTitle(updatedDocument.title);
      setEditVisible(false);
    } catch (error) {
      console.log(
        'Ошибка обновления документа:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        error.response?.data?.error || 'Не удалось обновить документ'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addPage = () => {
    Alert.alert(
      'Добавить страницы',
      'Позже здесь будет выбор фото, камеры или файла'
    );
  };

  const confirmDeleteDocument = () => {
    Alert.alert(
      'Удалить документ?',
      'Документ будет удалён без возможности восстановления',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: handleDeleteDocument,
        },
      ]
    );
  };

  const handleDeleteDocument = async () => {
    try {
      await deleteDocument(documentId);

      Alert.alert(
        'Готово',
        'Документ удалён',
        [
          {
            text: 'Ок',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log(
        'Ошибка удаления документа:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        error.response?.data?.error || 'Не удалось удалить документ'
      );
    }
  };

  const makeSharedStub = () => {
    Alert.alert(
      'Настройки доступа',
      'Следующим этапом подключим выбор родственников и отправку shared_with на backend'
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#858585" />
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <View style={styles.iconButtonPlaceholder} />
              <View style={styles.iconButtonPlaceholder} />
            </View>
          </View>

          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#9456FE" />

            <Text style={styles.loaderText} allowFontScaling={false}>
              Загружаем документ...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#858585" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {canEditDocument && (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.8}
                onPress={openEditModal}
              >
                <Ionicons name="pencil" size={24} color="#5F5F5F" />
              </TouchableOpacity>
            )}

            {canEditDocument && !isFamilyDocument && (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.8}
                onPress={openAccessModal}
              >
                <Ionicons name="settings-outline" size={26} color="#5F5F5F" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.title} allowFontScaling={false}>
          {title}
        </Text>

        {isFamilyDocument && (
          <View style={styles.infoPill}>
            <Ionicons name="people-outline" size={18} color="#9456FE" />

            <Text style={styles.infoPillText} allowFontScaling={false}>
              Доступен всей семье
            </Text>
          </View>
        )}

        {isSharedDocument && (
          <View style={styles.infoPill}>
            <Ionicons name="eye-outline" size={18} color="#9456FE" />

            <Text style={styles.infoPillText} allowFontScaling={false}>
              Документ предоставлен вам для просмотра
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#9456FE"
              colors={['#9456FE']}
            />
          }
        >
          <Image
            source={getDocumentImage(document)}
            style={styles.documentImage}
            resizeMode="cover"
          />
        </ScrollView>

        <Modal
          visible={editVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Редактировать документ
              </Text>

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Название
              </Text>

              <TextInput
                style={styles.input}
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Введите название"
                placeholderTextColor="#A4A4A4"
                allowFontScaling={false}
              />

              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.82}
                onPress={addPage}
              >
                <Ionicons name="images-outline" size={22} color="#9456FE" />

                <Text style={styles.actionButtonText} allowFontScaling={false}>
                  Добавить страницы документа
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.82}
                onPress={confirmDeleteDocument}
              >
                <Ionicons name="trash-outline" size={22} color="#FA4B4B" />

                <Text
                  style={[
                    styles.actionButtonText,
                    styles.deleteActionButtonText,
                  ]}
                  allowFontScaling={false}
                >
                  Удалить документ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSaving && styles.disabledButton,
                ]}
                activeOpacity={0.85}
                onPress={saveTitle}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText} allowFontScaling={false}>
                  {isSaving ? 'Сохраняем...' : 'Сохранить'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalButton}
                activeOpacity={0.75}
                onPress={() => setEditVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelModalText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={accessVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAccessVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Настройки доступа
              </Text>

              <Text style={styles.accessText} allowFontScaling={false}>
                Здесь будет выбор членов семьи, которым можно открыть просмотр
                этого личного документа.
              </Text>

              <TouchableOpacity
                style={styles.accessItem}
                activeOpacity={0.82}
                onPress={makeSharedStub}
              >
                <Ionicons name="people-outline" size={24} color="#9456FE" />

                <Text style={styles.accessItemText} allowFontScaling={false}>
                  Выбрать родственников
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accessItem}
                activeOpacity={0.82}
                onPress={makeSharedStub}
              >
                <Ionicons name="lock-closed-outline" size={24} color="#9456FE" />

                <Text style={styles.accessItemText} allowFontScaling={false}>
                  Сделать доступным только мне
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() => setAccessVisible(false)}
              >
                <Text style={styles.primaryButtonText} allowFontScaling={false}>
                  Готово
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  header: {
    height: 64,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 108,
    justifyContent: 'flex-end',
  },

  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  iconButtonPlaceholder: {
    width: 50,
    height: 50,
    marginLeft: 8,
  },

  title: {
    marginTop: 4,
    marginBottom: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    lineHeight: 30,
    color: '#262626',
  },

  infoPill: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  infoPillText: {
    marginLeft: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#9456FE',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  documentImage: {
    width: '100%',
    height: 270,
    backgroundColor: '#E7E7E7',
    marginBottom: 12,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderText: {
    marginTop: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 22,
  },

  modalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 18,
  },

  inputLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#606060',
    marginBottom: 8,
    marginLeft: 4,
  },

  input: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },

  actionButton: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
  },

  actionButtonText: {
    marginLeft: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#434343',
  },

  deleteActionButtonText: {
    color: '#FA4B4B',
  },

  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  cancelModalButton: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  cancelModalText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  accessText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 22,
    color: '#606060',
    marginBottom: 14,
  },

  accessItem: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  accessItemText: {
    marginLeft: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#434343',
  },
});