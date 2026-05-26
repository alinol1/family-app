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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import {
  getFamilyTree,
  updateTreePerson,
  uploadTreePersonPhoto,
  deleteTreePersonPhoto,
  deleteTreePerson,
} from '../../api/familytree';

const MAIN_COLOR = '#9456FE';

const GENDER_OPTIONS = [
  { key: 'female', title: 'Женский' },
  { key: 'male', title: 'Мужской' },
  { key: 'unknown', title: 'Не указано' },
];

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

  return 'Сервер вернул ошибку. Проверьте введённые данные.';
}

function emptyToNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function normalizePerson(person) {
  return {
    id: person.id,
    linkedUserId: person.linked_user_id ?? null,
    isCurrentUser: Boolean(person.is_current_user),
    firstName: person.first_name || '',
    lastName: person.last_name || '',
    middleName: person.middle_name || '',
    gender: person.gender || 'unknown',
    birthDate: person.birth_date || '',
    deathDate: person.death_date || '',
    photoUrl: person.photo_url || '',
    note: person.note || '',
    personalLabel: person.personal_label || '',
  };
}

function getFullName(person) {
  if (!person) return 'Без имени';

  const fullName = [
    person.lastName,
    person.firstName,
    person.middleName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || 'Без имени';
}

function getInitials(person) {
  const name = getFullName(person);
  const parts = name.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 1).toUpperCase();
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('ru-RU');
}

function getLifeDates(person) {
  const birth = formatDate(person?.birthDate);
  const death = formatDate(person?.deathDate);

  if (birth && death) return `${birth} — ${death}`;
  if (birth) return birth;
  if (death) return `— ${death}`;

  return 'Даты не указаны';
}

export default function FamilyTreePersonDetailScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const personId = route?.params?.personId;

  const [person, setPerson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [note, setNote] = useState('');
  const [personalLabel, setPersonalLabel] = useState('');

  const titleName = useMemo(() => {
    return getFullName({
      firstName,
      middleName,
      lastName,
    });
  }, [firstName, middleName, lastName]);

  const fillForm = useCallback((nextPerson) => {
    setPerson(nextPerson);

    setFirstName(nextPerson.firstName || '');
    setLastName(nextPerson.lastName || '');
    setMiddleName(nextPerson.middleName || '');
    setGender(nextPerson.gender || 'unknown');
    setBirthDate(nextPerson.birthDate || '');
    setDeathDate(nextPerson.deathDate || '');
    setPhotoUrl(nextPerson.photoUrl || '');
    setNote(nextPerson.note || '');
    setPersonalLabel(nextPerson.personalLabel || '');
  }, []);

  const loadPerson = useCallback(async () => {
    if (!personId) {
      setIsLoading(false);
      Alert.alert('Семейное древо', 'Не передан ID человека.');
      navigation.goBack();
      return;
    }

    try {
      setIsLoading(true);

      const data = await getFamilyTree();
      const foundPerson = (data.persons || [])
        .map(normalizePerson)
        .find((item) => item.id === personId);

      if (!foundPerson) {
        Alert.alert('Семейное древо', 'Человек не найден в семейном древе.');
        navigation.goBack();
        return;
      }

      fillForm(foundPerson);
    } catch (error) {
      Alert.alert('Семейное древо', getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [personId, navigation, fillForm]);

  useFocusEffect(
    useCallback(() => {
      loadPerson();
    }, [loadPerson])
  );

  const savePerson = useCallback(async () => {
    const trimmedFirstName = firstName.trim();

    if (!trimmedFirstName) {
      Alert.alert('Семейное древо', 'Имя не может быть пустым.');
      return;
    }

    try {
      setIsSaving(true);

      const updatedPerson = await updateTreePerson(personId, {
        first_name: trimmedFirstName,
        last_name: lastName.trim(),
        middle_name: middleName.trim(),
        gender,
        birth_date: emptyToNull(birthDate),
        death_date: emptyToNull(deathDate),
        note: note.trim(),
        personal_label: personalLabel.trim(),
      });

      fillForm(normalizePerson(updatedPerson));

      Alert.alert('Семейное древо', 'Данные сохранены.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Семейное древо', getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    personId,
    firstName,
    lastName,
    middleName,
    gender,
    birthDate,
    deathDate,
    note,
    personalLabel,
    fillForm,
    navigation,
  ]);

  const pickPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Нет доступа',
          'Разрешите доступ к галерее, чтобы выбрать фотографию.'
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
        Alert.alert('Фото', 'Не удалось получить выбранное изображение.');
        return;
      }

      setIsPhotoUploading(true);

      const updatedPerson = await uploadTreePersonPhoto(personId, image);
      const normalized = normalizePerson(updatedPerson);

      fillForm(normalized);

      Alert.alert('Фото', 'Фото обновлено.');
    } catch (error) {
      Alert.alert('Фото', getApiErrorMessage(error));
    } finally {
      setIsPhotoUploading(false);
    }
  }, [personId, fillForm]);

  const removePhoto = useCallback(() => {
    Alert.alert(
      'Удалить фото?',
      'Фото будет удалено из карточки человека.',
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
              setIsPhotoUploading(true);

              const updatedPerson = await deleteTreePersonPhoto(personId);
              const normalized = normalizePerson(updatedPerson);

              fillForm(normalized);

              Alert.alert('Фото', 'Фото удалено.');
            } catch (error) {
              Alert.alert('Фото', getApiErrorMessage(error));
            } finally {
              setIsPhotoUploading(false);
            }
          },
        },
      ]
    );
  }, [personId, fillForm]);

  const removePerson = useCallback(() => {
    Alert.alert(
      'Удалить человека?',
      'Карточка будет удалена из семейного древа вместе со связями. Это действие нельзя отменить.',
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
              setIsSaving(true);

              await deleteTreePerson(personId);

              Alert.alert('Семейное древо', 'Человек удалён из семейного древа.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Семейное древо', getApiErrorMessage(error));
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }, [personId, navigation]);

  const clearDeathDate = useCallback(() => {
    setDeathDate('');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={25} color="#262626" />
            </TouchableOpacity>

            <Text style={styles.headerTitle} allowFontScaling={false}>
              Карточка человека
            </Text>

            <TouchableOpacity
              style={[
                styles.headerSaveButton,
                isSaving && styles.headerSaveButtonDisabled,
              ]}
              activeOpacity={0.75}
              onPress={savePerson}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={MAIN_COLOR} />

              <Text style={styles.loadingText} allowFontScaling={false}>
                Загружаем карточку...
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.profileCard}>
                <TouchableOpacity
                  style={styles.avatarWrapper}
                  activeOpacity={0.82}
                  onPress={pickPhoto}
                  disabled={isPhotoUploading}
                >
                  {photoUrl ? (
                    <Image
                      source={{ uri: photoUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText} allowFontScaling={false}>
                        {getInitials({
                          firstName,
                          middleName,
                          lastName,
                        })}
                      </Text>
                    </View>
                  )}

                  <View style={styles.avatarEditBadge}>
                    {isPhotoUploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.profileTextBlock}>
                  <Text
                    style={styles.profileName}
                    allowFontScaling={false}
                    numberOfLines={2}
                  >
                    {titleName}
                  </Text>

                  <Text style={styles.profileDates} allowFontScaling={false}>
                    {getLifeDates({
                      birthDate,
                      deathDate,
                    })}
                  </Text>

                  {person?.linkedUserId && (
                    <View style={styles.linkedBadge}>
                      <Ionicons name="link-outline" size={13} color={MAIN_COLOR} />

                      <Text style={styles.linkedBadgeText} allowFontScaling={false}>
                        Связано с аккаунтом семьи
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.photoButton}
                  activeOpacity={0.82}
                  onPress={pickPhoto}
                  disabled={isPhotoUploading}
                >
                  <Ionicons name="image-outline" size={19} color={MAIN_COLOR} />

                  <Text style={styles.photoButtonText} allowFontScaling={false}>
                    Выбрать фото
                  </Text>
                </TouchableOpacity>

                {!!photoUrl && (
                  <TouchableOpacity
                    style={styles.photoDeleteButton}
                    activeOpacity={0.82}
                    onPress={removePhoto}
                    disabled={isPhotoUploading}
                  >
                    <Ionicons name="trash-outline" size={19} color="#EF4444" />

                    <Text style={styles.photoDeleteButtonText} allowFontScaling={false}>
                      Удалить
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  Основные данные
                </Text>

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Фамилия
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Фамилия"
                  placeholderTextColor="#A1A1A1"
                  allowFontScaling={false}
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Имя
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Имя"
                  placeholderTextColor="#A1A1A1"
                  allowFontScaling={false}
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Отчество
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={middleName}
                  onChangeText={setMiddleName}
                  placeholder="Отчество"
                  placeholderTextColor="#A1A1A1"
                  allowFontScaling={false}
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Пол
                </Text>

                <View style={styles.chipsRow}>
                  {GENDER_OPTIONS.map((item) => {
                    const isActive = item.key === gender;

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.chip,
                          isActive && styles.chipActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setGender(item.key)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isActive && styles.chipTextActive,
                          ]}
                          allowFontScaling={false}
                        >
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  Даты жизни
                </Text>

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Дата рождения
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="ГГГГ-ММ-ДД"
                  placeholderTextColor="#A1A1A1"
                  allowFontScaling={false}
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Дата смерти
                </Text>

                <View style={styles.inputWithButton}>
                  <TextInput
                    style={styles.inputWithButtonField}
                    value={deathDate}
                    onChangeText={setDeathDate}
                    placeholder="Необязательно"
                    placeholderTextColor="#A1A1A1"
                    allowFontScaling={false}
                  />

                  {!!deathDate && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      activeOpacity={0.75}
                      onPress={clearDeathDate}
                    >
                      <Ionicons name="close" size={18} color="#777777" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  Описание
                </Text>

                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Например: краткая биография, важные факты, воспоминания"
                  placeholderTextColor="#A1A1A1"
                  multiline
                  textAlignVertical="top"
                  allowFontScaling={false}
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Кто этот человек для вас?
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={personalLabel}
                  onChangeText={setPersonalLabel}
                  placeholder="Например: мама, дедушка, сестра"
                  placeholderTextColor="#A1A1A1"
                  allowFontScaling={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.deletePersonButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={removePerson}
                disabled={isSaving}
              >
                <Ionicons name="trash-outline" size={21} color="#EF4444" />

                <Text style={styles.deletePersonButtonText} allowFontScaling={false}>
                  Удалить из древа
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={savePerson}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="save-outline" size={21} color="#FFFFFF" />
                )}

                <Text style={styles.saveButtonText} allowFontScaling={false}>
                  {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
                </Text>
              </TouchableOpacity>
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
  keyboardView: {
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
  headerSaveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSaveButtonDisabled: {
    opacity: 0.7,
  },
  loadingBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileCard: {
    minHeight: 126,
    borderRadius: 28,
    backgroundColor: '#F7F7F7',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    width: 86,
    height: 86,
    borderRadius: 22,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 22,
    backgroundColor: '#F3ECFF',
  },
  avatarPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 22,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.medium,
    fontSize: 28,
    color: MAIN_COLOR,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F7F7F7',
  },
  profileTextBlock: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
    lineHeight: 28,
  },
  profileDates: {
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS,
    color: '#858585',
  },
  linkedBadge: {
    alignSelf: 'flex-start',
    marginTop: 9,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#F3ECFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedBadgeText: {
    marginLeft: 5,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: MAIN_COLOR,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },
  inputLabel: {
    marginBottom: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  textInput: {
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    paddingVertical: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 15,
    paddingBottom: 15,
    lineHeight: 22,
  },
  inputWithButton: {
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputWithButtonField: {
    flex: 1,
    height: 54,
    paddingHorizontal: 18,
    paddingVertical: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  clearButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  chip: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  chipActive: {
    backgroundColor: MAIN_COLOR,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#262626',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  deletePersonButton: {
    minHeight: 56,
    borderRadius: 24,
    backgroundColor: '#FFF1F1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  deletePersonButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#EF4444',
  },
  saveButton: {
    minHeight: 56,
    borderRadius: 24,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});