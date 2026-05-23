import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getProfile, updateProfile } from '../../api/profile';

export default function MedicalInfoScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [medications, setMedications] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const profile = await getProfile();

      setBloodType(profile.blood_type || '');
      setAllergies(profile.allergies || '');
      setChronicDiseases(profile.chronic_diseases || '');
      setMedications(profile.medications || '');
      setEmergencyContactName(profile.emergency_contact_name || '');
      setEmergencyContactPhone(profile.emergency_contact_phone || '');
      setMedicalNotes(profile.medical_notes || '');
    } catch (error) {
      console.log('Ошибка загрузки медицинской информации');

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить медицинскую информацию'
      );
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    const data = error?.response?.data;

    if (!data) {
      return 'Не удалось сохранить медицинскую информацию';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data.blood_type?.[0]) {
      return data.blood_type[0];
    }

    if (data.allergies?.[0]) {
      return data.allergies[0];
    }

    if (data.chronic_diseases?.[0]) {
      return data.chronic_diseases[0];
    }

    if (data.medications?.[0]) {
      return data.medications[0];
    }

    if (data.emergency_contact_name?.[0]) {
      return data.emergency_contact_name[0];
    }

    if (data.emergency_contact_phone?.[0]) {
      return data.emergency_contact_phone[0];
    }

    if (data.medical_notes?.[0]) {
      return data.medical_notes[0];
    }

    if (data.detail) {
      return data.detail;
    }

    return 'Не удалось сохранить медицинскую информацию';
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updatedProfile = await updateProfile({
        blood_type: bloodType.trim(),
        allergies: allergies.trim(),
        chronic_diseases: chronicDiseases.trim(),
        medications: medications.trim(),
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
        medical_notes: medicalNotes.trim(),
      });

      setBloodType(updatedProfile.blood_type || '');
      setAllergies(updatedProfile.allergies || '');
      setChronicDiseases(updatedProfile.chronic_diseases || '');
      setMedications(updatedProfile.medications || '');
      setEmergencyContactName(updatedProfile.emergency_contact_name || '');
      setEmergencyContactPhone(updatedProfile.emergency_contact_phone || '');
      setMedicalNotes(updatedProfile.medical_notes || '');

      Alert.alert(
        'Готово',
        'Медицинская информация сохранена'
      );
    } catch (error) {
      console.log('Ошибка сохранения медицинской информации');

      Alert.alert(
        'Ошибка',
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  const renderInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    multiline = false,
    keyboardType = 'default',
  }) => (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel} allowFontScaling={false}>
        {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
        ]}
      >
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={20} color="#9456FE" />
        </View>

        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8B8B8"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          allowFontScaling={false}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9456FE" />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загрузка медицинской информации...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#262626" />
            </TouchableOpacity>

            <Text style={styles.title} allowFontScaling={false}>
              Медицинская информация
            </Text>

            <View style={styles.headerRightPlaceholder} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.warningCard}>
              <View style={styles.warningIcon}>
                <Ionicons name="medical-outline" size={22} color="#EF4444" />
              </View>

              <View style={styles.warningTextBlock}>
                <Text style={styles.warningTitle} allowFontScaling={false}>
                  Важные данные для экстренных ситуаций
                </Text>

                <Text style={styles.warningSubtitle} allowFontScaling={false}>
                  Эта информация может помочь близким быстрее сориентироваться при SOS-сигнале.
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Основные сведения
            </Text>

            <View style={styles.card}>
              {renderInput({
                label: 'Группа крови',
                value: bloodType,
                onChangeText: setBloodType,
                placeholder: 'Например: II+',
                icon: 'water-outline',
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Аллергии',
                value: allergies,
                onChangeText: setAllergies,
                placeholder: 'Укажите аллергии или напишите “Нет”',
                icon: 'alert-circle-outline',
                multiline: true,
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Хронические заболевания',
                value: chronicDiseases,
                onChangeText: setChronicDiseases,
                placeholder: 'Например: астма, диабет, гипертония',
                icon: 'heart-outline',
                multiline: true,
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Принимаемые лекарства',
                value: medications,
                onChangeText: setMedications,
                placeholder: 'Укажите постоянные лекарства',
                icon: 'medkit-outline',
                multiline: true,
              })}
            </View>

            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Экстренный контакт
            </Text>

            <View style={styles.card}>
              {renderInput({
                label: 'Имя контакта',
                value: emergencyContactName,
                onChangeText: setEmergencyContactName,
                placeholder: 'К кому обратиться',
                icon: 'person-outline',
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Телефон контакта',
                value: emergencyContactPhone,
                onChangeText: setEmergencyContactPhone,
                placeholder: 'Введите номер телефона',
                icon: 'call-outline',
                keyboardType: 'phone-pad',
              })}
            </View>

            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Дополнительно
            </Text>

            <View style={styles.card}>
              {renderInput({
                label: 'Медицинские заметки',
                value: medicalNotes,
                onChangeText: setMedicalNotes,
                placeholder: 'Любая важная информация для семьи',
                icon: 'document-text-outline',
                multiline: true,
              })}
            </View>

            <View style={styles.infoNotice}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9456FE"
              />

              <Text style={styles.infoNoticeText} allowFontScaling={false}>
                Медицинские данные относятся к чувствительной информации. Позже мы ограничим доступ к ним настройками приватности.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.saveButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText} allowFontScaling={false}>
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },

  title: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  headerRightPlaceholder: {
    width: 24,
    height: 24,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  warningCard: {
    borderRadius: 24,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },

  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  warningTextBlock: {
    flex: 1,
  },

  warningTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  warningSubtitle: {
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: '#858585',
  },

  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  card: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },

  inputBlock: {
    paddingVertical: 10,
  },

  inputLabel: {
    marginLeft: 50,
    marginBottom: 7,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  inputWrapper: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputWrapperMultiline: {
    alignItems: 'flex-start',
  },

  inputIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  inputMultiline: {
    minHeight: 82,
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: 21,
  },

  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 50,
  },

  infoNotice: {
    borderRadius: 20,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginBottom: 16,
  },

  infoNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: '#6F45B8',
  },

  saveButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});