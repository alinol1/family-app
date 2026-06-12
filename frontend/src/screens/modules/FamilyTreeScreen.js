import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import buildFullTreeLayout from '../../utils/familytree/buildFullTreeLayout';
import getVisibleLayout from '../../utils/familytree/getVisibleLayout';

import {
  getFamilyTree,
  createTreePerson,
  addTreeRelative,
} from '../../api/familytree';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAIN_COLOR = '#9456FE';

const PERSON_CARD_WIDTH = 150;
const PERSON_CARD_HEIGHT = 150;

const PLACEHOLDER_SIZE = 42;
const PLACEHOLDER_WIDTH = 92;
const PLACEHOLDER_HEIGHT = 70;

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.8;

const RELATIVE_TYPES = [
  { key: 'mother', title: 'Мама', icon: 'female-outline' },
  { key: 'father', title: 'Папа', icon: 'male-outline' },
  { key: 'child', title: 'Ребёнок', icon: 'person-add-outline' },
  { key: 'partner', title: 'Супруг / партнёр', icon: 'heart-outline' },
  { key: 'sibling', title: 'Брат / сестра', icon: 'git-branch-outline' },
];

const GENDER_OPTIONS = [
  { key: 'female', title: 'Женский' },
  { key: 'male', title: 'Мужской' },
  { key: 'unknown', title: 'Не указано' },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDistance(touchA, touchB) {
  const dx = touchA.pageX - touchB.pageX;
  const dy = touchA.pageY - touchB.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getFullName(person) {
  if (!person) return 'Неизвестно';

  const parts = [
    person.firstName || '',
    person.lastName || '',
  ].filter(Boolean);

  return parts.join(' ').trim() || 'Без имени';
}

function getInitials(person) {
  const fullName = getFullName(person);
  const parts = fullName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return fullName.slice(0, 1).toUpperCase();
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

  return 'Дата не указана';
}

function getRelativeTitle(type) {
  const item = RELATIVE_TYPES.find((relative) => relative.key === type);
  return item?.title || 'Родственник';
}

function emptyToNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function normalizePerson(person) {
  return {
    id: person.id,
    linkedUserId: person.linked_user_id ?? person.linked_user ?? null,
    isCurrentUser: Boolean(person.is_current_user),
    firstName: person.first_name || '',
    lastName: person.last_name || '',
    middleName: person.middle_name || '',
    gender: person.gender || 'unknown',
    birthDate: person.birth_date || '',
    deathDate: person.death_date || '',
    photoUrl: person.photo_url || person.photo || '',
    note: person.note || '',
    personalLabel: person.personal_label || '',
  };
}

function normalizeFamilyAccount(member) {
  return {
    id: member.user_id,
    membershipId: member.id,
    firstName: member.first_name || '',
    lastName: member.last_name || '',
    avatarUrl: member.avatar || member.avatar_url || '',
    role: member.role || '',
  };
}

function normalizeTreeData(data = {}) {
  const normalizedPersons = (data.persons || []).map(normalizePerson);
  const labels = {};

  normalizedPersons.forEach((person) => {
    if (person.personalLabel) {
      labels[person.id] = person.personalLabel;
    }
  });

  return {
    currentUserId: data.current_user_id ?? null,

    persons: normalizedPersons,

    parentChildRelations: (data.parent_child_relations || []).map((relation) => ({
      id: relation.id,
      parentId: relation.parent_id ?? relation.parent,
      childId: relation.child_id ?? relation.child,
      relationType: relation.relation_type || '',
    })),

    partnerships: (data.partnerships || []).map((partnership) => ({
      id: partnership.id,
      partner1Id: partnership.partner1_id ?? partnership.partner1,
      partner2Id: partnership.partner2_id ?? partnership.partner2,
      status: partnership.status || '',
      startDate: partnership.start_date || '',
      endDate: partnership.end_date || '',
    })),

    siblingRelations: (data.sibling_relations || []).map((relation) => ({
      id: relation.id,
      person1Id: relation.person1_id ?? relation.person1,
      person2Id: relation.person2_id ?? relation.person2,
    })),

    familyAccounts: (data.family_members || [])
      .map(normalizeFamilyAccount)
      .filter((account) => Boolean(account.id)),

    linkedUserIds:
      data.linked_user_ids ||
      normalizedPersons
        .map((person) => person.linkedUserId)
        .filter(Boolean),

    personalLabels: labels,
  };
}

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

function makeActionLine(id, fromX, fromY, toX, toY) {
  return {
    id,
    d: `M ${fromX} ${fromY} L ${toX} ${toY}`,
  };
}

function makeActionNode({
  key,
  title,
  relationType,
  targetPersonId,
  x,
  y,
}) {
  return {
    key,
    type: 'placeholder',
    title,
    relationType,
    targetPersonId,
    x,
    y,
    width: PLACEHOLDER_WIDTH,
    height: PLACEHOLDER_HEIGHT,
    centerX: x + PLACEHOLDER_WIDTH / 2,
    centerY: y + PLACEHOLDER_SIZE / 2,
    topY: y,
    bottomY: y + PLACEHOLDER_SIZE,
    rightX: x + PLACEHOLDER_WIDTH,
  };
}

function createSelectedActionNodes({
  selectedNode,
  parents,
  partners,
}) {
  if (!selectedNode) {
    return {
      nodes: [],
      path: '',
    };
  }

  const hasFather = parents.some((parent) => parent.gender === 'male');
  const hasMother = parents.some((parent) => parent.gender === 'female');
  const hasPartner = partners.length > 0;

  const nodes = [];
  const lines = [];

  const addNode = (node, fromX, fromY) => {
    nodes.push(node);

    lines.push(
      makeActionLine(
        `action-line-${node.key}`,
        fromX,
        fromY,
        node.centerX,
        node.centerY
      )
    );
  };

  if (!hasFather) {
    addNode(
      makeActionNode({
        key: `father-${selectedNode.id}`,
        title: 'Отец',
        relationType: 'father',
        targetPersonId: selectedNode.id,
        x: selectedNode.centerX - PLACEHOLDER_WIDTH - 18,
        y: selectedNode.y - PLACEHOLDER_HEIGHT - 34,
      }),
      selectedNode.centerX,
      selectedNode.topY
    );
  }

  if (!hasMother) {
    addNode(
      makeActionNode({
        key: `mother-${selectedNode.id}`,
        title: 'Мать',
        relationType: 'mother',
        targetPersonId: selectedNode.id,
        x: selectedNode.centerX + 18,
        y: selectedNode.y - PLACEHOLDER_HEIGHT - 34,
      }),
      selectedNode.centerX,
      selectedNode.topY
    );
  }

  addNode(
    makeActionNode({
      key: `sibling-${selectedNode.id}`,
      title: 'Брат / сестра',
      relationType: 'sibling',
      targetPersonId: selectedNode.id,
      x: selectedNode.x - PLACEHOLDER_WIDTH - 46,
      y: selectedNode.centerY - PLACEHOLDER_SIZE / 2,
    }),
    selectedNode.x,
    selectedNode.centerY
  );

  if (!hasPartner) {
    addNode(
      makeActionNode({
        key: `partner-${selectedNode.id}`,
        title: 'Супруг(а)',
        relationType: 'partner',
        targetPersonId: selectedNode.id,
        x: selectedNode.rightX + 46,
        y: selectedNode.centerY - PLACEHOLDER_SIZE / 2,
      }),
      selectedNode.rightX,
      selectedNode.centerY
    );
  }

  addNode(
    makeActionNode({
      key: `child-${selectedNode.id}`,
      title: 'Ребёнок',
      relationType: 'child',
      targetPersonId: selectedNode.id,
      x: selectedNode.centerX - PLACEHOLDER_WIDTH / 2,
      y: selectedNode.bottomY + 38,
    }),
    selectedNode.centerX,
    selectedNode.bottomY
  );

  return {
    nodes,
    path: lines.map((line) => line.d).join(' '),
  };
}

const PersonCard = memo(function PersonCard({
  node,
  isSelected,
  isMe,
  personalLabel,
  onPress,
  onLongPress,
}) {
  const person = node.person;

  return (
    <TouchableOpacity
      style={[
        styles.personCard,
        {
          left: node.x,
          top: node.y,
        },
        isSelected && styles.personCardSelected,
        isMe && styles.personCardMe,
      ]}
      activeOpacity={0.84}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {person.photoUrl ? (
        <Image source={{ uri: person.photoUrl }} style={styles.personPhoto} />
      ) : (
        <View style={styles.personPhotoPlaceholder}>
          <Text style={styles.personPhotoText} allowFontScaling={false}>
            {getInitials(person)}
          </Text>
        </View>
      )}

      <Text
        style={[styles.personName, isSelected && styles.personNameSelected]}
        allowFontScaling={false}
        numberOfLines={2}
      >
        {getFullName(person)}
      </Text>

      <Text
        style={[styles.personDates, isSelected && styles.personDatesSelected]}
        allowFontScaling={false}
        numberOfLines={2}
      >
        {getLifeDates(person)}
      </Text>

      {!!personalLabel && (
        <View style={[styles.personalLabel, isMe && styles.personalLabelMe]}>
          <Text
            style={[styles.personalLabelText, isMe && styles.personalLabelTextMe]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {isMe ? 'это вы' : personalLabel}
          </Text>
        </View>
      )}

      {!!person.linkedUserId && (
        <View style={styles.linkedMark}>
          <Ionicons name="link-outline" size={11} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
});

const PlaceholderNode = memo(function PlaceholderNode({ node, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.placeholderNode,
        {
          left: node.x,
          top: node.y,
        },
      ]}
      activeOpacity={0.82}
      onPress={() => onPress(node.relationType, node.targetPersonId)}
    >
      <View style={styles.placeholderCircle}>
        <Ionicons name="add" size={22} color="#111111" />
      </View>

      <View style={styles.placeholderLabel}>
        <Text style={styles.placeholderLabelText} allowFontScaling={false} numberOfLines={1}>
          {node.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function FamilyTreeScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [persons, setPersons] = useState([]);
  const [parentChildRelations, setParentChildRelations] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [siblingRelations, setSiblingRelations] = useState([]);
  const [familyAccounts, setFamilyAccounts] = useState([]);
  const [linkedUserIds, setLinkedUserIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [personalLabels, setPersonalLabels] = useState({});

  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [addTargetPersonId, setAddTargetPersonId] = useState(null);

  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState('');

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const [relativeType, setRelativeType] = useState('child');
  const [addMode, setAddMode] = useState('manual');
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [personalRelationText, setPersonalRelationText] = useState('');

  const [viewportSize, setViewportSize] = useState({
    width: 1,
    height: 1,
  });

  const transformRef = useRef({
    x: -220,
    y: -160,
    scale: 0.74,
  });

  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    startScale: 1,
    startDistance: 0,
  });

  const pendingCenterPersonIdRef = useRef(null);

  const [canvasTransform, setCanvasTransform] = useState(transformRef.current);

  const personMap = useMemo(() => {
    const map = new Map();

    persons.forEach((person) => {
      map.set(person.id, person);
    });

    return map;
  }, [persons]);

  const selectedPerson = useMemo(() => {
    return personMap.get(selectedPersonId) || persons[0] || null;
  }, [personMap, selectedPersonId, persons]);

  const addTargetPerson = useMemo(() => {
    return personMap.get(addTargetPersonId) || selectedPerson;
  }, [personMap, addTargetPersonId, selectedPerson]);

  const parentsByChild = useMemo(() => {
    const map = new Map();

    persons.forEach((person) => {
      map.set(person.id, []);
    });

    parentChildRelations.forEach((relation) => {
      if (!map.has(relation.childId)) {
        map.set(relation.childId, []);
      }

      if (!map.get(relation.childId).includes(relation.parentId)) {
        map.get(relation.childId).push(relation.parentId);
      }
    });

    return map;
  }, [persons, parentChildRelations]);

  const partnersByPerson = useMemo(() => {
    const map = new Map();

    persons.forEach((person) => {
      map.set(person.id, []);
    });

    partnerships.forEach((partnership) => {
      if (!map.has(partnership.partner1Id)) {
        map.set(partnership.partner1Id, []);
      }

      if (!map.has(partnership.partner2Id)) {
        map.set(partnership.partner2Id, []);
      }

      if (!map.get(partnership.partner1Id).includes(partnership.partner2Id)) {
        map.get(partnership.partner1Id).push(partnership.partner2Id);
      }

      if (!map.get(partnership.partner2Id).includes(partnership.partner1Id)) {
        map.get(partnership.partner2Id).push(partnership.partner1Id);
      }
    });

    return map;
  }, [persons, partnerships]);

  const selectedParents = useMemo(() => {
    if (!selectedPersonId) return [];

    return (parentsByChild.get(selectedPersonId) || [])
      .map((parentId) => personMap.get(parentId))
      .filter(Boolean);
  }, [selectedPersonId, parentsByChild, personMap]);

  const selectedPartners = useMemo(() => {
    if (!selectedPersonId) return [];

    return (partnersByPerson.get(selectedPersonId) || [])
      .map((partnerId) => personMap.get(partnerId))
      .filter(Boolean);
  }, [selectedPersonId, partnersByPerson, personMap]);

  const availableAccounts = useMemo(() => {
    const linkedIds = new Set(linkedUserIds);
    return familyAccounts.filter((account) => !linkedIds.has(account.id));
  }, [familyAccounts, linkedUserIds]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    return persons
      .filter((person) => getFullName(person).toLowerCase().includes(query))
      .slice(0, 5);
  }, [persons, search]);

  const fullLayout = useMemo(() => {
    return buildFullTreeLayout({
      persons,
      parentChildRelations,
      partnerships,
      siblingRelations,
    });
  }, [
    persons,
    parentChildRelations,
    partnerships,
    siblingRelations,
  ]);

  const visibleLayout = useMemo(() => {
    return getVisibleLayout({
      layout: fullLayout,
      viewportSize,
      transform: canvasTransform,
    });
  }, [
    fullLayout,
    viewportSize,
    canvasTransform,
  ]);

  const selectedNode = useMemo(() => {
    if (!selectedPersonId) return null;
    return fullLayout.nodeById?.[selectedPersonId] || null;
  }, [fullLayout, selectedPersonId]);

  const selectedActionLayout = useMemo(() => {
    try {
      return createSelectedActionNodes({
        selectedNode,
        parents: selectedParents,
        partners: selectedPartners,
      });
    } catch (error) {
      console.log('[FamilyTree] action nodes error:', error);

      return {
        nodes: [],
        path: '',
      };
    }
  }, [
    selectedNode,
    selectedParents,
    selectedPartners,
  ]);

  const updateCanvasTransform = useCallback((nextTransform) => {
    const normalizedTransform = {
      x: Number.isFinite(nextTransform.x) ? nextTransform.x : transformRef.current.x,
      y: Number.isFinite(nextTransform.y) ? nextTransform.y : transformRef.current.y,
      scale: clamp(
        Number.isFinite(nextTransform.scale) ? nextTransform.scale : transformRef.current.scale,
        MIN_SCALE,
        MAX_SCALE
      ),
    };

    transformRef.current = normalizedTransform;
    setCanvasTransform(normalizedTransform);
  }, []);

  const centerOnPerson = useCallback((personId = selectedPersonId, nextScale = transformRef.current.scale) => {
    if (!personId) return;

    const node = fullLayout.nodeById?.[personId];

    if (!node) return;

    const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);

    updateCanvasTransform({
      x: viewportSize.width / 2 - node.centerX * scale,
      y: viewportSize.height / 2 - node.centerY * scale,
      scale,
    });
  }, [
    selectedPersonId,
    fullLayout,
    viewportSize,
    updateCanvasTransform,
  ]);

  useEffect(() => {
    const pendingPersonId = pendingCenterPersonIdRef.current;

    if (!pendingPersonId) return;
    if (!fullLayout.nodeById?.[pendingPersonId]) return;
    if (viewportSize.width <= 1 || viewportSize.height <= 1) return;

    pendingCenterPersonIdRef.current = null;
    centerOnPerson(pendingPersonId, 0.74);
  }, [
    fullLayout,
    viewportSize,
    centerOnPerson,
  ]);

  const applyTreeData = useCallback((data, preferredSelectedId = null) => {
    const normalized = normalizeTreeData(data);

    const preferredPerson = preferredSelectedId
      ? normalized.persons.find((person) => person.id === preferredSelectedId)
      : null;

    const currentUserPerson = normalized.persons.find((person) => person.isCurrentUser);
    const firstPerson = normalized.persons[0] || null;

    const nextSelectedId =
      preferredPerson?.id ||
      currentUserPerson?.id ||
      firstPerson?.id ||
      null;

    setCurrentUserId(normalized.currentUserId);
    setPersons(normalized.persons);
    setParentChildRelations(normalized.parentChildRelations);
    setPartnerships(normalized.partnerships);
    setSiblingRelations(normalized.siblingRelations);
    setFamilyAccounts(normalized.familyAccounts);
    setLinkedUserIds(normalized.linkedUserIds);
    setPersonalLabels(normalized.personalLabels);
    setSelectedPersonId(nextSelectedId);
    setAddTargetPersonId(nextSelectedId);

    pendingCenterPersonIdRef.current = nextSelectedId;
  }, []);

  const loadTree = useCallback(async () => {
    try {
      setTreeError('');
      setIsLoadingTree(true);

      const data = await getFamilyTree();
      applyTreeData(data);
    } catch (error) {
      setTreeError(getApiErrorMessage(error));
      setCurrentUserId(null);
      setPersons([]);
      setParentChildRelations([]);
      setPartnerships([]);
      setSiblingRelations([]);
      setFamilyAccounts([]);
      setLinkedUserIds([]);
      setPersonalLabels({});
      setSelectedPersonId(null);
      setAddTargetPersonId(null);
    } finally {
      setIsLoadingTree(false);
    }
  }, [applyTreeData]);

  useFocusEffect(
    useCallback(() => {
      loadTree();
    }, [loadTree])
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (event, gestureState) => {
        const touches = event.nativeEvent.touches;

        return (
          touches.length >= 2 ||
          Math.abs(gestureState.dx) > 4 ||
          Math.abs(gestureState.dy) > 4
        );
      },

      onPanResponderGrant: (event) => {
        const current = transformRef.current;

        gestureRef.current = {
          startX: current.x,
          startY: current.y,
          startScale: current.scale,
          startDistance:
            event.nativeEvent.touches.length >= 2
              ? getDistance(event.nativeEvent.touches[0], event.nativeEvent.touches[1])
              : 0,
        };
      },

      onPanResponderMove: (event, gestureState) => {
        const touches = event.nativeEvent.touches;

        if (touches.length >= 2) {
          const distance = getDistance(touches[0], touches[1]);
          const startDistance = gestureRef.current.startDistance || distance;

          updateCanvasTransform({
            ...transformRef.current,
            scale: gestureRef.current.startScale * (distance / startDistance),
          });

          return;
        }

        updateCanvasTransform({
          ...transformRef.current,
          x: gestureRef.current.startX + gestureState.dx,
          y: gestureRef.current.startY + gestureState.dy,
        });
      },
    })
  ).current;

  const resetForm = useCallback(() => {
    setAddMode('manual');
    setSelectedAccountId(null);
    setFirstName('');
    setLastName('');
    setGender('unknown');
    setBirthDate('');
    setDeathDate('');
    setPhotoUrl('');
    setPersonalRelationText('');
  }, []);

  const applyRelativeDefaults = useCallback((type) => {
    if (type === 'mother') {
      setGender('female');
      setPersonalRelationText('мама');
      return;
    }

    if (type === 'father') {
      setGender('male');
      setPersonalRelationText('папа');
      return;
    }

    if (type === 'child') {
      setGender('unknown');
      setPersonalRelationText('ребёнок');
      return;
    }

    if (type === 'partner') {
      setGender('unknown');
      setPersonalRelationText('супруг / партнёр');
      return;
    }

    if (type === 'sibling') {
      setGender('unknown');
      setPersonalRelationText('брат/сестра');
    }
  }, []);

  const openAddModal = useCallback((type = 'child', targetPersonId = selectedPersonId) => {
    resetForm();

    setRelativeType(type);
    setAddTargetPersonId(targetPersonId);
    applyRelativeDefaults(type);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAddModalVisible(true);
  }, [
    resetForm,
    selectedPersonId,
    applyRelativeDefaults,
  ]);

  const closeAddModal = useCallback(() => {
    if (!isSaving) {
      setIsAddModalVisible(false);
    }
  }, [isSaving]);

  const openPersonDetails = useCallback((person) => {
    if (!person?.id) return;

    setSelectedPersonId(person.id);
    setAddTargetPersonId(person.id);

    navigation.navigate('FamilyTreePersonDetail', {
      personId: person.id,
    });
  }, [navigation]);

  const handlePersonPress = useCallback((person) => {
    if (!person?.id) return;

    if (selectedPersonId === person.id) {
      openPersonDetails(person);
      return;
    }

    setSelectedPersonId(person.id);
    setAddTargetPersonId(person.id);
  }, [
    selectedPersonId,
    openPersonDetails,
  ]);

  const selectPersonFromSearch = useCallback((person) => {
    if (!person?.id) return;

    setSearch('');
    setSelectedPersonId(person.id);
    setAddTargetPersonId(person.id);
    centerOnPerson(person.id);
  }, [centerOnPerson]);

  const selectAccount = useCallback((account) => {
    setSelectedAccountId(account.id);
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setPhotoUrl(account.avatarUrl || '');
  }, []);

  const createPersonPayload = useCallback(() => {
    const payload = {
      gender,
      birth_date: emptyToNull(birthDate),
      death_date: emptyToNull(deathDate),
      photo_url: photoUrl.trim(),
      personal_label: personalRelationText.trim(),
    };

    if (addMode === 'account') {
      if (!selectedAccountId) {
        Alert.alert('Семейное древо', 'Выберите участника семьи');
        return null;
      }

      payload.linked_user_id = selectedAccountId;
      payload.first_name = firstName.trim();
      payload.last_name = lastName.trim();

      return payload;
    }

    const trimmedFirstName = firstName.trim();

    if (!trimmedFirstName) {
      Alert.alert('Семейное древо', 'Введите имя');
      return null;
    }

    payload.first_name = trimmedFirstName;
    payload.last_name = lastName.trim();

    return payload;
  }, [
    addMode,
    selectedAccountId,
    gender,
    birthDate,
    deathDate,
    photoUrl,
    personalRelationText,
    firstName,
    lastName,
  ]);

  const submitRelative = useCallback(async () => {
    const targetPerson = personMap.get(addTargetPersonId);

    if (persons.length > 0 && !targetPerson) {
      Alert.alert('Семейное древо', 'Не выбран человек для связи');
      return;
    }

    if (targetPerson && (relativeType === 'mother' || relativeType === 'father')) {
      const targetParents = (parentsByChild.get(targetPerson.id) || [])
        .map((parentId) => personMap.get(parentId))
        .filter(Boolean);

      if (relativeType === 'mother') {
        const hasMother = targetParents.some((parent) => parent.gender === 'female');

        if (hasMother) {
          Alert.alert('Родитель уже указан', 'У этого человека уже указана мама.');
          return;
        }
      }

      if (relativeType === 'father') {
        const hasFather = targetParents.some((parent) => parent.gender === 'male');

        if (hasFather) {
          Alert.alert('Родитель уже указан', 'У этого человека уже указан папа.');
          return;
        }
      }
    }

    if (targetPerson && relativeType === 'sibling') {
      const targetParents = (parentsByChild.get(targetPerson.id) || [])
        .map((parentId) => personMap.get(parentId))
        .filter(Boolean);

      if (targetParents.length === 0) {
        Alert.alert(
          'Нельзя добавить брата или сестру',
          'Сначала добавьте выбранному человеку хотя бы одного родителя.'
        );
        return;
      }
    }

    const payload = createPersonPayload();

    if (!payload) return;

    try {
      setIsSaving(true);

      const previousIds = new Set(persons.map((person) => person.id));

      const data = targetPerson
        ? await addTreeRelative(targetPerson.id, {
            ...payload,
            relation_type: relativeType,
          })
        : await createTreePerson(payload);

      const normalized = normalizeTreeData(data);
      const createdPerson = normalized.persons.find((person) => !previousIds.has(person.id));

      let nextSelectedId =
        createdPerson?.id ||
        targetPerson?.id ||
        normalized.persons[0]?.id ||
        null;

      if (
        targetPerson &&
        ['mother', 'father', 'partner', 'sibling'].includes(relativeType)
      ) {
        nextSelectedId = targetPerson.id;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setCurrentUserId(normalized.currentUserId);
      setPersons(normalized.persons);
      setParentChildRelations(normalized.parentChildRelations);
      setPartnerships(normalized.partnerships);
      setSiblingRelations(normalized.siblingRelations);
      setFamilyAccounts(normalized.familyAccounts);
      setLinkedUserIds(normalized.linkedUserIds);
      setPersonalLabels(normalized.personalLabels);
      setSelectedPersonId(nextSelectedId);
      setAddTargetPersonId(nextSelectedId);

      pendingCenterPersonIdRef.current = nextSelectedId;

      closeAddModal();
    } catch (error) {
      Alert.alert('Семейное древо', getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    persons,
    personMap,
    parentsByChild,
    addTargetPersonId,
    relativeType,
    createPersonPayload,
    closeAddModal,
  ]);

  const zoomCanvas = useCallback((delta) => {
    updateCanvasTransform({
      ...transformRef.current,
      scale: transformRef.current.scale + delta,
    });
  }, [updateCanvasTransform]);

  const fitCanvas = useCallback(() => {
    if (!fullLayout.canvasWidth || !fullLayout.canvasHeight) return;
    if (viewportSize.width <= 1 || viewportSize.height <= 1) return;

    const scaleX = viewportSize.width / fullLayout.canvasWidth;
    const scaleY = viewportSize.height / fullLayout.canvasHeight;
    const nextScale = clamp(Math.min(scaleX, scaleY) * 0.92, MIN_SCALE, 0.9);

    updateCanvasTransform({
      scale: nextScale,
      x: viewportSize.width / 2 - (fullLayout.canvasWidth / 2) * nextScale,
      y: viewportSize.height / 2 - (fullLayout.canvasHeight / 2) * nextScale,
    });
  }, [
    fullLayout,
    viewportSize,
    updateCanvasTransform,
  ]);

  const centerOnMe = useCallback(() => {
    if (!currentUserId) return;

    const myPerson = persons.find((person) => person.linkedUserId === currentUserId);

    if (!myPerson) return;

    setSelectedPersonId(myPerson.id);
    setAddTargetPersonId(myPerson.id);
    centerOnPerson(myPerson.id);
  }, [
    currentUserId,
    persons,
    centerOnPerson,
  ]);

  const renderPersonCards = useMemo(() => {
    return visibleLayout.nodes.map((node) => (
      <PersonCard
        key={node.key}
        node={node}
        isSelected={node.id === selectedPersonId}
        isMe={node.person.linkedUserId === currentUserId}
        personalLabel={personalLabels[node.id]}
        onPress={() => handlePersonPress(node.person)}
        onLongPress={() => openPersonDetails(node.person)}
      />
    ));
  }, [
    visibleLayout.nodes,
    selectedPersonId,
    currentUserId,
    personalLabels,
    handlePersonPress,
    openPersonDetails,
  ]);

  const renderActionNodes = useMemo(() => {
    return selectedActionLayout.nodes.map((node) => (
      <PlaceholderNode
        key={node.key}
        node={node}
        onPress={openAddModal}
      />
    ));
  }, [
    selectedActionLayout.nodes,
    openAddModal,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={25} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} allowFontScaling={false}>
            Семейное древо
          </Text>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.75}
            onPress={() => openAddModal('child', selectedPersonId)}
          >
            <Ionicons name="add" size={23} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>

        {isLoadingTree ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator size="large" color={MAIN_COLOR} />
            <Text style={styles.stateTitle} allowFontScaling={false}>
              Загружаем древо
            </Text>
            <Text style={styles.stateText} allowFontScaling={false}>
              Получаем данные семейного древа с сервера.
            </Text>
          </View>
        ) : treeError ? (
          <View style={styles.stateBlock}>
            <Ionicons name="warning-outline" size={38} color={MAIN_COLOR} />
            <Text style={styles.stateTitle} allowFontScaling={false}>
              Не удалось открыть древо
            </Text>
            <Text style={styles.stateText} allowFontScaling={false}>
              {treeError}
            </Text>

            <TouchableOpacity
              style={styles.stateButton}
              activeOpacity={0.85}
              onPress={loadTree}
            >
              <Text style={styles.stateButtonText} allowFontScaling={false}>
                Повторить
              </Text>
            </TouchableOpacity>
          </View>
        ) : persons.length === 0 ? (
          <View style={styles.stateBlock}>
            <Ionicons name="git-network-outline" size={42} color={MAIN_COLOR} />

            <Text style={styles.stateTitle} allowFontScaling={false}>
              Древо пока пустое
            </Text>

            <Text style={styles.stateText} allowFontScaling={false}>
              Добавьте первого человека, а затем связывайте с ним родственников.
            </Text>

            <TouchableOpacity
              style={styles.stateButton}
              activeOpacity={0.85}
              onPress={() => openAddModal('child', null)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.stateButtonText} allowFontScaling={false}>
                Добавить человека
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.searchWrapper}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Поиск человека"
                  placeholderTextColor="#A1A1A1"
                  allowFontScaling={false}
                />

                {!!search.trim() ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSearch('')}
                  >
                    <Ionicons name="close-circle" size={21} color="#858585" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="search-outline" size={21} color="#858585" />
                )}
              </View>

              {!!search.trim() && (
                <View style={styles.searchResults}>
                  {searchResults.length === 0 ? (
                    <Text style={styles.searchEmptyText} allowFontScaling={false}>
                      Человек не найден
                    </Text>
                  ) : (
                    searchResults.map((person) => (
                      <TouchableOpacity
                        key={person.id}
                        style={styles.searchResultItem}
                        activeOpacity={0.75}
                        onPress={() => selectPersonFromSearch(person)}
                      >
                        {person.photoUrl ? (
                          <Image source={{ uri: person.photoUrl }} style={styles.searchAvatarImage} />
                        ) : (
                          <View style={styles.searchAvatar}>
                            <Text style={styles.searchAvatarText} allowFontScaling={false}>
                              {getInitials(person)}
                            </Text>
                          </View>
                        )}

                        <View style={styles.searchTextBlock}>
                          <Text
                            style={styles.searchName}
                            allowFontScaling={false}
                            numberOfLines={1}
                          >
                            {getFullName(person)}
                          </Text>

                          <Text
                            style={styles.searchDate}
                            allowFontScaling={false}
                            numberOfLines={1}
                          >
                            {getLifeDates(person)}
                          </Text>
                        </View>

                        {person.linkedUserId === currentUserId && (
                          <View style={styles.meBadgeSmall}>
                            <Text style={styles.meBadgeSmallText} allowFontScaling={false}>
                              Вы
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            <View
              style={styles.canvasViewport}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;

                setViewportSize((prev) => {
                  if (prev.width === width && prev.height === height) {
                    return prev;
                  }

                  return { width, height };
                });
              }}
              {...panResponder.panHandlers}
            >
              <View
                style={[
                  styles.canvas,
                  {
                    width: fullLayout.canvasWidth,
                    height: fullLayout.canvasHeight,
                    transform: [
                      { translateX: canvasTransform.x },
                      { translateY: canvasTransform.y },
                      { scale: canvasTransform.scale },
                    ],
                  },
                ]}
              >
                <Svg
                  width={fullLayout.canvasWidth}
                  height={fullLayout.canvasHeight}
                  style={styles.svgLayer}
                  pointerEvents="none"
                >
                  {!!visibleLayout.solidPath && (
                    <Path
                      d={visibleLayout.solidPath}
                      stroke="#C9CED4"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}

                  {!!visibleLayout.dashedPath && (
                    <Path
                      d={visibleLayout.dashedPath}
                      stroke="#BFA7EF"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="8 8"
                      fill="none"
                    />
                  )}

                  {!!selectedActionLayout.path && (
                    <Path
                      d={selectedActionLayout.path}
                      stroke="#D7DADF"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                </Svg>

                {renderPersonCards}
                {renderActionNodes}
              </View>

              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  activeOpacity={0.75}
                  onPress={() => zoomCanvas(-0.12)}
                >
                  <Ionicons name="remove" size={20} color="#7B7B7B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomButton}
                  activeOpacity={0.75}
                  onPress={fitCanvas}
                >
                  <Ionicons name="scan-outline" size={20} color={MAIN_COLOR} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomButton}
                  activeOpacity={0.75}
                  onPress={centerOnMe}
                >
                  <Ionicons name="locate-outline" size={20} color={MAIN_COLOR} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomButton}
                  activeOpacity={0.75}
                  onPress={() => centerOnPerson(selectedPersonId)}
                >
                  <Ionicons name="radio-button-on-outline" size={20} color={MAIN_COLOR} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomButton}
                  activeOpacity={0.75}
                  onPress={() => zoomCanvas(0.12)}
                >
                  <Ionicons name="add" size={20} color="#7B7B7B" />
                </TouchableOpacity>
              </View>

              <View style={styles.statsBadge}>
                <Text style={styles.statsBadgeText} allowFontScaling={false}>
                  {visibleLayout.visibleStats.nodes}/{visibleLayout.visibleStats.totalNodes} карточек
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={closeAddModal}>
            <Pressable style={styles.bottomSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTextBlock}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>
                    Добавить человека
                  </Text>

                  <Text
                    style={styles.modalSubtitle}
                    allowFontScaling={false}
                    numberOfLines={1}
                  >
                    {addTargetPerson
                      ? `${getRelativeTitle(relativeType)} для ${getFullName(addTargetPerson)}`
                      : 'Первый человек в древе'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  activeOpacity={0.75}
                  onPress={closeAddModal}
                >
                  <Ionicons name="close" size={22} color="#262626" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Тип связи
                </Text>

                <View style={styles.relativeTypesGrid}>
                  {RELATIVE_TYPES.map((item) => {
                    const isActive = item.key === relativeType;

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.relativeTypeButton,
                          isActive && styles.relativeTypeButtonActive,
                        ]}
                        activeOpacity={0.82}
                        onPress={() => {
                          setRelativeType(item.key);
                          applyRelativeDefaults(item.key);
                        }}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isActive ? '#FFFFFF' : MAIN_COLOR}
                        />

                        <Text
                          style={[
                            styles.relativeTypeText,
                            isActive && styles.relativeTypeTextActive,
                          ]}
                          allowFontScaling={false}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modeTabs}>
                  <TouchableOpacity
                    style={[
                      styles.modeTab,
                      addMode === 'manual' && styles.modeTabActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setAddMode('manual')}
                  >
                    <Text
                      style={[
                        styles.modeTabText,
                        addMode === 'manual' && styles.modeTabTextActive,
                      ]}
                      allowFontScaling={false}
                    >
                      Вручную
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeTab,
                      addMode === 'account' && styles.modeTabActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setAddMode('account')}
                  >
                    <Text
                      style={[
                        styles.modeTabText,
                        addMode === 'account' && styles.modeTabTextActive,
                      ]}
                      allowFontScaling={false}
                    >
                      Связать аккаунт
                    </Text>
                  </TouchableOpacity>
                </View>

                {addMode === 'account' && (
                  <>
                    <Text style={styles.inputLabel} allowFontScaling={false}>
                      Участник семьи
                    </Text>

                    {availableAccounts.length === 0 ? (
                      <View style={styles.emptyAccountsBox}>
                        <Text style={styles.emptyAccountsText} allowFontScaling={false}>
                          Все доступные аккаунты уже связаны с карточками людей.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.accountsList}>
                        {availableAccounts.map((account) => {
                          const isSelected = selectedAccountId === account.id;

                          return (
                            <TouchableOpacity
                              key={account.id}
                              style={[
                                styles.accountItem,
                                isSelected && styles.accountItemSelected,
                              ]}
                              activeOpacity={0.8}
                              onPress={() => selectAccount(account)}
                            >
                              {account.avatarUrl ? (
                                <Image source={{ uri: account.avatarUrl }} style={styles.accountAvatarImage} />
                              ) : (
                                <View style={styles.accountAvatar}>
                                  <Text style={styles.accountAvatarText} allowFontScaling={false}>
                                    {getInitials(account)}
                                  </Text>
                                </View>
                              )}

                              <View style={styles.accountTextBlock}>
                                <Text style={styles.accountName} allowFontScaling={false}>
                                  {getFullName(account)}
                                </Text>

                                <Text style={styles.accountSubtext} allowFontScaling={false}>
                                  Зарегистрированный пользователь
                                </Text>
                              </View>

                              {isSelected && (
                                <View style={styles.accountCheck}>
                                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                {addMode === 'manual' && (
                  <>
                    <Text style={styles.inputLabel} allowFontScaling={false}>
                      Имя
                    </Text>

                    <TextInput
                      style={styles.textInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Имя"
                      placeholderTextColor="#A1A1A1"
                    />

                    <Text style={styles.inputLabel} allowFontScaling={false}>
                      Фамилия
                    </Text>

                    <TextInput
                      style={styles.textInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Фамилия"
                      placeholderTextColor="#A1A1A1"
                    />
                  </>
                )}

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Кто этот человек для вас?
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={personalRelationText}
                  onChangeText={setPersonalRelationText}
                  placeholder="Например: бабушка, супруг, брат"
                  placeholderTextColor="#A1A1A1"
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

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Дата рождения
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="ГГГГ-ММ-ДД"
                  placeholderTextColor="#A1A1A1"
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Дата смерти
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={deathDate}
                  onChangeText={setDeathDate}
                  placeholder="ГГГГ-ММ-ДД"
                  placeholderTextColor="#A1A1A1"
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  Ссылка на фото
                </Text>

                <TextInput
                  style={styles.textInput}
                  value={photoUrl}
                  onChangeText={setPhotoUrl}
                  placeholder="https://..."
                  placeholderTextColor="#A1A1A1"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
                  activeOpacity={0.85}
                  disabled={isSaving}
                  onPress={submitRelative}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.submitButtonText} allowFontScaling={false}>
                        Добавить
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stateBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },

  stateTitle: {
    marginTop: 14,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
    textAlign: 'center',
  },

  stateText: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    lineHeight: 21,
    color: '#858585',
    textAlign: 'center',
  },

  stateButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 24,
    backgroundColor: MAIN_COLOR,
    paddingHorizontal: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stateButtonText: {
    marginLeft: 6,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  searchWrapper: {
    zIndex: 30,
    marginBottom: 12,
  },

  searchContainer: {
    height: 48,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    paddingVertical: 0,
    paddingRight: 8,
  },

  searchResults: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 54,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  searchEmptyText: {
    paddingVertical: 14,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  searchResultItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  searchAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  searchAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3ECFF',
    marginRight: 10,
  },

  searchAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyS,
    color: MAIN_COLOR,
  },

  searchTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  searchName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  searchDate: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  meBadgeSmall: {
    minWidth: 34,
    height: 22,
    borderRadius: 11,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  meBadgeSmallText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#FFFFFF',
  },

  canvasViewport: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },

  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#FAFAFA',
  },

  svgLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },

  personCard: {
    position: 'absolute',
    width: PERSON_CARD_WIDTH,
    height: PERSON_CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9F0',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 12,
  },

  personCardSelected: {
    borderColor: MAIN_COLOR,
    borderWidth: 2,
    backgroundColor: '#F8F2FF',
  },

  personCardMe: {
    borderColor: MAIN_COLOR,
    borderWidth: 2,
  },

  personPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3ECFF',
    marginBottom: 8,
  },

  personPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  personPhotoText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: MAIN_COLOR,
  },

  personName: {
    width: '100%',
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyS,
    lineHeight: 18,
    color: '#262626',
    marginBottom: 4,
  },

  personNameSelected: {
    color: MAIN_COLOR,
  },

  personDates: {
    width: '100%',
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: '#858585',
    lineHeight: 14,
  },

  personDatesSelected: {
    color: '#7B5B9E',
  },

  personalLabel: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  personalLabelMe: {
    backgroundColor: MAIN_COLOR,
  },

  personalLabelText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: MAIN_COLOR,
  },

  personalLabelTextMe: {
    color: '#FFFFFF',
  },

  linkedMark: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderNode: {
    position: 'absolute',
    width: PLACEHOLDER_WIDTH,
    height: PLACEHOLDER_HEIGHT,
    alignItems: 'center',
  },

  placeholderCircle: {
    width: PLACEHOLDER_SIZE,
    height: PLACEHOLDER_SIZE,
    borderRadius: PLACEHOLDER_SIZE / 2,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderLabel: {
    minHeight: 22,
    maxWidth: PLACEHOLDER_WIDTH,
    marginTop: 4,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderLabelText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#4B4B4B',
  },

  zoomControls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  zoomButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsBadge: {
    position: 'absolute',
    left: 12,
    bottom: 14,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
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
    maxHeight: '91%',
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
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalHeaderTextBlock: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  modalSubtitle: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
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
    paddingBottom: 14,
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

  relativeTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  relativeTypeButton: {
    width: '48%',
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  relativeTypeButtonActive: {
    backgroundColor: MAIN_COLOR,
  },

  relativeTypeText: {
    flex: 1,
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: MAIN_COLOR,
  },

  relativeTypeTextActive: {
    color: '#FFFFFF',
  },

  modeTabs: {
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    padding: 3,
    marginBottom: 16,
  },

  modeTab: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modeTabActive: {
    backgroundColor: MAIN_COLOR,
  },

  modeTabText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#262626',
  },

  modeTabTextActive: {
    color: '#FFFFFF',
  },

  accountsList: {
    marginBottom: 14,
  },

  accountItem: {
    minHeight: 62,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F7F7F7',
  },

  accountItemSelected: {
    borderColor: MAIN_COLOR,
    backgroundColor: '#F3ECFF',
  },

  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  accountAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },

  accountAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: MAIN_COLOR,
  },

  accountTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  accountName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  accountSubtext: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  accountCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyAccountsBox: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  emptyAccountsText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  chip: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
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

  submitButton: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: MAIN_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    marginLeft: 7,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});