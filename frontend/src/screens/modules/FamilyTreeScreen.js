import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
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

const PRIMARY = '#9456FE';
const PRIMARY_LIGHT = '#F3ECFF';

const NODE_CONTAINER_WIDTH = 80;
const AVATAR_SIZE = 52;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

const CANVAS_MIN_WIDTH = 430;
const ROW_START_Y = 56;
const ROW_GAP = 122;

const INITIAL_LEVELS = [
  {
    id: 'level_1',
    title: 'Старшее поколение',
    members: [
      {
        id: 1,
        name: 'Иван',
        relation: 'Дедушка',
        initials: 'И',
        color: '#F3ECFF',
        isYou: false,
      },
    ],
  },
  {
    id: 'level_2',
    title: 'Родители',
    members: [
      {
        id: 2,
        name: 'Елена',
        relation: 'Мама',
        initials: 'Е',
        color: '#FFE8F1',
        isYou: false,
      },
      {
        id: 3,
        name: 'Павел',
        relation: 'Папа',
        initials: 'П',
        color: '#EAF0FF',
        isYou: false,
      },
      {
        id: 4,
        name: 'Алексей',
        relation: 'Дядя',
        initials: 'А',
        color: '#FFF1DE',
        isYou: false,
      },
    ],
  },
  {
    id: 'level_3',
    title: 'Дети',
    members: [
      {
        id: 5,
        name: 'Миша',
        relation: 'Сын',
        initials: 'М',
        color: '#EAF0FF',
        isYou: false,
      },
      {
        id: 6,
        name: 'Вы',
        relation: 'Вы',
        initials: 'В',
        color: '#F3ECFF',
        isYou: true,
      },
      {
        id: 7,
        name: 'Аня',
        relation: 'Дочь',
        initials: 'А',
        color: '#FFE8F1',
        isYou: false,
      },
    ],
  },
];

function getInitials(name) {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    return '?';
  }

  return cleanName[0].toUpperCase();
}

function getCanvasWidth(levels) {
  const maxMembersCount = Math.max(
    ...levels.map((level) => level.members.length),
    1
  );

  return Math.max(
    CANVAS_MIN_WIDTH,
    maxMembersCount * 84 + 80
  );
}

function getCenters(count, canvasWidth) {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [canvasWidth / 2];
  }

  const margin = 46;
  const availableWidth = canvasWidth - margin * 2;
  const step = availableWidth / (count - 1);

  return Array.from({ length: count }).map((_, index) => {
    return margin + step * index;
  });
}

function getAverage(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default function FamilyTreeScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [levels, setLevels] = useState(INITIAL_LEVELS);

  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState(INITIAL_LEVELS[2].id);
  const [memberName, setMemberName] = useState('');
  const [memberRelation, setMemberRelation] = useState('');

  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [levelTitleInput, setLevelTitleInput] = useState('');
  const [editingLevelId, setEditingLevelId] = useState(null);

  const [insertMode, setInsertMode] = useState('after');
  const [insertAfterLevelId, setInsertAfterLevelId] = useState(INITIAL_LEVELS[0].id);

  const canvasWidth = useMemo(() => getCanvasWidth(levels), [levels]);

  const canvasHeight = useMemo(() => {
    return ROW_START_Y + levels.length * ROW_GAP + 42;
  }, [levels]);

  const layout = useMemo(() => {
    return levels.reduce((acc, level, index) => {
      acc[level.id] = {
        top: ROW_START_Y + index * ROW_GAP,
        centers: getCenters(level.members.length, canvasWidth),
      };

      return acc;
    }, {});
  }, [levels, canvasWidth]);

  const openAddMemberModal = (levelId = null) => {
    const targetLevelId = levelId || levels[levels.length - 1]?.id;

    setSelectedLevelId(targetLevelId);
    setMemberName('');
    setMemberRelation('');
    setMemberModalVisible(true);
  };

  const closeMemberModal = () => {
    setMemberModalVisible(false);
    setMemberName('');
    setMemberRelation('');
  };

  const createMember = () => {
    const cleanName = memberName.trim();
    const cleanRelation = memberRelation.trim();

    if (!cleanName) {
      Alert.alert('Ошибка', 'Введите имя родственника');
      return;
    }

    if (!cleanRelation) {
      Alert.alert('Ошибка', 'Введите родственную связь');
      return;
    }

    const newMember = {
      id: Date.now(),
      name: cleanName,
      relation: cleanRelation,
      initials: getInitials(cleanName),
      color: PRIMARY_LIGHT,
      isYou: false,
    };

    setLevels((prev) =>
      prev.map((level) => {
        if (level.id !== selectedLevelId) {
          return level;
        }

        return {
          ...level,
          members: [...level.members, newMember],
        };
      })
    );

    closeMemberModal();
  };

  const openAddLevelModal = () => {
    const firstLevelId = levels[0]?.id || null;

    setEditingLevelId(null);
    setLevelTitleInput('');
    setInsertMode('top');
    setInsertAfterLevelId(firstLevelId);
    setLevelModalVisible(true);
  };

  const openEditLevelModal = (level) => {
    setEditingLevelId(level.id);
    setLevelTitleInput(level.title);
    setLevelModalVisible(true);
  };

  const closeLevelModal = () => {
    setLevelModalVisible(false);
    setLevelTitleInput('');
    setEditingLevelId(null);
    setInsertMode('after');
    setInsertAfterLevelId(levels[0]?.id || null);
  };

  const saveLevel = () => {
    const cleanTitle = levelTitleInput.trim();

    if (!cleanTitle) {
      Alert.alert('Ошибка', 'Введите название уровня');
      return;
    }

    if (editingLevelId) {
      setLevels((prev) =>
        prev.map((level) => {
          if (level.id !== editingLevelId) {
            return level;
          }

          return {
            ...level,
            title: cleanTitle,
          };
        })
      );

      closeLevelModal();
      return;
    }

    const newLevel = {
      id: `level_${Date.now()}`,
      title: cleanTitle,
      members: [],
    };

    setLevels((prev) => {
      if (insertMode === 'top') {
        return [newLevel, ...prev];
      }

      const insertIndex = prev.findIndex((level) => level.id === insertAfterLevelId);

      if (insertIndex === -1) {
        return [...prev, newLevel];
      }

      const updatedLevels = [...prev];
      updatedLevels.splice(insertIndex + 1, 0, newLevel);

      return updatedLevels;
    });

    setSelectedLevelId(newLevel.id);
    closeLevelModal();
  };

  const openMemberInfo = (member, levelId) => {
    Alert.alert(
      member.relation,
      `Имя: ${member.name}`,
      [
        {
          text: 'Добавить рядом',
          onPress: () => openAddMemberModal(levelId),
        },
        {
          text: 'Закрыть',
          style: 'cancel',
        },
      ]
    );
  };

  const renderLine = ({
    key,
    left,
    top,
    width,
    height,
  }) => (
    <View
      key={key}
      style={[
        styles.treeLine,
        {
          left,
          top,
          width,
          height,
        },
      ]}
    />
  );

  const renderConnectors = () => {
    const lines = [];

    for (let index = 0; index < levels.length - 1; index += 1) {
      const currentLevel = levels[index];
      const nextLevel = levels[index + 1];

      const currentLayout = layout[currentLevel.id];
      const nextLayout = layout[nextLevel.id];

      if (
        !currentLayout ||
        !nextLayout ||
        currentLayout.centers.length === 0 ||
        nextLayout.centers.length === 0
      ) {
        continue;
      }

      const sourceX = getAverage(currentLayout.centers);
      const sourceBottom = currentLayout.top + AVATAR_SIZE;
      const branchY = nextLayout.top - 24;

      lines.push(
        renderLine({
          key: `vertical-main-${currentLevel.id}-${nextLevel.id}`,
          left: sourceX,
          top: sourceBottom,
          width: 2,
          height: branchY - sourceBottom,
        })
      );

      const firstNextX = Math.min(...nextLayout.centers);
      const lastNextX = Math.max(...nextLayout.centers);

      lines.push(
        renderLine({
          key: `horizontal-${currentLevel.id}-${nextLevel.id}`,
          left: firstNextX,
          top: branchY,
          width: lastNextX - firstNextX,
          height: 2,
        })
      );

      nextLayout.centers.forEach((centerX, childIndex) => {
        lines.push(
          renderLine({
            key: `vertical-child-${nextLevel.id}-${childIndex}`,
            left: centerX,
            top: branchY,
            width: 2,
            height: nextLayout.top - branchY,
          })
        );
      });
    }

    return lines;
  };

  const renderLevelLabel = (level, top) => (
    <TouchableOpacity
      key={`label-${level.id}`}
      style={[
        styles.levelLabel,
        {
          top: top - 34,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => openEditLevelModal(level)}
    >
      <Text
        style={styles.levelLabelText}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {level.title}
      </Text>

      <Ionicons name="create-outline" size={14} color={PRIMARY} />
    </TouchableOpacity>
  );

  const renderEmptyLevelButton = (level, top) => (
    <TouchableOpacity
      key={`empty-${level.id}`}
      style={[
        styles.emptyLevelButton,
        {
          left: canvasWidth / 2 - 86,
          top,
        },
      ]}
      activeOpacity={0.85}
      onPress={() => openAddMemberModal(level.id)}
    >
      <Ionicons name="person-add-outline" size={20} color={PRIMARY} />

      <Text style={styles.emptyLevelText} allowFontScaling={false}>
        Добавить человека
      </Text>
    </TouchableOpacity>
  );

  const renderMemberNode = (member, centerX, top, levelId) => {
    const left = centerX - NODE_CONTAINER_WIDTH / 2;

    return (
      <TouchableOpacity
        key={member.id}
        style={[
          styles.memberNode,
          {
            left,
            top,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => openMemberInfo(member, levelId)}
      >
        <View
          style={[
            styles.avatarOuter,
            member.isYou && styles.avatarOuterYou,
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: member.color,
              },
            ]}
          >
            <Text style={styles.avatarText} allowFontScaling={false}>
              {member.initials}
            </Text>
          </View>
        </View>

        {!member.isYou && (
          <TouchableOpacity
            style={styles.smallAddButton}
            activeOpacity={0.85}
            onPress={() => openAddMemberModal(levelId)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {member.isYou ? (
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText} allowFontScaling={false}>
              Вы
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={styles.memberRelation}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {member.relation}
            </Text>

            <Text
              style={styles.memberName}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {member.name}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderLevelSelector = (level) => {
    const isActive = selectedLevelId === level.id;

    return (
      <TouchableOpacity
        key={level.id}
        style={[
          styles.levelSelectorButton,
          isActive && styles.levelSelectorButtonActive,
        ]}
        activeOpacity={0.8}
        onPress={() => setSelectedLevelId(level.id)}
      >
        <Text
          style={[
            styles.levelSelectorText,
            isActive && styles.levelSelectorTextActive,
          ]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {level.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderInsertAfterButton = (level) => {
    const isActive =
      insertMode === 'after' && insertAfterLevelId === level.id;

    return (
      <TouchableOpacity
        key={level.id}
        style={[
          styles.positionButton,
          isActive && styles.positionButtonActive,
        ]}
        activeOpacity={0.8}
        onPress={() => {
          setInsertMode('after');
          setInsertAfterLevelId(level.id);
        }}
      >
        <Text
          style={[
            styles.positionButtonText,
            isActive && styles.positionButtonTextActive,
          ]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          После: {level.title}
        </Text>
      </TouchableOpacity>
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
          >
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.title} allowFontScaling={false}>
            Семейное древо
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.75}
              onPress={openAddLevelModal}
            >
              <Ionicons name="layers-outline" size={22} color="#262626" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.75}
              onPress={() => openAddMemberModal()}
            >
              <Ionicons name="person-add-outline" size={22} color="#262626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="git-network-outline" size={22} color={PRIMARY} />
          </View>

          <View style={styles.infoTextBlock}>
            <Text style={styles.infoTitle} allowFontScaling={false}>
              Семейная структура
            </Text>

            <Text style={styles.infoText} allowFontScaling={false}>
              Добавляйте уровни выше, ниже или между поколениями
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
          <View style={styles.treeWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalContent}
            >
              <View
                style={[
                  styles.treeCanvas,
                  {
                    width: canvasWidth,
                    height: canvasHeight,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={90}
                  color={PRIMARY_LIGHT}
                  style={styles.backgroundIconLeft}
                />

                <Ionicons
                  name="git-network-outline"
                  size={100}
                  color={PRIMARY_LIGHT}
                  style={styles.backgroundIconRight}
                />

                {renderConnectors()}

                {levels.map((level) => {
                  const levelLayout = layout[level.id];

                  return (
                    <React.Fragment key={level.id}>
                      {renderLevelLabel(level, levelLayout.top)}

                      {level.members.length === 0
                        ? renderEmptyLevelButton(level, levelLayout.top)
                        : level.members.map((member, memberIndex) =>
                            renderMemberNode(
                              member,
                              levelLayout.centers[memberIndex],
                              levelLayout.top,
                              level.id
                            )
                          )}
                    </React.Fragment>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingAddButton}
          activeOpacity={0.85}
          onPress={() => openAddMemberModal()}
        >
          <Ionicons name="add" size={34} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal
          visible={memberModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMemberModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeMemberModal}
            />

            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="person-add-outline" size={32} color={PRIMARY} />
              </View>

              <Text style={styles.modalTitle} allowFontScaling={false}>
                Добавить родственника
              </Text>

              <TextInput
                style={styles.input}
                value={memberName}
                onChangeText={setMemberName}
                placeholder="Имя"
                placeholderTextColor="#A4A4A4"
                allowFontScaling={false}
              />

              <TextInput
                style={styles.input}
                value={memberRelation}
                onChangeText={setMemberRelation}
                placeholder="Кем приходится: мама, брат, дочь..."
                placeholderTextColor="#A4A4A4"
                allowFontScaling={false}
              />

              <Text style={styles.modalLabel} allowFontScaling={false}>
                Уровень дерева
              </Text>

              <View style={styles.levelSelectorWrap}>
                {levels.map(renderLevelSelector)}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={createMember}
              >
                <Text style={styles.primaryButtonText} allowFontScaling={false}>
                  Добавить в древо
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.75}
                onPress={closeMemberModal}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={levelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeLevelModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeLevelModal}
            />

            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="layers-outline" size={32} color={PRIMARY} />
              </View>

              <Text style={styles.modalTitle} allowFontScaling={false}>
                {editingLevelId ? 'Изменить уровень' : 'Новый уровень'}
              </Text>

              <TextInput
                style={styles.input}
                value={levelTitleInput}
                onChangeText={setLevelTitleInput}
                placeholder="Например: Прабабушки и прадедушки"
                placeholderTextColor="#A4A4A4"
                allowFontScaling={false}
                autoFocus
              />

              {!editingLevelId && (
                <>
                  <Text style={styles.modalLabel} allowFontScaling={false}>
                    Где разместить уровень
                  </Text>

                  <View style={styles.positionWrap}>
                    <TouchableOpacity
                      style={[
                        styles.positionButton,
                        insertMode === 'top' && styles.positionButtonActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setInsertMode('top')}
                    >
                      <Text
                        style={[
                          styles.positionButtonText,
                          insertMode === 'top' && styles.positionButtonTextActive,
                        ]}
                        allowFontScaling={false}
                      >
                        Выше всех
                      </Text>
                    </TouchableOpacity>

                    {levels.map(renderInsertAfterButton)}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={saveLevel}
              >
                <Text style={styles.primaryButtonText} allowFontScaling={false}>
                  {editingLevelId ? 'Сохранить' : 'Добавить уровень'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.75}
                onPress={closeLevelModal}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 14,
  },

  title: {
    flex: 1,
    marginHorizontal: 12,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 7,
  },

  infoCard: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  infoTextBlock: {
    flex: 1,
  },

  infoTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  infoText: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#7B5CB8',
  },

  pageContent: {
    paddingBottom: 140,
  },

  treeWrapper: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  horizontalContent: {
    paddingHorizontal: 2,
  },

  treeCanvas: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },

  backgroundIconLeft: {
    position: 'absolute',
    top: 36,
    left: 112,
    opacity: 0.7,
    transform: [{ rotate: '-20deg' }],
  },

  backgroundIconRight: {
    position: 'absolute',
    top: 180,
    right: 90,
    opacity: 0.55,
    transform: [{ rotate: '18deg' }],
  },

  treeLine: {
    position: 'absolute',
    backgroundColor: PRIMARY,
    opacity: 0.55,
    zIndex: 1,
  },

  levelLabel: {
    position: 'absolute',
    left: 12,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 8,
  },

  levelLabelText: {
    maxWidth: 160,
    marginRight: 5,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: PRIMARY,
  },

  memberNode: {
    position: 'absolute',
    width: NODE_CONTAINER_WIDTH,
    alignItems: 'center',
    zIndex: 5,
  },

  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E7E7E7',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  avatarOuterYou: {
    borderColor: PRIMARY,
    borderWidth: 3,
  },

  avatar: {
    width: AVATAR_SIZE - 8,
    height: AVATAR_SIZE - 8,
    borderRadius: (AVATAR_SIZE - 8) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#262626',
  },

  smallAddButton: {
    position: 'absolute',
    top: 32,
    right: 9,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.24,
    shadowRadius: 7,
    elevation: 5,
  },

  memberRelation: {
    marginTop: 6,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#262626',
    textAlign: 'center',
  },

  memberName: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: '#8A8A8A',
    textAlign: 'center',
  },

  youBadge: {
    marginTop: 6,
    minWidth: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 11,
  },

  youBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#FFFFFF',
  },

  emptyLevelButton: {
    position: 'absolute',
    width: 172,
    height: 64,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  emptyLevelText: {
    marginTop: 4,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: PRIMARY,
  },

  floatingAddButton: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  modalCard: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 22,
    alignItems: 'center',
  },

  modalIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
    marginBottom: 18,
  },

  input: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginBottom: 14,
  },

  modalLabel: {
    alignSelf: 'flex-start',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#434343',
    marginBottom: 10,
  },

  levelSelectorWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },

  levelSelectorButton: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginRight: 8,
    marginBottom: 8,
  },

  levelSelectorButtonActive: {
    backgroundColor: PRIMARY,
  },

  levelSelectorText: {
    maxWidth: 140,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#606060',
  },

  levelSelectorTextActive: {
    color: '#FFFFFF',
  },

  positionWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },

  positionButton: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginRight: 8,
    marginBottom: 8,
  },

  positionButtonActive: {
    backgroundColor: PRIMARY,
  },

  positionButtonText: {
    maxWidth: 220,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#606060',
  },

  positionButtonTextActive: {
    color: '#FFFFFF',
  },

  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  cancelButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  cancelButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },
});