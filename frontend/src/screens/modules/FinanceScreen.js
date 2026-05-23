import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAIN_COLOR = '#9456FE';

const INITIAL_OPERATION_CATEGORIES = {
  income: ['Зарплата', 'Копилка', 'Подарок', 'Перевод', 'Другое'],
  expense: ['Продукты', 'Автомобиль', 'Дом', 'Аптека', 'Транспорт', 'Другое'],
};

const CURRENT_USER = {
  name: 'Вы',
  initials: 'Я',
  color: '#F3ECFF',
};

const FAMILY_MEMBERS = [
  {
    id: 1,
    name: 'Вы',
    initials: 'Я',
    color: '#F3ECFF',
  },
  {
    id: 2,
    name: 'Мама',
    initials: 'М',
    color: '#EDE3FF',
  },
  {
    id: 3,
    name: 'Папа',
    initials: 'П',
    color: '#E8F0FF',
  },
  {
    id: 4,
    name: 'Анна',
    initials: 'А',
    color: '#FFE9DD',
  },
  {
    id: 5,
    name: 'Бабушка',
    initials: 'Б',
    color: '#DDF8EF',
  },
];

const PERIOD_LABELS = ['1 нед', '2 нед', '3 нед', '4 нед'];

const getOperationPeriodIndex = (subtitle = '') => {
  const text = String(subtitle);

  if (text.includes('Только что') || text.includes('Сегодня')) {
    return 3;
  }

  const match = text.match(/(\d{1,2})\s+мая/);

  if (!match) {
    return 3;
  }

  const day = Number(match[1]);

  if (day <= 7) {
    return 0;
  }

  if (day <= 14) {
    return 1;
  }

  if (day <= 21) {
    return 2;
  }

  return 3;
};

const INITIAL_FINANCE_SPACES = [
  {
    id: 1,
    title: 'Наш бюджет',
    type: 'joint',
    typeTitle: 'Совместный',
    subtitle: 'Мама + Папа',
    color: MAIN_COLOR,
    icon: 'wallet-outline',
    balance: 52067.32,
    income: 89999,
    expense: 37931.68,
    members: ['Вы', 'Мама', 'Папа'],
    membersCount: 3,
    accessText: 'Вы + Мама + Папа',
    section: 'mine',
    completedGoals: [],
    goals: [
      {
        id: 1,
        title: 'Купить машину',
        description:
          'Личная цель внутри финансового раздела. Деньги откладываются постепенно из общего бюджета.',
        scope: 'personal',
        scopeTitle: 'Личная цель',
        members: ['Вы'],
        currentAmount: 344556,
        targetAmount: 344556,
        color: MAIN_COLOR,
      },
      {
        id: 2,
        title: 'Ремонт кухни',
        description:
          'Общая семейная цель. К ней можно добавлять участников семьи и отслеживать общий прогресс.',
        scope: 'family',
        scopeTitle: 'Общая цель',
        members: ['Мама', 'Папа'],
        currentAmount: 19000,
        targetAmount: 120000,
        color: MAIN_COLOR,
      },
    ],
    operations: [
      {
        id: 1,
        title: 'Копилка',
        subtitle: '23 мая · 13:45 · Иван',
        amount: 5000,
        type: 'income',
        category: 'Копилка',
        actorName: 'Иван',
        actorInitials: 'И',
        actorColor: '#EDE3FF',
      },
      {
        id: 2,
        title: 'Автомобиль',
        subtitle: '23 мая · 13:45 · Анна',
        amount: 5000,
        type: 'expense',
        category: 'Автомобиль',
        actorName: 'Анна',
        actorInitials: 'А',
        actorColor: '#E8F0FF',
      },
      {
        id: 3,
        title: 'Продукты',
        subtitle: '22 мая · 18:20 · Анна',
        amount: 8400,
        type: 'expense',
        category: 'Продукты',
        actorName: 'Анна',
        actorInitials: 'А',
        actorColor: '#FFE9DD',
      },
      {
        id: 4,
        title: 'Зарплата',
        subtitle: '20 мая · 09:10 · Иван',
        amount: 84999,
        type: 'income',
        category: 'Зарплата',
        actorName: 'Иван',
        actorInitials: 'И',
        actorColor: '#EDE3FF',
      },
      {
        id: 5,
        title: 'Дом',
        subtitle: '18 мая · 16:35 · Вы',
        amount: 12100,
        type: 'expense',
        category: 'Дом',
        actorName: 'Вы',
        actorInitials: 'Я',
        actorColor: '#F3ECFF',
      },
      {
        id: 6,
        title: 'Транспорт',
        subtitle: '17 мая · 13:00 · Вы',
        amount: 7200,
        type: 'expense',
        category: 'Транспорт',
        actorName: 'Вы',
        actorInitials: 'Я',
        actorColor: '#F3ECFF',
      },
    ],
  },
  {
    id: 2,
    title: 'Бюджет 1',
    type: 'joint',
    typeTitle: 'Совместный',
    subtitle: 'Бабушка + Дедушка',
    color: MAIN_COLOR,
    icon: 'people-outline',
    balance: 18400,
    income: 45000,
    expense: 26600,
    members: ['Бабушка'],
    membersCount: 1,
    accessText: 'Бабушка',
    section: 'available',
    completedGoals: [],
    goals: [
      {
        id: 1,
        title: 'Лекарства',
        description: 'Цель для регулярных расходов на лекарства и медицинские товары.',
        scope: 'personal',
        scopeTitle: 'Личная цель',
        members: ['Бабушка'],
        currentAmount: 8000,
        targetAmount: 15000,
        color: MAIN_COLOR,
      },
      {
        id: 2,
        title: 'Ремонт комнаты',
        description: 'Общая цель бабушки и дедушки на обновление комнаты.',
        scope: 'family',
        scopeTitle: 'Общая цель',
        members: ['Бабушка'],
        currentAmount: 12000,
        targetAmount: 90000,
        color: MAIN_COLOR,
      },
    ],
    operations: [
      {
        id: 1,
        title: 'Пенсия',
        subtitle: '20 мая · 10:00 · Бабушка',
        amount: 30000,
        type: 'income',
        category: 'Пенсия',
        actorName: 'Бабушка',
        actorInitials: 'Б',
        actorColor: '#FFE9DD',
      },
      {
        id: 2,
        title: 'Аптека',
        subtitle: '21 мая · 16:30 · Дедушка',
        amount: 3200,
        type: 'expense',
        category: 'Аптека',
        actorName: 'Дедушка',
        actorInitials: 'Д',
        actorColor: '#EDE3FF',
      },
    ],
  },
  {
    id: 3,
    title: 'Подарок бабушке',
    type: 'goal',
    typeTitle: 'Сбор',
    subtitle: '3 участника · скрыто от бабушки',
    color: MAIN_COLOR,
    icon: 'gift-outline',
    balance: 8500,
    income: 8500,
    expense: 0,
    members: ['Вы', 'Мама', 'Папа'],
    membersCount: 3,
    accessText: 'Вы + Мама + Папа',
    section: 'mine',
    completedGoals: [],
    goals: [
      {
        id: 1,
        title: 'Бабушке на подарок',
        description: 'Семейный сбор на подарок. Цель видна только выбранным участникам.',
        scope: 'family',
        scopeTitle: 'Общая цель',
        members: ['Мама', 'Папа', 'Вы'],
        currentAmount: 8500,
        targetAmount: 15000,
        color: MAIN_COLOR,
      },
    ],
    operations: [
      {
        id: 1,
        title: 'Взнос от мамы',
        subtitle: '22 мая · 18:20 · Мария',
        amount: 3000,
        type: 'income',
        category: 'Подарок',
        actorName: 'Мария',
        actorInitials: 'М',
        actorColor: '#DDF8EF',
      },
      {
        id: 2,
        title: 'Взнос от папы',
        subtitle: '22 мая · 19:10 · Иван',
        amount: 4000,
        type: 'income',
        category: 'Подарок',
        actorName: 'Иван',
        actorInitials: 'И',
        actorColor: '#EDE3FF',
      },
    ],
  },
];

export default function FinanceScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [financeSpaces, setFinanceSpaces] = useState(INITIAL_FINANCE_SPACES);
  const [operationCategories, setOperationCategories] = useState(
    INITIAL_OPERATION_CATEGORIES
  );

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSpaceId, setSelectedSpaceId] = useState(INITIAL_FINANCE_SPACES[0].id);
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);

  const [isOperationModalVisible, setIsOperationModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isAddGoalModalVisible, setIsAddGoalModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const [operationType, setOperationType] = useState('income');
  const [operationTitle, setOperationTitle] = useState('');
  const [operationAmount, setOperationAmount] = useState('');
  const [operationCategory, setOperationCategory] = useState(
    INITIAL_OPERATION_CATEGORIES.income[0]
  );
  const [newCategoryName, setNewCategoryName] = useState('');

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalScope, setNewGoalScope] = useState('personal');
  const [newGoalMembers, setNewGoalMembers] = useState(['Вы']);

  const [draftSpaceMembers, setDraftSpaceMembers] = useState([]);

  const selectedSpace = useMemo(() => {
    return (
      financeSpaces.find((space) => space.id === selectedSpaceId) ||
      financeSpaces[0]
    );
  }, [financeSpaces, selectedSpaceId]);

  const visibleGoals = isGoalsExpanded
    ? selectedSpace.goals
    : selectedSpace.goals.slice(0, 1);

  const hiddenGoalsCount = Math.max(
    selectedSpace.goals.length - visibleGoals.length,
    0
  );

  const personalGoals = selectedSpace.goals.filter(
    (goal) => goal.scope === 'personal'
  );

  const familyGoals = selectedSpace.goals.filter(
    (goal) => goal.scope === 'family'
  );

  const stats = useMemo(() => {
    const operations = selectedSpace.operations || [];

    const incomeOperations = operations.filter(
      (operation) => operation.type === 'income'
    );

    const expenseOperations = operations.filter(
      (operation) => operation.type === 'expense'
    );

    const totalIncome = incomeOperations.reduce(
      (sum, operation) => sum + Number(operation.amount || 0),
      0
    );

    const totalExpense = expenseOperations.reduce(
      (sum, operation) => sum + Number(operation.amount || 0),
      0
    );

    const netAmount = totalIncome - totalExpense;

    const expenseLoadPercent = totalIncome
      ? Math.min(Math.round((totalExpense / totalIncome) * 100), 100)
      : 0;

    const savingPercent = totalIncome
      ? Math.max(Math.round((netAmount / totalIncome) * 100), 0)
      : 0;

    const averageIncome = incomeOperations.length
      ? Math.round(totalIncome / incomeOperations.length)
      : 0;

    const averageExpense = expenseOperations.length
      ? Math.round(totalExpense / expenseOperations.length)
      : 0;

    const expenseCategories = expenseOperations.reduce((acc, operation) => {
      const key = operation.category || 'Другое';
      acc[key] = (acc[key] || 0) + Number(operation.amount || 0);
      return acc;
    }, {});

    const incomeCategories = incomeOperations.reduce((acc, operation) => {
      const key = operation.category || 'Другое';
      acc[key] = (acc[key] || 0) + Number(operation.amount || 0);
      return acc;
    }, {});

    const expenseCategoryStats = Object.entries(expenseCategories)
      .map(([title, amount]) => ({
        title,
        amount,
        percent: totalExpense ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeCategoryStats = Object.entries(incomeCategories)
      .map(([title, amount]) => ({
        title,
        amount,
        percent: totalIncome ? Math.round((amount / totalIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const actorStatsMap = operations.reduce((acc, operation) => {
      const key = operation.actorName || 'Участник';

      if (!acc[key]) {
        acc[key] = {
          name: key,
          initials: operation.actorInitials || key.charAt(0).toUpperCase(),
          color: operation.actorColor || '#EDE3FF',
          income: 0,
          expense: 0,
        };
      }

      if (operation.type === 'income') {
        acc[key].income += Number(operation.amount || 0);
      } else {
        acc[key].expense += Number(operation.amount || 0);
      }

      return acc;
    }, {});

    const actorStats = Object.values(actorStatsMap)
      .map((actor) => ({
        ...actor,
        total: actor.income + actor.expense,
      }))
      .sort((a, b) => b.total - a.total);

    const goalsCurrentAmount = selectedSpace.goals.reduce(
      (sum, goal) => sum + Number(goal.currentAmount || 0),
      0
    );

    const goalsTargetAmount = selectedSpace.goals.reduce(
      (sum, goal) => sum + Number(goal.targetAmount || 0),
      0
    );

    const goalsProgressPercent = goalsTargetAmount
      ? Math.min(Math.round((goalsCurrentAmount / goalsTargetAmount) * 100), 100)
      : 0;

    const periodStats = PERIOD_LABELS.map((label) => ({
      label,
      income: 0,
      expense: 0,
    }));

    operations.forEach((operation) => {
      const periodIndex = getOperationPeriodIndex(operation.subtitle);
      const amount = Number(operation.amount || 0);

      if (operation.type === 'income') {
        periodStats[periodIndex].income += amount;
      } else {
        periodStats[periodIndex].expense += amount;
      }
    });

    const periodMaxValue = Math.max(
      ...periodStats.map((period) => Math.max(period.income, period.expense)),
      1
    );

    const largestExpense = expenseOperations.reduce(
      (maxOperation, operation) => {
        if (!maxOperation || Number(operation.amount) > Number(maxOperation.amount)) {
          return operation;
        }

        return maxOperation;
      },
      null
    );

    return {
      totalIncome,
      totalExpense,
      netAmount,
      incomeOperationsCount: incomeOperations.length,
      expenseOperationsCount: expenseOperations.length,
      expenseLoadPercent,
      savingPercent,
      averageIncome,
      averageExpense,
      expenseCategoryStats,
      incomeCategoryStats,
      actorStats,
      goalsCurrentAmount,
      goalsTargetAmount,
      goalsProgressPercent,
      periodStats,
      periodMaxValue,
      largestExpense,
      operationCount: operations.length,
    };
  }, [selectedSpace]);

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

  const getMemberMeta = (name) => {
    return (
      FAMILY_MEMBERS.find((member) => member.name === name) || {
        name,
        initials: name.charAt(0).toUpperCase(),
        color: '#EDE3FF',
      }
    );
  };

  const openNotReady = (title) => {
    Alert.alert(title, 'Этот раздел подключим позже');
  };

  const updateSelectedSpace = (updater) => {
    setFinanceSpaces((prevSpaces) =>
      prevSpaces.map((space) => {
        if (space.id !== selectedSpace.id) {
          return space;
        }

        return updater(space);
      })
    );
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
      color: MAIN_COLOR,
      goals: selectedSpace.goals,
      completedGoals: selectedSpace.completedGoals || [],
    });
  };

  const completeGoal = (goal) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const completedGoal = {
      ...goal,
      isCompleted: true,
      completedAt: 'Сегодня',
    };

    updateSelectedSpace((space) => ({
      ...space,
      goals: space.goals.filter((item) => item.id !== goal.id),
      completedGoals: [completedGoal, ...(space.completedGoals || [])],
    }));
  };

  const selectSpace = (space) => {
    setSelectedSpaceId(space.id);
    setIsSelectorVisible(false);
    setIsGoalsExpanded(false);
  };

  const toggleGoals = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsGoalsExpanded((prev) => !prev);
  };

  const changeOperationType = (type) => {
    setOperationType(type);
    setOperationCategory(operationCategories[type][0]);
  };

  const openOperationModal = () => {
    setOperationType('income');
    setOperationTitle('');
    setOperationAmount('');
    setOperationCategory(operationCategories.income[0]);
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

  const openAddGoalModal = () => {
    const defaultMembers = selectedSpace.members?.length
      ? [selectedSpace.members[0]]
      : ['Вы'];

    setNewGoalTitle('');
    setNewGoalAmount('');
    setNewGoalDescription('');
    setNewGoalScope('personal');
    setNewGoalMembers(['Вы']);
    setIsAddGoalModalVisible(true);
  };

  const closeAddGoalModal = () => {
    setIsAddGoalModalVisible(false);
  };

  const openSettingsModal = () => {
    setDraftSpaceMembers(selectedSpace.members || ['Вы']);
    setIsSettingsModalVisible(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalVisible(false);
  };

  const toggleDraftSpaceMember = (name) => {
    setDraftSpaceMembers((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }

      return [...prev, name];
    });
  };

  const saveSpaceMembers = () => {
    if (draftSpaceMembers.length === 0) {
      Alert.alert('Настройки ячейки', 'Нужно выбрать хотя бы одного участника');
      return;
    }

    const membersText = draftSpaceMembers.join(' + ');

    updateSelectedSpace((space) => ({
      ...space,
      members: draftSpaceMembers,
      membersCount: draftSpaceMembers.length,
      accessText: membersText,
      subtitle: membersText,
    }));

    closeSettingsModal();
  };

  const toggleNewGoalMember = (name) => {
    setNewGoalMembers((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }

      return [...prev, name];
    });
  };

  const changeNewGoalScope = (scope) => {
    setNewGoalScope(scope);

    if (scope === 'personal') {
      setNewGoalMembers(['Вы']);
    } else {
      const defaultMembers = selectedSpace.members?.length
        ? selectedSpace.members
        : ['Вы'];

      setNewGoalMembers(defaultMembers);
    }
  };

  const submitNewGoal = () => {
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

    if (newGoalScope === 'family' && newGoalMembers.length === 0) {
      Alert.alert('Новая цель', 'Выберите участников цели');
      return;
    }

    const newGoal = {
      id: Date.now(),
      title,
      description: newGoalDescription.trim() || 'Описание цели пока не добавлено.',
      scope: newGoalScope,
      scopeTitle: newGoalScope === 'family' ? 'Общая цель' : 'Личная цель',
      members: newGoalScope === 'family' ? newGoalMembers : ['Вы'],
      currentAmount: 0,
      targetAmount,
      color: MAIN_COLOR,
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    updateSelectedSpace((space) => ({
      ...space,
      goals: [newGoal, ...space.goals],
    }));

    setIsGoalsExpanded(true);
    closeAddGoalModal();
  };

  const submitNewCategory = () => {
    const trimmedCategory = newCategoryName.trim();

    if (!trimmedCategory) {
      Alert.alert('Категория', 'Введите название категории');
      return;
    }

    const currentCategories = operationCategories[operationType] || [];
    const alreadyExists = currentCategories.some(
      (category) => category.toLowerCase() === trimmedCategory.toLowerCase()
    );

    if (alreadyExists) {
      Alert.alert('Категория', 'Такая категория уже есть');
      return;
    }

    setOperationCategories((prev) => ({
      ...prev,
      [operationType]: [...prev[operationType], trimmedCategory],
    }));

    setOperationCategory(trimmedCategory);

    if (!operationTitle.trim()) {
      setOperationTitle(trimmedCategory);
    }

    setNewCategoryName('');
    closeCategoryModal();
  };

  const submitOperation = () => {
    const normalizedAmount = operationAmount.replace(/\s/g, '').replace(',', '.');
    const amount = Number(normalizedAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Операция', 'Введите корректную сумму');
      return;
    }

    const title = operationTitle.trim() || operationCategory;

    const newOperation = {
      id: Date.now(),
      title,
      subtitle: `Только что · ${CURRENT_USER.name}`,
      amount,
      type: operationType,
      category: operationCategory,
      actorName: CURRENT_USER.name,
      actorInitials: CURRENT_USER.initials,
      actorColor: CURRENT_USER.color,
    };

    updateSelectedSpace((space) => {
      const balance =
        operationType === 'income'
          ? Number(space.balance || 0) + amount
          : Number(space.balance || 0) - amount;

      const income =
        operationType === 'income'
          ? Number(space.income || 0) + amount
          : Number(space.income || 0);

      const expense =
        operationType === 'expense'
          ? Number(space.expense || 0) + amount
          : Number(space.expense || 0);

      return {
        ...space,
        balance,
        income,
        expense,
        operations: [newOperation, ...space.operations],
      };
    });

    closeOperationModal();
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
    const isReadyToComplete = percent >= 100;

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
                  : `${goal.scopeTitle} · ${goal.members.join(', ')}`}
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
                openNotReady('Настройки цели');
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

  const renderGoalSection = (title, goals) => {
    if (goals.length === 0) {
      return null;
    }

    return (
      <View>
        {isGoalsExpanded && (
          <Text style={styles.goalSectionTitle} allowFontScaling={false}>
            {title}
          </Text>
        )}

        {goals.map(renderGoalItem)}
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

      {selectedSpace.goals.length === 0 ? (
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
          onPress={() => openNotReady('Все операции')}
        >
          <Text style={styles.operationsAll} allowFontScaling={false}>
            все
          </Text>
        </TouchableOpacity>
      </View>

      {selectedSpace.operations.slice(0, 5).map((operation) => (
        <TouchableOpacity
          key={operation.id}
          style={styles.operationRow}
          activeOpacity={0.75}
          onPress={() => openNotReady('Операция')}
        >
          <View
            style={[
              styles.operationAvatar,
              {
                backgroundColor: operation.actorColor || '#EDE3FF',
              },
            ]}
          >
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
        'Добавьте доходы и расходы, чтобы увидеть полноценную аналитику по этому финансовому блоку.';
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
          <View key={actor.name} style={styles.actorStatsRow}>
            <View
              style={[
                styles.actorStatsAvatar,
                {
                  backgroundColor: actor.color,
                },
              ]}
            >
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
    const isActive = space.id === selectedSpace.id;

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

  const renderSpaceSelectorModal = () => {
    const mySpaces = financeSpaces.filter((space) => space.section === 'mine');
    const availableSpaces = financeSpaces.filter(
      (space) => space.section === 'available'
    );

    return (
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
              Все блоки
            </Text>

            <Text style={styles.modalSectionTitle} allowFontScaling={false}>
              Мои
            </Text>

            {mySpaces.map(renderSpacePickerItem)}

            <View style={styles.modalDivider} />

            <Text style={styles.modalSectionTitle} allowFontScaling={false}>
              Вам доступно
            </Text>

            {availableSpaces.map(renderSpacePickerItem)}

            <TouchableOpacity
              style={styles.createSpaceButton}
              activeOpacity={0.85}
              onPress={() => {
                setIsSelectorVisible(false);
                openNotReady('Создать финансовый раздел');
              }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />

              <Text
                style={styles.createSpaceButtonText}
                allowFontScaling={false}
              >
                Создать финансовый раздел
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

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
      {operationCategories[operationType].map((category) => {
        const isSelected = category === operationCategory;

        return (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              isSelected && styles.categoryChipActive,
            ]}
            activeOpacity={0.75}
            onPress={() => {
              setOperationCategory(category);

              if (!operationTitle.trim()) {
                setOperationTitle(category);
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
              {category}
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
          {(selectedSpace.members || ['Вы']).map((memberName) => {
            const member = getMemberMeta(memberName);
            const isSelected = newGoalMembers.includes(memberName);

            return (
              <TouchableOpacity
                key={memberName}
                style={[
                  styles.memberChip,
                  isSelected && styles.memberChipActive,
                ]}
                activeOpacity={0.75}
                onPress={() => toggleNewGoalMember(memberName)}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    {
                      backgroundColor: member.color,
                    },
                  ]}
                >
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
      {FAMILY_MEMBERS.map((member) => {
        const isSelected = draftSpaceMembers.includes(member.name);

        return (
          <TouchableOpacity
            key={member.id}
            style={styles.spaceMemberRow}
            activeOpacity={0.75}
            onPress={() => toggleDraftSpaceMember(member.name)}
          >
            <View
              style={[
                styles.spaceMemberAvatar,
                {
                  backgroundColor: member.color,
                },
              ]}
            >
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
        <Pressable style={styles.operationModalOverlay} onPress={closeOperationModal}>
          <Pressable style={styles.operationBottomSheet}>
            <View style={styles.operationModalHandle} />

            <View style={styles.operationModalHeader}>
              <Text style={styles.operationModalTitle} allowFontScaling={false}>
                Новая операция
              </Text>

              <TouchableOpacity
                style={styles.operationModalClose}
                activeOpacity={0.75}
                onPress={closeOperationModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.operationModalContent}
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
        <Pressable style={styles.categoryModalOverlay} onPress={closeCategoryModal}>
          <Pressable style={styles.categoryModalCard}>
            <View style={styles.operationModalHandle} />

            <View style={styles.operationModalHeader}>
              <Text style={styles.operationModalTitle} allowFontScaling={false}>
                Новая категория
              </Text>

              <TouchableOpacity
                style={styles.operationModalClose}
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
        <Pressable style={styles.categoryModalOverlay} onPress={closeAddGoalModal}>
          <Pressable style={styles.goalModalCard}>
            <View style={styles.operationModalHandle} />

            <View style={styles.operationModalHeader}>
              <Text style={styles.operationModalTitle} allowFontScaling={false}>
                Новая цель
              </Text>

              <TouchableOpacity
                style={styles.operationModalClose}
                activeOpacity={0.75}
                onPress={closeAddGoalModal}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.operationModalContent}
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
        <Pressable style={styles.categoryModalOverlay} onPress={closeSettingsModal}>
          <Pressable style={styles.goalModalCard}>
            <View style={styles.operationModalHandle} />

            <View style={styles.operationModalHeader}>
              <Text style={styles.operationModalTitle} allowFontScaling={false}>
                Настройки ячейки
              </Text>

              <TouchableOpacity
                style={styles.operationModalClose}
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
    marginBottom: 0,
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

  modalSectionTitle: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 12,
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
    width: 86,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalDivider: {
    height: 1,
    backgroundColor: '#DADADA',
    marginVertical: 16,
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

  operationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'flex-end',
  },

  operationBottomSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },

  operationModalHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D9D9D9',
    marginBottom: 14,
  },

  operationModalHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  operationModalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  operationModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  operationModalContent: {
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
  },

  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'flex-end',
  },

  categoryModalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },

  goalModalCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
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