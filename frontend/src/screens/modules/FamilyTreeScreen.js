import React, { useMemo, useRef, useState } from 'react';
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
  Image,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAIN_COLOR = '#9456FE';
const CURRENT_USER_ID = 101;
const PERSON_CARD_WIDTH = 136;
const PERSON_CARD_HEIGHT = 104;
const PLUS_SIZE = 42;
const ROW_GAP = 105;
const COLUMN_GAP = 44;
const CANVAS_PADDING = 120;
const GRID_SIZE = 42;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.8;

const FAMILY_ACCOUNTS = [
  { id: 101, firstName: 'Максим', lastName: 'Куплинов', avatarUrl: '' },
  { id: 102, firstName: 'Галина', lastName: 'Михайловна', avatarUrl: '' },
  { id: 103, firstName: 'Алексей', lastName: 'Куплинов', avatarUrl: '' },
];

const INITIAL_PERSONS = [
  { id: 1, linkedUserId: 101, firstName: 'Максим', lastName: 'Куплинов', gender: 'male', birthDate: '2004-04-12', deathDate: '', photoUrl: '' },
  { id: 2, linkedUserId: null, firstName: 'Мама', lastName: '', gender: 'female', birthDate: '1978-05-12', deathDate: '', photoUrl: '' },
  { id: 3, linkedUserId: 103, firstName: 'Папа', lastName: '', gender: 'male', birthDate: '1976-09-04', deathDate: '', photoUrl: '' },
  { id: 4, linkedUserId: null, firstName: 'Брат', lastName: '', gender: 'male', birthDate: '2008-03-22', deathDate: '', photoUrl: '' },
  { id: 5, linkedUserId: 102, firstName: 'Галина', lastName: 'Михайловна', gender: 'female', birthDate: '1952-01-18', deathDate: '', photoUrl: '' },
  { id: 6, linkedUserId: null, firstName: 'Дедушка', lastName: '', gender: 'male', birthDate: '1950-07-09', deathDate: '', photoUrl: '' },
];

const INITIAL_PARENT_CHILD_RELATIONS = [
  { id: 1, parentId: 2, childId: 1, relationType: 'biological' },
  { id: 2, parentId: 3, childId: 1, relationType: 'biological' },
  { id: 3, parentId: 2, childId: 4, relationType: 'biological' },
  { id: 4, parentId: 3, childId: 4, relationType: 'biological' },
  { id: 5, parentId: 5, childId: 2, relationType: 'biological' },
  { id: 6, parentId: 6, childId: 2, relationType: 'biological' },
];

const INITIAL_PARTNERSHIPS = [
  { id: 1, partner1Id: 2, partner2Id: 3, status: 'married' },
  { id: 2, partner1Id: 5, partner2Id: 6, status: 'married' },
];

const INITIAL_PERSONAL_LABELS = {
  1: 'это я',
  2: 'мама',
  3: 'папа',
  4: 'брат',
  5: 'бабушка',
  6: 'дедушка',
};

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
  const birth = formatDate(person.birthDate);
  const death = formatDate(person.deathDate);
  if (birth && death) return `${birth} — ${death}`;
  if (birth) return birth;
  if (death) return `— ${death}`;
  return 'Дата не указана';
}

function getRelativeTitle(type) {
  const item = RELATIVE_TYPES.find(relative => relative.key === type);
  return item?.title || 'Родственник';
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

export default function FamilyTreeScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const [persons, setPersons] = useState(INITIAL_PERSONS);
  const [parentChildRelations, setParentChildRelations] = useState(INITIAL_PARENT_CHILD_RELATIONS);
  const [partnerships, setPartnerships] = useState(INITIAL_PARTNERSHIPS);
  const [personalLabels, setPersonalLabels] = useState(INITIAL_PERSONAL_LABELS);
  const [selectedPersonId, setSelectedPersonId] = useState(1);
  const [addTargetPersonId, setAddTargetPersonId] = useState(1);
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
  
  const updateCanvasTransform = (nextTransform) => {
    transformRef.current = nextTransform;
    setCanvasTransform(nextTransform);
  };
  
  const findPerson = (personId) => persons.find(person => person.id === personId) || null;
  
  const selectedPerson = useMemo(() => findPerson(selectedPersonId) || persons[0] || null, [persons, selectedPersonId]);
  const addTargetPerson = useMemo(() => findPerson(addTargetPersonId) || selectedPerson, [persons, addTargetPersonId, selectedPerson]);
  
  const getParents = (personId) => {
    return parentChildRelations
      .filter(relation => relation.childId === personId)
      .map(relation => findPerson(relation.parentId))
      .filter(Boolean);
  };
  
  const getPartners = (personId) => {
    return partnerships
      .filter(partnership => partnership.partner1Id === personId || partnership.partner2Id === personId)
      .map(partnership => {
        const partnerId = partnership.partner1Id === personId ? partnership.partner2Id : partnership.partner1Id;
        return findPerson(partnerId);
      })
      .filter(Boolean);
  };
  
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return persons.filter(person => getFullName(person).toLowerCase().includes(query));
  }, [persons, search]);
  
  const createPersonItem = (person) => ({
    key: `person-${person.id}`,
    type: 'person',
    person,
    personId: person.id,
    width: PERSON_CARD_WIDTH,
    height: PERSON_CARD_HEIGHT,
  });
  
  const treeRows = useMemo(() => {
    if (persons.length === 0) return [];
    
    const levels = {};
    persons.forEach(person => { levels[person.id] = 0; });
    
    for (let i = 0; i < 30; i += 1) {
      let changed = false;
      
      parentChildRelations.forEach(relation => {
        const parentLevel = levels[relation.parentId] ?? 0;
        const childLevel = levels[relation.childId] ?? 0;
        const neededChildLevel = parentLevel + 1;
        if (childLevel < neededChildLevel) {
          levels[relation.childId] = neededChildLevel;
          changed = true;
        }
      });
      
      partnerships.forEach(partnership => {
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
      });
      
      if (!changed) break;
    }
    
    const minLevel = Math.min(...Object.values(levels));
    Object.keys(levels).forEach(personId => { levels[personId] = levels[personId] - minLevel; });
    
    const groupedByLevel = {};
    persons.forEach(person => {
      const level = levels[person.id] ?? 0;
      if (!groupedByLevel[level]) groupedByLevel[level] = [];
      groupedByLevel[level].push(person);
    });
    
    const orderRowPersons = (rowPersons) => {
      const usedIds = new Set();
      const ordered = [];
      const getPartnerIds = (personId) => {
        return partnerships
          .filter(partnership => partnership.partner1Id === personId || partnership.partner2Id === personId)
          .map(partnership => partnership.partner1Id === personId ? partnership.partner2Id : partnership.partner1Id);
      };
      
      rowPersons.forEach(person => {
        if (usedIds.has(person.id)) return;
        ordered.push(person);
        usedIds.add(person.id);
        const partnerIds = getPartnerIds(person.id);
        partnerIds.forEach(partnerId => {
          const partner = rowPersons.find(item => item.id === partnerId);
          if (partner && !usedIds.has(partner.id)) {
            ordered.push(partner);
            usedIds.add(partner.id);
          }
        });
      });
      
      rowPersons.forEach(person => {
        if (!usedIds.has(person.id)) {
          ordered.push(person);
          usedIds.add(person.id);
        }
      });
      
      return ordered;
    };
    
    return Object.keys(groupedByLevel)
      .map(level => Number(level))
      .sort((a, b) => a - b)
      .map(level => ({
        key: `level-${level}`,
        items: orderRowPersons(groupedByLevel[level]).map(createPersonItem),
      }));
  }, [persons, parentChildRelations, partnerships]);
  
  const rowWidths = treeRows.map(row => {
    const itemsWidth = row.items.reduce((sum, item) => sum + item.width, 0);
    const gapsWidth = Math.max(row.items.length - 1, 0) * COLUMN_GAP;
    return itemsWidth + gapsWidth;
  });
  
  const canvasWidth = Math.max(...rowWidths, 1) + CANVAS_PADDING * 2;
  const canvasHeight = CANVAS_PADDING * 2 + treeRows.length * PERSON_CARD_HEIGHT + Math.max(treeRows.length - 1, 0) * ROW_GAP;
  
  const positionedNodes = useMemo(() => {
    const nodes = [];
    treeRows.forEach((row, rowIndex) => {
      const rowWidth = row.items.reduce((sum, item, index) => {
        return sum + item.width + (index > 0 ? COLUMN_GAP : 0);
      }, 0);
      
      let currentX = (canvasWidth - rowWidth) / 2;
      const y = CANVAS_PADDING + rowIndex * (PERSON_CARD_HEIGHT + ROW_GAP);
      
      row.items.forEach(item => {
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
      });
    });
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
    
    const findNode = (personId) => positionedNodes.find(node => node.type === 'person' && node.personId === personId);
    
    const addPairLine = (node1, node2, color = '#C9CED4') => {
      if (!node1 || !node2) return;
      if (Math.abs(node1.centerY - node2.centerY) > 14) return;
      const leftNode = node1.centerX < node2.centerX ? node1 : node2;
      const rightNode = node1.centerX < node2.centerX ? node2 : node1;
      const startX = leftNode.rightX;
      const endX = rightNode.x;
      if (endX <= startX) return;
      paths.push({
        id: `pair-${node1.personId}-${node2.personId}-${paths.length}`,
        d: `M ${startX} ${leftNode.centerY} H ${endX}`,
        color,
        width: 2,
      });
    };
    
    partnerships.forEach(partnership => {
      const node1 = findNode(partnership.partner1Id);
      const node2 = findNode(partnership.partner2Id);
      if (node1 && node2) {
        const key = [partnership.partner1Id, partnership.partner2Id].sort().join('-');
        pairKeys.add(key);
        addPairLine(node1, node2, '#BFC7CF');
      }
    });
    
    const relationsByChild = {};
    parentChildRelations.forEach(relation => {
      const parentNode = findNode(relation.parentId);
      const childNode = findNode(relation.childId);
      if (!parentNode || !childNode) return;
      if (!relationsByChild[relation.childId]) {
        relationsByChild[relation.childId] = { childNode, parentNodes: [] };
      }
      const exists = relationsByChild[relation.childId].parentNodes.some(node => node.personId === parentNode.personId);
      if (!exists) relationsByChild[relation.childId].parentNodes.push(parentNode);
    });
    
    Object.values(relationsByChild).forEach(({ parentNodes }) => {
      if (parentNodes.length < 2) return;
      const sortedParents = [...parentNodes].sort((a, b) => a.centerX - b.centerX);
      const leftParent = sortedParents[0];
      const rightParent = sortedParents[sortedParents.length - 1];
      const key = [leftParent.personId, rightParent.personId].sort().join('-');
      if (!pairKeys.has(key)) {
        addPairLine(leftParent, rightParent, '#C9CED4');
        pairKeys.add(key);
      }
    });
    
    Object.values(relationsByChild).forEach(({ childNode, parentNodes }) => {
      if (!childNode || parentNodes.length === 0) return;
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
    });
    
    return paths;
  }, [positionedNodes, parentChildRelations, partnerships]);
  
  const gridPaths = useMemo(() => {
    const paths = [];
    for (let x = 0; x <= canvasWidth; x += GRID_SIZE) {
      paths.push({ id: `grid-v-${x}`, d: `M ${x} 0 V ${canvasHeight}` });
    }
    for (let y = 0; y <= canvasHeight; y += GRID_SIZE) {
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
  
  const resetForm = () => {
    setAddMode('manual');
    setSelectedAccountId(null);
    setFirstName('');
    setLastName('');
    setGender('unknown');
    setBirthDate('');
    setDeathDate('');
    setPhotoUrl('');
    setPersonalRelationText('');
  };
  
  const openAddModal = (type = 'child', targetPersonId = selectedPersonId) => {
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
  };
  
  const closeAddModal = () => setIsAddModalVisible(false);
  
  const openPersonModal = (person) => {
    setSelectedPersonId(person.id);
    setDraftPersonalLabel(personalLabels[person.id] || '');
    setIsPersonModalVisible(true);
  };
  
  const closePersonModal = () => setIsPersonModalVisible(false);
  
  const availableAccounts = useMemo(() => {
    return FAMILY_ACCOUNTS.filter(account => !persons.some(person => person.linkedUserId === account.id));
  }, [persons]);
  
  const selectAccount = (account) => {
    setSelectedAccountId(account.id);
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setPhotoUrl(account.avatarUrl || '');
  };
  
  const createNewPerson = () => {
    if (addMode === 'account') {
      const account = FAMILY_ACCOUNTS.find(item => item.id === selectedAccountId);
      if (!account) {
        Alert.alert('Семейное древо', 'Выберите участника семьи');
        return null;
      }
      return {
        id: Date.now(),
        linkedUserId: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        gender,
        birthDate: birthDate.trim(),
        deathDate: deathDate.trim(),
        photoUrl: account.avatarUrl || photoUrl.trim(),
      };
    }
    
    const trimmedFirstName = firstName.trim();
    if (!trimmedFirstName) {
      Alert.alert('Семейное древо', 'Введите имя');
      return null;
    }
    
    return {
      id: Date.now(),
      linkedUserId: null,
      firstName: trimmedFirstName,
      lastName: lastName.trim(),
      gender,
      birthDate: birthDate.trim(),
      deathDate: deathDate.trim(),
      photoUrl: photoUrl.trim(),
    };
  };
  
  const submitRelative = () => {
    const targetPerson = findPerson(addTargetPersonId);
    if (!targetPerson) {
      Alert.alert('Семейное древо', 'Не выбран человек для связи');
      return;
    }
    
    const newPerson = createNewPerson();
    if (!newPerson) return;
    
    const nextRelations = [];
    const nextPartnerships = [];
    
    if (relativeType === 'mother' || relativeType === 'father' || relativeType === 'parent') {
      const targetParents = getParents(targetPerson.id);
      
      if (relativeType === 'mother') {
        const hasMother = targetParents.some(parent => parent.gender === 'female');
        if (hasMother) {
          Alert.alert('Родитель уже указан', 'У этого человека уже указана мама.');
          return;
        }
      }
      
      if (relativeType === 'father') {
        const hasFather = targetParents.some(parent => parent.gender === 'male');
        if (hasFather) {
          Alert.alert('Родитель уже указан', 'У этого человека уже указан папа.');
          return;
        }
      }
      
      nextRelations.push({
        id: Date.now() + 1,
        parentId: newPerson.id,
        childId: targetPerson.id,
        relationType: relativeType === 'parent' ? 'guardian' : 'biological',
      });
    }
    
    if (relativeType === 'child') {
      nextRelations.push({
        id: Date.now() + 1,
        parentId: targetPerson.id,
        childId: newPerson.id,
        relationType: 'biological',
      });
      
      const targetPartners = getPartners(targetPerson.id);
      if (targetPartners.length > 0) {
        nextRelations.push({
          id: Date.now() + 2,
          parentId: targetPartners[0].id,
          childId: newPerson.id,
          relationType: 'biological',
        });
      }
    }
    
    if (relativeType === 'partner') {
      nextPartnerships.push({
        id: Date.now() + 1,
        partner1Id: targetPerson.id,
        partner2Id: newPerson.id,
        status: 'relationship',
      });
    }
    
    if (relativeType === 'sibling') {
      const parentIds = parentChildRelations.filter(relation => relation.childId === targetPerson.id).map(relation => relation.parentId);
      
      if (parentIds.length === 0) {
        Alert.alert('Нельзя добавить брата или сестру', 'Сначала добавьте выбранному человеку хотя бы одного родителя.');
        return;
      }
      
      parentIds.forEach((parentId, index) => {
        nextRelations.push({
          id: Date.now() + index + 1,
          parentId,
          childId: newPerson.id,
          relationType: 'biological',
        });
      });
    }
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPersons(prev => [...prev, newPerson]);
    
    if (nextRelations.length > 0) {
      setParentChildRelations(prev => [...prev, ...nextRelations]);
    }
    
    if (nextPartnerships.length > 0) {
      setPartnerships(prev => [...prev, ...nextPartnerships]);
    }
    
    if (personalRelationText.trim()) {
      setPersonalLabels(prev => ({ ...prev, [newPerson.id]: personalRelationText.trim() }));
    }
    
    setSelectedPersonId(newPerson.id);
    closeAddModal();
  };
  
  const savePersonalLabel = () => {
    if (!selectedPerson) return;
    setPersonalLabels(prev => ({ ...prev, [selectedPerson.id]: draftPersonalLabel.trim() }));
    closePersonModal();
  };
  
  const zoomCanvas = (delta) => {
    const nextScale = clamp(transformRef.current.scale + delta, MIN_SCALE, MAX_SCALE);
    updateCanvasTransform({ ...transformRef.current, scale: nextScale });
  };
  
  const centerOnPerson = (personId = selectedPersonId) => {
    const node = positionedNodes.find(item => item.type === 'person' && item.personId === personId);
    if (!node) return;
    const scale = transformRef.current.scale;
    updateCanvasTransform({
      ...transformRef.current,
      x: viewportSize.width / 2 - node.centerX * scale,
      y: viewportSize.height / 2 - node.centerY * scale,
    });
  };
  
  const centerOnMe = () => {
    const myPerson = persons.find(person => person.linkedUserId === CURRENT_USER_ID);
    if (!myPerson) return;
    setSelectedPersonId(myPerson.id);
    centerOnPerson(myPerson.id);
  };
  
  const renderPersonPhoto = (person) => {
    if (person.photoUrl) {
      return <Image source={{ uri: person.photoUrl }} style={styles.personPhoto} />;
    }
    return (
      <View style={styles.personPhotoPlaceholder}>
        <Text style={styles.personPhotoText} allowFontScaling={false}>{getInitials(person)}</Text>
      </View>
    );
  };
  
  const renderPersonCard = (node) => {
    const isSelected = node.personId === selectedPersonId;
    const isMe = node.person.linkedUserId === CURRENT_USER_ID;
    const isLinked = Boolean(node.person.linkedUserId);
    const personalLabel = personalLabels[node.personId] || '';
    
    return (
      <TouchableOpacity
        key={node.key}
        style={[styles.personCard, { left: node.x, top: node.y }, isSelected && styles.personCardSelected, isMe && styles.personCardMe]}
        activeOpacity={0.84}
        onPress={() => {
          if (isSelected) {
            openPersonModal(node.person);
          } else {
            setSelectedPersonId(node.personId);
          }
        }}
        onLongPress={() => openPersonModal(node.person)}
      >
        {renderPersonPhoto(node.person)}
        <Text style={[styles.personName, isSelected && styles.personNameSelected]} allowFontScaling={false} numberOfLines={2}>
          {getFullName(node.person)}
        </Text>
        <Text style={[styles.personDates, isSelected && styles.personDatesSelected]} allowFontScaling={false} numberOfLines={1}>
          {getLifeDates(node.person)}
        </Text>
        {!!personalLabel && (
          <View style={[styles.personalLabel, isMe && styles.personalLabelMe]}>
            <Text style={[styles.personalLabelText, isMe && styles.personalLabelTextMe]} allowFontScaling={false} numberOfLines={1}>
              {isMe ? 'это вы' : personalLabel}
            </Text>
          </View>
        )}
        {isLinked && (
          <View style={styles.linkedMark}>
            <Ionicons name="link-outline" size={11} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderPlusButton = (node) => (
    <TouchableOpacity
      key={node.key}
      style={[styles.plusButton, { left: node.x, top: node.y }]}
      activeOpacity={0.78}
      onPress={() => openAddModal(node.relativeType, node.targetPersonId)}
    >
      <Ionicons name="add" size={24} color="#7B7B7B" />
    </TouchableOpacity>
  );
  
  const renderSearchResults = () => {
    if (!search.trim()) return null;
    
    return (
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
              {person.linkedUserId === CURRENT_USER_ID && (
                <View style={styles.meBadgeSmall}>
                  <Text style={styles.meBadgeSmallText} allowFontScaling={false}>Вы</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };
  
  const renderAddModeTabs = () => (
    <View style={styles.modeTabs}>
      <TouchableOpacity style={[styles.modeTab, addMode === 'manual' && styles.modeTabActive]} activeOpacity={0.8} onPress={() => setAddMode('manual')}>
        <Text style={[styles.modeTabText, addMode === 'manual' && styles.modeTabTextActive]} allowFontScaling={false}>Вручную</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.modeTab, addMode === 'account' && styles.modeTabActive]} activeOpacity={0.8} onPress={() => setAddMode('account')}>
        <Text style={[styles.modeTabText, addMode === 'account' && styles.modeTabTextActive]} allowFontScaling={false}>Связать аккаунт</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderRelativeTypePicker = () => (
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
  );
  
  const renderGenderPicker = () => (
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
  );
  
  const renderAccountPicker = () => {
    if (addMode !== 'account') return null;
    
    return (
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
    );
  };
  
  const renderAddModal = () => (
    <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={closeAddModal}>
      <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={closeAddModal}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTextBlock}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Добавить человека</Text>
                <Text style={styles.modalSubtitle} allowFontScaling={false} numberOfLines={1}>
                  {getRelativeTitle(relativeType)} для {getFullName(addTargetPerson)}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} activeOpacity={0.75} onPress={closeAddModal}>
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.inputLabel} allowFontScaling={false}>Тип связи</Text>
              {renderRelativeTypePicker()}
              {renderAddModeTabs()}
              {renderAccountPicker()}
              
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
              {renderGenderPicker()}
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
              
              <TouchableOpacity style={styles.submitButton} activeOpacity={0.85} onPress={submitRelative}>
                <Ionicons name="add" size={21} color="#FFFFFF" />
                <Text style={styles.submitButtonText} allowFontScaling={false}>Добавить</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
  
  const renderPersonModal = () => {
    if (!selectedPerson) return null;
    const isMe = selectedPerson.linkedUserId === CURRENT_USER_ID;
    const isLinked = Boolean(selectedPerson.linkedUserId);
    
    return (
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
                {renderPersonPhoto(selectedPerson)}
                <View style={styles.personModalTextBlock}>
                  <Text style={styles.personModalName} allowFontScaling={false} numberOfLines={1}>{getFullName(selectedPerson)}</Text>
                  <Text style={styles.personModalDates} allowFontScaling={false}>{getLifeDates(selectedPerson)}</Text>
                  {isLinked && (
                    <Text style={styles.personModalLinked} allowFontScaling={false}>
                      {isMe ? 'Это ваша карточка' : 'Связано с аккаунтом семьи'}
                    </Text>
                  )}
                </View>
              </View>
              
              <Text style={styles.inputLabel} allowFontScaling={false}>Кто этот человек для вас?</Text>
              <TextInput style={styles.textInput} value={draftPersonalLabel} onChangeText={setDraftPersonalLabel} placeholder="Например: бабушка, папа, сестра" placeholderTextColor="#A1A1A1" />
              <Text style={styles.personalHint} allowFontScaling={false}>
                Эта подпись видна только вам. Другие члены семьи могут указать своё отношение к этому человеку.
              </Text>
              
              <TouchableOpacity style={styles.submitButton} activeOpacity={0.85} onPress={savePersonalLabel}>
                <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                <Text style={styles.submitButtonText} allowFontScaling={false}>Сохранить</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  
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
        
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Поиск человека" placeholderTextColor="#A1A1A1" allowFontScaling={false} />
            <Ionicons name="search-outline" size={21} color="#858585" />
          </View>
          {renderSearchResults()}
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
              {gridPaths.map(path => <Path key={path.id} d={path.d} stroke="#EEF0F3" strokeWidth={1} fill="none" />)}
              {linePaths.map(path => <Path key={path.id} d={path.d} stroke={path.color} strokeWidth={path.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
            </Svg>
            
            {positionedNodes.map(renderPersonCard)}
            {plusNodes.map(renderPlusButton)}
          </View>
          
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} activeOpacity={0.75} onPress={() => zoomCanvas(-0.12)}>
              <Ionicons name="remove" size={20} color="#262626" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} activeOpacity={0.75} onPress={centerOnMe}>
              <Ionicons name="locate-outline" size={20} color={MAIN_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} activeOpacity={0.75} onPress={() => zoomCanvas(0.12)}>
              <Ionicons name="add" size={20} color="#262626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {renderAddModal()}
      {renderPersonModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  personCard: { position: 'absolute', width: PERSON_CARD_WIDTH, height: PERSON_CARD_HEIGHT, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1.4, borderColor: '#D8DEE6', alignItems: 'center', paddingHorizontal: 8, paddingTop: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 9, elevation: 2 },
  personCardSelected: { borderColor: MAIN_COLOR, backgroundColor: '#F3ECFF' },
  personCardMe: { borderWidth: 2, borderColor: MAIN_COLOR },
  personPhoto: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EAEAEA', marginBottom: 6 },
  personPhotoPlaceholder: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3ECFF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  personPhotoText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: MAIN_COLOR },
  personName: { width: '100%', textAlign: 'center', fontFamily: fontFamily.medium, fontSize: fontSize.caption, lineHeight: 15, color: '#262626' },
  personNameSelected: { color: MAIN_COLOR },
  personDates: { width: '100%', marginTop: 3, textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 10, color: '#858585' },
  personDatesSelected: { color: '#6F45C7' },
  personalLabel: { position: 'absolute', left: 8, right: 8, bottom: 7, height: 18, borderRadius: 9, backgroundColor: '#F3ECFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  personalLabelMe: { backgroundColor: MAIN_COLOR },
  personalLabelText: { fontFamily: fontFamily.medium, fontSize: 9, color: MAIN_COLOR },
  personalLabelTextMe: { color: '#FFFFFF' },
  linkedMark: { position: 'absolute', right: 7, top: 7, width: 18, height: 18, borderRadius: 9, backgroundColor: MAIN_COLOR, justifyContent: 'center', alignItems: 'center' },
  plusButton: { position: 'absolute', width: PLUS_SIZE, height: PLUS_SIZE, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#A9A9A9', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
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
  accountItem: { minHeight: 62, borderRadius: 22, backgroundColor: '#F7F7F7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8, borderWidth: 1.4, borderColor: '#F7F7F7' },
  accountItemSelected: { borderColor: MAIN_COLOR, backgroundColor: '#F3ECFF' },
  accountAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
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
  submitButtonText: { marginLeft: 7, fontFamily: fontFamily.medium, fontSize: fontSize.bodyM, color: '#FFFFFF' },
  personModalCard: { minHeight: 76, borderRadius: 24, backgroundColor: '#F7F7F7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 18 },
  personModalTextBlock: { flex: 1, marginLeft: 12 },
  personModalName: { fontFamily: fontFamily.medium, fontSize: fontSize.bodyL, color: '#262626' },
  personModalDates: { marginTop: 3, fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: '#858585' },
  personModalLinked: { marginTop: 3, fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: MAIN_COLOR },
  personalHint: { marginTop: -6, marginBottom: 16, fontFamily: fontFamily.regular, fontSize: fontSize.caption, lineHeight: 18, color: '#858585' },
});