import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

export default function DocumentsScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const openDocumentList = (params) => {
    navigation.navigate('DocumentList', params);
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
                5 апр.
              </Text>
            </View>

            <View style={styles.countRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="folder" size={16} color="#9456FE" />
              </View>

              <Text style={styles.familyCountText} allowFontScaling={false}>
                Всего документов: 5
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
                  Свидетельство о браке
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
                6 апр.
              </Text>
            </View>

            <View style={styles.countRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="folder" size={16} color="#5F5F5F" />
              </View>

              <Text style={styles.personalCountText} allowFontScaling={false}>
                Всего документов: 3
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
                  СНИЛС
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

          <View style={styles.sharedGrid}>
            <TouchableOpacity
              style={styles.sharedCard}
              activeOpacity={0.86}
              onPress={() =>
                openDocumentList({
                  title: 'Документы Константина',
                  type: 'shared',
                  owner: 'Константин',
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
                  Константин
                </Text>
              </View>

              <View style={styles.sharedBottomRow}>
                <Text style={styles.sharedFilesText} allowFontScaling={false}>
                  Файлы: 0
                </Text>

                <View style={styles.sharedArrow}>
                  <Ionicons name="arrow-forward" size={28} color="#5F5F5F" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sharedCard}
              activeOpacity={0.86}
              onPress={() =>
                openDocumentList({
                  title: 'Документы папы',
                  type: 'shared',
                  owner: 'Папа',
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
                  Папа
                </Text>
              </View>

              <View style={styles.sharedBottomRow}>
                <Text style={styles.sharedFilesText} allowFontScaling={false}>
                  Файлы: 1
                </Text>

                <View style={styles.sharedArrow}>
                  <Ionicons name="arrow-forward" size={28} color="#5F5F5F" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
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

  sharedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sharedCard: {
    width: '48%',
    height: 112,
    borderRadius: 26,
    backgroundColor: '#E7E7E7',
    padding: 14,
    justifyContent: 'space-between',
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

  sharedFilesText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#4A4A4A',
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