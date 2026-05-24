import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getFinanceFamilyMembers,
  getFinanceSpaces,
  createFinanceSpace,
  getFinanceRecords,
  getFinanceCategories,
  getFinanceGoals,
  getFinanceStatistics,
  createFinanceRecord,
  createFinanceCategory,
  createFinanceGoal,
  completeFinanceGoal,
  getFinanceSpaceMembers,
  updateFinanceSpaceMembers,
} from '../../api/finance';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAIN_COLOR = '#9456FE';

const DEFAULT_STATS = {
  totalIncome: 0,
  totalExpense: 0,
  netAmount: 0,
  incomeOperationsCount: 0,
  expenseOperationsCount: 0,
  expenseLoadPercent: 0,
  savingPercent: 0,
  averageIncome: 0,
  averageExpense: 0,
  incomeCategoryStats: [],
  expenseCategoryStats: [],
  actorStats: [],
  periodStats: [
    { label: '1 нед', income: 0, expense: 0 },
    { label: '2 нед', income: 0, expense: 0 },
    { label: '3 нед', income: 0, expense: 0 },
    { label: '4 нед', income: 0, expense: 0 },
  ],
  periodMaxValue: 1,
  goalsCurrentAmount: 0,
  goalsTargetAmount: 0,
  goalsProgressPercent: 0,
  largestExpense: null,
};

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
  color: member.is_current_user ? '#F3ECFF' : '#EDE3FF',
});

const normalizeSpace = (space) => ({
  id: space.id,
  title: space.title,
  type: space.type,
  typeTitle: space.type_display || 'Финансовая ячейка',
  subtitle: space.access_text || space.type_display || 'Финансовая ячейка',
  color: MAIN_COLOR,
  balance: toNumber(space.balance),
  income: toNumber(space.income),
  expense: toNumber(space.expense),
  members: (space.members || []).map(normalizeMember),
  membersCount: space.members_count || 0,
  accessText: space.access_text || '',
  goalsCount: space.goals_count || 0,
  completedGoalsCount: space.completed_goals_count || 0,
});

const normalizeCategory = (category) => ({
  id: category.id,
  title: category.title,
  type: category.type,
  isDefault: Boolean(category.is_default),
});

const normalizeRecord = (record) => ({
  id: record.id,
  title: record.title || record.category_title || 'Операция',
  subtitle: record.subtitle || record.created_by_name || '',
  amount: toNumber(record.amount),
  type: record.type,
  category: record.category,
  categoryTitle: record.category_title || 'Без категории',
  actorName: record.created_by_name || 'Участник',
  actorInitials: record.actor_initials || 'У',
  actorAvatarUrl: record.actor_avatar_url || null,
  actorColor: '#F3ECFF',
});

const normalizeGoal = (goal) => ({
  id: goal.id,
  title: goal.title,
  description: goal.description || '',
  scope: goal.scope,
  scopeTitle: goal.scope_display || (goal.scope === 'family' ? 'Общая цель' : 'Личная цель'),
  currentAmount: toNumber(goal.current_amount),
  targetAmount: toNumber(goal.target_amount),
  progressPercent: toNumber(goal.progress_percent),
  isReadyToComplete: Boolean(goal.is_ready_to_complete),
  status: goal.status,
  completedAt: goal.completed_at,
  members: (goal.members || []).map(normalizeMember),
  color: MAIN_COLOR,
});

const normalizeStats = (data) => {
  const periodStats = (data?.period_stats || DEFAULT_STATS.periodStats).map((item) => ({
    label: item.label,
    income: toNumber(item.income),
    expense: toNumber(item.expense),
  }));

  const periodMaxValue = Math.max(
    ...periodStats.map((item) => Math.max(item.income, item.expense)),
    1
  );

  return {
    totalIncome: toNumber(data?.total_income),
    totalExpense: toNumber(data?.total_expense),
    netAmount: toNumber(data?.net_amount),
    incomeOperationsCount: data?.income_operations_count || 0,
    expenseOperationsCount: data?.expense_operations_count || 0,
    expenseLoadPercent: data?.expense_load_percent || 0,
    savingPercent: data?.saving_percent || 0,
    averageIncome: toNumber(data?.average_income),
    averageExpense: toNumber(data?.average_expense),
    incomeCategoryStats: (data?.income_category_stats || []).map((item) => ({
      title: item.title,
      amount: toNumber(item.amount),
      percent: item.percent || 0,
    })),
    expenseCategoryStats: (data?.expense_category_stats || []).map((item) => ({
      title: item.title,
      amount: toNumber(item.amount),
      percent: item.percent || 0,
    })),
    actorStats: (data?.actor_stats || []).map((item) => ({
      id: item.id,
      name: item.name,
      initials: item.initials,
      income: toNumber(item.income),
      expense: toNumber(item.expense),
      color: '#F3ECFF',
    })),
    periodStats,
    periodMaxValue,
    goalsCurrentAmount: toNumber(data?.goals_current_amount),
    goalsTargetAmount: toNumber(data?.goals_target_amount),
    goalsProgressPercent: data?.goals_progress_percent || 0,
    largestExpense: data?.largest_expense ? normalizeRecord(data.largest_expense) : null,
  };
};

export default function FinanceScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [isLoading, setIsLoading] = useState(true);
  const [financeSpaces, setFinanceSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  const [operations, setOperations] = useState([]);
  const [goals, setGoals] = useState([]);
  const [completedGoals, setCompletedGoals] = useState([]);
  const [operationCategories, setOperationCategories] = useState({
    income: [],
    expense: [],
  });
  const [stats, setStats] = useState(DEFAULT_STATS);

  const [familyMembers, setFamilyMembers] = useState([]);
  const [spaceMemberOptions, setSpaceMemberOptions] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);

  const [isOperationModalVisible, setIsOperationModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isAddGoalModalVisible, setIsAddGoalModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const [operationType, setOperationType] = useState('income');
  const [operationTitle, setOperationTitle] = useState('');
  const [operationAmount, setOperationAmount] = useState('');
  const [operationCategory, setOperationCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalScope, setNewGoalScope] = useState('personal');
  const [newGoalMemberIds, setNewGoalMemberIds] = useState([]);

  const [draftSpaceMemberIds, setDraftSpaceMemberIds] = useState([]);

  const selectedSpace = useMemo(() => {
    return financeSpaces.find((space) => space.id === selectedSpaceId) || null;
  }, [financeSpaces, selectedSpaceId]);

  const visibleGoals = isGoalsExpanded ? goals : goals.slice(0, 1);
  const hiddenGoalsCount = Math.max(goals.length - visibleGoals.length, 0);

  const personalGoals = goals.filter((goal) => goal.scope === 'personal');
  const familyGoals = goals.filter((goal) => goal.scope === 'family');

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

  const loadSelectedSpaceData = useCallback(async (spaceId) => {
    if (!spaceId) {
      return;
    }

    try {
      const [
        recordsData,
        categoriesData,
        activeGoalsData,
        completedGoalsData,
        statisticsData,
      ] = await Promise.all([
        getFinanceRecords(spaceId),
        getFinanceCategories(spaceId),
        getFinanceGoals(spaceId, 'active'),
        getFinanceGoals(spaceId, 'completed'),
        getFinanceStatistics(spaceId),
      ]);

      const categories = (categoriesData || []).map(normalizeCategory);

      setOperations((recordsData || []).map(normalizeRecord));
      setGoals((activeGoalsData || []).map(normalizeGoal));
      setCompletedGoals((completedGoalsData || []).map(normalizeGoal));
      setStats(normalizeStats(statisticsData));
      setOperationCategories({
        income: categories.filter((category) => category.type === 'income'),
        expense: categories.filter((category) => category.type === 'expense'),
      });
    } catch (error) {
      Alert.alert('Финансы', getErrorMessage(error, 'Не удалось загрузить данные ячейки'));
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [spacesData, membersData] = await Promise.all([
        getFinanceSpaces(),
        getFinanceFamilyMembers(),
      ]);

      const normalizedSpaces = (spacesData || []).map(normalizeSpace);
      const normalizedMembers = (membersData || []).map(normalizeMember);

      setFinanceSpaces(normalizedSpaces);
      setFamilyMembers(normalizedMembers);

      if (normalizedSpaces.length === 0) {
        setSelectedSpaceId(null);
        setOperations([]);
        setGoals([]);
        setCompletedGoals([]);
        setStats(DEFAULT_STATS);
        return;
      }

      const currentSpaceExists = normalizedSpaces.some(
        (space) => space.id === selectedSpaceId
      );

      const nextSpaceId = currentSpaceExists
        ? selectedSpaceId
        : normalizedSpaces[0].id;

      setSelectedSpaceId(nextSpaceId);
      await loadSelectedSpaceData(nextSpaceId);
    } catch (error) {
      Alert.alert('Финансы', getErrorMessage(error, 'Не удалось загрузить финансы'));
    } finally {
      setIsLoading(false);
    }
  }, [loadSelectedSpaceData, selectedSpaceId]);

  const reloadSpaces = async () => {
    const spacesData = await getFinanceSpaces();
    const normalizedSpaces = (spacesData || []).map(normalizeSpace);
    setFinanceSpaces(normalizedSpaces);
    return normalizedSpaces;
  };

  const reloadCurrentSpace = async () => {
    if (!selectedSpaceId) {
      return;
    }

    await Promise.all([
      reloadSpaces(),
      loadSelectedSpaceData(selectedSpaceId),
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  const createDefaultSpace = async () => {
    try {
      setIsLoading(true);

      const currentMemberIds = familyMembers
        .filter((member) => member.isCurrentUser)
        .map((member) => member.id);

      const createdSpace = await createFinanceSpace({
        title: 'Наш бюджет',
        type: 'joint',
        memberIds: currentMemberIds,
      });

      const normalizedSpace = normalizeSpace(createdSpace);

      await loadInitialData();
      setSelectedSpaceId(normalizedSpace.id);
      await loadSelectedSpaceData(normalizedSpace.id);
    } catch (error) {
      Alert.alert('Финансы', getErrorMessage(error, 'Не удалось создать ячейку'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectSpace = async (space) => {
    setSelectedSpaceId(space.id);
    setIsSelectorVisible(false);
    setIsGoalsExpanded(false);
    await loadSelectedSpaceData(space.id);
  };

  const openGoalDetail = (goal) => {
    navigation.navigate('FinanceGoalDetail', {
      goalId: goal.id,
      financeSpaceId: selectedSpace.id,
      financeSpaceTitle: selectedSpace.title,
      goal,
    });
  };

  const openGoalsScreen = () => {
    navigation.navigate('FinanceGoals', {
      financeSpaceId: selectedSpace.id,
      financeSpaceTitle: selectedSpace.title,
    });
  };

  const completeGoal = async (goal) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await completeFinanceGoal(selectedSpace.id, goal.id);
      await reloadCurrentSpace();
    } catch (error) {
      Alert.alert('Цель', getErrorMessage(error, 'Не удалось завершить цель'));
    }
  };

  const toggleGoals = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsGoalsExpanded((prev) => !prev);
  };

  const changeOperationType = (type) => {
    const categories = operationCategories[type] || [];

    setOperationType(type);
    setOperationCategory(categories[0] || null);
  };

  const openOperationModal = () => {
    const categories = operationCategories.income || [];

    setOperationType('income');
    setOperationTitle('');
    setOperationAmount('');
    setOperationCategory(categories[0] || null);
    setIsOperationModalVisible(true);
  };

  const closeOperationModal = () => {
    setIsOperationModalVisible(false);
  };

  const openCategoryModal = () => {
    setNewCategoryName('');
    setIsCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalVisible(false);
  };

  const submitNewCategory = async () => {
    if (!selectedSpace) {
      return;
    }

    const trimmedCategory = newCategoryName.trim();

    if (!trimmedCategory) {
      Alert.alert('Категория', 'Введите название категории');
      return;
    }

    try {
      const createdCategory = await createFinanceCategory({
        spaceId: selectedSpace.id,
        title: trimmedCategory,
        type: operationType,
      });

      const normalizedCategory = normalizeCategory(createdCategory);

      setOperationCategories((prev) => ({
        ...prev,
        [operationType]: [...prev[operationType], normalizedCategory],
      }));

      setOperationCategory(normalizedCategory);

      if (!operationTitle.trim()) {
        setOperationTitle(normalizedCategory.title);
      }

      setNewCategoryName('');
      closeCategoryModal();
    } catch (error) {
      Alert.alert('Категория', getErrorMessage(error, 'Не удалось добавить категорию'));
    }
  };

  const submitOperation = async () => {
    if (!selectedSpace) {
      return;
    }

    const normalizedAmount = operationAmount.replace(/\s/g, '').replace(',', '.');
    const amount = Number(normalizedAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Операция', 'Введите корректную сумму');
      return;
    }

    const title = operationTitle.trim() || operationCategory?.title || 'Операция';

    try {
      await createFinanceRecord({
        spaceId: selectedSpace.id,
        type: operationType,
        amount,
        title,
        category: operationCategory?.id,
        categoryTitle: operationCategory?.title,
      });

      closeOperationModal();
      await reloadCurrentSpace();
    } catch (error) {
      Alert.alert('Операция', getErrorMessage(error, 'Не удалось добавить операцию'));
    }
  };

  const openAddGoalModal = () => {
    const defaultMembers = selectedSpace?.members?.map((member) => member.id) || [];

    setNewGoalTitle('');
    setNewGoalAmount('');
    setNewGoalDescription('');
    setNewGoalScope('personal');
    setNewGoalMemberIds(defaultMembers);
    setIsAddGoalModalVisible(true);
  };

  const closeAddGoalModal = () => {
    setIsAddGoalModalVisible(false);
  };

  const changeNewGoalScope = (scope) => {
    setNewGoalScope(scope);

    if (scope === 'family') {
      setNewGoalMemberIds(selectedSpace?.members?.map((member) => member.id) || []);
    } else {
      setNewGoalMemberIds([]);
    }
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
    if (!selectedSpace) {
      return;
    }

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
        spaceId: selectedSpace.id,
        title,
        description: newGoalDescription.trim(),
        scope: newGoalScope,
        targetAmount,
        memberIds: newGoalScope === 'family' ? newGoalMemberIds : [],
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsGoalsExpanded(true);
      closeAddGoalModal();
      await reloadCurrentSpace();
    } catch (error) {
      Alert.alert('Новая цель', getErrorMessage(error, 'Не удалось добавить цель'));
    }
  };

  const openSettingsModal = async () => {
    if (!selectedSpace) {
      return;
    }

    try {
      const membersData = await getFinanceSpaceMembers(selectedSpace.id);
      const normalizedMembers = (membersData || []).map(normalizeMember);

      setSpaceMemberOptions(normalizedMembers);
      setDraftSpaceMemberIds(
        normalizedMembers
          .filter((member) => member.isSelected)
          .map((member) => member.id)
      );
      setIsSettingsModalVisible(true);
    } catch (error) {
      Alert.alert('Настройки', getErrorMessage(error, 'Не удалось загрузить участников'));
    }
  };

  const closeSettingsModal = () => {
    setIsSettingsModalVisible(false);
  };

  const toggleDraftSpaceMember = (memberId) => {
    setDraftSpaceMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const saveSpaceMembers = async () => {
    if (!selectedSpace) {
      return;
    }

    if (draftSpaceMemberIds.length === 0) {
      Alert.alert('Настройки ячейки', 'Нужно выбрать хотя бы одного участника');
      return;
    }

    try {
      await updateFinanceSpaceMembers(selectedSpace.id, draftSpaceMemberIds);
      closeSettingsModal();
      await reloadCurrentSpace();
    } catch (error) {
      Alert.alert('Настройки', getErrorMessage(error, 'Не удалось сохранить доступ'));
    }
  };

  const renderSegmentedTabs = () => (
    <View style={styles.segmentedWrapper}>
      <TouchableOpacity
        style={[
          styles.segmentedButton,
          activeTab === 'overview' && styles.segmentedButtonActive,
        ]}
        activeOpacity={0.85}
        onPress={() => setActiveTab('overview')}
      >
        <Text
          style={[
            styles.segmentedText,
            activeTab === 'overview' && styles.segmentedTextActive,
          ]}
          allowFontScaling={false}
        >
          Обзор
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.segmentedButton,
          activeTab === 'stats' && styles.segmentedButtonActive,
        ]}
        activeOpacity={0.85}
        onPress={() => setActiveTab('stats')}
      >
        <Text
          style={[
            styles.segmentedText,
            activeTab === 'stats' && styles.segmentedTextActive,
          ]}
          allowFontScaling={false}
        >
          Статистика
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyScreen}>
      <View style={styles.emptyScreenIcon}>
        <Ionicons name="wallet-outline" size={34} color="#FFFFFF" />
      </View>

      <Text style={styles.emptyScreenTitle} allowFontScaling={false}>
        Финансовых ячеек пока нет
      </Text>

      <Text style={styles.emptyScreenText} allowFontScaling={false}>
        Создайте первую ячейку, чтобы добавлять доходы, расходы, цели и участников.
      </Text>

      <TouchableOpacity
        style={styles.purpleButton}
        activeOpacity={0.85}
        onPress={createDefaultSpace}
      >
        <Ionicons name="add" size={21} color="#FFFFFF" />

        <Text style={styles.submitOperationText} allowFontScaling={false}>
          Создать ячейку
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFinanceSelector = () => (
    <TouchableOpacity
      style={styles.selectorButton}
      activeOpacity={0.75}
      onPress={() => setIsSelectorVisible(true)}
    >
      <Text
        style={styles.selectorText}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {selectedSpace.title}
      </Text>

      <View style={styles.selectorColorMark} />

      <Ionicons name="chevron-down" size={16} color="#858585" />
    </TouchableOpacity>
  );

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

  const renderSummaryCards = () => (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel} allowFontScaling={false}>
          Доходы
        </Text>

        <Text
          style={styles.summaryValue}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {formatCurrency(selectedSpace.income)}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel} allowFontScaling={false}>
          Расходы
        </Text>

        <Text
          style={styles.summaryValue}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {formatCurrency(selectedSpace.expense)}
        </Text>
      </View>
    </View>
  );

  const renderBudgetHeader = () => (
    <View style={styles.budgetHeader}>
      {renderBackgroundGrid()}

      <View style={styles.budgetHeaderContent}>
        {renderFinanceSelector()}

        <Text
          style={styles.balanceValue}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {formatCurrency(selectedSpace.balance, 2)}
        </Text>

        {renderSummaryCards()}
      </View>
    </View>
  );

  const renderGoalItem = (goal, index) => {
    const percent = getGoalPercent(goal);
    const isReadyToComplete = percent >= 100 || goal.isReadyToComplete;

    return (
      <TouchableOpacity
        key={goal.id}
        activeOpacity={0.78}
        onPress={() => openGoalDetail(goal)}
      >
        {index !== 0 && <View style={styles.darkDivider} />}

        <View style={styles.goalHeader}>
          <View style={styles.goalLeft}>
            <View style={styles.goalIcon}>
              <Ionicons
                name={isReadyToComplete ? 'checkmark-outline' : 'flag-outline'}
                size={18}
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
              style={styles.goalCompleteButton}
              activeOpacity={0.8}
              onPress={(event) => {
                event?.stopPropagation?.();
                completeGoal(goal);
              }}
            >
              <Ionicons name="checkmark" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.goalEditButton}
              activeOpacity={0.75}
              onPress={(event) => {
                event?.stopPropagation?.();
                openGoalDetail(goal);
              }}
            >
              <Ionicons name="create-outline" size={14} color="#A7A7A7" />
            </TouchableOpacity>
          )}
        </View>

        {isReadyToComplete && (
          <View style={styles.goalCompletedHint}>
            <Ionicons name="sparkles-outline" size={14} color={MAIN_COLOR} />

            <Text style={styles.goalCompletedHintText} allowFontScaling={false}>
              Нажмите на галочку, чтобы перенести цель в выполненные.
            </Text>
          </View>
        )}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percent}%`,
              },
            ]}
          />

          <Text
            style={styles.progressInsideText}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {formatNumber(goal.currentAmount)}/{formatNumber(goal.targetAmount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGoalSection = (title, sectionGoals) => {
    if (sectionGoals.length === 0) {
      return null;
    }

    return (
      <View>
        {isGoalsExpanded && (
          <Text style={styles.goalSectionTitle} allowFontScaling={false}>
            {title}
          </Text>
        )}

        {sectionGoals.map(renderGoalItem)}
      </View>
    );
  };

  const renderGoalsBlock = () => (
    <View style={styles.goalsCard}>
      <View style={styles.goalsTopRow}>
        <TouchableOpacity
          style={styles.goalsTitleRow}
          activeOpacity={0.75}
          onPress={openGoalsScreen}
        >
          <Text style={styles.goalsTitle} allowFontScaling={false}>
            Цели
          </Text>

          {hiddenGoalsCount > 0 && (
            <View style={styles.hiddenGoalsBadge}>
              <Text style={styles.hiddenGoalsText} allowFontScaling={false}>
                +{hiddenGoalsCount}
              </Text>
            </View>
          )}

          <Ionicons
            name="chevron-forward"
            size={18}
            color="#FFFFFF"
            style={styles.goalsTitleArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.75} onPress={toggleGoals}>
          <Ionicons
            name={isGoalsExpanded ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <Text style={styles.emptyGoalsText} allowFontScaling={false}>
          Целей пока нет
        </Text>
      ) : isGoalsExpanded ? (
        <>
          {renderGoalSection('Личные цели', personalGoals)}

          {personalGoals.length > 0 && familyGoals.length > 0 && (
            <View style={styles.goalScopeDivider} />
          )}

          {renderGoalSection('Общие цели семьи', familyGoals)}
        </>
      ) : (
        visibleGoals.map(renderGoalItem)
      )}

      <TouchableOpacity
        style={styles.addGoalButton}
        activeOpacity={0.8}
        onPress={openAddGoalModal}
      >
        <Ionicons name="add" size={19} color="#FFFFFF" />

        <Text style={styles.addGoalText} allowFontScaling={false}>
          Добавить цель
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOperations = () => (
    <View style={styles.operationsCard}>
      <View style={styles.operationsHeader}>
        <Text style={styles.operationsTitle} allowFontScaling={false}>
          История операций
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => Alert.alert('Операции', 'Позже сделаем отдельный список')}
        >
          <Text style={styles.operationsAll} allowFontScaling={false}>
            все
          </Text>
        </TouchableOpacity>
      </View>

      {operations.slice(0, 5).map((operation) => (
        <TouchableOpacity
          key={operation.id}
          style={styles.operationRow}
          activeOpacity={0.75}
        >
          <View style={styles.operationAvatar}>
            <Text style={styles.operationAvatarText} allowFontScaling={false}>
              {operation.actorInitials}
            </Text>
          </View>

          <View style={styles.operationTextBlock}>
            <Text
              style={styles.operationTitle}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {operation.title}
            </Text>

            <Text
              style={styles.operationSubtitle}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {operation.subtitle}
            </Text>
          </View>

          <Text
            style={[
              styles.operationAmount,
              operation.type === 'income'
                ? styles.operationAmountIncome
                : styles.operationAmountExpense,
            ]}
            allowFontScaling={false}
          >
            {operation.type === 'income' ? '+' : '-'}
            {formatCurrency(operation.amount)}
          </Text>
        </TouchableOpacity>
      ))}

      {operations.length === 0 && (
        <Text style={styles.emptyLightText} allowFontScaling={false}>
          Операций пока нет
        </Text>
      )}
    </View>
  );

  const renderOverview = () => (
    <>
      {renderBudgetHeader()}
      {renderGoalsBlock()}
      {renderOperations()}
    </>
  );

  const renderStatsMetricCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.statsMetricCard}>
      <View style={styles.statsMetricIcon}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.statsMetricTitle} allowFontScaling={false}>
        {title}
      </Text>

      <Text style={styles.statsMetricValue} allowFontScaling={false} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.statsMetricSubtitle} allowFontScaling={false} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );

  const renderInsightCard = () => {
    let title = 'Финансовая ситуация стабильная';
    let text =
      'По текущим операциям бюджет выглядит сбалансированным. Можно продолжать отслеживать расходы по категориям.';

    if (stats.totalIncome === 0 && stats.totalExpense === 0) {
      title = 'Пока нет данных';
      text =
        'Добавьте доходы и расходы, чтобы увидеть полноценную аналитику по этой финансовой ячейке.';
    } else if (stats.netAmount > 0) {
      title = 'Бюджет в плюсе';
      text = `Доходы превышают расходы на ${formatCurrency(stats.netAmount)}. Сейчас удаётся сохранить около ${stats.savingPercent}% доходов.`;
    } else if (stats.netAmount < 0) {
      title = 'Расходы выше доходов';
      text = `Расходы превысили доходы на ${formatCurrency(Math.abs(stats.netAmount))}. Стоит проверить самые крупные категории расходов.`;
    }

    return (
      <View style={styles.insightCard}>
        <View style={styles.insightTopRow}>
          <View style={styles.insightIcon}>
            <Ionicons name="sparkles-outline" size={22} color={MAIN_COLOR} />
          </View>

          <Text style={styles.insightTitle} allowFontScaling={false}>
            {title}
          </Text>
        </View>

        <Text style={styles.insightText} allowFontScaling={false}>
          {text}
        </Text>
      </View>
    );
  };

  const renderCashflowChart = () => {
    const chartHeight = 132;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderTextBlock}>
            <Text style={styles.chartTitle} allowFontScaling={false}>
              Динамика доходов и расходов
            </Text>

            <Text style={styles.chartSubtitle} allowFontScaling={false}>
              Сравнение по неделям текущего периода
            </Text>
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#20B846' }]} />
              <Text style={styles.legendText} allowFontScaling={false}>
                Доход
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText} allowFontScaling={false}>
                Расход
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartBody}>
          {stats.periodStats.map((period) => {
            const incomeHeight = period.income
              ? Math.max((period.income / stats.periodMaxValue) * chartHeight, 8)
              : 0;

            const expenseHeight = period.expense
              ? Math.max((period.expense / stats.periodMaxValue) * chartHeight, 8)
              : 0;

            return (
              <View key={period.label} style={styles.chartColumn}>
                <View style={styles.chartBars}>
                  <View
                    style={[
                      styles.chartBar,
                      styles.chartIncomeBar,
                      {
                        height: incomeHeight,
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.chartBar,
                      styles.chartExpenseBar,
                      {
                        height: expenseHeight,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.chartLabel} allowFontScaling={false}>
                  {period.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStatsProgress = ({ title, percent, leftText, rightText, color }) => (
    <View style={styles.statsProgressCard}>
      <View style={styles.statsProgressHeader}>
        <Text style={styles.statsProgressTitle} allowFontScaling={false}>
          {title}
        </Text>

        <Text style={styles.statsProgressPercent} allowFontScaling={false}>
          {percent}%
        </Text>
      </View>

      <View style={styles.statsProgressTrack}>
        <View
          style={[
            styles.statsProgressFill,
            {
              width: `${percent}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      <View style={styles.statsProgressFooter}>
        <Text style={styles.statsProgressFooterText} allowFontScaling={false}>
          {leftText}
        </Text>

        <Text style={styles.statsProgressFooterText} allowFontScaling={false}>
          {rightText}
        </Text>
      </View>
    </View>
  );

  const renderCategoryStats = ({ title, items, emptyText, color }) => (
    <View style={styles.statsBlockCard}>
      <Text style={styles.statsBlockTitle} allowFontScaling={false}>
        {title}
      </Text>

      {items.length === 0 ? (
        <Text style={styles.statsEmptyText} allowFontScaling={false}>
          {emptyText}
        </Text>
      ) : (
        items.map((category) => (
          <View key={category.title} style={styles.categoryStatsRow}>
            <View style={styles.categoryStatsTop}>
              <View style={styles.categoryNameBlock}>
                <Text style={styles.categoryStatsName} allowFontScaling={false}>
                  {category.title}
                </Text>

                <Text style={styles.categoryStatsPercent} allowFontScaling={false}>
                  {category.percent}% от суммы
                </Text>
              </View>

              <Text style={styles.categoryStatsAmount} allowFontScaling={false}>
                {formatCurrency(category.amount)}
              </Text>
            </View>

            <View style={styles.categoryStatsTrack}>
              <View
                style={[
                  styles.categoryStatsFill,
                  {
                    width: `${category.percent}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderActorStats = () => (
    <View style={styles.statsBlockCard}>
      <Text style={styles.statsBlockTitle} allowFontScaling={false}>
        Активность участников
      </Text>

      {stats.actorStats.length === 0 ? (
        <Text style={styles.statsEmptyText} allowFontScaling={false}>
          Операций пока нет
        </Text>
      ) : (
        stats.actorStats.map((actor) => (
          <View key={actor.id} style={styles.actorStatsRow}>
            <View style={styles.actorStatsAvatar}>
              <Text style={styles.actorStatsAvatarText} allowFontScaling={false}>
                {actor.initials}
              </Text>
            </View>

            <View style={styles.actorStatsTextBlock}>
              <Text style={styles.actorStatsName} allowFontScaling={false}>
                {actor.name}
              </Text>

              <Text style={styles.actorStatsSubtitle} allowFontScaling={false}>
                Доходы {formatCurrency(actor.income)} · Расходы {formatCurrency(actor.expense)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderStats = () => (
    <>
      <View style={styles.statsHeroCard}>
        <View style={styles.statsHeroTopRow}>
          <View style={styles.statsHeroTextBlock}>
            <Text style={styles.statsHeroLabel} allowFontScaling={false}>
              Финансовый результат
            </Text>

            <Text
              style={[
                styles.statsHeroValue,
                stats.netAmount < 0 && styles.statsHeroValueNegative,
              ]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {stats.netAmount >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(stats.netAmount))}
            </Text>

            <Text style={styles.statsHeroSubtitle} allowFontScaling={false}>
              {stats.netAmount >= 0
                ? `Сохранено ${stats.savingPercent}% доходов за период`
                : 'Расходы превысили доходы за период'}
            </Text>
          </View>

          <View style={styles.statsHeroIcon}>
            <Ionicons name="analytics-outline" size={25} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {renderInsightCard()}

      <View style={styles.statsMetricsGrid}>
        {renderStatsMetricCard({
          title: 'Доходы',
          value: formatCurrency(stats.totalIncome),
          subtitle: `${stats.incomeOperationsCount} операций`,
          icon: 'arrow-down-outline',
          color: '#20B846',
        })}

        {renderStatsMetricCard({
          title: 'Расходы',
          value: formatCurrency(stats.totalExpense),
          subtitle: `${stats.expenseOperationsCount} операций`,
          icon: 'arrow-up-outline',
          color: '#EF4444',
        })}
      </View>

      <View style={styles.statsMetricsGrid}>
        {renderStatsMetricCard({
          title: 'Средний доход',
          value: formatCurrency(stats.averageIncome),
          subtitle: 'на одну операцию',
          icon: 'trending-up-outline',
          color: '#20B846',
        })}

        {renderStatsMetricCard({
          title: 'Средний расход',
          value: formatCurrency(stats.averageExpense),
          subtitle: stats.largestExpense
            ? `макс. ${stats.largestExpense.title}`
            : 'на одну операцию',
          icon: 'trending-down-outline',
          color: '#EF4444',
        })}
      </View>

      {renderCashflowChart()}

      {renderStatsProgress({
        title: 'Нагрузка расходов',
        percent: stats.expenseLoadPercent,
        leftText: `Расходы ${formatCurrency(stats.totalExpense)}`,
        rightText: `Доходы ${formatCurrency(stats.totalIncome)}`,
        color: '#EF4444',
      })}

      {renderStatsProgress({
        title: 'Прогресс целей',
        percent: stats.goalsProgressPercent,
        leftText: `Собрано ${formatCurrency(stats.goalsCurrentAmount)}`,
        rightText: `Цель ${formatCurrency(stats.goalsTargetAmount)}`,
        color: MAIN_COLOR,
      })}

      {renderCategoryStats({
        title: 'Доходы по категориям',
        items: stats.incomeCategoryStats,
        emptyText: 'Доходов пока нет',
        color: '#20B846',
      })}

      {renderCategoryStats({
        title: 'Расходы по категориям',
        items: stats.expenseCategoryStats,
        emptyText: 'Расходов пока нет',
        color: '#EF4444',
      })}

      {renderActorStats()}
    </>
  );

  const renderSpacePickerItem = (space) => {
    const isActive = space.id === selectedSpace?.id;

    return (
      <TouchableOpacity
        key={space.id}
        style={styles.spacePickerItem}
        activeOpacity={0.75}
        onPress={() => selectSpace(space)}
      >
        <View style={styles.spacePickerColor} />

        <View style={styles.spacePickerTextBlock}>
          <Text
            style={[
              styles.spacePickerTitle,
              isActive && styles.spacePickerTitleActive,
            ]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {space.title}
          </Text>

          <Text
            style={styles.spacePickerSubtitle}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {space.typeTitle} · {space.subtitle}
          </Text>
        </View>

        <View style={styles.spacePickerArrow}>
          {isActive ? (
            <Ionicons name="checkmark" size={22} color={MAIN_COLOR} />
          ) : (
            <Ionicons name="arrow-forward-outline" size={22} color="#858585" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSpaceSelectorModal = () => (
    <Modal
      visible={isSelectorVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsSelectorVisible(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setIsSelectorVisible(false)}
      >
        <Pressable style={styles.modalCard}>
          <Text style={styles.modalTitle} allowFontScaling={false}>
            Все ячейки
          </Text>

          {financeSpaces.map(renderSpacePickerItem)}

          <TouchableOpacity
            style={styles.createSpaceButton}
            activeOpacity={0.85}
            onPress={createDefaultSpace}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />

            <Text
              style={styles.createSpaceButtonText}
              allowFontScaling={false}
            >
              Создать ячейку
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderOperationTypeTabs = () => (
    <View style={styles.operationTypeWrapper}>
      <TouchableOpacity
        style={[
          styles.operationTypeButton,
          operationType === 'income' && styles.operationTypeButtonActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeOperationType('income')}
      >
        <Text
          style={[
            styles.operationTypeText,
            operationType === 'income' && styles.operationTypeTextActive,
          ]}
          allowFontScaling={false}
        >
          Доход
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.operationTypeButton,
          operationType === 'expense' && styles.operationTypeButtonActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeOperationType('expense')}
      >
        <Text
          style={[
            styles.operationTypeText,
            operationType === 'expense' && styles.operationTypeTextActive,
          ]}
          allowFontScaling={false}
        >
          Расход
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategoryChips = () => (
    <View style={styles.chipsWrap}>
      {(operationCategories[operationType] || []).map((category) => {
        const isSelected = category.id === operationCategory?.id;

        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              isSelected && styles.categoryChipActive,
            ]}
            activeOpacity={0.75}
            onPress={() => {
              setOperationCategory(category);

              if (!operationTitle.trim()) {
                setOperationTitle(category.title);
              }
            }}
          >
            <Text
              style={[
                styles.categoryChipText,
                isSelected && styles.categoryChipTextActive,
              ]}
              allowFontScaling={false}
            >
              {category.title}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.addCategoryChip}
        activeOpacity={0.75}
        onPress={openCategoryModal}
      >
        <Ionicons name="add" size={17} color={MAIN_COLOR} />

        <Text style={styles.addCategoryChipText} allowFontScaling={false}>
          Добавить категорию
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoalScopeTabs = () => (
    <View style={styles.operationTypeWrapper}>
      <TouchableOpacity
        style={[
          styles.operationTypeButton,
          newGoalScope === 'personal' && styles.operationTypeButtonActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeNewGoalScope('personal')}
      >
        <Text
          style={[
            styles.operationTypeText,
            newGoalScope === 'personal' && styles.operationTypeTextActive,
          ]}
          allowFontScaling={false}
        >
          Личная
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.operationTypeButton,
          newGoalScope === 'family' && styles.operationTypeButtonActive,
        ]}
        activeOpacity={0.85}
        onPress={() => changeNewGoalScope('family')}
      >
        <Text
          style={[
            styles.operationTypeText,
            newGoalScope === 'family' && styles.operationTypeTextActive,
          ]}
          allowFontScaling={false}
        >
          Общая
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoalMembersPicker = () => {
    if (newGoalScope !== 'family') {
      return null;
    }

    return (
      <>
        <Text style={styles.inputLabel} allowFontScaling={false}>
          Участники цели
        </Text>

        <View style={styles.membersWrap}>
          {(selectedSpace?.members || []).map((member) => {
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
      </>
    );
  };

  const renderSpaceMembersPicker = () => (
    <View style={styles.membersList}>
      {spaceMemberOptions.map((member) => {
        const isSelected = draftSpaceMemberIds.includes(member.id);

        return (
          <TouchableOpacity
            key={member.id}
            style={styles.spaceMemberRow}
            activeOpacity={0.75}
            onPress={() => toggleDraftSpaceMember(member.id)}
          >
            <View style={styles.spaceMemberAvatar}>
              <Text style={styles.spaceMemberAvatarText} allowFontScaling={false}>
                {member.initials}
              </Text>
            </View>

            <View style={styles.spaceMemberTextBlock}>
              <Text style={styles.spaceMemberName} allowFontScaling={false}>
                {member.name}
              </Text>

              <Text style={styles.spaceMemberSubtitle} allowFontScaling={false}>
                Доступ к этой финансовой ячейке
              </Text>
            </View>

            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxActive,
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderOperationModal = () => (
    <Modal
      visible={isOperationModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeOperationModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.bottomOverlay} onPress={closeOperationModal}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle} allowFontScaling={false}>
                Новая операция
              </Text>

              <TouchableOpacity
                style={styles.modalClose}
                activeOpacity={0.75}
                onPress={closeOperationModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              {renderOperationTypeTabs()}

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Сумма
              </Text>

              <TextInput
                style={styles.textInput}
                value={operationAmount}
                onChangeText={setOperationAmount}
                keyboardType="numeric"
                placeholder="Сумма"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Название
              </Text>

              <TextInput
                style={styles.textInput}
                value={operationTitle}
                onChangeText={setOperationTitle}
                placeholder="Название операции"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Категория
              </Text>

              {renderCategoryChips()}

              <TouchableOpacity
                style={[
                  styles.submitOperationButton,
                  {
                    backgroundColor:
                      operationType === 'income' ? '#20B846' : '#EF4444',
                  },
                ]}
                activeOpacity={0.85}
                onPress={submitOperation}
              >
                <Ionicons
                  name={
                    operationType === 'income'
                      ? 'arrow-down-outline'
                      : 'arrow-up-outline'
                  }
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.submitOperationText} allowFontScaling={false}>
                  Добавить {operationType === 'income' ? 'доход' : 'расход'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={isCategoryModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeCategoryModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.bottomOverlay} onPress={closeCategoryModal}>
          <Pressable style={styles.smallBottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle} allowFontScaling={false}>
                Новая категория
              </Text>

              <TouchableOpacity
                style={styles.modalClose}
                activeOpacity={0.75}
                onPress={closeCategoryModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel} allowFontScaling={false}>
              Название категории
            </Text>

            <TextInput
              style={styles.textInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Название категории"
              placeholderTextColor="#A1A1A1"
              autoFocus
            />

            <TouchableOpacity
              style={styles.purpleButton}
              activeOpacity={0.85}
              onPress={submitNewCategory}
            >
              <Ionicons name="add" size={21} color="#FFFFFF" />

              <Text style={styles.submitOperationText} allowFontScaling={false}>
                Добавить категорию
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

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
        <Pressable style={styles.bottomOverlay} onPress={closeAddGoalModal}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle} allowFontScaling={false}>
                Новая цель
              </Text>

              <TouchableOpacity
                style={styles.modalClose}
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
              {renderGoalScopeTabs()}

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

              {renderGoalMembersPicker()}

              <TouchableOpacity
                style={styles.purpleButton}
                activeOpacity={0.85}
                onPress={submitNewGoal}
              >
                <Ionicons name="add" size={21} color="#FFFFFF" />

                <Text style={styles.submitOperationText} allowFontScaling={false}>
                  Добавить цель
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={isSettingsModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeSettingsModal}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.bottomOverlay} onPress={closeSettingsModal}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle} allowFontScaling={false}>
                Настройки ячейки
              </Text>

              <TouchableOpacity
                style={styles.modalClose}
                activeOpacity={0.75}
                onPress={closeSettingsModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsDescription} allowFontScaling={false}>
              Выберите людей, которым будет доступна именно эта финансовая ячейка.
            </Text>

            {renderSpaceMembersPicker()}

            <TouchableOpacity
              style={styles.purpleButton}
              activeOpacity={0.85}
              onPress={saveSpaceMembers}
            >
              <Ionicons name="checkmark" size={21} color="#FFFFFF" />

              <Text style={styles.submitOperationText} allowFontScaling={false}>
                Сохранить доступ
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (isLoading && financeSpaces.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Загружаем финансы...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedSpace) {
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
              Финансы
            </Text>

            <View style={styles.headerSettingsButton} />
          </View>

          {renderEmptyState()}
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
            Финансы
          </Text>

          <TouchableOpacity
            style={styles.headerSettingsButton}
            activeOpacity={0.75}
            onPress={openSettingsModal}
          >
            <Ionicons name="settings-outline" size={20} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>

        {renderSegmentedTabs()}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'overview' ? renderOverview() : renderStats()}
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.85}
          onPress={openOperationModal}
        >
          <Ionicons name="add" size={34} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {renderSpaceSelectorModal()}
      {renderOperationModal()}
      {renderCategoryModal()}
      {renderAddGoalModal()}
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

  headerSettingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  segmentedWrapper: {
    height: 40,
    borderRadius: 17,
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    padding: 3,
  },

  segmentedButton: {
    flex: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  segmentedButtonActive: {
    backgroundColor: MAIN_COLOR,
  },

  segmentedText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  segmentedTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingBottom: 140,
  },

  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 70,
  },

  emptyScreenIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyScreenTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
    marginBottom: 8,
  },

  emptyScreenText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 22,
    color: '#858585',
    marginBottom: 22,
  },

  budgetHeader: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 250,
    marginBottom: 18,
  },

  budgetHeaderContent: {
    paddingTop: 42,
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

  selectorButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    maxWidth: '82%',
  },

  selectorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  selectorColorMark: {
    width: 24,
    height: 12,
    borderRadius: 3,
    marginHorizontal: 7,
    backgroundColor: MAIN_COLOR,
  },

  balanceValue: {
    textAlign: 'center',
    fontFamily: fontFamily.bold || fontFamily.medium,
    fontWeight: '800',
    fontSize: 50,
    color: '#262626',
    letterSpacing: -1.6,
    marginBottom: 42,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  summaryCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },

  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
    marginBottom: 6,
  },

  summaryValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  goalsCard: {
    borderRadius: 22,
    backgroundColor: '#202020',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    marginBottom: 20,
  },

  goalsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  goalsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goalsTitleArrow: {
    marginLeft: 6,
  },

  goalsTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  hiddenGoalsBadge: {
    marginLeft: 10,
    minWidth: 30,
    height: 24,
    borderRadius: 12,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  hiddenGoalsText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#FFFFFF',
  },

  emptyGoalsText: {
    marginTop: 20,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#CFCFCF',
  },

  goalSectionTitle: {
    marginTop: 18,
    marginBottom: 2,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#A7A7A7',
  },

  goalScopeDivider: {
    height: 1,
    backgroundColor: '#555555',
    marginTop: 22,
    marginBottom: 4,
  },

  goalHeader: {
    marginTop: 20,
    marginBottom: 12,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  goalTextBlock: {
    flex: 1,
  },

  goalTitle: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  goalMeta: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A7A7A7',
  },

  goalMetaCompleted: {
    color: '#C9B2FF',
    fontFamily: fontFamily.medium,
  },

  goalEditButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#383838',
    justifyContent: 'center',
    alignItems: 'center',
  },

  goalCompleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  goalCompletedHint: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#33254B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  goalCompletedHintText: {
    flex: 1,
    marginLeft: 6,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#C9B2FF',
  },

  progressTrack: {
    width: '100%',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#363636',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: MAIN_COLOR,
  },

  progressInsideText: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  darkDivider: {
    height: 1,
    backgroundColor: '#4A4A4A',
    marginTop: 20,
  },

  addGoalButton: {
    alignSelf: 'flex-start',
    marginTop: 20,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#383838',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  addGoalText: {
    marginLeft: 6,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  operationsCard: {
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 12,
  },

  operationsHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  operationsTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  operationsAll: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A1A1A1',
  },

  operationRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  operationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  operationAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: MAIN_COLOR,
  },

  operationTextBlock: {
    flex: 1,
    paddingRight: 8,
  },

  operationTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  operationSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  operationAmount: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
  },

  operationAmountIncome: {
    color: '#20B846',
  },

  operationAmountExpense: {
    color: '#EF4444',
  },

  emptyLightText: {
    paddingVertical: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  statsHeroCard: {
    borderRadius: 28,
    backgroundColor: '#202020',
    padding: 20,
    marginTop: 22,
    marginBottom: 12,
  },

  statsHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  statsHeroTextBlock: {
    flex: 1,
    paddingRight: 14,
  },

  statsHeroLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A7A7A7',
    marginBottom: 8,
  },

  statsHeroValue: {
    fontFamily: fontFamily.bold || fontFamily.medium,
    fontWeight: '800',
    fontSize: 32,
    color: '#20B846',
    letterSpacing: -0.8,
  },

  statsHeroValueNegative: {
    color: '#EF4444',
  },

  statsHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsHeroSubtitle: {
    marginTop: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#DADADA',
  },

  insightCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  insightTitle: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  insightText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 22,
    color: '#525252',
  },

  statsMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  statsMetricCard: {
    flex: 1,
    minHeight: 138,
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 16,
  },

  statsMetricIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  statsMetricTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  statsMetricValue: {
    marginTop: 4,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  statsMetricSubtitle: {
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A1A1A1',
  },

  chartCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  chartHeaderTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  chartTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  chartSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  chartLegend: {
    alignItems: 'flex-end',
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  legendText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#858585',
  },

  chartBody: {
    height: 164,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },

  chartBars: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 10,
  },

  chartBar: {
    width: 12,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    marginHorizontal: 3,
  },

  chartIncomeBar: {
    backgroundColor: '#20B846',
  },

  chartExpenseBar: {
    backgroundColor: '#EF4444',
  },

  chartLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  statsProgressCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  statsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statsProgressTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  statsProgressPercent: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  statsProgressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E9E9E9',
    overflow: 'hidden',
    marginTop: 14,
  },

  statsProgressFill: {
    height: '100%',
    borderRadius: 6,
  },

  statsProgressFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statsProgressFooterText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  statsBlockCard: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    padding: 18,
    marginBottom: 12,
  },

  statsBlockTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
    marginBottom: 14,
  },

  statsEmptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  categoryStatsRow: {
    marginBottom: 14,
  },

  categoryStatsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  categoryNameBlock: {
    flex: 1,
    paddingRight: 12,
  },

  categoryStatsName: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  categoryStatsPercent: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  categoryStatsAmount: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  categoryStatsTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E9E9E9',
    overflow: 'hidden',
  },

  categoryStatsFill: {
    height: '100%',
    borderRadius: 5,
  },

  actorStatsRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actorStatsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  actorStatsAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  actorStatsTextBlock: {
    flex: 1,
  },

  actorStatsName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  actorStatsSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  floatingButton: {
    position: 'absolute',
    right: 18,
    bottom: 108,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MAIN_COLOR,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },

  modalCard: {
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
  },

  modalTitle: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 24,
  },

  spacePickerItem: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },

  spacePickerColor: {
    width: 24,
    height: 12,
    borderRadius: 3,
    marginRight: 12,
    backgroundColor: MAIN_COLOR,
  },

  spacePickerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },

  spacePickerTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  spacePickerTitleActive: {
    fontFamily: fontFamily.medium,
  },

  spacePickerSubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  spacePickerArrow: {
    width: 62,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  createSpaceButton: {
    marginTop: 22,
    height: 50,
    borderRadius: 20,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  createSpaceButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  modalKeyboardView: {
    flex: 1,
  },

  bottomOverlay: {
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
    paddingBottom: 26,
  },

  smallBottomSheet: {
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
    marginBottom: 8,
  },

  modalSheetTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    paddingBottom: 16,
  },

  operationTypeWrapper: {
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    padding: 3,
    marginBottom: 18,
  },

  operationTypeButton: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  operationTypeButtonActive: {
    backgroundColor: MAIN_COLOR,
  },

  operationTypeText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  operationTypeTextActive: {
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
    minHeight: 108,
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

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  categoryChip: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  categoryChipActive: {
    backgroundColor: MAIN_COLOR,
  },

  categoryChipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#262626',
  },

  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  addCategoryChip: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    flexDirection: 'row',
  },

  addCategoryChipText: {
    marginLeft: 5,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: MAIN_COLOR,
  },

  submitOperationButton: {
    minHeight: 56,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitOperationText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  purpleButton: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
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

  settingsDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 21,
    color: '#858585',
    marginBottom: 16,
  },

  membersList: {
    marginBottom: 18,
  },

  spaceMemberRow: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  spaceMemberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  spaceMemberAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  spaceMemberTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  spaceMemberName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  spaceMemberSubtitle: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
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

  checkboxActive: {
    backgroundColor: MAIN_COLOR,
    borderColor: MAIN_COLOR,
  },
});