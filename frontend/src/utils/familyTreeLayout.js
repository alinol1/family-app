const DEFAULT_CARD_WIDTH = 150;
const DEFAULT_CARD_HEIGHT = 150;
const DEFAULT_COLUMN_GAP = 58;
const DEFAULT_ROW_GAP = 132;
const DEFAULT_PARTNER_GAP = 34;
const DEFAULT_GROUP_GAP = 86;
const DEFAULT_PADDING = 160;

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createRoundedPath(sourceX, sourceY, targetX, targetY) {
  if (targetY <= sourceY) {
    return '';
  }

  const middleY = sourceY + (targetY - sourceY) / 2;
  const radius = 18;
  const dx = targetX - sourceX;

  if (Math.abs(dx) < 2) {
    return `M ${sourceX} ${sourceY} V ${targetY}`;
  }

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

function makePairKey(personAId, personBId) {
  const a = Number(personAId);
  const b = Number(personBId);

  if (a < b) {
    return `${a}-${b}`;
  }

  return `${b}-${a}`;
}

function buildPersonMap(persons) {
  const map = new Map();

  persons.forEach((person) => {
    if (person && person.id !== undefined && person.id !== null) {
      map.set(person.id, person);
    }
  });

  return map;
}

function buildRelationMaps(parentChildRelations, partnerships) {
  const parentsByChild = new Map();
  const childrenByParent = new Map();
  const partnersByPerson = new Map();

  parentChildRelations.forEach((relation) => {
    if (!relation || relation.parentId == null || relation.childId == null) {
      return;
    }

    if (!parentsByChild.has(relation.childId)) {
      parentsByChild.set(relation.childId, []);
    }

    if (!childrenByParent.has(relation.parentId)) {
      childrenByParent.set(relation.parentId, []);
    }

    parentsByChild.get(relation.childId).push(relation.parentId);
    childrenByParent.get(relation.parentId).push(relation.childId);
  });

  partnerships.forEach((partnership) => {
    if (!partnership || partnership.partner1Id == null || partnership.partner2Id == null) {
      return;
    }

    if (!partnersByPerson.has(partnership.partner1Id)) {
      partnersByPerson.set(partnership.partner1Id, []);
    }

    if (!partnersByPerson.has(partnership.partner2Id)) {
      partnersByPerson.set(partnership.partner2Id, []);
    }

    partnersByPerson.get(partnership.partner1Id).push(partnership.partner2Id);
    partnersByPerson.get(partnership.partner2Id).push(partnership.partner1Id);
  });

  return {
    parentsByChild,
    childrenByParent,
    partnersByPerson,
  };
}

function calculateGenerations(persons, parentChildRelations, partnerships) {
  const levels = new Map();

  persons.forEach((person) => {
    levels.set(person.id, 0);
  });

  let changed = true;
  let iteration = 0;
  const maxIterations = Math.max(persons.length * 2, 20);

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration += 1;

    parentChildRelations.forEach((relation) => {
      const parentLevel = levels.get(relation.parentId) ?? 0;
      const childLevel = levels.get(relation.childId) ?? 0;
      const nextChildLevel = parentLevel + 1;

      if (childLevel < nextChildLevel) {
        levels.set(relation.childId, nextChildLevel);
        changed = true;
      }
    });

    partnerships.forEach((partnership) => {
      const partner1Level = levels.get(partnership.partner1Id) ?? 0;
      const partner2Level = levels.get(partnership.partner2Id) ?? 0;
      const sharedLevel = Math.max(partner1Level, partner2Level);

      if (partner1Level !== sharedLevel) {
        levels.set(partnership.partner1Id, sharedLevel);
        changed = true;
      }

      if (partner2Level !== sharedLevel) {
        levels.set(partnership.partner2Id, sharedLevel);
        changed = true;
      }
    });
  }

  const levelValues = Array.from(levels.values());

  if (levelValues.length === 0) {
    return levels;
  }

  const minLevel = Math.min(...levelValues);

  levels.forEach((level, personId) => {
    levels.set(personId, level - minLevel);
  });

  return levels;
}

function getPrimaryPartnerId(personId, partnersByPerson, levelPersonsSet) {
  const partners = partnersByPerson.get(personId) || [];

  const visiblePartners = partners.filter((partnerId) => levelPersonsSet.has(partnerId));

  if (visiblePartners.length === 0) {
    return null;
  }

  return visiblePartners.sort((a, b) => Number(a) - Number(b))[0];
}

function createLevelUnits(levelPersons, partnersByPerson) {
  const levelPersonsSet = new Set(levelPersons.map((person) => person.id));
  const used = new Set();
  const units = [];

  const sortedPersons = [...levelPersons].sort((a, b) => {
    const aName = `${a.lastName || ''} ${a.firstName || ''} ${a.middleName || ''}`.trim();
    const bName = `${b.lastName || ''} ${b.firstName || ''} ${b.middleName || ''}`.trim();

    if (aName && bName && aName !== bName) {
      return aName.localeCompare(bName, 'ru');
    }

    return Number(a.id) - Number(b.id);
  });

  sortedPersons.forEach((person) => {
    if (used.has(person.id)) {
      return;
    }

    const primaryPartnerId = getPrimaryPartnerId(person.id, partnersByPerson, levelPersonsSet);

    if (primaryPartnerId && !used.has(primaryPartnerId)) {
      const partner = sortedPersons.find((item) => item.id === primaryPartnerId);

      if (partner) {
        const pair = Number(person.id) <= Number(partner.id)
          ? [person, partner]
          : [partner, person];

        units.push({
          type: 'couple',
          key: `couple-${pair[0].id}-${pair[1].id}`,
          persons: pair,
        });

        used.add(pair[0].id);
        used.add(pair[1].id);
        return;
      }
    }

    units.push({
      type: 'single',
      key: `single-${person.id}`,
      persons: [person],
    });

    used.add(person.id);
  });

  return units;
}

function calculateUnitWidth(unit, options) {
  const cardWidth = options.cardWidth;
  const partnerGap = options.partnerGap;

  if (unit.persons.length <= 1) {
    return cardWidth;
  }

  return unit.persons.length * cardWidth + (unit.persons.length - 1) * partnerGap;
}

function buildInitialLevels(persons, levels, partnersByPerson, options) {
  const grouped = new Map();

  persons.forEach((person) => {
    const level = levels.get(person.id) ?? 0;

    if (!grouped.has(level)) {
      grouped.set(level, []);
    }

    grouped.get(level).push(person);
  });

  const result = [];

  Array.from(grouped.keys())
    .sort((a, b) => a - b)
    .forEach((level) => {
      const levelPersons = grouped.get(level) || [];
      const units = createLevelUnits(levelPersons, partnersByPerson).map((unit) => ({
        ...unit,
        width: calculateUnitWidth(unit, options),
        centerX: 0,
        x: 0,
      }));

      result.push({
        level,
        units,
      });
    });

  return result;
}

function getChildrenForUnit(unit, childrenByParent) {
  const childIds = new Set();

  unit.persons.forEach((person) => {
    const children = childrenByParent.get(person.id) || [];

    children.forEach((childId) => {
      childIds.add(childId);
    });
  });

  return Array.from(childIds);
}

function improveHorizontalOrder(levelRows, childrenByParent) {
  const rows = levelRows.map((row) => ({
    ...row,
    units: [...row.units],
  }));

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const previousRow = rows[rowIndex - 1];
    const currentRow = rows[rowIndex];

    const parentCenterByChild = new Map();

    previousRow.units.forEach((unit, unitIndex) => {
      const children = getChildrenForUnit(unit, childrenByParent);

      children.forEach((childId) => {
        parentCenterByChild.set(childId, unitIndex);
      });
    });

    currentRow.units.sort((a, b) => {
      const aPersonIds = a.persons.map((person) => person.id);
      const bPersonIds = b.persons.map((person) => person.id);

      const aParentIndexes = aPersonIds
        .map((id) => parentCenterByChild.get(id))
        .filter((value) => value !== undefined);

      const bParentIndexes = bPersonIds
        .map((id) => parentCenterByChild.get(id))
        .filter((value) => value !== undefined);

      const aScore = aParentIndexes.length
        ? aParentIndexes.reduce((sum, value) => sum + value, 0) / aParentIndexes.length
        : Number.MAX_SAFE_INTEGER;

      const bScore = bParentIndexes.length
        ? bParentIndexes.reduce((sum, value) => sum + value, 0) / bParentIndexes.length
        : Number.MAX_SAFE_INTEGER;

      if (aScore !== bScore) {
        return aScore - bScore;
      }

      return String(a.key).localeCompare(String(b.key));
    });
  }

  return rows;
}

function assignCoordinates(levelRows, options) {
  const rows = [];
  let maxWidth = 0;

  levelRows.forEach((row) => {
    const unitsWidth = row.units.reduce((sum, unit) => sum + unit.width, 0);
    const gapsWidth = Math.max(row.units.length - 1, 0) * options.groupGap;
    const rowWidth = unitsWidth + gapsWidth;

    maxWidth = Math.max(maxWidth, rowWidth);

    rows.push({
      ...row,
      width: rowWidth,
    });
  });

  const canvasWidth = Math.max(
    maxWidth + options.padding * 2,
    options.viewportWidth || 1
  );

  const canvasHeight = Math.max(
    options.padding * 2 +
      rows.length * options.cardHeight +
      Math.max(rows.length - 1, 0) * options.rowGap,
    options.viewportHeight || 1
  );

  const positionedRows = rows.map((row, rowIndex) => {
    let currentX = (canvasWidth - row.width) / 2;
    const y = options.padding + rowIndex * (options.cardHeight + options.rowGap);

    const units = row.units.map((unit) => {
      const unitX = currentX;
      const unitCenterX = unitX + unit.width / 2;

      currentX += unit.width + options.groupGap;

      return {
        ...unit,
        x: unitX,
        y,
        centerX: unitCenterX,
      };
    });

    return {
      ...row,
      y,
      units,
    };
  });

  return {
    rows: positionedRows,
    canvasWidth,
    canvasHeight,
  };
}

function buildNodes(rows, options) {
  const nodes = [];

  rows.forEach((row) => {
    row.units.forEach((unit) => {
      let currentX = unit.x;

      unit.persons.forEach((person, personIndex) => {
        const x = currentX;
        const y = unit.y;

        nodes.push({
          key: `person-${person.id}`,
          type: 'person',
          person,
          personId: person.id,
          unitKey: unit.key,
          rowLevel: row.level,
          x,
          y,
          width: options.cardWidth,
          height: options.cardHeight,
          centerX: x + options.cardWidth / 2,
          centerY: y + options.cardHeight / 2,
          topY: y,
          bottomY: y + options.cardHeight,
          rightX: x + options.cardWidth,
          leftX: x,
          partnerIndex: personIndex,
        });

        currentX += options.cardWidth + options.partnerGap;
      });
    });
  });

  return nodes;
}

function buildGridPaths(canvasWidth, canvasHeight, gridSize) {
  const paths = [];

  if (!gridSize || gridSize <= 0) {
    return paths;
  }

  for (let x = 0; x <= canvasWidth; x += gridSize) {
    paths.push({
      id: `grid-v-${x}`,
      d: `M ${x} 0 V ${canvasHeight}`,
    });
  }

  for (let y = 0; y <= canvasHeight; y += gridSize) {
    paths.push({
      id: `grid-h-${y}`,
      d: `M 0 ${y} H ${canvasWidth}`,
    });
  }

  return paths;
}

function buildConnectionPaths(nodes, parentChildRelations, partnerships) {
  const paths = [];
  const nodeMap = new Map();
  const partnershipKeys = new Set();

  nodes.forEach((node) => {
    nodeMap.set(node.personId, node);
  });

  const addHorizontalLine = (nodeA, nodeB, color = '#BFC7CF') => {
    if (!nodeA || !nodeB) {
      return;
    }

    if (Math.abs(nodeA.centerY - nodeB.centerY) > 12) {
      return;
    }

    const leftNode = nodeA.centerX <= nodeB.centerX ? nodeA : nodeB;
    const rightNode = nodeA.centerX <= nodeB.centerX ? nodeB : nodeA;
    const startX = leftNode.rightX;
    const endX = rightNode.leftX;

    if (endX <= startX) {
      return;
    }

    paths.push({
      id: `partner-${leftNode.personId}-${rightNode.personId}`,
      d: `M ${startX} ${leftNode.centerY} H ${endX}`,
      color,
      width: 2,
    });
  };

  partnerships.forEach((partnership) => {
    const node1 = nodeMap.get(partnership.partner1Id);
    const node2 = nodeMap.get(partnership.partner2Id);

    if (!node1 || !node2) {
      return;
    }

    const key = makePairKey(partnership.partner1Id, partnership.partner2Id);
    partnershipKeys.add(key);

    addHorizontalLine(node1, node2, '#BFC7CF');
  });

  const relationsByChild = new Map();

  parentChildRelations.forEach((relation) => {
    const parentNode = nodeMap.get(relation.parentId);
    const childNode = nodeMap.get(relation.childId);

    if (!parentNode || !childNode) {
      return;
    }

    if (!relationsByChild.has(relation.childId)) {
      relationsByChild.set(relation.childId, {
        childNode,
        parentNodes: [],
      });
    }

    const entry = relationsByChild.get(relation.childId);

    if (!entry.parentNodes.some((node) => node.personId === parentNode.personId)) {
      entry.parentNodes.push(parentNode);
    }
  });

  relationsByChild.forEach(({ parentNodes }) => {
    if (parentNodes.length < 2) {
      return;
    }

    const sortedParents = [...parentNodes].sort((a, b) => a.centerX - b.centerX);
    const leftParent = sortedParents[0];
    const rightParent = sortedParents[sortedParents.length - 1];
    const key = makePairKey(leftParent.personId, rightParent.personId);

    if (!partnershipKeys.has(key)) {
      addHorizontalLine(leftParent, rightParent, '#C9CED4');
      partnershipKeys.add(key);
    }
  });

  relationsByChild.forEach(({ childNode, parentNodes }) => {
    if (!childNode || parentNodes.length === 0) {
      return;
    }

    const sortedParents = [...parentNodes].sort((a, b) => a.centerX - b.centerX);

    let sourceX;
    let sourceY;

    if (sortedParents.length >= 2) {
      const leftParent = sortedParents[0];
      const rightParent = sortedParents[sortedParents.length - 1];

      sourceX = (leftParent.rightX + rightParent.leftX) / 2;
      sourceY = leftParent.centerY;
    } else {
      sourceX = sortedParents[0].centerX;
      sourceY = sortedParents[0].bottomY;
    }

    const targetX = childNode.centerX;
    const targetY = childNode.topY;
    const d = createRoundedPath(sourceX, sourceY, targetX, targetY);

    if (d) {
      paths.push({
        id: `parent-child-${childNode.personId}-${parentNodes.map((node) => node.personId).join('-')}`,
        d,
        color: '#C9CED4',
        width: 2,
      });
    }
  });

  return paths;
}

export function buildFamilyTreeLayout(params) {
  const persons = Array.isArray(params?.persons) ? params.persons : [];
  const parentChildRelations = Array.isArray(params?.parentChildRelations)
    ? params.parentChildRelations
    : [];
  const partnerships = Array.isArray(params?.partnerships) ? params.partnerships : [];

  const options = {
    cardWidth: normalizeNumber(params?.cardWidth, DEFAULT_CARD_WIDTH),
    cardHeight: normalizeNumber(params?.cardHeight, DEFAULT_CARD_HEIGHT),
    columnGap: normalizeNumber(params?.columnGap, DEFAULT_COLUMN_GAP),
    rowGap: normalizeNumber(params?.rowGap, DEFAULT_ROW_GAP),
    partnerGap: normalizeNumber(params?.partnerGap, DEFAULT_PARTNER_GAP),
    groupGap: normalizeNumber(params?.groupGap, DEFAULT_GROUP_GAP),
    padding: normalizeNumber(params?.padding, DEFAULT_PADDING),
    gridSize: normalizeNumber(params?.gridSize, 42),
    viewportWidth: normalizeNumber(params?.viewportWidth, 1),
    viewportHeight: normalizeNumber(params?.viewportHeight, 1),
  };

  if (persons.length === 0) {
    return {
      nodes: [],
      paths: [],
      gridPaths: [],
      canvasWidth: Math.max(options.viewportWidth, 1),
      canvasHeight: Math.max(options.viewportHeight, 1),
    };
  }

  const personMap = buildPersonMap(persons);

  const validParentChildRelations = parentChildRelations.filter((relation) => (
    relation &&
    personMap.has(relation.parentId) &&
    personMap.has(relation.childId) &&
    relation.parentId !== relation.childId
  ));

  const validPartnerships = partnerships.filter((partnership) => (
    partnership &&
    personMap.has(partnership.partner1Id) &&
    personMap.has(partnership.partner2Id) &&
    partnership.partner1Id !== partnership.partner2Id
  ));

  const {
    childrenByParent,
    partnersByPerson,
  } = buildRelationMaps(validParentChildRelations, validPartnerships);

  const levels = calculateGenerations(
    persons,
    validParentChildRelations,
    validPartnerships
  );

  const initialRows = buildInitialLevels(
    persons,
    levels,
    partnersByPerson,
    options
  );

  const orderedRows = improveHorizontalOrder(
    initialRows,
    childrenByParent
  );

  const {
    rows,
    canvasWidth,
    canvasHeight,
  } = assignCoordinates(
    orderedRows,
    options
  );

  const nodes = buildNodes(rows, options);

  const paths = buildConnectionPaths(
    nodes,
    validParentChildRelations,
    validPartnerships
  );

  const gridPaths = buildGridPaths(
    canvasWidth,
    canvasHeight,
    options.gridSize
  );

  return {
    nodes,
    paths,
    gridPaths,
    canvasWidth,
    canvasHeight,
  };
}

export function calculateInitialTreeTransform(params) {
  const viewportWidth = normalizeNumber(params?.viewportWidth, 1);
  const viewportHeight = normalizeNumber(params?.viewportHeight, 1);
  const canvasWidth = normalizeNumber(params?.canvasWidth, 1);
  const canvasHeight = normalizeNumber(params?.canvasHeight, 1);
  const minScale = normalizeNumber(params?.minScale, 0.55);
  const maxScale = normalizeNumber(params?.maxScale, 1.8);
  const preferredScale = normalizeNumber(params?.preferredScale, 0.92);

  if (viewportWidth <= 1 || viewportHeight <= 1 || canvasWidth <= 1 || canvasHeight <= 1) {
    return {
      x: 0,
      y: 0,
      scale: preferredScale,
    };
  }

  const horizontalScale = (viewportWidth * 0.88) / canvasWidth;
  const verticalScale = (viewportHeight * 0.78) / canvasHeight;

  const scale = Math.min(
    maxScale,
    Math.max(
      minScale,
      Math.min(preferredScale, horizontalScale, verticalScale)
    )
  );

  return {
    x: (viewportWidth - canvasWidth * scale) / 2,
    y: Math.max(24, (viewportHeight - canvasHeight * scale) / 2),
    scale,
  };
}

export function calculateCenteredTransform(params) {
  const viewportWidth = normalizeNumber(params?.viewportWidth, 1);
  const viewportHeight = normalizeNumber(params?.viewportHeight, 1);
  const canvasWidth = normalizeNumber(params?.canvasWidth, 1);
  const canvasHeight = normalizeNumber(params?.canvasHeight, 1);
  const scale = normalizeNumber(params?.scale, 1);
  const targetX = normalizeNumber(params?.targetX, canvasWidth / 2);
  const targetY = normalizeNumber(params?.targetY, canvasHeight / 2);

  return {
    x: viewportWidth / 2 - targetX * scale,
    y: viewportHeight / 2 - targetY * scale,
    scale,
  };
}