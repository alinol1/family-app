import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getPhotoAlbums,
  createPhotoAlbum,
} from '../../api/photos';

function chunkArray(array, size) {
  const result = [];

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }

  return result;
}

export default function PhotosScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [albums, setAlbums] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');

  const albumRows = useMemo(() => {
    return chunkArray(albums, 2);
  }, [albums]);

  const loadAlbums = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getPhotoAlbums();
      setAlbums(data || []);
    } catch (error) {
      console.log(
        'Ошибка загрузки фотоальбомов:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить фотоальбомы'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAlbums(false);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAlbums(false);
  };

  const openCreateAlbumModal = () => {
    setAlbumTitle('');
    setCreateModalVisible(true);
  };

  const closeCreateAlbumModal = () => {
    if (isCreating) return;

    setAlbumTitle('');
    setCreateModalVisible(false);
  };

  const handleCreateAlbum = async () => {
    const trimmedTitle = albumTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Введите название альбома');
      return;
    }

    try {
      setIsCreating(true);

      await createPhotoAlbum(trimmedTitle);

      setAlbumTitle('');
      setCreateModalVisible(false);

      await loadAlbums(false);
    } catch (error) {
      console.log(
        'Ошибка создания альбома:',
        error.response?.data || error
      );

      Alert.alert(
        'Ошибка',
        error.response?.data?.error || 'Не удалось создать альбом'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openAlbum = (album) => {
    navigation.navigate('PhotoAlbum', {
      albumId: album.id,
      albumTitle: album.title,
    });
  };

  const renderAlbumCard = (item) => (
    <TouchableOpacity
      key={String(item.id)}
      style={styles.albumCard}
      activeOpacity={0.85}
      onPress={() => openAlbum(item)}
    >
      <View style={styles.albumPreview}>
        {item.last_photo_url ? (
          <Image
            source={{ uri: item.last_photo_url }}
            style={styles.albumImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="images" size={46} color="#9456FE" />
        )}
      </View>

      <View style={styles.albumInfo}>
        <Text
          style={styles.albumTitle}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text style={styles.albumText} allowFontScaling={false}>
          Фото: {item.photos_count || 0}
        </Text>

        <Text
          style={styles.albumSubText}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {item.last_photo_title || 'Пока пусто'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderAlbumRow = ({ item }) => (
    <View style={styles.row}>
      {item.map((album) => renderAlbumCard(album))}

      {item.length === 1 && <View style={styles.albumCardPlaceholder} />}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyBlock}>
        <Ionicons name="images-outline" size={58} color="#C8C8C8" />

        <Text style={styles.emptyTitle} allowFontScaling={false}>
          Альбомов пока нет
        </Text>

        <Text style={styles.emptyText} allowFontScaling={false}>
          Нажмите на плюсик, чтобы создать первый семейный альбом
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
              <Ionicons name="arrow-back" size={24} color="#262626" />
            </TouchableOpacity>

            <Text style={styles.title} allowFontScaling={false}>
              Фотографии
            </Text>

            <View style={{ width: 30 }} />
          </View>

          <View style={styles.loaderBlock}>
            <ActivityIndicator size="large" color="#9456FE" />

            <Text style={styles.loaderText} allowFontScaling={false}>
              Загружаем альбомы...
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
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.title} allowFontScaling={false}>
            Фотографии
          </Text>

          <TouchableOpacity
            onPress={openCreateAlbumModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={30} color="#262626" />
          </TouchableOpacity>
        </View>

        <FlatList
          key="albums-manual-rows"
          data={albumRows}
          keyExtractor={(_, index) => `album-row-${index}`}
          renderItem={renderAlbumRow}
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

        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeCreateAlbumModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeCreateAlbumModal}
            />

            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="images-outline" size={32} color="#9456FE" />
              </View>

              <Text style={styles.modalTitle} allowFontScaling={false}>
                Новый альбом
              </Text>

              <Text style={styles.modalText} allowFontScaling={false}>
                Введите название альбома, в который можно будет добавлять семейные фотографии.
              </Text>

              <TextInput
                style={styles.input}
                value={albumTitle}
                onChangeText={setAlbumTitle}
                placeholder="Название альбома"
                placeholderTextColor="#A4A4A4"
                allowFontScaling={false}
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isCreating && styles.primaryButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleCreateAlbum}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={styles.primaryButtonText}
                    allowFontScaling={false}
                  >
                    Создать альбом
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.75}
                onPress={closeCreateAlbumModal}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
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
    marginBottom: 24,
  },

  title: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },

  row: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 14,
  },

  albumCard: {
    width: '48%',
    borderRadius: 26,
    backgroundColor: '#F7F7F7',
    padding: 14,
    marginRight: '4%',
  },

  albumCardPlaceholder: {
    width: '48%',
  },

  albumPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 22,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  albumImage: {
    width: '100%',
    height: '100%',
  },

  albumInfo: {
    marginTop: 12,
  },

  albumTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    lineHeight: 24,
    color: '#262626',
  },

  albumText: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#606060',
  },

  albumSubText: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A4A4A4',
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

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 22,
    alignItems: 'center',
  },

  modalIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 8,
  },

  modalText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 21,
    color: '#858585',
    textAlign: 'center',
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

  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  cancelButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  cancelButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },
});