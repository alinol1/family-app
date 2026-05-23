import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getAlbumPhotos,
  uploadAlbumPhoto,
} from '../../api/photos';

function getCleanPhotoTitle(fileName = '') {
  if (!fileName) {
    return 'Фотография';
  }

  if (!fileName.includes('.')) {
    return fileName;
  }

  return fileName.substring(0, fileName.lastIndexOf('.')) || 'Фотография';
}

export default function PhotoAlbumScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const albumId = route?.params?.albumId;
  const albumTitle = route?.params?.albumTitle || 'Альбом';

  const [photos, setPhotos] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  const [addMenuVisible, setAddMenuVisible] = useState(false);

  const loadPhotos = async (showLoader = true) => {
    if (!albumId) {
      setPhotos([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getAlbumPhotos(albumId);
      setPhotos(data || []);
    } catch (error) {
      console.log(
        'Ошибка загрузки фотографий альбома:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить фотографии'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPhotos(false);
    }, [albumId])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadPhotos(false);
  };

  const openAddMenu = () => {
    setAddMenuVisible(true);
  };

  const closeAddMenu = () => {
    if (isAddingPhoto) return;
    setAddMenuVisible(false);
  };

  const openPhoto = (photo) => {
    navigation.navigate('PhotoView', {
      photoId: photo.id,
      photoTitle: photo.title || 'Фотография',
      albumTitle,
      photoUri: photo.image_url || null,
    });
  };

  const uploadSelectedPhoto = async (asset) => {
    if (!asset || !albumId) {
      return;
    }

    try {
      setIsAddingPhoto(true);

      const fileName =
        asset.fileName ||
        `photo_${Date.now()}.jpg`;

      const image = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: fileName,
      };

      await uploadAlbumPhoto({
        albumId,
        title: getCleanPhotoTitle(fileName),
        image,
      });

      await loadPhotos(false);

      Alert.alert(
        'Успешно',
        'Фотография добавлена в альбом'
      );
    } catch (error) {
      console.log(
        'Ошибка загрузки фотографии:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        error.response?.data?.error || 'Не удалось загрузить фотографию'
      );
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setAddMenuVisible(false);

      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Нет доступа',
          'Разрешите доступ к камере, чтобы сделать фото'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      await uploadSelectedPhoto(asset);
    } catch (error) {
      console.log(
        'Ошибка добавления фото с камеры:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось сделать фото'
      );
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setAddMenuVisible(false);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Нет доступа',
          'Разрешите доступ к галерее, чтобы выбрать фото'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      await uploadSelectedPhoto(asset);
    } catch (error) {
      console.log(
        'Ошибка выбора фото из галереи:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось выбрать фото'
      );
    }
  };

  const renderPhoto = ({ item }) => {
    const photoUri = item.image_url || null;

    return (
      <TouchableOpacity
        style={styles.photoCard}
        activeOpacity={0.85}
        onPress={() => openPhoto(item)}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photoImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image" size={38} color="#9456FE" />
          </View>
        )}

        <Text
          style={styles.photoTitle}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {item.title || 'Фотография'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyBlock}>
        <Ionicons name="image-outline" size={58} color="#C8C8C8" />

        <Text style={styles.emptyTitle} allowFontScaling={false}>
          Фотографий пока нет
        </Text>

        <Text style={styles.emptyText} allowFontScaling={false}>
          Нажмите на плюсик, чтобы добавить фото в альбом
        </Text>
      </View>
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
            >
              <Ionicons name="arrow-back" size={24} color="#858585" />
            </TouchableOpacity>

            <Text
              style={styles.title}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {albumTitle}
            </Text>

            <View style={{ width: 24 }} />
          </View>

          <View style={styles.loaderBlock}>
            <ActivityIndicator size="large" color="#9456FE" />

            <Text style={styles.loaderText} allowFontScaling={false}>
              Загружаем фотографии...
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
            {albumTitle}
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <FlatList
          key="photos-3-columns"
          data={photos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPhoto}
          numColumns={3}
          columnWrapperStyle={photos.length > 0 ? styles.row : null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#9456FE"
              colors={['#9456FE']}
            />
          }
        />

        <TouchableOpacity
          style={[
            styles.addButton,
            isAddingPhoto && styles.addButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={openAddMenu}
          disabled={isAddingPhoto}
        >
          {isAddingPhoto ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={36} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        <Modal
          visible={addMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAddMenu}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeAddMenu}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.addMenu}
            >
              <Text style={styles.addMenuTitle} allowFontScaling={false}>
                Добавить фото
              </Text>

              <Text style={styles.addMenuDescription} allowFontScaling={false}>
                Фотография будет добавлена в альбом “{albumTitle}”
              </Text>

              <TouchableOpacity
                style={styles.addMenuItem}
                activeOpacity={0.75}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={24} color="#9456FE" />

                <Text style={styles.addMenuItemText} allowFontScaling={false}>
                  Сделать фото
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addMenuItem}
                activeOpacity={0.75}
                onPress={handlePickFromGallery}
              >
                <Ionicons name="image-outline" size={24} color="#9456FE" />

                <Text style={styles.addMenuItemText} allowFontScaling={false}>
                  Выбрать из галереи
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.75}
                onPress={closeAddMenu}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
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
    marginBottom: 24,
  },

  title: {
    flex: 1,
    marginHorizontal: 16,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: 130,
  },

  row: {
    justifyContent: 'space-between',
  },

  photoCard: {
    width: '31%',
    marginBottom: 18,
    alignItems: 'center',
  },

  photoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#E7E7E7',
  },

  photoTitle: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#606060',
    textAlign: 'center',
  },

  emptyBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },

  emptyTitle: {
    marginTop: 16,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#606060',
  },

  emptyText: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 21,
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

  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#9456FE',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },

  addButtonDisabled: {
    opacity: 0.7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },

  addMenu: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 36,
  },

  addMenuTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 6,
  },

  addMenuDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 20,
    color: '#858585',
    marginBottom: 18,
  },

  addMenuItem: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  addMenuItemText: {
    marginLeft: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#434343',
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
});