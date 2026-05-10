import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

const mockDocuments = [
  {
    id: 1,
    title: 'Паспорт',
    type: 'family',
    owner: null,
    image: require('../../../assets/images/document-placeholder.png'),
  },
  {
    id: 2,
    title: 'Водительское удостоверение',
    type: 'family',
    owner: null,
    image: require('../../../assets/images/document-placeholder.png'),
  },
  {
    id: 3,
    title: 'Паспорт',
    type: 'personal',
    owner: null,
    image: require('../../../assets/images/document-placeholder.png'),
  },
  {
    id: 4,
    title: 'СНИЛС',
    type: 'personal',
    owner: null,
    image: require('../../../assets/images/document-placeholder.png'),
  },
  {
    id: 5,
    title: 'Водительские права',
    type: 'shared',
    owner: 'Папа',
    image: require('../../../assets/images/document-placeholder.png'),
  },
];

export default function DocumentListScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const title = route?.params?.title || 'Документы';
  const type = route?.params?.type || 'family';
  const owner = route?.params?.owner || null;

  const [search, setSearch] = useState('');

  const documents = useMemo(() => {
    return mockDocuments.filter((document) => {
      const matchesType = document.type === type;
      const matchesOwner = owner ? document.owner === owner : true;
      const matchesSearch = document.title
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      return matchesType && matchesOwner && matchesSearch;
    });
  }, [type, owner, search]);

  const openDocument = (document) => {
    navigation.navigate('DocumentView', {
      document,
    });
  };

  const renderDocument = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.documentCard}
        activeOpacity={0.85}
        onPress={() => openDocument(item)}
      >
        <Image
          source={item.image}
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
            onChangeText={setSearch}
            allowFontScaling={false}
          />

          <Ionicons name="search-outline" size={26} color="#858585" />
        </View>

        <FlatList
          data={documents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDocument}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Ionicons name="folder-open-outline" size={54} color="#C8C8C8" />

              <Text style={styles.emptyTitle} allowFontScaling={false}>
                Документы пока не добавлены
              </Text>

              <Text style={styles.emptyText} allowFontScaling={false}>
                Здесь появятся документы после добавления
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={() => {
            console.log('Добавить документ');
          }}
        >
          <Ionicons name="add" size={36} color="#FFFFFF" />
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
    color: '#A4A4A4',
    textAlign: 'center',
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
});