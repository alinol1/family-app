import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getFamilyDocuments,
  getMyDocuments,
  getSharedDocuments,
} from '../../api/documents';

function getDocumentImage(document) {
  if (document?.file_url) {
    return { uri: document.file_url };
  }

  return require('../../../assets/images/document-placeholder.png');
}

export default function DocumentListScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const title = route?.params?.title || 'Документы';
  const type = route?.params?.type || 'family';
  const ownerId = route?.params?.ownerId || null;

  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  const isSharedScreen = type === 'shared';

  const loadDocuments = async (searchValue = search, showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      let data = [];

      if (type === 'family') {
        data = await getFamilyDocuments(searchValue);
      }

      if (type === 'personal') {
        data = await getMyDocuments(searchValue);
      }

      if (type === 'shared') {
        data = await getSharedDocuments(ownerId, searchValue);
      }

      setDocuments(data || []);
    } catch (error) {
      console.log(
        'Ошибка загрузки списка документов:',
        error.response?.data || error
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments('', true);
  }, [type, ownerId]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments(search, false);
    }, [type, ownerId, search])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDocuments(search, false);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    loadDocuments(value, false);
  };

  const openDocument = (document) => {
    navigation.navigate('DocumentView', {
      documentId: document.id,
      document,
      sourceType: type,
    });
  };

  const openAddMenu = () => {
    if (isSharedScreen) {
      Alert.alert(
        'Недоступно',
        'В этом разделе отображаются документы, к которым вам предоставили доступ'
      );
      return;
    }

    setAddMenuVisible(true);
  };

  const handleAddDocument = (method) => {
    setAddMenuVisible(false);

    Alert.alert(
      'Добавление документа',
      method === 'camera'
        ? 'Позже здесь откроется камера'
        : method === 'gallery'
          ? 'Позже здесь откроется галерея'
          : 'Позже здесь откроется выбор файла'
    );
  };

  const renderDocument = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.documentCard}
        activeOpacity={0.85}
        onPress={() => openDocument(item)}
      >
        <Image
          source={getDocumentImage(item)}
          style={styles.documentImage}
          resizeMode="cover"
        />

        <Text
          style={styles.documentTitle}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return null;
    }

    return (
      <View style={styles.emptyBlock}>
        <Ionicons name="folder-open-outline" size={58} color="#C8C8C8" />

        <Text style={styles.emptyTitle} allowFontScaling={false}>
          Пока документов нет
        </Text>

        <Text style={styles.emptyText} allowFontScaling={false}>
          {isSharedScreen
            ? 'Здесь появятся документы, к которым вам предоставят доступ'
            : 'Нажмите на плюсик, чтобы добавить первый документ'}
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
              {title}
            </Text>

            <View style={{ width: 24 }} />
          </View>

          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#9456FE" />

            <Text style={styles.loaderText} allowFontScaling={false}>
              Загружаем документы...
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
            {title}
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchBlock}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск"
            placeholderTextColor="#A4A4A4"
            value={search}
            onChangeText={handleSearchChange}
            allowFontScaling={false}
          />

          <Ionicons name="search-outline" size={26} color="#858585" />
        </View>

        <FlatList
          data={documents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDocument}
          numColumns={2}
          columnWrapperStyle={documents.length > 0 ? styles.row : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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

        {!isSharedScreen && (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={openAddMenu}
          >
            <Ionicons name="add" size={36} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <Modal
          visible={addMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setAddMenuVisible(false)}
          >
            <View style={styles.addMenu}>
              <Text style={styles.addMenuTitle} allowFontScaling={false}>
                Добавить документ
              </Text>

              <Text style={styles.addMenuDescription} allowFontScaling={false}>
                Документ будет добавлен в раздел “{title}”
              </Text>

              <TouchableOpacity
                style={styles.addMenuItem}
                activeOpacity={0.75}
                onPress={() => handleAddDocument('camera')}
              >
                <Ionicons name="camera-outline" size={24} color="#9456FE" />

                <Text style={styles.addMenuItemText} allowFontScaling={false}>
                  Сделать фото
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addMenuItem}
                activeOpacity={0.75}
                onPress={() => handleAddDocument('gallery')}
              >
                <Ionicons name="image-outline" size={24} color="#9456FE" />

                <Text style={styles.addMenuItemText} allowFontScaling={false}>
                  Выбрать из галереи
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addMenuItem}
                activeOpacity={0.75}
                onPress={() => handleAddDocument('file')}
              >
                <Ionicons name="document-outline" size={24} color="#9456FE" />

                <Text style={styles.addMenuItemText} allowFontScaling={false}>
                  Выбрать файл
                </Text>
              </TouchableOpacity>
            </View>
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

  searchBlock: {
    width: '100%',
    height: 46,
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    paddingVertical: 0,
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: 130,
  },

  row: {
    justifyContent: 'space-between',
  },

  documentCard: {
    width: '48%',
    marginBottom: 22,
    alignItems: 'center',
  },

  documentImage: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#E7E7E7',
  },

  documentTitle: {
    marginTop: 7,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 19,
    color: '#3D3D3D',
    textAlign: 'center',
  },

  emptyBlock: {
    flex: 1,
    marginTop: 90,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  emptyTitle: {
    marginTop: 16,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#606060',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 20,
    color: '#A4A4A4',
    textAlign: 'center',
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
});