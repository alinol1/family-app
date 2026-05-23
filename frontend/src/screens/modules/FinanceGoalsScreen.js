import React, { useMemo, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

const FAMILY_MEMBERS = [
  { id: 1, name: 'Вы', initials: 'Я', color: '#F3ECFF' },
  { id: 2, name: 'Мама', initials: 'М', color: '#DDF8EF' },
  { id: 3, name: 'Папа', initials: 'П', color: '#EDE3FF' },
  { id: 4, name: 'Анна', initials: 'А', color: '#FFE9DD' },
];

export default function FinanceGoalsScreen({ navigation, route }) {
  const { screenPadding } = useLayout();

  const initialGoals = route?.params?.goals || [];
  const financeSpaceTitle = route?.params?.financeSpaceTitle || 'Финансовый блок';
  const goalColor = route?.params?.color || '#9456FE';

  const [goals, setGoals] = useState(initialGoals);
  const [completedGoals, setCompletedGoals] = useState([]);

  const [isAddGoalModalVisible, setIsAddGoalModalVisible] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalScope, setGoalScope] = useState('personal');
  const [goalMembers, setGoalMembers] = useState(['Вы']);

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !goal.isCompleted);
  }, [goals]);

  const formatNumber = (value) => {
    const number = Number(value || 0);

    return number
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getGoalPercent = (goal) => {
    if (!goal.targetAmount) {
      return 0;
    }

    const percent = Math.round(
      (Number(goal.currentAmount || 0) / Number(goal.targetAmount || 0)) * 100
    );

    return Math.min(percent, 100);
  };

  const openGoalDetail = (goal) => {
    navigation.navigate('FinanceGoalDetail', {
      goalId: goal.id,
      financeSpaceTitle,
      goal,
    });
  };

  const openAddGoalModal = () => {
    setGoalTitle('');
    setGoalDescription('');
    setGoalTargetAmount('');
    setGoalScope('personal');
    setGoalMembers(['Вы']);
    setIsAddGoalModalVisible(true);
  };

  const closeAddGoalModal = () => {
    setIsAddGoalModalVisible(false);
  };

  const toggleMember = (name) => {
    setGoalMembers((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }

      return [...prev, name];
    });
  };

  const completeGoal = (goal) => {
    const completedGoal = {
      ...goal,
      isCompleted: true,
      completedAt: 'Сегодня',
    };

    setGoals((prev) => prev.filter((item) => item.id !== goal.id));
    setCompletedGoals((prev) => [completedGoal, ...prev]);
  };

  const addGoal = () => {
    const trimmedTitle = goalTitle.trim();
    const targetAmount = Number(goalTargetAmount.replace(/\s/g, '').replace(',', '.'));

    if (!trimmedTitle) {
      Alert.alert('Новая цель', 'Введите название цели');
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      Alert.alert('Новая цель', 'Введите корректную сумму цели');
      return;
    }

    if (goalScope === 'family' && goalMembers.length === 0) {
      Alert.alert('Новая цель', 'Выберите хотя бы одного участника');
      return;
    }

    const newGoal = {
      id: Date.now(),
      title: trimmedTitle,
      description: goalDescription.trim() || 'Описание цели пока не добавлено.',
      scope: goalScope,
      scopeTitle: goalScope === 'family' ? 'Общая цель' : 'Личная цель',
      members: goalScope === 'family' ? goalMembers : ['Вы'],
      currentAmount: 0,
      targetAmount,
      color: goalColor,
      isCompleted: false,
    };

    setGoals((prev) => [newGoal, ...prev]);
    closeAddGoalModal();
  };

  const renderGoalProgress = (goal) => {
    const percent = getGoalPercent(goal);
    const isReadyToComplete = percent >= 100 && !goal.isCompleted;

    return (
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
              backgroundColor: isReadyToComplete ? '#10B981' : goal.color || goalColor,
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
    const isReadyToComplete = percent >= 100 && !goal.isCompleted;

    return (
      <TouchableOpacity
        key={goal.id}
        style={styles.goalCard}
        activeOpacity={0.78}
        onPress={() => openGoalDetail(goal)}
      >
        <View style={styles.goalTopRow}>
          <View style={styles.goalLeft}>
            <View
              style={[
                styles.goalIcon,
                {
                  backgroundColor: isReadyToComplete ? '#10B981' : goal.color || goalColor,
                },
              ]}
            >
              <Ionicons
                name={isReadyToComplete ? 'checkmark-outline' : 'flag-outline'}
                size={20}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.goalTextBlock}>
              <Text style={styles.goalTitle} allowFontScaling={false} numberOfLines={1}>
                {goal.title}
              </Text>

              <Text style={styles.goalMeta} allowFontScaling={false} numberOfLines={1}>
                {goal.scopeTitle} · {goal.members.join(', ')}
              </Text>
            </View>
          </View>

          {isReadyToComplete ? (
            <TouchableOpacity
              style={styles.completeButton}
              activeOpacity={0.8}
              onPress={() => completeGoal(goal)}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={21} color="#B8B8B8" />
          )}
        </View>

        {isReadyToComplete && (
          <View style={styles.completedReadyBadge}>
            <Ionicons name="sparkles-outline" size={16} color="#10B981" />

            <Text style={styles.completedReadyText} allowFontScaling={false}>
              Цель выполнена! Нажмите на галочку, чтобы перенести её в выполненные.
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
            <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
          </View>

          <View style={styles.goalTextBlock}>
            <Text style={styles.goalTitle} allowFontScaling={false} numberOfLines={1}>
              {goal.title}
            </Text>

            <Text style={styles.goalMeta} allowFontScaling={false} numberOfLines={1}>
              Выполнено · {goal.completedAt || 'Сегодня'}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={21} color="#B8B8B8" />
      </View>

      <Text style={styles.completedGoalText} allowFontScaling={false}>
        Цель выполнена 🎉
      </Text>
    </TouchableOpacity>
  );

  const renderScopeTabs = () => (
    <View style={styles.scopeTabs}>
      <TouchableOpacity
        style={[
          styles.scopeTab,
          goalScope === 'personal' && styles.scopeTabActive,
        ]}
        activeOpacity={0.85}
        onPress={() => {
          setGoalScope('personal');
          setGoalMembers(['Вы']);
        }}
      >
        <Text
          style={[
            styles.scopeTabText,
            goalScope === 'personal' && styles.scopeTabTextActive,
          ]}
          allowFontScaling={false}
        >
          Личная
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.scopeTab,
          goalScope === 'family' && styles.scopeTabActive,
        ]}
        activeOpacity={0.85}
        onPress={() => setGoalScope('family')}
      >
        <Text
          style={[
            styles.scopeTabText,
            goalScope === 'family' && styles.scopeTabTextActive,
          ]}
          allowFontScaling={false}
        >
          Общая
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMembersPicker = () => {
    if (goalScope !== 'family') {
      return null;
    }

    return (
      <>
        <Text style={styles.inputLabel} allowFontScaling={false}>
          Участники
        </Text>

        <View style={styles.membersSelectWrap}>
          {FAMILY_MEMBERS.map((member) => {
            const isSelected = goalMembers.includes(member.name);

            return (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberSelectChip,
                  isSelected && styles.memberSelectChipActive,
                ]}
                activeOpacity={0.75}
                onPress={() => toggleMember(member.name)}
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
              </TouchableOpacity>
            );
          })}
        </View>
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
                Название
              </Text>

              <TextInput
                style={styles.textInput}
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="Название цели"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Сумма цели
              </Text>

              <TextInput
                style={styles.textInput}
                value={goalTargetAmount}
                onChangeText={setGoalTargetAmount}
                keyboardType="numeric"
                placeholder="Сумма"
                placeholderTextColor="#A1A1A1"
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>
                Описание
              </Text>

              <TextInput
                style={styles.descriptionInput}
                value={goalDescription}
                onChangeText={setGoalDescription}
                multiline
                textAlignVertical="top"
                placeholder="Краткое описание цели"
                placeholderTextColor="#A1A1A1"
              />

              {renderMembersPicker()}

              <TouchableOpacity
                style={[
                  styles.addGoalSubmitButton,
                  {
                    backgroundColor: goalColor,
                  },
                ]}
                activeOpacity={0.85}
                onPress={addGoal}
              >
                <Ionicons name="add" size={21} color="#FFFFFF" />

                <Text style={styles.addGoalSubmitText} allowFontScaling={false}>
                  Добавить цель
                </Text>
              </TouchableOpacity>
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
            Цели
          </Text>

          <TouchableOpacity
            style={styles.headerRightButton}
            activeOpacity={0.75}
            onPress={openAddGoalModal}
          >
            <Ionicons name="add" size={23} color="#9456FE" />
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
                Цели блока
              </Text>

              <Text style={styles.introSubtitle} allowFontScaling={false}>
                {financeSpaceTitle}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Активные цели
            </Text>

            <Text style={styles.sectionCount} allowFontScaling={false}>
              {activeGoals.length}
            </Text>
          </View>

          {activeGoals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="flag-outline" size={26} color="#9456FE" />

              <Text style={styles.emptyTitle} allowFontScaling={false}>
                Активных целей пока нет
              </Text>

              <Text style={styles.emptyText} allowFontScaling={false}>
                Добавьте цель, чтобы отслеживать накопления и прогресс.
              </Text>
            </View>
          ) : (
            activeGoals.map(renderGoalCard)
          )}

          <TouchableOpacity
            style={[
              styles.addGoalButton,
              {
                backgroundColor: goalColor,
              },
            ]}
            activeOpacity={0.85}
            onPress={openAddGoalModal}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />

            <Text style={styles.addGoalButtonText} allowFontScaling={false}>
              Добавить цель
            </Text>
          </TouchableOpacity>

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
    backgroundColor: '#9456FE',
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
    color: '#9456FE',
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
    borderColor: '#E8FAF3',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  completedGoalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10B981',
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

  completeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },

  completedReadyBadge: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: '#E8FAF3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  completedReadyText: {
    flex: 1,
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#10B981',
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
  },

  progressText: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  completedGoalText: {
    marginTop: 12,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#10B981',
  },

  addGoalButton: {
    height: 56,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 22,
  },

  addGoalButtonText: {
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
    marginBottom: 12,
  },

  emptyTitle: {
    marginTop: 10,
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
    backgroundColor: '#9456FE',
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

  membersSelectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },

  memberSelectChip: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 13,
  },

  memberSelectChipActive: {
    borderWidth: 1.5,
    borderColor: '#9456FE',
    backgroundColor: '#F3ECFF',
  },

  memberSelectAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  memberSelectAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#9456FE',
  },

  memberSelectName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  addGoalSubmitButton: {
    minHeight: 56,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addGoalSubmitText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});