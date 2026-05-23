import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getPhotoById,
  updatePhoto,
  deletePhoto,
} from '../../api/photos';

export default function PhotoViewScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const photoId = route?.params?.photoId;
  const initialPhotoTitle = route?.params?.photoTitle || 'Фотография';
  const initialAlbumTitle = route?.params?.albumTitle || 'Альбом';
  const initialPhotoUri = route?.params?.photoUri || null;

  const [photo, setPhoto] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [newTitle, setNewTitle] = useState(initialPhotoTitle);
  const [isSaving, setIsSaving] = useState(false);

  const photoTitle = photo?.title || initialPhotoTitle;
  const albumTitle = photo?.album_title || initialAlbumTitle;

  // Используем только image_url. Старое поле image больше не используем.
  const photoUri = photo?.image_url || initialPhotoUri;

  const loadPhoto = async (showLoader = true) => {
    if (!photoId) {
      setIsLoading(false);
      return;
    }

    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getPhotoById(photoId);

      setPhoto(data);
      setNewTitle(data?.title || 'Фотография');
    } catch (error) {
      console.log(
        'Ошибка загрузки фотографии:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить фотографию'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPhoto(false);
    }, [photoId])
  );

  const openMenu = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const openRenameModal = () => {
    setMenuVisible(false);
    setNewTitle(photoTitle);
    setRenameVisible(true);
  };

  const closeRenameModal = () => {
    if (isSaving) return;

    setRenameVisible(false);
    setNewTitle(photoTitle);
  };

  const saveNewTitle = async () => {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Введите название фотографии');
      return;
    }

    if (!photoId) {
      return;
    }

    try {
      setIsSaving(true);

      const updatedPhoto = await updatePhoto(photoId, {
        title: trimmedTitle,
      });

      setPhoto(updatedPhoto);
      setRenameVisible(false);
    } catch (error) {
      console.log(
        'Ошибка изменения названия фотографии:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        error.response?.data?.error || 'Не удалось изменить название'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletePhoto = () => {
    setMenuVisible(false);

    Alert.alert(
      'Удалить фотографию?',
      'Фотография будет удалена из альбома.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: handleDeletePhoto,
        },
      ]
    );
  };

  const handleDeletePhoto = async () => {
    if (!photoId) {
      return;
    }

    try {
      await deletePhoto(photoId);

      Alert.alert(
        'Удалено',
        'Фотография удалена'
      );

      navigation.goBack();
    } catch (error) {
      console.log(
        'Ошибка удаления фотографии:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        error.response?.data?.error || 'Не удалось удалить фотографию'
      );
    }
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
            >
              <Ionicons name="arrow-back" size={24} color="#858585" />
            </TouchableOpacity>

            <Text
              style={styles.title}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {initialPhotoTitle}
            </Text>

            <View style={{ width: 26 }} />
          </View>

          <View style={styles.loaderBlock}>
            <ActivityIndicator size="large" color="#9456FE" />

            <Text style={styles.loaderText} allowFontScaling={false}>
              Загружаем фотографию...
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
          >
            <Ionicons name="arrow-back" size={24} color="#858585" />
          </TouchableOpacity>

          <Text
            style={styles.title}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {photoTitle}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openMenu}
          >
            <Ionicons name="ellipsis-horizontal" size={26} color="#858585" />
          </TouchableOpacity>
        </View>

        <Text style={styles.albumText} allowFontScaling={false}>
          Альбом: {albumTitle}
        </Text>

        <TouchableOpacity
          style={styles.photoLarge}
          activeOpacity={0.9}
          onPress={() => {
            if (photoUri) {
              setFullscreenVisible(true);
            }
          }}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noPhotoBlock}>
              <Ionicons name="image-outline" size={88} color="#9456FE" />

              <Text style={styles.noPhotoText} allowFontScaling={false}>
                Не удалось загрузить изображение
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {photoUri && (
          <Text style={styles.tapHint} allowFontScaling={false}>
            Нажмите на фотографию, чтобы открыть на весь экран
          </Text>
        )}

        <Modal
          visible={fullscreenVisible}
          animationType="fade"
          transparent={false}
          onRequestClose={() => setFullscreenVisible(false)}
        >
          <View style={styles.fullscreen}>
            <TouchableOpacity
              style={styles.closeFullscreen}
              activeOpacity={0.8}
              onPress={() => setFullscreenVisible(false)}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="image-outline" size={120} color="#FFFFFF" />
            )}
          </View>
        </Modal>

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={closeMenu}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.menuCard}
            >
              <Text style={styles.menuTitle} allowFontScaling={false}>
                Действия с фото
              </Text>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.75}
                onPress={openRenameModal}
              >
                <Ionicons name="create-outline" size={24} color="#9456FE" />

                <Text style={styles.menuItemText} allowFontScaling={false}>
                  Переименовать
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.75}
                onPress={confirmDeletePhoto}
              >
                <Ionicons name="trash-outline" size={24} color="#FA4B4B" />

                <Text
                  style={[
                    styles.menuItemText,
                    styles.deleteText,
                  ]}
                  allowFontScaling={false}
                >
                  Удалить фотографию
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.75}
                onPress={closeMenu}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={renameVisible}
          transparent
          animationType="fade"
          onRequestClose={closeRenameModal}
        >
          <KeyboardAvoidingView
            style={styles.renameOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.renameBackdrop}
              activeOpacity={1}
              onPress={closeRenameModal}
            />

            <View style={styles.renameCard}>
              <View style={styles.renameIcon}>
                <Ionicons name="create-outline" size={30} color="#9456FE" />
              </View>

              <Text style={styles.renameTitle} allowFontScaling={false}>
                Изменить название
              </Text>

              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Название фотографии"
                placeholderTextColor="#A4A4A4"
                allowFontScaling={false}
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={saveNewTitle}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText} allowFontScaling={false}>
                    Сохранить
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.renameCancelButton}
                activeOpacity={0.75}
                onPress={closeRenameModal}
                disabled={isSaving}
              >
                <Text style={styles.renameCancelText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },

  title: {
    flex: 1,
    marginHorizontal: 16,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  albumText: {
    marginBottom: 18,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
    textAlign: 'center',
  },

  photoLarge: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  noPhotoBlock: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  noPhotoText: {
    marginTop: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#9456FE',
    textAlign: 'center',
  },

  tapHint: {
    marginBottom: 34,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A4A4A4',
    textAlign: 'center',
  },

  loaderBlock: {
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

  fullscreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeFullscreen: {
    position: 'absolute',
    top: 48,
    right: 22,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullscreenImage: {
    width: '100%',
    height: '100%',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 36,
  },

  menuTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 16,
  },

  menuItem: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  menuItemText: {
    marginLeft: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#434343',
  },

  deleteText: {
    color: '#FA4B4B',
  },

  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  cancelButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  renameOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  renameBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  renameCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 22,
    alignItems: 'center',
  },

  renameIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  renameTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 18,
  },

  input: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },

  saveButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  renameCancelButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  renameCancelText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },
});