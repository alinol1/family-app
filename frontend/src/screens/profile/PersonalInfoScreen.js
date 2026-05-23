import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
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

export default function PersonalInfoScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatar, setAvatar] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const profile = await getProfile();

      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setCity(profile.city || '');
      setAvatar(profile.avatar || null);
    } catch (error) {
      console.log('Ошибка загрузки профиля');

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить данные профиля'
      );
    } finally {
      setLoading(false);
    }
  };

  const openNotReady = (title) => {
    Alert.alert(
      title,
      'Этот раздел подключим позже'
    );
  };

  const getInitials = () => {
    const firstLetter = firstName ? firstName.trim()[0] : '';
    const lastLetter = lastName ? lastName.trim()[0] : '';

    return `${firstLetter || ''}${lastLetter || ''}` || 'П';
  };

  const getErrorMessage = (error) => {
    const data = error?.response?.data;

    if (!data) {
      return 'Не удалось сохранить данные профиля';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data.email?.[0]) {
      return data.email[0];
    }

    if (data.phone?.[0]) {
      return data.phone[0];
    }

    if (data.first_name?.[0]) {
      return data.first_name[0];
    }

    if (data.last_name?.[0]) {
      return data.last_name[0];
    }

    if (data.city?.[0]) {
      return data.city[0];
    }

    if (data.detail) {
      return data.detail;
    }

    return 'Не удалось сохранить данные профиля';
  };

  const handleSave = async () => {
    const preparedFirstName = firstName.trim();
    const preparedLastName = lastName.trim();
    const preparedPhone = phone.trim();
    const preparedEmail = email.trim();
    const preparedCity = city.trim();

    if (!preparedFirstName) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    if (!preparedLastName) {
      Alert.alert('Ошибка', 'Введите фамилию');
      return;
    }

    if (!preparedPhone) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }

    if (!preparedEmail) {
      Alert.alert('Ошибка', 'Введите почту');
      return;
    }

    try {
      setSaving(true);

      const updatedProfile = await updateProfile({
        first_name: preparedFirstName,
        last_name: preparedLastName,
        phone: preparedPhone,
        email: preparedEmail,
        city: preparedCity,
      });

      setFirstName(updatedProfile.first_name || '');
      setLastName(updatedProfile.last_name || '');
      setPhone(updatedProfile.phone || '');
      setEmail(updatedProfile.email || '');
      setCity(updatedProfile.city || '');
      setAvatar(updatedProfile.avatar || null);

      Alert.alert(
        'Готово',
        'Личная информация сохранена'
      );
    } catch (error) {
      console.log('Ошибка сохранения профиля');

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
    keyboardType = 'default',
    autoCapitalize = 'sentences',
  }) => (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel} allowFontScaling={false}>
        {label}
      </Text>

      <View style={styles.inputWrapper}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={20} color="#9456FE" />
        </View>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8B8B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          allowFontScaling={false}
        />
      </View>
    </View>
  );

  const renderVerificationRow = ({
    isVerified,
    verifiedText,
    notVerifiedText,
    actionText,
    onPress,
  }) => (
    <View style={styles.verificationRow}>
      <View style={styles.verificationLeft}>
        <Ionicons
          name={isVerified ? 'checkmark-circle' : 'alert-circle-outline'}
          size={16}
          color={isVerified ? '#10B981' : '#F59E0B'}
        />

        <Text
          style={[
            styles.verificationText,
            isVerified && styles.verificationTextSuccess,
          ]}
          allowFontScaling={false}
        >
          {isVerified ? verifiedText : notVerifiedText}
        </Text>
      </View>

      {!isVerified && (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Text style={styles.verificationAction} allowFontScaling={false}>
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9456FE" />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загрузка профиля...
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
              Личная информация
            </Text>

            <View style={styles.headerRightPlaceholder} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.profileTop}>
              <View style={styles.avatarWrapper}>
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetters} allowFontScaling={false}>
                      {getInitials()}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.avatarEditButton}
                  activeOpacity={0.8}
                  onPress={() => openNotReady('Изменить фото')}
                >
                  <Ionicons name="camera" size={15} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.avatarHint} allowFontScaling={false}>
                Фото профиля
              </Text>
            </View>

            <View style={styles.card}>
              {renderInput({
                label: 'Имя',
                value: firstName,
                onChangeText: setFirstName,
                placeholder: 'Введите имя',
                icon: 'person-outline',
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Фамилия',
                value: lastName,
                onChangeText: setLastName,
                placeholder: 'Введите фамилию',
                icon: 'person-outline',
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Телефон',
                value: phone,
                onChangeText: setPhone,
                placeholder: 'Введите номер телефона',
                icon: 'call-outline',
                keyboardType: 'phone-pad',
                autoCapitalize: 'none',
              })}

              {renderVerificationRow({
                isVerified: false,
                verifiedText: 'Телефон подтверждён',
                notVerifiedText: 'Телефон не подтверждён',
                actionText: 'Подтвердить',
                onPress: () => openNotReady('Подтверждение телефона'),
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Email',
                value: email,
                onChangeText: setEmail,
                placeholder: 'Введите почту',
                icon: 'mail-outline',
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}

              {renderVerificationRow({
                isVerified: false,
                verifiedText: 'Почта подтверждена',
                notVerifiedText: 'Почта не подтверждена',
                actionText: 'Подтвердить',
                onPress: () => openNotReady('Подтверждение почты'),
              })}

              <View style={styles.divider} />

              {renderInput({
                label: 'Город',
                value: city,
                onChangeText: setCity,
                placeholder: 'Введите город',
                icon: 'location-outline',
              })}
            </View>

            <View style={styles.infoNotice}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#9456FE"
              />

              <Text style={styles.infoNoticeText} allowFontScaling={false}>
                Эти данные будут использоваться в профиле и семейных разделах приложения.
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

  profileTop: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 22,
  },

  avatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },

  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarLetters: {
    fontFamily: fontFamily.medium,
    fontSize: 34,
    color: '#9456FE',
  },

  avatarEditButton: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  avatarHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
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

  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 50,
  },

  verificationRow: {
    marginLeft: 50,
    marginTop: -2,
    marginBottom: 8,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },

  verificationText: {
    marginLeft: 5,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#F59E0B',
  },

  verificationTextSuccess: {
    color: '#10B981',
  },

  verificationAction: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#9456FE',
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