import React, { useMemo, useRef, useState, useCallback, memo } from 'react';
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
import {
  getFamilyTree,
  createTreePerson,
  addTreeRelative,
  updateTreePersonLabel,
} from '../../api/familytree';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAIN_COLOR = '#9456FE';
const PERSON_CARD_WIDTH = 150;
const PERSON_CARD_HEIGHT = 150;
const PLUS_SIZE = 42;
const ROW_GAP = 130;
const COLUMN_GAP = 50;
const CANVAS_PADDING = 120;
const GRID_SIZE = 42;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.8;

const RELATIVE_TYPES = [
  { key: 'mother', title: 'Мама', icon: 'female-outline' },
  { key: 'father', title: 'Папа', icon: 'male-outline' },
  { key: 'parent', title: 'Родитель / опекун', icon: 'people-outline' },
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
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Без имени';
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
  if (Number.isNaN(date.getTime())) return value;
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
  const item = RELATIVE_TYPES.find(relative => relative.key === type);
  return item?.title || 'Родственник';
}

function emptyToNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function normalizePerson(person) {
  return {
    id: person.id,
    linkedUserId: person.linked_user_id ?? null,
    isCurrentUser: Boolean(person.is_current_user),
    firstName: person.first_name || '',
    lastName: person.last_name || '',
    middleName: person.middle_name || '',
    gender: person.gender || 'unknown',
    birthDate: person.birth_date || '',
    deathDate: person.death_date || '',
    photoUrl: person.photo_url || '',
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
    avatarUrl: member.avatar || '',
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
      parentId: relation.parent_id,
      childId: relation.child_id,
      relationType: relation.relation_type,
    })),
    partnerships: (data.partnerships || []).map((partnership) => ({
      id: partnership.id,
      partner1Id: partnership.partner1_id,
      partner2Id: partnership.partner2_id,
      status: partnership.status,
      startDate: partnership.start_date || '',
      endDate: partnership.end_date || '',
    })),
    familyAccounts: (data.family_members || [])
      .map(normalizeFamilyAccount)
      .filter((account) => Boolean(account.id)),
    linkedUserIds:
      data.linked_user_ids ||
      normalizedPersons.map((person) => person.linkedUserId).filter(Boolean),
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

function createRoundedPath(sourceX, sourceY, targetX, targetY) {
  if (targetY <= sourceY) return '';
  const middleY = sourceY + (targetY - sourceY) / 2;
  const radius = 18;
  const dx = targetX - sourceX;
  if (Math.abs(dx) < 2) return `M ${sourceX} ${sourceY} V ${targetY}`;
  const direction = dx > 0 ? 1 : -1;
  return [
    `M ${sourceX} ${sourceY}`,
    `V ${middleY - radius}`,
    `Q ${sourceX} ${middleY} ${sourceX + direction * radius} ${middleY}`,
    `H ${targetX - direction * radius}`,
    `Q ${targetX} ${middleY} ${targetX} ${middleY + radius}`,
    `V ${targetY}`,
  ].join(' ');
}

const PersonCard = memo(({ node, isSelected, isMe, personalLabel, onPress, onLongPress }) => {
  const renderPersonPhoto = useCallback((person) => {
    if (person.photoUrl) {
      return <Image source={{ uri: person.photoUrl }} style={styles.personPhoto} />;
    }
    return (
      <View style={styles.personPhotoPlaceholder}>
        <Text style={styles.personPhotoText} allowFontScaling={false}>
          {getInitials(person)}
        </Text>
      </View>
    );
  }, []);

  return (
    <TouchableOpacity
      style={[
        styles.personCard,
        { left: node.x, top: node.y },
        isSelected && styles.personCardSelected,
        isMe && styles.personCardMe,
      ]}
      activeOpacity={0.84}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {renderPersonPhoto(node.person)}
      <Text style={[styles.personName, isSelected && styles.personNameSelected]} allowFontScaling={false} numberOfLines={2}>
        {getFullName(node.person)}
      </Text>
      <Text style={[styles.personDates, isSelected && styles.personDatesSelected]} allowFontScaling={false} numberOfLines={2}>
        {getLifeDates(node.person)}
      </Text>
      {!!personalLabel && (
        <View style={[styles.personalLabel, isMe && styles.personalLabelMe]}>
          <Text style={[styles.personalLabelText, isMe && styles.personalLabelTextMe]} allowFontScaling={false} numberOfLines={1}>
            {isMe ? 'это вы' : personalLabel}
          </Text>
        </View>
      )}
      {node.person.linkedUserId && (
        <View style={styles.linkedMark}>
          <Ionicons name="link-outline" size={11} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
});

const PlusButton = memo(({ node, onPress }) => (
  <TouchableOpacity
    style={[styles.plusButton, { left: node.x, top: node.y }]}
    activeOpacity={0.78}
    onPress={() => onPress(node.relativeType, node.targetPersonId)}
  >
    <Ionicons name="add" size={24} color="#7B7B7B" />
  </TouchableOpacity>
));

export default function FamilyTreeScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const [persons, setPersons] = useState([]);
  const [parentChildRelations, setParentChildRelations] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
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
  const [isPersonModalVisible, setIsPersonModalVisible] = useState(false);
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
  const [draftPersonalLabel, setDraftPersonalLabel] = useState('');
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  
  const transformRef = useRef({ x: -170, y: 20, scale: 0.92 });
  const gestureRef = useRef({ startX: 0, startY: 0, startScale: 1, startDistance: 0 });
  const [canvasTransform, setCanvasTransform] = useState(transformRef.current);
  
  const applyTreeData = useCallback((data, preferredSelectedId = null) => {
    const normalized = normalizeTreeData(data);

    const preferredPerson = preferredSelectedId
      ? normalized.persons.find((person) => person.id === preferredSelectedId)
      : null;
    const currentUserPerson = normalized.persons.find((person) => person.isCurrentUser);
    const firstPerson = normalized.persons[0] || null;
    const nextSelectedId = preferredPerson?.id || currentUserPerson?.id || firstPerson?.id || null;

    setCurrentUserId(normalized.currentUserId);
    setPersons(normalized.persons);
    setParentChildRelations(normalized.parentChildRelations);
    setPartnerships(normalized.partnerships);
    setFamilyAccounts(normalized.familyAccounts);
    setLinkedUserIds(normalized.linkedUserIds);
    setPersonalLabels(normalized.personalLabels);
    setSelectedPersonId(nextSelectedId);
    setAddTargetPersonId(nextSelectedId);
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
  
  const updateCanvasTransform = useCallback((nextTransform) => {
    transformRef.current = nextTransform;
    setCanvasTransform(nextTransform);
  }, []);
  
  const findPerson = useCallback((personId) => persons.find(person => person.id === personId) || null, [persons]);
  
  const selectedPerson = useMemo(() => findPerson(selectedPersonId) || persons[0] || null, [persons, selectedPersonId, findPerson]);
  const addTargetPerson = useMemo(() => findPerson(addTargetPersonId) || selectedPerson, [persons, addTargetPersonId, selectedPerson, findPerson]);
  
  const getParents = useCallback((personId) => {
    return parentChildRelations
      .filter(relation => relation.childId === personId)
      .map(relation => findPerson(relation.parentId))
      .filter(Boolean);
  }, [parentChildRelations, findPerson]);
  
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return persons.filter(person => getFullName(person).toLowerCase().includes(query));
  }, [persons, search]);
  
  const treeRows = useMemo(() => {
    if (persons.length === 0) return [];
    
    const levels = {};
    persons.forEach(person => { levels[person.id] = 0; });
    
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 20) {
      changed = false;
      iterations++;
      
      for (const relation of parentChildRelations) {
        const parentLevel = levels[relation.parentId] ?? 0;
        const childLevel = levels[relation.childId] ?? 0;
        const neededChildLevel = parentLevel + 1;
        if (childLevel < neededChildLevel) {
          levels[relation.childId] = neededChildLevel;
          changed = true;
        }
      }
      
      for (const partnership of partnerships) {
        const partner1Level = levels[partnership.partner1Id] ?? 0;
        const partner2Level = levels[partnership.partner2Id] ?? 0;
        const sharedLevel = Math.max(partner1Level, partner2Level);
        if (partner1Level !== sharedLevel) {
          levels[partnership.partner1Id] = sharedLevel;
          changed = true;
        }
        if (partner2Level !== sharedLevel) {
          levels[partnership.partner2Id] = sharedLevel;
          changed = true;
        }
      }
    }
    
    const minLevel = Math.min(...Object.values(levels));
    Object.keys(levels).forEach(personId => { levels[personId] = levels[personId] - minLevel; });
    
    const groupedByLevel = {};
    for (const person of persons) {
      const level = levels[person.id] ?? 0;
      if (!groupedByLevel[level]) groupedByLevel[level] = [];
      groupedByLevel[level].push(person);
    }
    
    const orderRowPersons = (rowPersons) => {
      const usedIds = new Set();
      const ordered = [];
      
      const partnerMap = new Map();
      for (const partnership of partnerships) {
        partnerMap.set(partnership.partner1Id, partnership.partner2Id);
        partnerMap.set(partnership.partner2Id, partnership.partner1Id);
      }
      
      for (const person of rowPersons) {
        if (usedIds.has(person.id)) continue;
        ordered.push(person);
        usedIds.add(person.id);
        
        const partnerId = partnerMap.get(person.id);
        if (partnerId) {
          const partner = rowPersons.find(item => item.id === partnerId);
          if (partner && !usedIds.has(partner.id)) {
            ordered.push(partner);
            usedIds.add(partner.id);
          }
        }
      }
      
      for (const person of rowPersons) {
        if (!usedIds.has(person.id)) {
          ordered.push(person);
          usedIds.add(person.id);
        }
      }
      
      return ordered;
    };
    
    const levelsArray = Object.keys(groupedByLevel).map(level => Number(level)).sort((a, b) => a - b);
    return levelsArray.map(level => ({
      key: `level-${level}`,
      items: orderRowPersons(groupedByLevel[level]).map(person => ({
        key: `person-${person.id}`,
        type: 'person',
        person,
        personId: person.id,
        width: PERSON_CARD_WIDTH,
        height: PERSON_CARD_HEIGHT,
      })),
    }));
  }, [persons, parentChildRelations, partnerships]);
  
  const rowWidths = useMemo(() => {
    return treeRows.map(row => {
      const itemsWidth = row.items.reduce((sum, item) => sum + item.width, 0);
      const gapsWidth = Math.max(row.items.length - 1, 0) * COLUMN_GAP;
      return itemsWidth + gapsWidth;
    });
  }, [treeRows]);
  
  const canvasWidth = useMemo(() => {
    return Math.max(...rowWidths, 1) + CANVAS_PADDING * 2;
  }, [rowWidths]);
  
  const canvasHeight = useMemo(() => {
    return CANVAS_PADDING * 2 + treeRows.length * PERSON_CARD_HEIGHT + Math.max(treeRows.length - 1, 0) * ROW_GAP;
  }, [treeRows.length]);
  
  const positionedNodes = useMemo(() => {
    const nodes = [];
    for (let rowIndex = 0; rowIndex < treeRows.length; rowIndex++) {
      const row = treeRows[rowIndex];
      const rowWidth = row.items.reduce((sum, item, index) => {
        return sum + item.width + (index > 0 ? COLUMN_GAP : 0);
      }, 0);
      
      let currentX = (canvasWidth - rowWidth) / 2;
      const y = CANVAS_PADDING + rowIndex * (PERSON_CARD_HEIGHT + ROW_GAP);
      
      for (const item of row.items) {
        nodes.push({
          ...item,
          rowKey: row.key,
          x: currentX,
          y,
          centerX: currentX + item.width / 2,
          centerY: y + item.height / 2,
          topY: y,
          bottomY: y + item.height,
          rightX: currentX + item.width,
        });
        currentX += item.width + COLUMN_GAP;
      }
    }
    return nodes;
  }, [treeRows, canvasWidth]);
  
  const selectedNode = useMemo(() => {
    return positionedNodes.find(node => node.type === 'person' && node.personId === selectedPersonId);
  }, [positionedNodes, selectedPersonId]);
  
  const plusNodes = useMemo(() => {
    if (!selectedNode) return [];
    const space = 16;
    return [
      { key: 'plus-top', relativeType: 'mother', targetPersonId: selectedPersonId, x: selectedNode.centerX - PLUS_SIZE / 2, y: selectedNode.y - PLUS_SIZE - space },
      { key: 'plus-bottom', relativeType: 'child', targetPersonId: selectedPersonId, x: selectedNode.centerX - PLUS_SIZE / 2, y: selectedNode.bottomY + space },
      { key: 'plus-left', relativeType: 'sibling', targetPersonId: selectedPersonId, x: selectedNode.x - PLUS_SIZE - space, y: selectedNode.centerY - PLUS_SIZE / 2 },
      { key: 'plus-right', relativeType: 'partner', targetPersonId: selectedPersonId, x: selectedNode.rightX + space, y: selectedNode.centerY - PLUS_SIZE / 2 },
    ];
  }, [selectedNode, selectedPersonId]);
  
  const linePaths = useMemo(() => {
    const paths = [];
    const pairKeys = new Set();
    
    const nodeMap = new Map();
    for (const node of positionedNodes) {
      if (node.type === 'person') {
        nodeMap.set(node.personId, node);
      }
    }
    
    const addPairLine = (node1, node2, color = '#C9CED4') => {
      if (!node1 || !node2) return;
      if (Math.abs(node1.centerY - node2.centerY) > 14) return;
      const leftNode = node1.centerX < node2.centerX ? node1 : node2;
      const rightNode = node1.centerX < node2.centerX ? node2 : node1;
      const startX = leftNode.rightX;
      const endX = rightNode.x;
      if (endX <= startX) return;
      paths.push({
        id: `pair-${node1.personId}-${node2.personId}`,
        d: `M ${startX} ${leftNode.centerY} H ${endX}`,
        color,
        width: 2,
      });
    };
    
    for (const partnership of partnerships) {
      const node1 = nodeMap.get(partnership.partner1Id);
      const node2 = nodeMap.get(partnership.partner2Id);
      if (node1 && node2) {
        const key = [partnership.partner1Id, partnership.partner2Id].sort().join('-');
        pairKeys.add(key);
        addPairLine(node1, node2, '#BFC7CF');
      }
    }
    
    const relationsByChild = new Map();
    for (const relation of parentChildRelations) {
      const parentNode = nodeMap.get(relation.parentId);
      const childNode = nodeMap.get(relation.childId);
      if (!parentNode || !childNode) continue;
      
      if (!relationsByChild.has(relation.childId)) {
        relationsByChild.set(relation.childId, { childNode, parentNodes: [] });
      }
      const entry = relationsByChild.get(relation.childId);
      if (!entry.parentNodes.some(node => node.personId === parentNode.personId)) {
        entry.parentNodes.push(parentNode);
      }
    }
    
    for (const { parentNodes } of relationsByChild.values()) {
      if (parentNodes.length < 2) continue;
      const sortedParents = [...parentNodes].sort((a, b) => a.centerX - b.centerX);
      const leftParent = sortedParents[0];
      const rightParent = sortedParents[sortedParents.length - 1];
      const key = [leftParent.personId, rightParent.personId].sort().join('-');
      if (!pairKeys.has(key)) {
        addPairLine(leftParent, rightParent, '#C9CED4');
        pairKeys.add(key);
      }
    }
    
    for (const { childNode, parentNodes } of relationsByChild.values()) {
      if (!childNode || parentNodes.length === 0) continue;
      
      const sortedParents = [...parentNodes].sort((a, b) => a.centerX - b.centerX);
      let sourceX, sourceY;
      
      if (sortedParents.length >= 2) {
        const leftParent = sortedParents[0];
        const rightParent = sortedParents[sortedParents.length - 1];
        sourceX = (leftParent.rightX + rightParent.x) / 2;
        sourceY = leftParent.centerY;
      } else {
        sourceX = sortedParents[0].centerX;
        sourceY = sortedParents[0].bottomY;
      }
      
      const targetX = childNode.centerX;
      const targetY = childNode.topY;
      const d = createRoundedPath(sourceX, sourceY, targetX, targetY);
      
      if (d) {
        paths.push({ id: `parent-child-${childNode.personId}`, d, color: '#C9CED4', width: 2 });
      }
    }
    
    return paths;
  }, [positionedNodes, parentChildRelations, partnerships]);
  
  const gridPaths = useMemo(() => {
    const paths = [];
    const step = GRID_SIZE;
    for (let x = 0; x <= canvasWidth; x += step) {
      paths.push({ id: `grid-v-${x}`, d: `M ${x} 0 V ${canvasHeight}` });
    }
    for (let y = 0; y <= canvasHeight; y += step) {
      paths.push({ id: `grid-h-${y}`, d: `M 0 ${y} H ${canvasWidth}` });
    }
    return paths;
  }, [canvasWidth, canvasHeight]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (event, gestureState) => {
        const touches = event.nativeEvent.touches;
        return touches.length >= 2 || Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: (event) => {
        const current = transformRef.current;
        gestureRef.current = {
          startX: current.x,
          startY: current.y,
          startScale: current.scale,
          startDistance: event.nativeEvent.touches.length >= 2 ? getDistance(event.nativeEvent.touches[0], event.nativeEvent.touches[1]) : 0,
        };
      },
      onPanResponderMove: (event, gestureState) => {
        const touches = event.nativeEvent.touches;
        if (touches.length >= 2) {
          const distance = getDistance(touches[0], touches[1]);
          const startDistance = gestureRef.current.startDistance || distance;
          const nextScale = clamp(gestureRef.current.startScale * (distance / startDistance), MIN_SCALE, MAX_SCALE);
          updateCanvasTransform({ ...transformRef.current, scale: nextScale });
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
  
  const openAddModal = useCallback((type = 'child', targetPersonId = selectedPersonId) => {
    resetForm();
    setRelativeType(type);
    setAddTargetPersonId(targetPersonId);
    if (type === 'mother') {
      setGender('female');
      setPersonalRelationText('мама');
    }
    if (type === 'father') {
      setGender('male');
      setPersonalRelationText('папа');
    }
    if (type === 'child') setPersonalRelationText('ребёнок');
    if (type === 'partner') setPersonalRelationText('партнёр');
    if (type === 'sibling') setPersonalRelationText('брат / сестра');
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAddModalVisible(true);
  }, [resetForm, selectedPersonId]);
  
  const closeAddModal = useCallback(() => {
    if (!isSaving) setIsAddModalVisible(false);
  }, [isSaving]);

  const openPersonDetails = useCallback((person) => {
    if (!person?.id) return;

    setSelectedPersonId(person.id);

    navigation.navigate('FamilyTreePersonDetail', {
      personId: person.id,
    });
  }, [navigation]);
  
  const closePersonModal = useCallback(() => {
    if (!isSaving) setIsPersonModalVisible(false);
  }, [isSaving]);
  
  const availableAccounts = useMemo(() => {
    const linkedIds = new Set(linkedUserIds);
    return familyAccounts.filter((account) => !linkedIds.has(account.id));
  }, [familyAccounts, linkedUserIds]);
  
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
    const targetPerson = findPerson(addTargetPersonId);

    if (persons.length > 0 && !targetPerson) {
      Alert.alert('Семейное древо', 'Не выбран человек для связи');
      return;
    }

    if (targetPerson && (relativeType === 'mother' || relativeType === 'father')) {
      const targetParents = getParents(targetPerson.id);

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
      const targetParents = getParents(targetPerson.id);

      if (targetParents.length === 0) {
        Alert.alert('Нельзя добавить брата или сестру', 'Сначала добавьте выбранному человеку хотя бы одного родителя.');
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
      const nextSelectedId = createdPerson?.id || targetPerson?.id || normalized.persons[0]?.id || null;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentUserId(normalized.currentUserId);
      setPersons(normalized.persons);
      setParentChildRelations(normalized.parentChildRelations);
      setPartnerships(normalized.partnerships);
      setFamilyAccounts(normalized.familyAccounts);
      setLinkedUserIds(normalized.linkedUserIds);
      setPersonalLabels(normalized.personalLabels);
      setSelectedPersonId(nextSelectedId);
      setAddTargetPersonId(nextSelectedId);
      closeAddModal();

    } catch (error) {
      Alert.alert('Семейное древо', getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    addTargetPersonId,
    relativeType,
    createPersonPayload,
    findPerson,
    closeAddModal,
    persons,
    getParents,
  ]);
  
  const savePersonalLabel = useCallback(async () => {
    if (!selectedPerson) return;

    try {
      setIsSaving(true);

      const data = await updateTreePersonLabel(selectedPerson.id, draftPersonalLabel.trim());
      applyTreeData(data, selectedPerson.id);
      closePersonModal();
    } catch (error) {
      Alert.alert('Семейное древо', getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [selectedPerson, draftPersonalLabel, applyTreeData, closePersonModal]);
  
  const zoomCanvas = useCallback((delta) => {
    const nextScale = clamp(transformRef.current.scale + delta, MIN_SCALE, MAX_SCALE);
    updateCanvasTransform({ ...transformRef.current, scale: nextScale });
  }, [updateCanvasTransform]);
  
  const centerOnPerson = useCallback((personId = selectedPersonId) => {
    const node = positionedNodes.find(item => item.type === 'person' && item.personId === personId);
    if (!node) return;
    const scale = transformRef.current.scale;
    updateCanvasTransform({
      ...transformRef.current,
      x: viewportSize.width / 2 - node.centerX * scale,
      y: viewportSize.height / 2 - node.centerY * scale,
    });
  }, [positionedNodes, viewportSize, updateCanvasTransform, selectedPersonId]);
  
  const centerOnMe = useCallback(() => {
    if (!currentUserId) return;

    const myPerson = persons.find(person => person.linkedUserId === currentUserId);
    if (!myPerson) return;

    setSelectedPersonId(myPerson.id);
    setTimeout(() => centerOnPerson(myPerson.id), 50);
  }, [persons, currentUserId, centerOnPerson]);
  
  const handlePersonPress = useCallback((personId, person) => {
    if (selectedPersonId === personId) {
      openPersonDetails(person);
    } else {
      setSelectedPersonId(personId);
    }
  }, [selectedPersonId, openPersonDetails]);
  
  const renderPersonCards = useMemo(() => {
    return positionedNodes.map(node => (
      <PersonCard
        key={node.key}
        node={node}
        isSelected={node.personId === selectedPersonId}
        isMe={node.person.linkedUserId === currentUserId}
        personalLabel={personalLabels[node.personId]}
        onPress={() => handlePersonPress(node.personId, node.person)}
        onLongPress={() => openPersonDetails(node.person)}
      />
    ));
  }, [positionedNodes, selectedPersonId, currentUserId, personalLabels, handlePersonPress, openPersonDetails]);
  
  const renderPlusButtons = useMemo(() => {
    return plusNodes.map(node => (
      <PlusButton key={node.key} node={node} onPress={openAddModal} />
    ));
  }, [plusNodes, openAddModal]);
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={[styles.container, { paddingHorizontal: screenPadding }]}> 
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={25} color="#262626" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>Семейное древо</Text>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.75} onPress={() => openAddModal('child', selectedPersonId)}>
            <Ionicons name="add" size={23} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>
        
        {isLoadingTree ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator size="large" color={MAIN_COLOR} />
            <Text style={styles.stateTitle} allowFontScaling={false}>Загружаем древо</Text>
            <Text style={styles.stateText} allowFontScaling={false}>Получаем данные семейного древа с сервера.</Text>
          </View>
        ) : treeError ? (
          <View style={styles.stateBlock}>
            <Ionicons name="warning-outline" size={38} color={MAIN_COLOR} />
            <Text style={styles.stateTitle} allowFontScaling={false}>Не удалось открыть древо</Text>
            <Text style={styles.stateText} allowFontScaling={false}>{treeError}</Text>
            <TouchableOpacity style={styles.stateButton} activeOpacity={0.85} onPress={loadTree}>
              <Text style={styles.stateButtonText} allowFontScaling={false}>Повторить</Text>
            </TouchableOpacity>
          </View>
        ) : persons.length === 0 ? (
          <View style={styles.stateBlock}>
            <Ionicons name="git-network-outline" size={42} color={MAIN_COLOR} />
            <Text style={styles.stateTitle} allowFontScaling={false}>Древо пока пустое</Text>
            <Text style={styles.stateText} allowFontScaling={false}>Добавьте первого человека, а затем связывайте с ним родственников.</Text>
            <TouchableOpacity style={styles.stateButton} activeOpacity={0.85} onPress={() => openAddModal('child', null)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.stateButtonText} allowFontScaling={false}>Добавить человека</Text>
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
                <Ionicons name="search-outline" size={21} color="#858585" />
              </View>
              {search.trim() && (
                <View style={styles.searchResults}>
                  {searchResults.length === 0 ? (
                    <Text style={styles.searchEmptyText} allowFontScaling={false}>Человек не найден</Text>
                  ) : (
                    searchResults.slice(0, 5).map(person => (
                      <TouchableOpacity
                        key={person.id}
                        style={styles.searchResultItem}
                        activeOpacity={0.75}
                        onPress={() => {
                          setSelectedPersonId(person.id);
                          setSearch('');
                          setTimeout(() => centerOnPerson(person.id), 50);
                        }}
                      >
                        <View style={styles.searchAvatar}>
                          <Text style={styles.searchAvatarText} allowFontScaling={false}>{getInitials(person)}</Text>
                        </View>
                        <View style={styles.searchTextBlock}>
                          <Text style={styles.searchName} allowFontScaling={false} numberOfLines={1}>{getFullName(person)}</Text>
                          <Text style={styles.searchDate} allowFontScaling={false} numberOfLines={1}>{getLifeDates(person)}</Text>
                        </View>
                        {person.linkedUserId === currentUserId && (
                          <View style={styles.meBadgeSmall}>
                            <Text style={styles.meBadgeSmallText} allowFontScaling={false}>Вы</Text>
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
                setViewportSize({ width, height });
              }}
              {...panResponder.panHandlers}
            >
              <View
                style={[
                  styles.canvas,
                  {
                    width: canvasWidth,
                    height: canvasHeight,
                    transform: [
                      { translateX: canvasTransform.x },
                      { translateY: canvasTransform.y },
                      { scale: canvasTransform.scale },
                    ],
                  },
                ]}
              >
                <Svg width={canvasWidth} height={canvasHeight} style={styles.svgLayer} pointerEvents="none">
                  {gridPaths.map(path => (
                    <Path key={path.id} d={path.d} stroke="#EEF0F3" strokeWidth={1} fill="none" />
                  ))}
                  {linePaths.map(path => (
                    <Path key={path.id} d={path.d} stroke="#C9CED4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  ))}
                </Svg>
                
                {renderPersonCards}
                {renderPlusButtons}
              </View>
              
              <View style={styles.zoomControls}>
                <TouchableOpacity style={styles.zoomButton} activeOpacity={0.75} onPress={() => zoomCanvas(-0.12)}>
                  <Ionicons name="remove" size={20} color="#7B7B7B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomButton} activeOpacity={0.75} onPress={centerOnMe}>
                  <Ionicons name="locate-outline" size={20} color={MAIN_COLOR} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomButton} activeOpacity={0.75} onPress={() => zoomCanvas(0.12)}>
                  <Ionicons name="add" size={20} color="#7B7B7B" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
      
      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={closeAddModal}>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalOverlay} onPress={closeAddModal}>
            <Pressable style={styles.bottomSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTextBlock}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Добавить человека</Text>
                  <Text style={styles.modalSubtitle} allowFontScaling={false} numberOfLines={1}>
                    {addTargetPerson ? `${getRelativeTitle(relativeType)} для ${getFullName(addTargetPerson)}` : 'Первый человек в древе'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} activeOpacity={0.75} onPress={closeAddModal}>
                  <Ionicons name="close" size={22} color="#262626" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <Text style={styles.inputLabel} allowFontScaling={false}>Тип связи</Text>
                <View style={styles.relativeTypesGrid}>
                  {RELATIVE_TYPES.map(item => {
                    const isActive = item.key === relativeType;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.relativeTypeButton, isActive && styles.relativeTypeButtonActive]}
                        activeOpacity={0.82}
                        onPress={() => {
                          setRelativeType(item.key);
                          if (item.key === 'mother') {
                            setGender('female');
                            setPersonalRelationText('мама');
                          }
                          if (item.key === 'father') {
                            setGender('male');
                            setPersonalRelationText('папа');
                          }
                        }}
                      >
                        <Ionicons name={item.icon} size={18} color={isActive ? '#FFFFFF' : MAIN_COLOR} />
                        <Text style={[styles.relativeTypeText, isActive && styles.relativeTypeTextActive]} allowFontScaling={false} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                <View style={styles.modeTabs}>
                  <TouchableOpacity style={[styles.modeTab, addMode === 'manual' && styles.modeTabActive]} activeOpacity={0.8} onPress={() => setAddMode('manual')}>
                    <Text style={[styles.modeTabText, addMode === 'manual' && styles.modeTabTextActive]} allowFontScaling={false}>Вручную</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modeTab, addMode === 'account' && styles.modeTabActive]} activeOpacity={0.8} onPress={() => setAddMode('account')}>
                    <Text style={[styles.modeTabText, addMode === 'account' && styles.modeTabTextActive]} allowFontScaling={false}>Связать аккаунт</Text>
                  </TouchableOpacity>
                </View>
                
                {addMode === 'account' && (
                  <>
                    <Text style={styles.inputLabel} allowFontScaling={false}>Участник семьи</Text>
                    {availableAccounts.length === 0 ? (
                      <View style={styles.emptyAccountsBox}>
                        <Text style={styles.emptyAccountsText} allowFontScaling={false}>Все доступные аккаунты уже связаны с карточками людей.</Text>
                      </View>
                    ) : (
                      <View style={styles.accountsList}>
                        {availableAccounts.map(account => {
                          const isSelected = selectedAccountId === account.id;
                          return (
                            <TouchableOpacity
                              key={account.id}
                              style={[styles.accountItem, isSelected && styles.accountItemSelected]}
                              activeOpacity={0.8}
                              onPress={() => selectAccount(account)}
                            >
                              <View style={styles.accountAvatar}>
                                <Text style={styles.accountAvatarText} allowFontScaling={false}>{getInitials(account)}</Text>
                              </View>
                              <View style={styles.accountTextBlock}>
                                <Text style={styles.accountName} allowFontScaling={false}>{getFullName(account)}</Text>
                                <Text style={styles.accountSubtext} allowFontScaling={false}>Зарегистрированный пользователь</Text>
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
                    <Text style={styles.inputLabel} allowFontScaling={false}>Имя</Text>
                    <TextInput style={styles.textInput} value={firstName} onChangeText={setFirstName} placeholder="Имя" placeholderTextColor="#A1A1A1" />
                    <Text style={styles.inputLabel} allowFontScaling={false}>Фамилия</Text>
                    <TextInput style={styles.textInput} value={lastName} onChangeText={setLastName} placeholder="Фамилия" placeholderTextColor="#A1A1A1" />
                  </>
                )}
                
                <Text style={styles.inputLabel} allowFontScaling={false}>Кто этот человек для вас?</Text>
                <TextInput style={styles.textInput} value={personalRelationText} onChangeText={setPersonalRelationText} placeholder="Например: бабушка, дядя, крестная" placeholderTextColor="#A1A1A1" />
                <Text style={styles.inputLabel} allowFontScaling={false}>Пол</Text>
                <View style={styles.chipsRow}>
                  {GENDER_OPTIONS.map(item => {
                    const isActive = item.key === gender;
                    return (
                      <TouchableOpacity key={item.key} style={[styles.chip, isActive && styles.chipActive]} activeOpacity={0.8} onPress={() => setGender(item.key)}>
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]} allowFontScaling={false}>{item.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.inputLabel} allowFontScaling={false}>Дата рождения</Text>
                <TextInput style={styles.textInput} value={birthDate} onChangeText={setBirthDate} placeholder="ГГГГ-ММ-ДД" placeholderTextColor="#A1A1A1" />
                <Text style={styles.inputLabel} allowFontScaling={false}>Дата смерти</Text>
                <TextInput style={styles.textInput} value={deathDate} onChangeText={setDeathDate} placeholder="Необязательно" placeholderTextColor="#A1A1A1" />
                
                {addMode === 'manual' && (
                  <>
                    <Text style={styles.inputLabel} allowFontScaling={false}>Ссылка на фото</Text>
                    <TextInput style={styles.textInput} value={photoUrl} onChangeText={setPhotoUrl} placeholder="Можно оставить пустым" placeholderTextColor="#A1A1A1" />
                  </>
                )}
                
                <TouchableOpacity
                  style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
                  activeOpacity={0.85}
                  onPress={submitRelative}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="add" size={21} color="#FFFFFF" />
                  )}
                  <Text style={styles.submitButtonText} allowFontScaling={false}>
                    {isSaving ? 'Сохраняем...' : 'Добавить'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      
      <Modal visible={isPersonModalVisible} transparent animationType="fade" onRequestClose={closePersonModal}>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalOverlay} onPress={closePersonModal}>
            <Pressable style={styles.smallBottomSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTextBlock}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Карточка человека</Text>
                  <Text style={styles.modalSubtitle} allowFontScaling={false} numberOfLines={1}>{getFullName(selectedPerson)}</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} activeOpacity={0.75} onPress={closePersonModal}>
                  <Ionicons name="close" size={22} color="#262626" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.personModalCard}>
                {selectedPerson?.photoUrl ? (
                  <Image source={{ uri: selectedPerson.photoUrl }} style={styles.personPhotoLarge} />
                ) : (
                  <View style={styles.personPhotoPlaceholderLarge}>
                    <Text style={styles.personPhotoTextLarge} allowFontScaling={false}>{getInitials(selectedPerson)}</Text>
                  </View>
                )}
                <View style={styles.personModalTextBlock}>
                  <Text style={styles.personModalName} allowFontScaling={false} numberOfLines={1}>{getFullName(selectedPerson)}</Text>
                  <Text style={styles.personModalDates} allowFontScaling={false}>{getLifeDates(selectedPerson)}</Text>
                  {selectedPerson?.linkedUserId && (
                    <Text style={styles.personModalLinked} allowFontScaling={false}>
                      {selectedPerson.linkedUserId === currentUserId ? 'Это ваша карточка' : 'Связано с аккаунтом семьи'}
                    </Text>
                  )}
                </View>
              </View>
              
              <Text style={styles.inputLabel} allowFontScaling={false}>Кто этот человек для вас?</Text>
              <TextInput style={styles.textInput} value={draftPersonalLabel} onChangeText={setDraftPersonalLabel} placeholder="Например: бабушка, папа, сестра" placeholderTextColor="#A1A1A1" />
              <Text style={styles.personalHint} allowFontScaling={false}>
                Эта подпись видна только вам. Другие члены семьи могут указать своё отношение к этому человеку.
              </Text>
              
              <TouchableOpacity
                style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
                activeOpacity={0.85}
                onPress={savePersonalLabel}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                )}
                <Text style={styles.submitButtonText} allowFontScaling={false}>
                  {isSaving ? 'Сохраняем...' : 'Сохранить'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    lineHeight: 22,
    color: '#858585',
    textAlign: 'center',
  },
  stateButton: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: 26,
    backgroundColor: MAIN_COLOR,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 56, marginTop: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.titleL, color: '#262626' },
  headerButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center' },
  searchWrapper: { zIndex: 20, marginBottom: 12 },
  searchContainer: { height: 52, borderRadius: 26, backgroundColor: '#F7F7F7', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', padding: 0, marginRight: 12, fontFamily: fontFamily.regular, fontSize: fontSize.bodyM, color: '#262626' },
  searchResults: { position: 'absolute', top: 58, left: 0, right: 0, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 8 },
  searchResultItem: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 8 },
  searchAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3ECFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  searchAvatarText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: MAIN_COLOR },
  searchTextBlock: { flex: 1 },
  searchName: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: '#262626' },
  searchDate: { marginTop: 2, fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: '#858585' },
  searchEmptyText: { paddingVertical: 10, textAlign: 'center', fontFamily: fontFamily.regular, fontSize: fontSize.bodyM, color: '#858585' },
  meBadgeSmall: { height: 24, borderRadius: 12, backgroundColor: MAIN_COLOR, paddingHorizontal: 9, justifyContent: 'center', alignItems: 'center' },
  meBadgeSmallText: { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: '#FFFFFF' },
  canvasViewport: { flex: 1, borderRadius: 30, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  canvas: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FAFAFA' },
  svgLayer: { position: 'absolute', left: 0, top: 0 },
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
    paddingTop: 12 
  },
  personCardSelected: { borderColor: MAIN_COLOR, borderWidth: 2, backgroundColor: '#F8F2FF' },
  personCardMe: { borderColor: MAIN_COLOR, borderWidth: 2 },
  personPhoto: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3ECFF', marginBottom: 8 },
  personPhotoPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3ECFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  personPhotoText: { fontFamily: fontFamily.medium, fontSize: 20, color: MAIN_COLOR },
  personPhotoLarge: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3ECFF' },
  personPhotoPlaceholderLarge: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3ECFF', justifyContent: 'center', alignItems: 'center' },
  personPhotoTextLarge: { fontFamily: fontFamily.medium, fontSize: 20, color: MAIN_COLOR },
  personName: { width: '100%', textAlign: 'center', fontFamily: fontFamily.medium, fontSize: fontSize.bodyS, lineHeight: 18, color: '#262626', marginBottom: 4 },
  personNameSelected: { color: MAIN_COLOR },
  personDates: { width: '100%', textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 10, color: '#858585', lineHeight: 14 },
  personDatesSelected: { color: '#7B5B9E' },
  personalLabel: { position: 'absolute', left: 8, right: 8, bottom: 8, height: 22, borderRadius: 8, backgroundColor: '#F3ECFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  personalLabelMe: { backgroundColor: MAIN_COLOR },
  personalLabelText: { fontFamily: fontFamily.medium, fontSize: 10, color: MAIN_COLOR },
  personalLabelTextMe: { color: '#FFFFFF' },
  linkedMark: { position: 'absolute', right: 8, top: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: MAIN_COLOR, justifyContent: 'center', alignItems: 'center' },
  plusButton: { position: 'absolute', width: PLUS_SIZE, height: PLUS_SIZE, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#7B7B7B', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  zoomControls: { position: 'absolute', right: 12, bottom: 12, borderRadius: 22, backgroundColor: '#FFFFFF', flexDirection: 'row', padding: 4, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  zoomButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  modalKeyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.58)', justifyContent: 'flex-end' },
  bottomSheet: { maxHeight: '91%', borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  smallBottomSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30 },
  modalHandle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 3, backgroundColor: '#D9D9D9', marginBottom: 14 },
  modalHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalHeaderTextBlock: { flex: 1, paddingRight: 12 },
  modalTitle: { fontFamily: fontFamily.medium, fontSize: fontSize.titleS, color: '#262626' },
  modalSubtitle: { marginTop: 3, fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: '#858585' },
  modalCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center' },
  modalContent: { paddingBottom: 14 },
  inputLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: '#262626', marginBottom: 8 },
  textInput: { height: 54, borderRadius: 22, backgroundColor: '#F7F7F7', paddingHorizontal: 18, fontFamily: fontFamily.regular, fontSize: fontSize.bodyM, color: '#262626', marginBottom: 14 },
  relativeTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  relativeTypeButton: { width: '48%', minHeight: 44, borderRadius: 22, backgroundColor: '#F3ECFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  relativeTypeButtonActive: { backgroundColor: MAIN_COLOR },
  relativeTypeText: { flex: 1, marginLeft: 7, fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: MAIN_COLOR },
  relativeTypeTextActive: { color: '#FFFFFF' },
  modeTabs: { height: 42, borderRadius: 21, backgroundColor: '#F4F4F4', flexDirection: 'row', padding: 3, marginBottom: 16 },
  modeTab: { flex: 1, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modeTabActive: { backgroundColor: MAIN_COLOR },
  modeTabText: { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: '#262626' },
  modeTabTextActive: { color: '#FFFFFF' },
  accountsList: { marginBottom: 14 },
  accountItem: { minHeight: 62, borderRadius: 22, backgroundColor: '#F7F7F7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F7F7F7' },
  accountItemSelected: { borderColor: MAIN_COLOR, backgroundColor: '#F3ECFF' },
  accountAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountAvatarText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: MAIN_COLOR },
  accountTextBlock: { flex: 1, paddingRight: 10 },
  accountName: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: '#262626' },
  accountSubtext: { marginTop: 3, fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: '#858585' },
  accountCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: MAIN_COLOR, justifyContent: 'center', alignItems: 'center' },
  emptyAccountsBox: { minHeight: 58, borderRadius: 22, backgroundColor: '#F7F7F7', justifyContent: 'center', paddingHorizontal: 14, marginBottom: 14 },
  emptyAccountsText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodyM, color: '#858585' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { minHeight: 38, borderRadius: 19, backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  chipActive: { backgroundColor: MAIN_COLOR },
  chipText: { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: '#262626' },
  chipTextActive: { color: '#FFFFFF' },
  submitButton: { minHeight: 56, borderRadius: 22, backgroundColor: MAIN_COLOR, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { marginLeft: 7, fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: '#FFFFFF' },
  personModalCard: { minHeight: 90, borderRadius: 20, backgroundColor: '#F7F7F7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 18 },
  personModalTextBlock: { flex: 1, marginLeft: 14 },
  personModalName: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyL, color: '#262626' },
  personModalDates: { marginTop: 3, fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: '#858585' },
  personModalLinked: { marginTop: 3, fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: MAIN_COLOR },
  personalHint: { marginTop: -6, marginBottom: 16, fontFamily: fontFamily.regular, fontSize: fontSize.caption, lineHeight: 18, color: '#858585' },
});