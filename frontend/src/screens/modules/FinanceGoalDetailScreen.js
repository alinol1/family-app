import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

const FALLBACK_GOAL = {
  id: 1,
  title: 'Купить машину',
  description:
    'Цель создана для постепенного накопления денег. Здесь можно отслеживать прогресс, участников и историю пополнений.',
  scope: 'personal',
  scopeTitle: 'Личная цель',
  members: ['Вы'],
  currentAmount: 34000,
  targetAmount: 344556,
  color: '#9456FE',
};

const FAMILY_MEMBERS = [
  {
    id: 1,
    name: 'Вы',
    initials: 'Я',
    color: '#EDE3FF',
  },
  {
    id: 2,
    name: 'Иван',
    initials: 'И',
    color: '#E8F0FF',
  },
  {
    id: 3,
    name: 'Анна',
    initials: 'А',
    color: '#FFE9DD',
  },
  {
    id: 4,
    name: 'Мария',
    initials: 'М',
    color: '#DDF8EF',
  },
  {
    id: 5,
    name: 'Бабушка',
    initials: 'Б',
    color: '#FFF3D6',
  },
];

const MOCK_CONTRIBUTIONS = [
  {
    id: 1,
    title: 'Пополнение цели',
    subtitle: 'Сегодня · 10:30 · Иван',
    amount: 5000,
    initials: 'И',
    color: '#EDE3FF',
  },
  {
    id: 2,
    title: 'Перевод из бюджета',
    subtitle: '23 мая · 13:45 · Анна',
    amount: 3000,
    initials: 'А',
    color: '#E8F0FF',
  },
  {
    id: 3,
    title: 'Пополнение цели',
    subtitle: '21 мая · 19:20 · Вы',
    amount: 2500,
    initials: 'Я',
    color: '#F3ECFF',
  },
  {
    id: 4,
    title: 'Взнос участника',
    subtitle: '19 мая · 12:10 · Мария',
    amount: 1500,
    initials: 'М',
    color: '#DDF8EF',
  },
];

export default function FinanceGoalDetailScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const goal = route?.params?.goal || FALLBACK_GOAL;
  const financeSpaceTitle = route?.params?.financeSpaceTitle || 'Финансовый раздел';

  const goalColor = goal.color || '#9456FE';
  const targetAmount = Number(goal.targetAmount || 0);

  const [description, setDescription] = useState(
    goal.description || 'Описание цели пока не добавлено.'
  );
  const [membersList, setMembersList] = useState(
    Array.isArray(goal.members) ? goal.members : []
  );
  const [contributions, setContributions] = useState(MOCK_CONTRIBUTIONS);
  const [addedAmount, setAddedAmount] = useState(0);

  const [activeModal, setActiveModal] = useState(null);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftMembers, setDraftMembers] = useState(membersList);
  const [topUpAmount, setTopUpAmount] = useState('');

  const currentAmount = Number(goal.currentAmount || 0) + addedAmount;
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  const progressPercent = targetAmount
    ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100)
    : 0;

  const isGoalCompleted = progressPercent >= 100;

  const modalTitle = useMemo(() => {
    if (activeModal === 'settings') {
      return 'Настройки цели';
    }

    if (activeModal === 'description') {
      return 'Описание цели';
    }

    if (activeModal === 'members') {
      return 'Участники цели';
    }

    if (activeModal === 'history') {
      return 'История пополнений';
    }

    if (activeModal === 'topup') {
      return 'Пополнить цель';
    }

    return '';
  }, [activeModal]);

  const formatNumber = (value, decimals = 0) => {
    const number = Number(value || 0);
    const sign = number < 0 ? '-' : '';
    const absoluteNumber = Math.abs(number);
    const fixedValue = absoluteNumber.toFixed(decimals);
    const [integerPart, decimalPart] = fixedValue.split('.');

    const groupedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );

    if (decimals > 0) {
      return `${sign}${groupedInteger},${decimalPart}`;
    }

    return `${sign}${groupedInteger}`;
  };

  const formatCurrency = (value, decimals = 0) => {
    return `${formatNumber(value, decimals)} ₽`;
  };

  const openModal = (type) => {
    if (type === 'description') {
      setDraftDescription(description);
    }

    if (type === 'members') {
      setDraftMembers(membersList);
    }

    if (type === 'topup') {
      setTopUpAmount('');
    }

    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const openNotReady = (title) => {
    Alert.alert(title, 'Этот раздел подключим позже');
  };

  const saveDescription = () => {
    const trimmedDescription = draftDescription.trim();

    if (!trimmedDescription) {
      Alert.alert('Описание', 'Описание не может быть пустым');
      return;
    }

    setDescription(trimmedDescription);
    closeModal();
  };

  const toggleDraftMember = (name) => {
    setDraftMembers((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }

      return [...prev, name];
    });
  };

  const saveMembers = () => {
    if (draftMembers.length === 0) {
      Alert.alert('Участники цели', 'Нужно выбрать хотя бы одного участника');
      return;
    }

    setMembersList(draftMembers);
    closeModal();
  };

  const submitTopUp = () => {
    const normalizedValue = topUpAmount.replace(/\s/g, '').replace(',', '.');
    const amount = Number(normalizedValue);

    if (!amount || amount <= 0) {
      Alert.alert('Пополнить цель', 'Введите корректную сумму пополнения');
      return;
    }

    const newContribution = {
      id: Date.now(),
      title: 'Пополнение цели',
      subtitle: 'Только что · Вы',
      amount,
      initials: 'Я',
      color: '#F3ECFF',
    };

    setAddedAmount((prev) => prev + amount);
    setContributions((prev) => [newContribution, ...prev]);
    setTopUpAmount('');
    closeModal();
  };

  const renderBackgroundGrid = () => {
    const verticalLines = Array.from({ length: 10 });
    const horizontalLines = Array.from({ length: 8 });

    return (
      <View pointerEvents="none" style={styles.gridLayer}>
        {verticalLines.map((_, index) => (
          <View
            key={`vertical-${index}`}
            style={[
              styles.gridVerticalLine,
              {
                left: `${index * 10}%`,
              },
            ]}
          />
        ))}

        {horizontalLines.map((_, index) => (
          <View
            key={`horizontal-${index}`}
            style={[
              styles.gridHorizontalLine,
              {
                top: `${index * 14}%`,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderHero = () => (
    <View style={styles.heroCard}>
      {renderBackgroundGrid()}

      <View style={styles.heroContent}>
        <View
          style={[
            styles.goalIconLarge,
            {
              backgroundColor: isGoalCompleted ? '#10B981' : goalColor,
            },
          ]}
        >
          <Ionicons
            name={isGoalCompleted ? 'checkmark-outline' : 'flag-outline'}
            size={30}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.goalTitle} allowFontScaling={false} numberOfLines={2}>
          {goal.title}
        </Text>

        <View style={styles.goalTypeBadge}>
          <Ionicons
            name={goal.scope === 'family' ? 'people-outline' : 'person-outline'}
            size={15}
            color={goalColor}
          />

          <Text style={styles.goalTypeText} allowFontScaling={false} numberOfLines={1}>
            {goal.scopeTitle || 'Цель'} · {financeSpaceTitle}
          </Text>
        </View>

        <Text style={styles.mainAmount} allowFontScaling={false} numberOfLines={1}>
          {formatCurrency(currentAmount)}
        </Text>

        <Text style={styles.targetAmount} allowFontScaling={false} numberOfLines={1}>
          из {formatCurrency(targetAmount)}
        </Text>

        {isGoalCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="sparkles-outline" size={17} color="#10B981" />

            <Text style={styles.completedText} allowFontScaling={false}>
              Цель выполнена! Ура 🎉
            </Text>
          </View>
        )}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isGoalCompleted ? '#10B981' : goalColor,
              },
            ]}
          />

          <Text style={styles.progressInsideText} allowFontScaling={false}>
            {progressPercent}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel} allowFontScaling={false}>
          Собрано
        </Text>

        <Text style={styles.statValue} allowFontScaling={false} numberOfLines={1}>
          {formatCurrency(currentAmount)}
        </Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel} allowFontScaling={false}>
          Осталось
        </Text>

        <Text style={styles.statValue} allowFontScaling={false} numberOfLines={1}>
          {formatCurrency(remainingAmount)}
        </Text>
      </View>
    </View>
  );

  const renderDescription = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Описание
        </Text>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.75}
          onPress={() => openModal('description')}
        >
          <Ionicons name="create-outline" size={20} color="#9456FE" />
        </TouchableOpacity>
      </View>

      <Text style={styles.descriptionText} allowFontScaling={false}>
        {description}
      </Text>
    </View>
  );

  const renderMembers = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Участники цели
        </Text>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.75}
          onPress={() => openModal('members')}
        >
          <Ionicons name="person-add-outline" size={20} color="#9456FE" />
        </TouchableOpacity>
      </View>

      {membersList.length === 0 ? (
        <Text style={styles.emptyText} allowFontScaling={false}>
          Участники пока не выбраны
        </Text>
      ) : (
        <View style={styles.membersWrap}>
          {membersList.map((member, index) => (
            <View key={`${member}-${index}`} style={styles.memberChip}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText} allowFontScaling={false}>
                  {member.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.memberName} allowFontScaling={false} numberOfLines={1}>
                {member}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderContribution = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.contributionRow}
      activeOpacity={0.75}
      onPress={() => openNotReady('Операция цели')}
    >
      <View
        style={[
          styles.contributionAvatar,
          {
            backgroundColor: item.color,
          },
        ]}
      >
        <Text style={styles.contributionAvatarText} allowFontScaling={false}>
          {item.initials}
        </Text>
      </View>

      <View style={styles.contributionTextBlock}>
        <Text style={styles.contributionTitle} allowFontScaling={false} numberOfLines={1}>
          {item.title}
        </Text>

        <Text style={styles.contributionSubtitle} allowFontScaling={false} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>

      <Text style={styles.contributionAmount} allowFontScaling={false}>
        +{formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  );

  const renderHistory = () => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} allowFontScaling={false}>
          История пополнений
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => openModal('history')}
        >
          <Text style={styles.viewAllText} allowFontScaling={false}>
            все
          </Text>
        </TouchableOpacity>
      </View>

      {contributions.slice(0, 2).map(renderContribution)}
    </View>
  );

  const renderSettingsRow = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity
      style={styles.settingsRow}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={22} color="#9456FE" />
      </View>

      <View style={styles.settingsTextBlock}>
        <Text style={styles.settingsTitle} allowFontScaling={false} numberOfLines={1}>
          {title}
        </Text>

        <Text style={styles.settingsSubtitle} allowFontScaling={false} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#B8B8B8" />
    </TouchableOpacity>
  );

  const renderSettingsModal = () => (
    <View>
      {renderSettingsRow({
        icon: 'settings-outline',
        title: 'Настройки цели',
        subtitle: 'Название, сумма, тип цели',
        onPress: () => openNotReady('Настройки цели'),
      })}

      {renderSettingsRow({
        icon: 'create-outline',
        title: 'Изменить описание',
        subtitle: 'Краткое описание и заметки',
        onPress: () => openModal('description'),
      })}

      {renderSettingsRow({
        icon: 'people-outline',
        title: 'Участники цели',
        subtitle: 'Добавить или убрать людей',
        onPress: () => openModal('members'),
      })}

      {renderSettingsRow({
        icon: 'time-outline',
        title: 'История пополнений',
        subtitle: 'Все взносы по цели',
        onPress: () => openModal('history'),
      })}

      {renderSettingsRow({
        icon: 'add-circle-outline',
        title: 'Пополнить цель',
        subtitle: isGoalCompleted ? 'Цель уже выполнена' : 'Добавить новый взнос',
        onPress: () => openModal('topup'),
      })}
    </View>
  );

  const renderDescriptionModal = () => (
    <View>
      <Text style={styles.modalLabel} allowFontScaling={false}>
        Краткое описание
      </Text>

      <TextInput
        style={styles.descriptionInput}
        value={draftDescription}
        onChangeText={setDraftDescription}
        multiline
        textAlignVertical="top"
        placeholder="Например: копим на первый взнос, подарок или крупную покупку"
        placeholderTextColor="#A1A1A1"
      />

      <TouchableOpacity
        style={[
          styles.modalPrimaryButton,
          {
            backgroundColor: goalColor,
          },
        ]}
        activeOpacity={0.85}
        onPress={saveDescription}
      >
        <Text style={styles.modalPrimaryButtonText} allowFontScaling={false}>
          Сохранить описание
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMembersModal = () => (
    <View>
      <Text style={styles.modalHint} allowFontScaling={false}>
        Выберите членов семьи, которые участвуют в этой цели.
      </Text>

      {FAMILY_MEMBERS.map((member) => {
        const isSelected = draftMembers.includes(member.name);

        return (
          <TouchableOpacity
            key={member.id}
            style={styles.memberSelectRow}
            activeOpacity={0.75}
            onPress={() => toggleDraftMember(member.name)}
          >
            <View
              style={[
                styles.memberSelectAvatar,
                {
                  backgroundColor: member.color,
                },
              ]}
            >
              <Text style={styles.memberSelectAvatarText} allowFontScaling={false}>
                {member.initials}
              </Text>
            </View>

            <Text style={styles.memberSelectName} allowFontScaling={false}>
              {member.name}
            </Text>

            <View
              style={[
                styles.checkbox,
                isSelected && {
                  backgroundColor: goalColor,
                  borderColor: goalColor,
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[
          styles.modalPrimaryButton,
          {
            backgroundColor: goalColor,
          },
        ]}
        activeOpacity={0.85}
        onPress={saveMembers}
      >
        <Text style={styles.modalPrimaryButtonText} allowFontScaling={false}>
          Сохранить участников
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHistoryModal = () => (
    <View>
      <Text style={styles.modalHint} allowFontScaling={false}>
        Все пополнения по выбранной цели.
      </Text>

      {contributions.map(renderContribution)}
    </View>
  );

  const renderTopUpModal = () => (
    <View>
      <Text style={styles.modalLabel} allowFontScaling={false}>
        Сумма пополнения
      </Text>

      <TextInput
        style={styles.amountInput}
        value={topUpAmount}
        onChangeText={setTopUpAmount}
        keyboardType="numeric"
        placeholder="Например: 5000"
        placeholderTextColor="#A1A1A1"
      />

      <View style={styles.quickAmountRow}>
        {[1000, 3000, 5000].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.quickAmountButton}
            activeOpacity={0.75}
            onPress={() => setTopUpAmount(String(amount))}
          >
            <Text style={styles.quickAmountText} allowFontScaling={false}>
              {formatCurrency(amount)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.modalPrimaryButton,
          {
            backgroundColor: isGoalCompleted ? '#10B981' : goalColor,
          },
        ]}
        activeOpacity={0.85}
        onPress={submitTopUp}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />

        <Text style={styles.modalPrimaryButtonText} allowFontScaling={false}>
          Пополнить цель
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderModalContent = () => {
    if (activeModal === 'settings') {
      return renderSettingsModal();
    }

    if (activeModal === 'description') {
      return renderDescriptionModal();
    }

    if (activeModal === 'members') {
      return renderMembersModal();
    }

    if (activeModal === 'history') {
      return renderHistoryModal();
    }

    if (activeModal === 'topup') {
      return renderTopUpModal();
    }

    return null;
  };

  const renderBottomModal = () => (
    <Modal
      visible={Boolean(activeModal)}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                {modalTitle}
              </Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.75}
                onPress={closeModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {renderModalContent()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={25} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} allowFontScaling={false}>
            Цель
          </Text>

          <TouchableOpacity
            style={styles.headerSettingsButton}
            activeOpacity={0.75}
            onPress={() => openModal('settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#9456FE" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderHero()}

          {renderStats()}

          {renderDescription()}

          {renderMembers()}

          {renderHistory()}
        </ScrollView>

        <View
          style={[
            styles.buttonWrapper,
            {
              left: screenPadding,
              right: screenPadding,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.mainButton,
              {
                backgroundColor: isGoalCompleted ? '#10B981' : goalColor,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => openModal('topup')}
          >
            <Ionicons
              name={isGoalCompleted ? 'checkmark-outline' : 'add'}
              size={22}
              color="#FFFFFF"
            />

            <Text style={styles.mainButtonText} allowFontScaling={false}>
              {isGoalCompleted ? 'Цель выполнена' : 'Пополнить цель'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderBottomModal()}
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
    minHeight: 56,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  headerSettingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingBottom: 126,
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 356,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },

  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.48,
  },

  gridVerticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#EFEFEF',
  },

  gridHorizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EFEFEF',
  },

  heroContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 24,
  },

  goalIconLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  goalTitle: {
    textAlign: 'center',
    fontFamily: fontFamily.bold || fontFamily.medium,
    fontWeight: '800',
    fontSize: 32,
    color: '#262626',
    letterSpacing: -0.8,
    marginBottom: 12,
  },

  goalTypeBadge: {
    maxWidth: '100%',
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 26,
  },

  goalTypeText: {
    marginLeft: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#6F45B8',
  },

  mainAmount: {
    textAlign: 'center',
    fontFamily: fontFamily.bold || fontFamily.medium,
    fontWeight: '800',
    fontSize: 38,
    color: '#262626',
    letterSpacing: -1.2,
  },

  targetAmount: {
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  completedBadge: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#E8FAF3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  completedText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#10B981',
  },

  progressTrack: {
    width: '100%',
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F1F1',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 19,
  },

  progressInsideText: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },

  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
    marginBottom: 6,
  },

  statValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  infoCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  historyCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    marginBottom: 12,
  },

  cardHeader: {
    minHeight: 30,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  descriptionText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 22,
    color: '#525252',
  },

  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  membersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  memberChip: {
    minHeight: 42,
    maxWidth: '100%',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 14,
  },

  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  memberAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#9456FE',
  },

  memberName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  contributionRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contributionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  contributionAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#9456FE',
  },

  contributionTextBlock: {
    flex: 1,
    paddingRight: 8,
  },

  contributionTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  contributionSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  contributionAmount: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#20B846',
  },

  viewAllText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A1A1A1',
  },

  buttonWrapper: {
    position: 'absolute',
    bottom: 24,
  },

  mainButton: {
    height: 56,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9456FE',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 7,
  },

  mainButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  modalKeyboardView: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'flex-end',
  },

  bottomSheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },

  modalHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D9D9D9',
    marginBottom: 14,
  },

  modalHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  modalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalScrollContent: {
    paddingBottom: 16,
  },

  settingsRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingsIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  settingsTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  settingsTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  settingsSubtitle: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  modalLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 10,
  },

  modalHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 21,
    color: '#858585',
    marginBottom: 14,
  },

  descriptionInput: {
    minHeight: 150,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },

  amountInput: {
    height: 58,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
    marginBottom: 12,
  },

  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  quickAmountButton: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickAmountText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#262626',
  },

  modalPrimaryButton: {
    minHeight: 54,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalPrimaryButtonText: {
    marginLeft: 6,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  memberSelectRow: {
    minHeight: 62,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  memberSelectAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  memberSelectAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#9456FE',
  },

  memberSelectName: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});