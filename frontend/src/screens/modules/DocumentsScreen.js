import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  getFamilyDocuments,
  getMyDocuments,
  getSharedOwners,
} from '../../api/documents';

function getLastDocumentTitle(documents) {
  if (!documents || documents.length === 0) {
    return 'Нет недавно добавленных';
  }

  return documents[0]?.title || 'Нет недавно добавленных';
}

export default function DocumentsScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [familyDocuments, setFamilyDocuments] = useState([]);
  const [myDocuments, setMyDocuments] = useState([]);
  const [sharedOwners, setSharedOwners] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openDocumentList = (params) => {
    navigation.navigate('DocumentList', params);
  };

  const loadDocuments = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const [familyDocs, personalDocs, sharedUsers] = await Promise.all([
        getFamilyDocuments(),
        getMyDocuments(),
        getSharedOwners(),
      ]);

      setFamilyDocuments(familyDocs || []);
      setMyDocuments(personalDocs || []);
      setSharedOwners(sharedUsers || []);
    } catch (error) {
      console.log(
        'Ошибка загрузки документов:',
        error.response?.data || error
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocuments(false);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDocuments(false);
  };

  const familyLastTitle = getLastDocumentTitle(familyDocuments);
  const myLastTitle = getLastDocumentTitle(myDocuments);

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
              Документы
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
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.title} allowFontScaling={false}>
            Документы
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#9456FE"
              colors={['#9456FE']}
            />
          }
        >
          <TouchableOpacity
            style={[styles.card, styles.familyCard]}
            activeOpacity={0.88}
            onPress={() =>
              openDocumentList({
                title: 'Общие документы',
                type: 'family',
              })
            }
          >
            <View style={styles.cardTop}>
              <Text style={styles.familyCardTitle} allowFontScaling={false}>
                Общие документы
              </Text>

              <Text style={styles.familyDate} allowFontScaling={false}>
                {familyDocuments.length > 0 ? 'Обновлено' : ''}
              </Text>
            </View>

            <View style={styles.countRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="folder" size={16} color="#9456FE" />
              </View>

              <Text style={styles.familyCountText} allowFontScaling={false}>
                Всего документов: {familyDocuments.length}
              </Text>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.lastBlock}>
                <Text style={styles.lastLabel} allowFontScaling={false}>
                  Недавно добавленные:
                </Text>

                <Text
                  style={styles.lastValue}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {familyLastTitle}
                </Text>
              </View>

              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={30} color="#5F5F5F" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.personalCard]}
            activeOpacity={0.88}
            onPress={() =>
              openDocumentList({
                title: 'Личные документы',
                type: 'personal',
              })
            }
          >
            <View style={styles.cardTop}>
              <Text style={styles.personalCardTitle} allowFontScaling={false}>
                Личные документы
              </Text>

              <Text style={styles.personalDate} allowFontScaling={false}>
                {myDocuments.length > 0 ? 'Обновлено' : ''}
              </Text>
            </View>

            <View style={styles.countRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="folder" size={16} color="#5F5F5F" />
              </View>

              <Text style={styles.personalCountText} allowFontScaling={false}>
                Всего документов: {myDocuments.length}
              </Text>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.lastBlock}>
                <Text style={styles.lastLabel} allowFontScaling={false}>
                  Недавно добавленные:
                </Text>

                <Text
                  style={styles.lastValue}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {myLastTitle}
                </Text>
              </View>

              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={30} color="#5F5F5F" />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionTitle} allowFontScaling={false}>
            Доступно мне
          </Text>

          {sharedOwners.length === 0 ? (
            <View style={styles.emptySharedBlock}>
              <Ionicons name="lock-closed-outline" size={34} color="#A4A4A4" />

              <Text style={styles.emptySharedTitle} allowFontScaling={false}>
                Вам ещё не предоставили доступ
              </Text>

              <Text style={styles.emptySharedText} allowFontScaling={false}>
                Здесь появятся документы, которыми с вами поделятся родственники
              </Text>
            </View>
          ) : (
            <View style={styles.sharedGrid}>
              {sharedOwners.map((owner) => (
                <TouchableOpacity
                  key={owner.id}
                  style={styles.sharedCard}
                  activeOpacity={0.86}
                  onPress={() =>
                    openDocumentList({
                      title: owner.name,
                      type: 'shared',
                      ownerId: owner.id,
                    })
                  }
                >
                  <View style={styles.sharedTopRow}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={22} color="#A4A4A4" />
                    </View>

                    <Text
                      style={styles.sharedName}
                      allowFontScaling={false}
                      numberOfLines={1}
                    >
                      {owner.name}
                    </Text>
                  </View>

                  <View style={styles.sharedBottomRow}>
                    <View style={styles.sharedTextBlock}>
                      <Text style={styles.sharedFilesText} allowFontScaling={false}>
                        Файлы: {owner.documents_count}
                      </Text>

                      <Text
                        style={styles.sharedLastText}
                        allowFontScaling={false}
                        numberOfLines={1}
                      >
                        {owner.last_document_title || 'Нет недавно добавленных'}
                      </Text>
                    </View>

                    <View style={styles.sharedArrow}>
                      <Ionicons name="arrow-forward" size={28} color="#5F5F5F" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
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

  content: {
    paddingBottom: 120,
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

  card: {
    width: '100%',
    minHeight: 162,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },

  familyCard: {
    backgroundColor: '#9456FE',
  },

  personalCard: {
    backgroundColor: '#E7E7E7',
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  familyCardTitle: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    lineHeight: 30,
    color: '#FFFFFF',
  },

  personalCardTitle: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    lineHeight: 30,
    color: '#262626',
  },

  familyDate: {
    marginLeft: 8,
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
    opacity: 0.9,
  },

  personalDate: {
    marginLeft: 8,
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  countRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  familyCountText: {
    marginLeft: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  personalCountText: {
    marginLeft: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#4A4A4A',
  },

  cardBottom: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lastBlock: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginRight: 14,
  },

  lastLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A4A4A4',
  },

  lastValue: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#5A5A5A',
  },

  arrowCircle: {
    width: 58,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionTitle: {
    marginTop: 26,
    marginBottom: 16,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  emptySharedBlock: {
    width: '100%',
    borderRadius: 26,
    backgroundColor: '#F7F7F7',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  emptySharedTitle: {
    marginTop: 10,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#606060',
    textAlign: 'center',
  },

  emptySharedText: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 20,
    color: '#A4A4A4',
    textAlign: 'center',
  },

  sharedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  sharedCard: {
    width: '48%',
    height: 122,
    borderRadius: 26,
    backgroundColor: '#E7E7E7',
    padding: 14,
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sharedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sharedName: {
    flex: 1,
    marginLeft: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  sharedBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sharedTextBlock: {
    flex: 1,
    marginRight: 8,
  },

  sharedFilesText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#4A4A4A',
  },

  sharedLastText: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  sharedArrow: {
    width: 44,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});