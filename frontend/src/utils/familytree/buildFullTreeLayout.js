const DEFAULT_CONFIG = {
  cardWidth: 150,
  cardHeight: 150,

  levelGap: 185,
  nodeGap: 150,
  partnerGap: 76,

  padding: 420,

  minCanvasWidth: 1400,
  minCanvasHeight: 1000,

  maxLevel: 120,
  stabilizationPasses: 36,
};

function getPersonName(person) {
  if (!person) return 'Неизвестно';

  const parts = [
    person.firstName || '',
    person.lastName || '',
  ].filter(Boolean);

  return parts.join(' ').trim() || 'Без имени';
}

function uniqueArray(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeId(value) {
  if (value === null || value === undefined) return null;
  return value;
}

function sortPeople(a, b) {
  const genderOrder = {
    male: 0,
    female: 1,
    unknown: 2,
  };

  const genderA = genderOrder[a?.gender || 'unknown'] ?? 2;
  const genderB = genderOrder[b?.gender || 'unknown'] ?? 2;

  if (genderA !== genderB) {
    return genderA - genderB;
  }

  return getPersonName(a).localeCompare(getPersonName(b));
}

function makeNode(person, x, y, config) {
  const width = config.cardWidth;
  const height = config.cardHeight;

  return {
    id: person.id,
    key: `person-${person.id}`,
    type: 'person',
    person,
    personId: person.id,

    x,
    y,
    width,
    height,

    centerX: x + width / 2,
    centerY: y + height / 2,
    topY: y,
    bottomY: y + height,
    rightX: x + width,
  };
}

function makeLine({
  id,
  d,
  fromId = null,
  toId = null,
  minX,
  minY,
  maxX,
  maxY,
  dashed = false,
}) {
  return {
    id,
    d,
    fromId,
    toId,
    minX,
    minY,
    maxX,
    maxY,
    dashed,
  };
}

function makeParentChildLine(parentNode, childNode) {
  const startX = parentNode.centerX;
  const startY = parentNode.bottomY;
  const endX = childNode.centerX;
  const endY = childNode.topY;
  const midY = startY + (endY - startY) / 2;

  return makeLine({
    id: `parent-child-${parentNode.id}-${childNode.id}`,
    fromId: parentNode.id,
    toId: childNode.id,
    d: [
      `M ${startX} ${startY}`,
      `V ${midY}`,
      `H ${endX}`,
      `V ${endY}`,
    ].join(' '),
    minX: Math.min(startX, endX),
    minY: Math.min(startY, endY),
    maxX: Math.max(startX, endX),
    maxY: Math.max(startY, endY),
  });
}

function makePartnerLine(leftNode, rightNode, idPrefix = 'partner') {
  const y = leftNode.centerY;
  const startX = leftNode.rightX;
  const endX = rightNode.x;

  if (endX <= startX) return null;

  return makeLine({
    id: `${idPrefix}-${leftNode.id}-${rightNode.id}`,
    fromId: leftNode.id,
    toId: rightNode.id,
    d: `M ${startX} ${y} H ${endX}`,
    minX: startX,
    minY: y,
    maxX: endX,
    maxY: y,
  });
}

function makeSiblingLine(nodeA, nodeB) {
  const leftNode = nodeA.centerX <= nodeB.centerX ? nodeA : nodeB;
  const rightNode = nodeA.centerX <= nodeB.centerX ? nodeB : nodeA;

  const y = Math.min(leftNode.y, rightNode.y) - 22;

  return makeLine({
    id: `sibling-${leftNode.id}-${rightNode.id}`,
    fromId: leftNode.id,
    toId: rightNode.id,
    d: [
      `M ${leftNode.centerX} ${leftNode.topY}`,
      `V ${y}`,
      `H ${rightNode.centerX}`,
      `V ${rightNode.topY}`,
    ].join(' '),
    minX: leftNode.centerX,
    minY: y,
    maxX: rightNode.centerX,
    maxY: Math.max(leftNode.topY, rightNode.topY),
    dashed: true,
  });
}

function normalizeParentChildRelations(relations, personMap) {
  return relations
    .map((relation) => {
      let parentId = normalizeId(relation.parentId);
      let childId = normalizeId(relation.childId);

      if (!personMap.has(parentId) || !personMap.has(childId)) {
        return null;
      }

      if (parentId === childId) {
        return null;
      }

      const parent = personMap.get(parentId);
      const child = personMap.get(childId);

      const relationType = relation.relationType || '';

      const expectedParentGender =
        relationType === 'mother'
          ? 'female'
          : relationType === 'father'
            ? 'male'
            : null;

      if (
        expectedParentGender &&
        child?.gender === expectedParentGender &&
        parent?.gender !== expectedParentGender
      ) {
        const temp = parentId;
        parentId = childId;
        childId = temp;
      }

      return {
        ...relation,
        parentId,
        childId,
      };
    })
    .filter(Boolean);
}

function buildRelationMaps({
  persons,
  parentChildRelations,
  partnerships,
  siblingRelations,
}) {
  const personMap = new Map();
  const parentIdsByChild = new Map();
  const childIdsByParent = new Map();
  const partnerIdsByPerson = new Map();
  const siblingIdsByPerson = new Map();
  const coParentIdsByPerson = new Map();
  const partnerOrderByPairKey = new Map();

  persons.forEach((person) => {
    personMap.set(person.id, person);
    parentIdsByChild.set(person.id, []);
    childIdsByParent.set(person.id, []);
    partnerIdsByPerson.set(person.id, []);
    siblingIdsByPerson.set(person.id, []);
    coParentIdsByPerson.set(person.id, []);
  });

  parentChildRelations.forEach((relation) => {
    const parentId = normalizeId(relation.parentId);
    const childId = normalizeId(relation.childId);

    if (!personMap.has(parentId) || !personMap.has(childId)) return;
    if (parentId === childId) return;

    parentIdsByChild.get(childId).push(parentId);
    childIdsByParent.get(parentId).push(childId);
  });

  partnerships.forEach((partnership) => {
    const partner1Id = normalizeId(partnership.partner1Id);
    const partner2Id = normalizeId(partnership.partner2Id);

    if (!personMap.has(partner1Id) || !personMap.has(partner2Id)) return;
    if (partner1Id === partner2Id) return;

    partnerIdsByPerson.get(partner1Id).push(partner2Id);
    partnerIdsByPerson.get(partner2Id).push(partner1Id);

    const pairKey = [partner1Id, partner2Id].sort().join('-');

    if (!partnerOrderByPairKey.has(pairKey)) {
      partnerOrderByPairKey.set(pairKey, [partner1Id, partner2Id]);
    }
  });

  siblingRelations.forEach((relation) => {
    const person1Id = normalizeId(relation.person1Id);
    const person2Id = normalizeId(relation.person2Id);

    if (!personMap.has(person1Id) || !personMap.has(person2Id)) return;
    if (person1Id === person2Id) return;

    siblingIdsByPerson.get(person1Id).push(person2Id);
    siblingIdsByPerson.get(person2Id).push(person1Id);
  });

  parentIdsByChild.forEach((parentIds, childId) => {
    const uniqueParentIds = uniqueArray(parentIds);
    parentIdsByChild.set(childId, uniqueParentIds);

    if (uniqueParentIds.length < 2) return;

    uniqueParentIds.forEach((parentId) => {
      uniqueParentIds.forEach((otherParentId) => {
        if (parentId === otherParentId) return;
        if (!coParentIdsByPerson.has(parentId)) return;

        coParentIdsByPerson.get(parentId).push(otherParentId);
      });
    });
  });

  childIdsByParent.forEach((childIds, parentId) => {
    const uniqueChildIds = uniqueArray(childIds);
    childIdsByParent.set(parentId, uniqueChildIds);

    uniqueChildIds.forEach((childId) => {
      uniqueChildIds.forEach((otherChildId) => {
        if (childId === otherChildId) return;
        if (!siblingIdsByPerson.has(childId)) return;

        siblingIdsByPerson.get(childId).push(otherChildId);
      });
    });
  });

  partnerIdsByPerson.forEach((ids, key) => {
    partnerIdsByPerson.set(key, uniqueArray(ids));
  });

  siblingIdsByPerson.forEach((ids, key) => {
    siblingIdsByPerson.set(key, uniqueArray(ids));
  });

  coParentIdsByPerson.forEach((ids, key) => {
    coParentIdsByPerson.set(key, uniqueArray(ids));
  });

  return {
    personMap,
    parentIdsByChild,
    childIdsByParent,
    partnerIdsByPerson,
    siblingIdsByPerson,
    coParentIdsByPerson,
    partnerOrderByPairKey,
  };
}

function buildLevels({
  persons,
  parentChildRelations,
  partnerships,
  siblingRelations,
}) {
  const personIds = new Set(persons.map((person) => person.id));
  const adjacency = new Map();

  persons.forEach((person) => {
    adjacency.set(person.id, []);
  });

  const addConstraint = (fromId, toId, delta) => {
    if (!personIds.has(fromId) || !personIds.has(toId)) return;
    if (fromId === toId) return;

    adjacency.get(fromId).push({
      toId,
      delta,
    });

    adjacency.get(toId).push({
      toId: fromId,
      delta: -delta,
    });
  };

  parentChildRelations.forEach((relation) => {
    const parentId = normalizeId(relation.parentId);
    const childId = normalizeId(relation.childId);

    addConstraint(parentId, childId, 1);
  });

  partnerships.forEach((partnership) => {
    const partner1Id = normalizeId(partnership.partner1Id);
    const partner2Id = normalizeId(partnership.partner2Id);

    addConstraint(partner1Id, partner2Id, 0);
  });

  siblingRelations.forEach((relation) => {
    const person1Id = normalizeId(relation.person1Id);
    const person2Id = normalizeId(relation.person2Id);

    addConstraint(person1Id, person2Id, 0);
  });

  const childIdsByParent = new Map();

  persons.forEach((person) => {
    childIdsByParent.set(person.id, []);
  });

  parentChildRelations.forEach((relation) => {
    const parentId = normalizeId(relation.parentId);
    const childId = normalizeId(relation.childId);

    if (!childIdsByParent.has(parentId)) return;
    childIdsByParent.get(parentId).push(childId);
  });

  childIdsByParent.forEach((childIds) => {
    const uniqueChildIds = uniqueArray(childIds);

    uniqueChildIds.forEach((childId) => {
      uniqueChildIds.forEach((otherChildId) => {
        if (childId === otherChildId) return;

        addConstraint(childId, otherChildId, 0);
      });
    });
  });

  const parentIdsByChild = new Map();

  persons.forEach((person) => {
    parentIdsByChild.set(person.id, []);
  });

  parentChildRelations.forEach((relation) => {
    const parentId = normalizeId(relation.parentId);
    const childId = normalizeId(relation.childId);

    if (!parentIdsByChild.has(childId)) return;
    parentIdsByChild.get(childId).push(parentId);
  });

  parentIdsByChild.forEach((parentIds) => {
    const uniqueParentIds = uniqueArray(parentIds);

    uniqueParentIds.forEach((parentId) => {
      uniqueParentIds.forEach((otherParentId) => {
        if (parentId === otherParentId) return;

        addConstraint(parentId, otherParentId, 0);
      });
    });
  });

  const levelById = new Map();
  const visited = new Set();

  persons.forEach((startPerson) => {
    if (visited.has(startPerson.id)) return;

    const queue = [startPerson.id];

    levelById.set(startPerson.id, 0);
    visited.add(startPerson.id);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentLevel = levelById.get(currentId) || 0;
      const edges = adjacency.get(currentId) || [];

      edges.forEach((edge) => {
        const expectedLevel = currentLevel + edge.delta;

        if (!levelById.has(edge.toId)) {
          levelById.set(edge.toId, expectedLevel);
          visited.add(edge.toId);
          queue.push(edge.toId);
        }
      });
    }
  });

  const levelsArray = Array.from(levelById.values());
  const minLevel = levelsArray.length > 0 ? Math.min(...levelsArray) : 0;

  if (Number.isFinite(minLevel) && minLevel !== 0) {
    levelById.forEach((level, personId) => {
      levelById.set(personId, level - minLevel);
    });
  }

  const levels = new Map();

  persons.forEach((person) => {
    const level = levelById.get(person.id) || 0;

    if (!levels.has(level)) {
      levels.set(level, []);
    }

    levels.get(level).push(person);
  });

  levels.forEach((levelPersons, level) => {
    levels.set(level, [...levelPersons].sort(sortPeople));
  });

  return {
    levelById,
    levels,
  };
}

function createUnit(level, persons, config) {
  const offsetsByPersonId = {};
  let width = 0;

  persons.forEach((person, index) => {
    if (index > 0) {
      width += config.partnerGap;
    }

    offsetsByPersonId[person.id] = width;
    width += config.cardWidth;
  });

  return {
    id: `unit-${level}-${persons.map((person) => person.id).join('-')}`,
    level,
    persons,
    personIds: persons.map((person) => person.id),
    offsetsByPersonId,
    width,
    height: config.cardHeight,
    x: 0,
    y: 0,
    targetCenterX: null,
  };
}

function createUnitsForLevel(
  level,
  levelPersons,
  levelById,
  partnerIdsByPerson,
  coParentIdsByPerson,
  partnerOrderByPairKey,
  config
) {
  const usedIds = new Set();
  const units = [];

  levelPersons.forEach((person) => {
    if (usedIds.has(person.id)) return;

    const partnerIds = partnerIdsByPerson.get(person.id) || [];
    const coParentIds = coParentIdsByPerson.get(person.id) || [];

    const partner = partnerIds
      .map((id) => levelPersons.find((item) => item.id === id))
      .find((item) => {
        if (!item) return false;
        if (usedIds.has(item.id)) return false;

        return levelById.get(item.id) === levelById.get(person.id);
      });

    const coParent = coParentIds
      .map((id) => levelPersons.find((item) => item.id === id))
      .find((item) => {
        if (!item) return false;
        if (usedIds.has(item.id)) return false;

        return levelById.get(item.id) === levelById.get(person.id);
      });

    const pairPerson = partner || coParent;

    if (pairPerson) {
      let pair = [person, pairPerson];

      const pairKey = [person.id, pairPerson.id].sort().join('-');
      const savedPartnerOrder = partnerOrderByPairKey.get(pairKey);

      if (savedPartnerOrder) {
        const first = levelPersons.find((item) => item.id === savedPartnerOrder[0]);
        const second = levelPersons.find((item) => item.id === savedPartnerOrder[1]);

        if (first && second) {
          pair = [first, second];
        }
      } else if (person.gender === 'female' && pairPerson.gender !== 'female') {
        pair = [pairPerson, person];
      }

      units.push(createUnit(level, pair, config));
      usedIds.add(pair[0].id);
      usedIds.add(pair[1].id);
      return;
    }

    units.push(createUnit(level, [person], config));
    usedIds.add(person.id);
  });

  return units;
}

function getUnitCenterX(unit) {
  return unit.x + unit.width / 2;
}

function unitHasPerson(unit, personId) {
  return unit.personIds.includes(personId);
}

function getPersonCenterX(personId, unitByPersonId, config) {
  const unit = unitByPersonId.get(personId);

  if (!unit) return null;

  const offset = unit.offsetsByPersonId[personId] || 0;

  return unit.x + offset + config.cardWidth / 2;
}

function getAverage(values) {
  const filtered = values.filter((value) => Number.isFinite(value));

  if (filtered.length === 0) return null;

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function calculateUnitTargetCenter({
  unit,
  unitByPersonId,
  parentChildRelations,
  config,
}) {
  const targets = [];

  parentChildRelations.forEach((relation) => {
    const parentId = relation.parentId;
    const childId = relation.childId;

    if (unitHasPerson(unit, parentId)) {
      const childCenterX = getPersonCenterX(childId, unitByPersonId, config);

      if (Number.isFinite(childCenterX)) {
        targets.push(childCenterX);
        targets.push(childCenterX);
      }
    }

    if (unitHasPerson(unit, childId)) {
      const parentCenterX = getPersonCenterX(parentId, unitByPersonId, config);

      if (Number.isFinite(parentCenterX)) {
        targets.push(parentCenterX);
      }
    }
  });

  const average = getAverage(targets);

  if (!Number.isFinite(average)) {
    return getUnitCenterX(unit);
  }

  return average;
}

function layoutRowByTargets(row, config) {
  const units = [...row.units].sort((a, b) => {
    const targetA = Number.isFinite(a.targetCenterX)
      ? a.targetCenterX
      : getUnitCenterX(a);

    const targetB = Number.isFinite(b.targetCenterX)
      ? b.targetCenterX
      : getUnitCenterX(b);

    return targetA - targetB;
  });

  units.forEach((unit) => {
    const targetCenterX = Number.isFinite(unit.targetCenterX)
      ? unit.targetCenterX
      : getUnitCenterX(unit);

    unit.x = targetCenterX - unit.width / 2;
  });

  for (let index = 1; index < units.length; index += 1) {
    const previous = units[index - 1];
    const current = units[index];

    const minX = previous.x + previous.width + config.nodeGap;

    if (current.x < minX) {
      current.x = minX;
    }
  }

  for (let index = units.length - 2; index >= 0; index -= 1) {
    const current = units[index];
    const next = units[index + 1];

    const maxX = next.x - config.nodeGap - current.width;

    const targetCenterX = Number.isFinite(current.targetCenterX)
      ? current.targetCenterX
      : getUnitCenterX(current);

    const desiredX = targetCenterX - current.width / 2;

    if (current.x > desiredX && desiredX <= maxX) {
      current.x = desiredX;
    }

    if (current.x > maxX) {
      current.x = maxX;
    }
  }

  row.units = units;
}

function stabilizeHorizontalPositions({
  rows,
  unitByPersonId,
  parentChildRelations,
  config,
}) {
  for (let pass = 0; pass < config.stabilizationPasses; pass += 1) {
    rows.forEach((row) => {
      row.units.forEach((unit) => {
        const targetCenterX = calculateUnitTargetCenter({
          unit,
          unitByPersonId,
          parentChildRelations,
          config,
        });

        const currentCenterX = getUnitCenterX(unit);

        unit.targetCenterX =
          currentCenterX * 0.18 +
          targetCenterX * 0.82;
      });
    });

    rows.forEach((row) => {
      layoutRowByTargets(row, config);
    });
  }
}

function shiftPath(d, dx, dy) {
  const tokens = d.match(/[A-Za-z]|-?\d+(\.\d+)?/g);

  if (!tokens) return d;

  let mode = null;
  let pairPart = 'x';

  return tokens.map((token) => {
    if (/^[A-Za-z]$/.test(token)) {
      mode = token;
      pairPart = 'x';
      return token;
    }

    const value = Number(token);

    if (Number.isNaN(value)) return token;

    if (mode === 'H') return String(value + dx);
    if (mode === 'V') return String(value + dy);

    if (mode === 'M' || mode === 'L') {
      if (pairPart === 'x') {
        pairPart = 'y';
        return String(value + dx);
      }

      pairPart = 'x';
      return String(value + dy);
    }

    return token;
  }).join(' ');
}

export default function buildFullTreeLayout(input = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...(input.config || {}),
  };

  const persons = Array.isArray(input.persons) ? input.persons : [];

  const rawParentChildRelations = Array.isArray(input.parentChildRelations)
    ? input.parentChildRelations
    : [];

  const partnerships = Array.isArray(input.partnerships)
    ? input.partnerships
    : [];

  const siblingRelations = Array.isArray(input.siblingRelations)
    ? input.siblingRelations
    : [];

  if (persons.length === 0) {
    return {
      nodes: [],
      lines: [],
      nodeById: {},
      canvasWidth: config.minCanvasWidth,
      canvasHeight: config.minCanvasHeight,
      stats: {
        totalPersons: 0,
        totalLines: 0,
        levels: 0,
      },
    };
  }

  const personMap = new Map();

  persons.forEach((person) => {
    personMap.set(person.id, person);
  });

  const parentChildRelations = normalizeParentChildRelations(
    rawParentChildRelations,
    personMap
  );

  const {
    partnerIdsByPerson,
    coParentIdsByPerson,
    partnerOrderByPairKey,
  } = buildRelationMaps({
    persons,
    parentChildRelations,
    partnerships,
    siblingRelations,
  });

  const {
    levelById,
    levels,
  } = buildLevels({
    persons,
    parentChildRelations,
    partnerships,
    siblingRelations,
  });

  const sortedLevelNumbers = Array.from(levels.keys()).sort((a, b) => a - b);

  const rows = sortedLevelNumbers.map((level, rowIndex) => {
    const levelPersons = levels.get(level) || [];

    const units = createUnitsForLevel(
      level,
      levelPersons,
      levelById,
      partnerIdsByPerson,
      coParentIdsByPerson,
      partnerOrderByPairKey,
      config
    );

    const rowWidth = units.reduce((sum, unit, index) => {
      return sum + unit.width + (index > 0 ? config.nodeGap : 0);
    }, 0);

    return {
      level,
      rowIndex,
      units,
      rowWidth,
    };
  });

  const maxRowWidth = Math.max(
    ...rows.map((row) => row.rowWidth),
    config.minCanvasWidth - config.padding * 2
  );

  const provisionalCanvasWidth = Math.max(
    config.minCanvasWidth,
    maxRowWidth + config.padding * 2
  );

  const unitByPersonId = new Map();

  rows.forEach((row) => {
    const y = config.padding + row.rowIndex * (config.cardHeight + config.levelGap);
    let x = (provisionalCanvasWidth - row.rowWidth) / 2;

    row.units.forEach((unit, unitIndex) => {
      if (unitIndex > 0) {
        x += config.nodeGap;
      }

      unit.x = x;
      unit.y = y;

      unit.personIds.forEach((personId) => {
        unitByPersonId.set(personId, unit);
      });

      x += unit.width;
    });
  });

  stabilizeHorizontalPositions({
    rows,
    unitByPersonId,
    parentChildRelations,
    config,
  });

  const allUnits = rows.flatMap((row) => row.units);

  const minUnitX = Math.min(...allUnits.map((unit) => unit.x));
  const shiftX = config.padding - minUnitX;

  if (Number.isFinite(shiftX) && shiftX !== 0) {
    allUnits.forEach((unit) => {
      unit.x += shiftX;
    });
  }

  const nodes = [];
  const nodeByIdMap = new Map();

  rows.forEach((row) => {
    row.units.forEach((unit) => {
      unit.persons.forEach((person) => {
        const offset = unit.offsetsByPersonId[person.id] || 0;

        const node = makeNode(
          person,
          unit.x + offset,
          unit.y,
          config
        );

        nodes.push(node);
        nodeByIdMap.set(person.id, node);
      });
    });
  });

  const lines = [];
  const addedLineIds = new Set();
  const partnerPairKeys = new Set();

  const addLine = (line) => {
    if (!line) return;
    if (addedLineIds.has(line.id)) return;

    addedLineIds.add(line.id);
    lines.push(line);
  };

  const addVisualPartnerLine = (node1, node2, idPrefix = 'partner') => {
    if (!node1 || !node2) return;
    if (node1.id === node2.id) return;
    if (Math.abs(node1.centerY - node2.centerY) > 4) return;

    const pairKey = [node1.id, node2.id].sort().join('-');

    if (partnerPairKeys.has(pairKey)) return;

    partnerPairKeys.add(pairKey);

    const leftNode = node1.centerX <= node2.centerX ? node1 : node2;
    const rightNode = node1.centerX <= node2.centerX ? node2 : node1;

    addLine(makePartnerLine(leftNode, rightNode, idPrefix));
  };

  parentChildRelations.forEach((relation) => {
    const parentNode = nodeByIdMap.get(relation.parentId);
    const childNode = nodeByIdMap.get(relation.childId);

    if (!parentNode || !childNode) return;
    if (parentNode.id === childNode.id) return;

    addLine(makeParentChildLine(parentNode, childNode));
  });

  partnerships.forEach((partnership) => {
    const node1 = nodeByIdMap.get(partnership.partner1Id);
    const node2 = nodeByIdMap.get(partnership.partner2Id);

    addVisualPartnerLine(node1, node2, 'partner');
  });

  const parentIdsByChild = new Map();

  persons.forEach((person) => {
    parentIdsByChild.set(person.id, []);
  });

  parentChildRelations.forEach((relation) => {
    if (!parentIdsByChild.has(relation.childId)) return;

    parentIdsByChild.get(relation.childId).push(relation.parentId);
  });

  parentIdsByChild.forEach((parentIds) => {
    const uniqueParentIds = uniqueArray(parentIds);

    if (uniqueParentIds.length < 2) return;

    const parentNodes = uniqueParentIds
      .map((parentId) => nodeByIdMap.get(parentId))
      .filter(Boolean)
      .sort((a, b) => a.centerX - b.centerX);

    if (parentNodes.length < 2) return;

    for (let index = 0; index < parentNodes.length - 1; index += 1) {
      addVisualPartnerLine(
        parentNodes[index],
        parentNodes[index + 1],
        'co-parent'
      );
    }
  });

  siblingRelations.forEach((relation) => {
    const node1 = nodeByIdMap.get(relation.person1Id);
    const node2 = nodeByIdMap.get(relation.person2Id);

    if (!node1 || !node2) return;
    if (node1.id === node2.id) return;
    if (Math.abs(node1.centerY - node2.centerY) > config.cardHeight + 10) return;

    addLine(makeSiblingLine(node1, node2));
  });

  const minX = Math.min(...nodes.map((node) => node.x), config.padding);
  const maxX = Math.max(...nodes.map((node) => node.rightX), config.minCanvasWidth);
  const maxY = Math.max(...nodes.map((node) => node.bottomY), config.minCanvasHeight);

  const canvasWidth = Math.max(
    config.minCanvasWidth,
    maxX + config.padding
  );

  const canvasHeight = Math.max(
    config.minCanvasHeight,
    maxY + config.padding
  );

  if (minX < config.padding) {
    const extraShiftX = config.padding - minX;

    nodes.forEach((node) => {
      node.x += extraShiftX;
      node.centerX += extraShiftX;
      node.rightX += extraShiftX;
    });

    lines.forEach((line) => {
      line.minX += extraShiftX;
      line.maxX += extraShiftX;
      line.d = shiftPath(line.d, extraShiftX, 0);
    });
  }

  const nodeById = {};

  nodeByIdMap.forEach((node, id) => {
    nodeById[id] = node;
  });

  return {
    nodes,
    lines,
    nodeById,
    canvasWidth,
    canvasHeight,
    stats: {
      totalPersons: nodes.length,
      totalLines: lines.length,
      levels: rows.length,
    },
  };
}