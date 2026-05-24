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
  getFinanceGoals,
  getFinanceSpaceMembers,
  createFinanceGoal,
  completeFinanceGoal,
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
});

export default function FinanceGoalsScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const financeSpaceId = route?.params?.financeSpaceId;
  const financeSpaceTitle = route?.params?.financeSpaceTitle || 'Финансовая ячейка';

  const [isLoading, setIsLoading] = useState(true);
  const [activeGoals, setActiveGoals] = useState([]);
  const [completedGoals, setCompletedGoals] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);

  const [isAddGoalModalVisible, setIsAddGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalScope, setNewGoalScope] = useState('personal');
  const [newGoalMemberIds, setNewGoalMemberIds] = useState([]);

  const personalGoals = useMemo(() => {
    return activeGoals.filter((goal) => goal.scope === 'personal');
  }, [activeGoals]);

  const familyGoals = useMemo(() => {
    return activeGoals.filter((goal) => goal.scope === 'family');
  }, [activeGoals]);

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

  const formatCurrency = (value) => {
    return `${formatNumber(value)} ₽`;
  };

  const getGoalPercent = (goal) => {
    if (!goal.targetAmount) {
      return 0;
    }

    const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    return Math.min(percent, 100);
  };

  const getMemberNames = (members) => {
    if (!members || members.length === 0) {
      return 'Без участников';
    }

    return members.map((member) => member.name).join(', ');
  };

  const formatCompletedDate = (value) => {
    if (!value) {
      return 'Сегодня';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Сегодня';
    }

    return date.toLocaleDateString('ru-RU');
  };

  const loadGoals = useCallback(async () => {
    if (!financeSpaceId) {
      Alert.alert('Цели', 'Не передан идентификатор финансовой ячейки');
      navigation.goBack();
      return;
    }

    setIsLoading(true);

    try {
      const [activeGoalsData, completedGoalsData, membersData] =
        await Promise.all([
          getFinanceGoals(financeSpaceId, 'active'),
          getFinanceGoals(financeSpaceId, 'completed'),
          getFinanceSpaceMembers(financeSpaceId),
        ]);

      setActiveGoals((activeGoalsData || []).map(normalizeGoal));
      setCompletedGoals((completedGoalsData || []).map(normalizeGoal));
      setSpaceMembers((membersData || []).map(normalizeMember));
    } catch (error) {
      Alert.alert('Цели', getErrorMessage(error, 'Не удалось загрузить цели'));
    } finally {
      setIsLoading(false);
    }
  }, [financeSpaceId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const openGoalDetail = (goal) => {
    navigation.navigate('FinanceGoalDetail', {
      goalId: goal.id,
      financeSpaceId,
      financeSpaceTitle,
      goal,
    });
  };

  const openAddGoalModal = () => {
    const selectedMembers = spaceMembers
      .filter((member) => member.isSelected)
      .map((member) => member.id);

    setNewGoalTitle('');
    setNewGoalAmount('');
    setNewGoalDescription('');
    setNewGoalScope('personal');
    setNewGoalMemberIds(selectedMembers);
    setIsAddGoalModalVisible(true);
  };

  const closeAddGoalModal = () => {
    setIsAddGoalModalVisible(false);
  };

  const changeNewGoalScope = (scope) => {
    setNewGoalScope(scope);

    if (scope === 'personal') {
      setNewGoalMemberIds([]);
      return;
    }

    const selectedMembers = spaceMembers
      .filter((member) => member.isSelected)
      .map((member) => member.id);

    setNewGoalMemberIds(selectedMembers);
  };

  const toggleNewGoalMember = (memberId) => {
    setNewGoalMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const submitNewGoal = async () => {
    const title = newGoalTitle.trim();
    const targetAmount = Number(newGoalAmount.replace(/\s/g, '').replace(',', '.'));

    if (!title) {
      Alert.alert('Новая цель', 'Введите название цели');
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      Alert.alert('Новая цель', 'Введите корректную сумму');
      return;
    }

    if (newGoalScope === 'family' && newGoalMemberIds.length === 0) {
      Alert.alert('Новая цель', 'Выберите участников цели');
      return;
    }

    try {
      await createFinanceGoal({
        spaceId: financeSpaceId,
        title,
        description: newGoalDescription.trim(),
        scope: newGoalScope,
        targetAmount,
        memberIds: newGoalScope === 'family' ? newGoalMemberIds : [],
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      closeAddGoalModal();
      await loadGoals();
    } catch (error) {
      Alert.alert('Новая цель', getErrorMessage(error, 'Не удалось добавить цель'));
    }
  };

  const finishGoal = async (goal) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await completeFinanceGoal(financeSpaceId, goal.id);
      await loadGoals();
    } catch (error) {
      Alert.alert('Цель', getErrorMessage(error, 'Не удалось перенести цель в выполненные'));
    }
  };

  const renderGoalProgress = (goal, isCompleted = false) => {
    const percent = isCompleted ? 100 : getGoalPercent(goal);

    return (
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
            },
          ]}
        />

        <Text style={styles.progressText} allowFontScaling={false}>
          {formatNumber(goal.currentAmount)}/{formatNumber(goal.targetAmount)}
        </Text>
      </View>
    );
  };

  const renderGoalCard = (goal) => {
    const percent = getGoalPercent(goal);
    const isReadyToComplete = percent >= 100 || goal.isReadyToComplete;

    return (
      <TouchableOpacity
        key={goal.id}
        style={styles.goalCard}
        activeOpacity={0.78}
        onPress={() => openGoalDetail(goal)}
      >
        <View style={styles.goalTopRow}>
          <View style={styles.goalLeft}>
            <View style={styles.goalIcon}>
              <Ionicons
                name={isReadyToComplete ? 'checkmark-outline' : 'flag-outline'}
                size={21}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.goalTextBlock}>
              <Text
                style={styles.goalTitle}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {goal.title}
              </Text>

              <Text
                style={[
                  styles.goalMeta,
                  isReadyToComplete && styles.goalMetaCompleted,
                ]}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {isReadyToComplete
                  ? 'Цель выполнена!'
                  : `${goal.scopeTitle} · ${getMemberNames(goal.members)}`}
              </Text>
            </View>
          </View>

          {isReadyToComplete ? (
            <TouchableOpacity
              style={styles.completeButton}
              activeOpacity={0.8}
              onPress={(event) => {
                event?.stopPropagation?.();
                finishGoal(goal);
              }}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={21} color="#B8B8B8" />
          )}
        </View>

        {isReadyToComplete && (
          <View style={styles.completedReadyBadge}>
            <Ionicons name="sparkles-outline" size={16} color={MAIN_COLOR} />

            <Text style={styles.completedReadyText} allowFontScaling={false}>
              Нажмите на галочку, чтобы перенести цель в выполненные.
            </Text>
          </View>
        )}

        {renderGoalProgress(goal)}
      </TouchableOpacity>
    );
  };

  const renderCompletedGoalCard = (goal) => (
    <TouchableOpacity
      key={goal.id}
      style={styles.completedGoalCard}
      activeOpacity={0.78}
      onPress={() => openGoalDetail(goal)}
    >
      <View style={styles.goalTopRow}>
        <View style={styles.goalLeft}>
          <View style={styles.completedGoalIcon}>
            <Ionicons name="checkmark-outline" size={21} color="#FFFFFF" />
          </View>

          <View style={styles.goalTextBlock}>
            <Text
              style={styles.goalTitle}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {goal.title}
            </Text>

            <Text
              style={styles.goalMeta}
              allowFontScaling={false}
              numberOfLines={1}
            >
              Выполнено · {formatCompletedDate(goal.completedAt)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={21} color="#B8B8B8" />
      </View>

      <View style={styles.completedTextRow}>
        <Ionicons name="sparkles-outline" size={16} color={MAIN_COLOR} />

        <Text style={styles.completedGoalText} allowFontScaling={false}>
          Цель выполнена
        </Text>
      </View>

      {renderGoalProgress(goal, true)}
    </TouchableOpacity>
  );

  const renderGoalSection = (title, sectionGoals) => {
    if (sectionGoals.length === 0) {
      return null;
    }

    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>
            {title}
          </Text>

          <Text style={styles.sectionCount} allowFontScaling={false}>
            {sectionGoals.length}
          </Text>
        </View>

        {sectionGoals.map(renderGoalCard)}
      </View>
    );
  };

  const renderScopeTabs = () => (
    <View style={styles.scopeTabs}>
      <TouchableOpacity
        style={[
          styles.scopeTab,
          newGoalScope === 'personal' && styles.scopeTabActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeNewGoalScope('personal')}
      >
        <Text
          style={[
            styles.scopeTabText,
            newGoalScope === 'personal' && styles.scopeTabTextActive,
          ]}
          allowFontScaling={false}
        >
          Личная
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.scopeTab,
          newGoalScope === 'family' && styles.scopeTabActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeNewGoalScope('family')}
      >
        <Text
          style={[
            styles.scopeTabText,
            newGoalScope === 'family' && styles.scopeTabTextActive,
          ]}
          allowFontScaling={false}
        >
          Общая
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMembersPicker = () => {
    if (newGoalScope !== 'family') {
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
              const isSelected = newGoalMemberIds.includes(member.id);

              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberChip,
                    isSelected && styles.memberChipActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => toggleNewGoalMember(member.id)}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText} allowFontScaling={false}>
                      {member.initials}
                    </Text>
                  </View>

                  <Text style={styles.memberName} allowFontScaling={false}>
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

  const renderAddGoalModal = () => (
    <Modal
      visible={isAddGoalModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeAddGoalModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={closeAddGoalModal}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Новая цель
              </Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.75}
                onPress={closeAddGoalModal}
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
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
                placeholder="Название цели"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Сумма цели
              </Text>

              <TextInput
                style={styles.textInput}
                value={newGoalAmount}
                onChangeText={setNewGoalAmount}
                keyboardType="numeric"
                placeholder="Сумма"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Описание
              </Text>

              <TextInput
                style={styles.descriptionInput}
                value={newGoalDescription}
                onChangeText={setNewGoalDescription}
                multiline
                textAlignVertical="top"
                placeholder="Краткое описание цели"
                placeholderTextColor="#A1A1A1"
              />

              {renderMembersPicker()}

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.85}
                onPress={submitNewGoal}
              >
                <Ionicons name="add" size={21} color="#FFFFFF" />

                <Text style={styles.submitButtonText} allowFontScaling={false}>
                  Добавить цель
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загружаем цели...
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
            Цели
          </Text>

          <TouchableOpacity
            style={styles.headerRightButton}
            activeOpacity={0.75}
            onPress={openAddGoalModal}
          >
            <Ionicons name="add" size={23} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="flag-outline" size={25} color="#FFFFFF" />
            </View>

            <View style={styles.introTextBlock}>
              <Text style={styles.introTitle} allowFontScaling={false}>
                Цели ячейки
              </Text>

              <Text style={styles.introSubtitle} allowFontScaling={false}>
                {financeSpaceTitle}
              </Text>
            </View>
          </View>

          {activeGoals.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="flag-outline" size={27} color={MAIN_COLOR} />
              </View>

              <Text style={styles.emptyTitle} allowFontScaling={false}>
                Активных целей пока нет
              </Text>

              <Text style={styles.emptyText} allowFontScaling={false}>
                Добавьте цель, чтобы отслеживать накопления и прогресс.
              </Text>

              <TouchableOpacity
                style={styles.emptyAddButton}
                activeOpacity={0.85}
                onPress={openAddGoalModal}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />

                <Text style={styles.emptyAddButtonText} allowFontScaling={false}>
                  Добавить цель
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {renderGoalSection('Личные цели', personalGoals)}
              {renderGoalSection('Общие цели семьи', familyGoals)}

              <TouchableOpacity
                style={styles.mainAddButton}
                activeOpacity={0.85}
                onPress={openAddGoalModal}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />

                <Text style={styles.mainAddButtonText} allowFontScaling={false}>
                  Добавить цель
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.completedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>
                Выполненные цели
              </Text>

              <Text style={styles.sectionCount} allowFontScaling={false}>
                {completedGoals.length}
              </Text>
            </View>

            {completedGoals.length === 0 ? (
              <View style={styles.emptyCompletedCard}>
                <Text style={styles.emptyCompletedText} allowFontScaling={false}>
                  Здесь будут цели, которые уже достигли 100%.
                </Text>
              </View>
            ) : (
              completedGoals.map(renderCompletedGoalCard)
            )}
          </View>
        </ScrollView>
      </View>

      {renderAddGoalModal()}
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
    paddingBottom: 120,
  },

  introCard: {
    minHeight: 86,
    borderRadius: 26,
    backgroundColor: '#202020',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginTop: 10,
    marginBottom: 18,
  },

  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  introTextBlock: {
    flex: 1,
  },

  introTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  introSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#CFCFCF',
  },

  sectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  sectionCount: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  goalCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  completedGoalCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3ECFF',
  },

  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  goalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  completedGoalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  goalTextBlock: {
    flex: 1,
  },

  goalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  goalMeta: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  goalMetaCompleted: {
    color: MAIN_COLOR,
    fontFamily: fontFamily.medium,
  },

  completeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  completedReadyBadge: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  completedReadyText: {
    flex: 1,
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: MAIN_COLOR,
  },

  progressTrack: {
    width: '100%',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E9E9E9',
    overflow: 'hidden',
    justifyContent: 'center',
    marginTop: 14,
  },

  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: MAIN_COLOR,
  },

  progressText: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  completedTextRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  completedGoalText: {
    marginLeft: 6,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  mainAddButton: {
    height: 56,
    borderRadius: 22,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 22,
  },

  mainAddButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  completedSection: {
    marginTop: 4,
  },

  emptyCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    padding: 22,
    marginBottom: 22,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  emptyText: {
    marginTop: 5,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: '#858585',
  },

  emptyAddButton: {
    marginTop: 18,
    height: 46,
    borderRadius: 19,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  emptyAddButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  emptyCompletedCard: {
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    padding: 18,
  },

  emptyCompletedText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
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
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
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

  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  memberAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  memberName: {
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