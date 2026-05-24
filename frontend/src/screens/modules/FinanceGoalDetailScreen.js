import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getFinanceGoalById,
  updateFinanceGoal,
  completeFinanceGoal,
  createFinanceGoalContribution,
  getFinanceGoalContributions,
  getFinanceSpaceMembers,
} from '../../api/finance';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAIN_COLOR = '#9456FE';

const getErrorMessage = (error, fallback = 'Произошла ошибка') => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.detail ||
    fallback
  );
};

const toNumber = (value) => Number(value || 0);

const normalizeMember = (member) => ({
  id: member.id,
  name: member.name || member.username || 'Участник',
  initials: member.initials || (member.name || 'У').charAt(0).toUpperCase(),
  avatarUrl: member.avatar_url || null,
  isCurrentUser: Boolean(member.is_current_user),
  isSelected: Boolean(member.is_selected),
});

const normalizeContribution = (contribution) => ({
  id: contribution.id,
  amount: toNumber(contribution.amount),
  comment: contribution.comment || '',
  createdByName: contribution.created_by_name || 'Участник',
  actorInitials: contribution.actor_initials || 'У',
  createdAt: contribution.created_at,
});

const normalizeGoal = (goal) => ({
  id: goal.id,
  title: goal.title,
  description: goal.description || '',
  scope: goal.scope,
  scopeTitle:
    goal.scope_display ||
    (goal.scope === 'family' ? 'Общая цель' : 'Личная цель'),
  currentAmount: toNumber(goal.current_amount),
  targetAmount: toNumber(goal.target_amount),
  progressPercent: toNumber(goal.progress_percent),
  isReadyToComplete: Boolean(goal.is_ready_to_complete),
  status: goal.status,
  completedAt: goal.completed_at,
  members: (goal.members || []).map(normalizeMember),
  contributions: (goal.contributions || []).map(normalizeContribution),
});

export default function FinanceGoalDetailScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const financeSpaceId = route?.params?.financeSpaceId;
  const financeSpaceTitle = route?.params?.financeSpaceTitle || 'Финансовая ячейка';
  const goalId = route?.params?.goalId || route?.params?.goal?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);

  const [activeModal, setActiveModal] = useState(null);

  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpComment, setTopUpComment] = useState('');

  const [draftDescription, setDraftDescription] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTargetAmount, setDraftTargetAmount] = useState('');
  const [draftScope, setDraftScope] = useState('personal');
  const [draftMemberIds, setDraftMemberIds] = useState([]);

  const percent = useMemo(() => {
    if (!goal?.targetAmount) {
      return 0;
    }

    const value = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    return Math.min(value, 100);
  }, [goal]);

  const isCompleted = goal?.status === 'completed';
  const isReadyToComplete = !isCompleted && percent >= 100;

  const formatNumber = (value, decimals = 0) => {
    const number = Number(value || 0);
    const fixedValue = number.toFixed(decimals);
    const [integerPart, decimalPart] = fixedValue.split('.');

    const groupedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );

    if (decimals > 0) {
      return `${groupedInteger},${decimalPart}`;
    }

    return groupedInteger;
  };

  const formatCurrency = (value) => `${formatNumber(value)} ₽`;

  const formatDate = (value) => {
    if (!value) {
      return 'Сегодня';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Сегодня';
    }

    return date.toLocaleDateString('ru-RU');
  };

  const getMemberNames = (members) => {
    if (!members || members.length === 0) {
      return 'Без участников';
    }

    return members.map((member) => member.name).join(', ');
  };

  const loadGoal = useCallback(async () => {
    if (!financeSpaceId || !goalId) {
      Alert.alert('Цель', 'Не передан идентификатор цели');
      navigation.goBack();
      return;
    }

    setIsLoading(true);

    try {
      const [goalData, contributionsData, membersData] = await Promise.all([
        getFinanceGoalById(financeSpaceId, goalId),
        getFinanceGoalContributions(financeSpaceId, goalId),
        getFinanceSpaceMembers(financeSpaceId),
      ]);

      const normalizedGoal = normalizeGoal(goalData);

      setGoal(normalizedGoal);
      setContributions((contributionsData || []).map(normalizeContribution));
      setSpaceMembers((membersData || []).map(normalizeMember));
    } catch (error) {
      Alert.alert('Цель', getErrorMessage(error, 'Не удалось загрузить цель'));
    } finally {
      setIsLoading(false);
    }
  }, [financeSpaceId, goalId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadGoal();
    }, [loadGoal])
  );

  const openModal = (modalName) => {
    if (!goal) {
      return;
    }

    if (modalName === 'topup') {
      setTopUpAmount('');
      setTopUpComment('');
    }

    if (modalName === 'description') {
      setDraftDescription(goal.description || '');
    }

    if (modalName === 'settings') {
      setDraftTitle(goal.title);
      setDraftTargetAmount(String(goal.targetAmount || ''));
      setDraftDescription(goal.description || '');
      setDraftScope(goal.scope || 'personal');
      setDraftMemberIds(goal.members.map((member) => member.id));
    }

    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const toggleDraftMember = (memberId) => {
    setDraftMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const changeDraftScope = (scope) => {
    setDraftScope(scope);

    if (scope === 'personal') {
      setDraftMemberIds([]);
      return;
    }

    const selectedMembers = spaceMembers
      .filter((member) => member.isSelected)
      .map((member) => member.id);

    setDraftMemberIds(selectedMembers);
  };

  const submitTopUp = async () => {
    const amount = Number(topUpAmount.replace(/\s/g, '').replace(',', '.'));

    if (!amount || amount <= 0) {
      Alert.alert('Пополнение', 'Введите корректную сумму');
      return;
    }

    try {
      await createFinanceGoalContribution({
        spaceId: financeSpaceId,
        goalId,
        amount,
        comment: topUpComment.trim(),
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      closeModal();
      await loadGoal();
    } catch (error) {
      Alert.alert('Пополнение', getErrorMessage(error, 'Не удалось пополнить цель'));
    }
  };

  const saveDescription = async () => {
    try {
      await updateFinanceGoal(financeSpaceId, goalId, {
        description: draftDescription.trim(),
      });

      closeModal();
      await loadGoal();
    } catch (error) {
      Alert.alert('Описание', getErrorMessage(error, 'Не удалось сохранить описание'));
    }
  };

  const saveSettings = async () => {
    const title = draftTitle.trim();
    const targetAmount = Number(
      String(draftTargetAmount).replace(/\s/g, '').replace(',', '.')
    );

    if (!title) {
      Alert.alert('Настройки цели', 'Введите название цели');
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      Alert.alert('Настройки цели', 'Введите корректную сумму цели');
      return;
    }

    if (draftScope === 'family' && draftMemberIds.length === 0) {
      Alert.alert('Настройки цели', 'Выберите участников цели');
      return;
    }

    try {
      await updateFinanceGoal(financeSpaceId, goalId, {
        title,
        target_amount: targetAmount,
        description: draftDescription.trim(),
        scope: draftScope,
        member_ids: draftScope === 'family' ? draftMemberIds : [],
      });

      closeModal();
      await loadGoal();
    } catch (error) {
      Alert.alert('Настройки цели', getErrorMessage(error, 'Не удалось сохранить настройки'));
    }
  };

  const finishGoal = async () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await completeFinanceGoal(financeSpaceId, goalId);
      await loadGoal();

      Alert.alert('Цель', 'Цель перенесена в выполненные');
    } catch (error) {
      Alert.alert('Цель', getErrorMessage(error, 'Не удалось завершить цель'));
    }
  };

  const renderProgressCard = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressTopRow}>
        <View>
          <Text style={styles.progressLabel} allowFontScaling={false}>
            Накоплено
          </Text>

          <Text style={styles.progressAmount} allowFontScaling={false}>
            {formatCurrency(goal.currentAmount)}
          </Text>
        </View>

        <View style={styles.percentCircle}>
          <Text style={styles.percentText} allowFontScaling={false}>
            {percent}%
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
            },
          ]}
        />
      </View>

      <View style={styles.progressFooter}>
        <Text style={styles.progressFooterText} allowFontScaling={false}>
          Сейчас {formatCurrency(goal.currentAmount)}
        </Text>

        <Text style={styles.progressFooterText} allowFontScaling={false}>
          Цель {formatCurrency(goal.targetAmount)}
        </Text>
      </View>

      {isReadyToComplete && (
        <TouchableOpacity
          style={styles.finishGoalButton}
          activeOpacity={0.85}
          onPress={finishGoal}
        >
          <Ionicons name="checkmark" size={21} color="#FFFFFF" />

          <Text style={styles.finishGoalButtonText} allowFontScaling={false}>
            Перенести в выполненные
          </Text>
        </TouchableOpacity>
      )}

      {isCompleted && (
        <View style={styles.completedBadge}>
          <Ionicons name="sparkles-outline" size={18} color={MAIN_COLOR} />

          <Text style={styles.completedBadgeText} allowFontScaling={false}>
            Цель выполнена · {formatDate(goal.completedAt)}
          </Text>
        </View>
      )}
    </View>
  );

  const renderDescriptionCard = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Описание
        </Text>

        {!isCompleted && (
          <TouchableOpacity
            style={styles.smallIconButton}
            activeOpacity={0.75}
            onPress={() => openModal('description')}
          >
            <Ionicons name="create-outline" size={17} color={MAIN_COLOR} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.descriptionText} allowFontScaling={false}>
        {goal.description || 'Описание цели пока не добавлено.'}
      </Text>
    </View>
  );

  const renderMembersCard = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Участники
        </Text>

        <Text style={styles.cardCounter} allowFontScaling={false}>
          {goal.members.length}
        </Text>
      </View>

      {goal.members.length === 0 ? (
        <Text style={styles.descriptionText} allowFontScaling={false}>
          Участники не выбраны
        </Text>
      ) : (
        goal.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText} allowFontScaling={false}>
                {member.initials}
              </Text>
            </View>

            <View style={styles.memberTextBlock}>
              <Text style={styles.memberName} allowFontScaling={false}>
                {member.name}
              </Text>

              <Text style={styles.memberSubtitle} allowFontScaling={false}>
                Участник цели
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderHistoryCard = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} allowFontScaling={false}>
          История пополнений
        </Text>

        <Text style={styles.cardCounter} allowFontScaling={false}>
          {contributions.length}
        </Text>
      </View>

      {contributions.length === 0 ? (
        <Text style={styles.descriptionText} allowFontScaling={false}>
          Пополнений пока нет
        </Text>
      ) : (
        contributions.map((item) => (
          <View key={item.id} style={styles.contributionRow}>
            <View style={styles.contributionAvatar}>
              <Text style={styles.contributionAvatarText} allowFontScaling={false}>
                {item.actorInitials}
              </Text>
            </View>

            <View style={styles.contributionTextBlock}>
              <Text style={styles.contributionTitle} allowFontScaling={false}>
                {item.createdByName}
              </Text>

              <Text
                style={styles.contributionSubtitle}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {formatDate(item.createdAt)}
                {item.comment ? ` · ${item.comment}` : ''}
              </Text>
            </View>

            <Text style={styles.contributionAmount} allowFontScaling={false}>
              +{formatCurrency(item.amount)}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderScopeTabs = () => (
    <View style={styles.scopeTabs}>
      <TouchableOpacity
        style={[
          styles.scopeTab,
          draftScope === 'personal' && styles.scopeTabActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeDraftScope('personal')}
      >
        <Text
          style={[
            styles.scopeTabText,
            draftScope === 'personal' && styles.scopeTabTextActive,
          ]}
          allowFontScaling={false}
        >
          Личная
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.scopeTab,
          draftScope === 'family' && styles.scopeTabActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeDraftScope('family')}
      >
        <Text
          style={[
            styles.scopeTabText,
            draftScope === 'family' && styles.scopeTabTextActive,
          ]}
          allowFontScaling={false}
        >
          Общая
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDraftMembersPicker = () => {
    if (draftScope !== 'family') {
      return null;
    }

    const availableMembers = spaceMembers.filter((member) => member.isSelected);

    return (
      <>
        <Text style={styles.inputLabel} allowFontScaling={false}>
          Участники цели
        </Text>

        {availableMembers.length === 0 ? (
          <Text style={styles.emptyMembersText} allowFontScaling={false}>
            Сначала добавьте участников в настройках финансовой ячейки.
          </Text>
        ) : (
          <View style={styles.membersWrap}>
            {availableMembers.map((member) => {
              const isSelected = draftMemberIds.includes(member.id);

              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberChip,
                    isSelected && styles.memberChipActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => toggleDraftMember(member.id)}
                >
                  <View style={styles.memberChipAvatar}>
                    <Text style={styles.memberChipAvatarText} allowFontScaling={false}>
                      {member.initials}
                    </Text>
                  </View>

                  <Text style={styles.memberChipName} allowFontScaling={false}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </>
    );
  };

  const renderTopUpModal = () => (
    <Modal
      visible={activeModal === 'topup'}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.smallBottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Пополнить цель
              </Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.75}
                onPress={closeModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel} allowFontScaling={false}>
              Сумма
            </Text>

            <TextInput
              style={styles.textInput}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              keyboardType="numeric"
              placeholder="Сумма"
              placeholderTextColor="#A1A1A1"
              autoFocus
            />

            <Text style={styles.inputLabel} allowFontScaling={false}>
              Комментарий
            </Text>

            <TextInput
              style={styles.textInput}
              value={topUpComment}
              onChangeText={setTopUpComment}
              placeholder="Например: перевод в копилку"
              placeholderTextColor="#A1A1A1"
            />

            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.85}
              onPress={submitTopUp}
            >
              <Ionicons name="add" size={21} color="#FFFFFF" />

              <Text style={styles.submitButtonText} allowFontScaling={false}>
                Пополнить
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDescriptionModal = () => (
    <Modal
      visible={activeModal === 'description'}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.smallBottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Описание цели
              </Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.75}
                onPress={closeModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.descriptionInput}
              value={draftDescription}
              onChangeText={setDraftDescription}
              multiline
              textAlignVertical="top"
              placeholder="Описание цели"
              placeholderTextColor="#A1A1A1"
            />

            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.85}
              onPress={saveDescription}
            >
              <Ionicons name="checkmark" size={21} color="#FFFFFF" />

              <Text style={styles.submitButtonText} allowFontScaling={false}>
                Сохранить
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={activeModal === 'settings'}
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
                Настройки цели
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
              contentContainerStyle={styles.modalContent}
            >
              {renderScopeTabs()}

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Название цели
              </Text>

              <TextInput
                style={styles.textInput}
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Название цели"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Сумма цели
              </Text>

              <TextInput
                style={styles.textInput}
                value={draftTargetAmount}
                onChangeText={setDraftTargetAmount}
                keyboardType="numeric"
                placeholder="Сумма"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Описание
              </Text>

              <TextInput
                style={styles.descriptionInput}
                value={draftDescription}
                onChangeText={setDraftDescription}
                multiline
                textAlignVertical="top"
                placeholder="Описание цели"
                placeholderTextColor="#A1A1A1"
              />

              {renderDraftMembersPicker()}

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.85}
                onPress={saveSettings}
              >
                <Ionicons name="checkmark" size={21} color="#FFFFFF" />

                <Text style={styles.submitButtonText} allowFontScaling={false}>
                  Сохранить изменения
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (isLoading || !goal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загружаем цель...
          </Text>
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
            <Ionicons name="arrow-back" size={25} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} allowFontScaling={false}>
            Цель
          </Text>

          <TouchableOpacity
            style={styles.headerRightButton}
            activeOpacity={0.75}
            onPress={() => openModal('settings')}
          >
            <Ionicons name="settings-outline" size={20} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name={isCompleted ? 'checkmark-outline' : 'flag-outline'}
                size={28}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.heroTitle} allowFontScaling={false}>
              {goal.title}
            </Text>

            <Text style={styles.heroSubtitle} allowFontScaling={false}>
              {goal.scopeTitle} · {getMemberNames(goal.members)}
            </Text>

            <Text style={styles.heroSpace} allowFontScaling={false}>
              {financeSpaceTitle}
            </Text>
          </View>

          {renderProgressCard()}
          {renderDescriptionCard()}
          {renderMembersCard()}
          {renderHistoryCard()}
        </ScrollView>

        {!isCompleted && (
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
              style={styles.mainButton}
              activeOpacity={0.85}
              onPress={() => openModal('topup')}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />

              <Text style={styles.mainButtonText} allowFontScaling={false}>
                Пополнить цель
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {renderTopUpModal()}
      {renderDescriptionModal()}
      {renderSettingsModal()}
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

  loadingWrapper: {
    flex: 1,
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

  headerRightButton: {
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
    borderRadius: 28,
    backgroundColor: '#202020',
    padding: 22,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  heroTitle: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#CFCFCF',
  },

  heroSpace: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#C9B2FF',
  },

  progressCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  progressAmount: {
    marginTop: 5,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  percentCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  percentText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: MAIN_COLOR,
  },

  progressTrack: {
    width: '100%',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E9E9E9',
    overflow: 'hidden',
    justifyContent: 'center',
    marginTop: 16,
  },

  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: MAIN_COLOR,
  },

  progressFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressFooterText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  finishGoalButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 21,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  finishGoalButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  completedBadge: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  completedBadgeText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  infoCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  cardHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  cardTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  cardCounter: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  smallIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  descriptionText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 22,
    color: '#525252',
  },

  memberRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },

  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  memberAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  memberTextBlock: {
    flex: 1,
  },

  memberName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  memberSubtitle: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  contributionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contributionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  contributionAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  contributionTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  contributionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  contributionSubtitle: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  contributionAmount: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  buttonWrapper: {
    position: 'absolute',
    bottom: 24,
  },

  mainButton: {
    height: 56,
    borderRadius: 22,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MAIN_COLOR,
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

  smallBottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },

  bottomSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
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
    marginBottom: 10,
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

  modalContent: {
    paddingBottom: 10,
  },

  inputLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 8,
  },

  textInput: {
    height: 54,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },

  descriptionInput: {
    minHeight: 116,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },

  scopeTabs: {
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    padding: 3,
    marginBottom: 18,
  },

  scopeTab: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scopeTabActive: {
    backgroundColor: MAIN_COLOR,
  },

  scopeTabText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  scopeTabTextActive: {
    color: '#FFFFFF',
  },

  membersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },

  memberChip: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 13,
  },

  memberChipActive: {
    borderWidth: 1.5,
    borderColor: MAIN_COLOR,
    backgroundColor: '#F3ECFF',
  },

  memberChipAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  memberChipAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  memberChipName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  emptyMembersText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 21,
    color: '#858585',
    marginBottom: 18,
  },

  submitButton: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});