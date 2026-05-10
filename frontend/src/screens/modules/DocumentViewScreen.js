import React, { useState } from 'react';
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
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

export default function DocumentViewScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const document = route?.params?.document;

  const [title, setTitle] = useState(
    document?.title || 'Водительское удостоверение'
  );

  const [editVisible, setEditVisible] = useState(false);
  const [accessVisible, setAccessVisible] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  const pages = [
    require('../../../assets/images/document-placeholder.png'),
    require('../../../assets/images/document-placeholder.png'),
  ];

  const saveTitle = () => {
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Название документа не может быть пустым');
      return;
    }

    setTitle(trimmedTitle);
    setEditVisible(false);
  };

  const addPage = () => {
    Alert.alert(
      'Добавить страницу',
      'Позже здесь будет выбор фото, камеры или файла'
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
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#858585" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={() => {
                setDraftTitle(title);
                setEditVisible(true);
              }}
            >
              <Ionicons name="pencil" size={24} color="#5F5F5F" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={() => setAccessVisible(true)}
            >
              <Ionicons name="settings-outline" size={26} color="#5F5F5F" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title} allowFontScaling={false}>
          {title}
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pages.map((page, index) => (
            <Image
              key={index}
              source={page}
              style={styles.documentImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={addPage}
        >
          <Ionicons name="add" size={36} color="#FFFFFF" />
        </TouchableOpacity>

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
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={saveTitle}
              >
                <Text style={styles.primaryButtonText} allowFontScaling={false}>
                  Сохранить
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalButton}
                activeOpacity={0.75}
                onPress={() => setEditVisible(false)}
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
                Позже здесь можно будет выбрать родственников, которым разрешён
                просмотр этого документа.
              </Text>

              <View style={styles.accessItem}>
                <Ionicons name="eye-outline" size={24} color="#9456FE" />

                <Text style={styles.accessItemText} allowFontScaling={false}>
                  Только просмотр
                </Text>
              </View>

              <View style={styles.accessItem}>
                <Ionicons name="people-outline" size={24} color="#9456FE" />

                <Text style={styles.accessItemText} allowFontScaling={false}>
                  Выбор членов семьи
                </Text>
              </View>

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

  title: {
    marginTop: 4,
    marginBottom: 18,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    lineHeight: 30,
    color: '#262626',
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

  addButton: {
    position: 'absolute',
    right: 0,
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
  },

  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
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