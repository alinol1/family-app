function intersectsRect(a, b) {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

function nodeToRect(node) {
  return {
    minX: node.x,
    minY: node.y,
    maxX: node.x + node.width,
    maxY: node.y + node.height,
  };
}

function lineToRect(line) {
  return {
    minX: line.minX,
    minY: line.minY,
    maxX: line.maxX,
    maxY: line.maxY,
  };
}

export default function getVisibleLayout({
  layout,
  viewportSize,
  transform,
  buffer = 520,
}) {
  if (!layout) {
    return {
      nodes: [],
      lines: [],
      solidPath: '',
      dashedPath: '',
      visibleStats: {
        nodes: 0,
        lines: 0,
        totalNodes: 0,
        totalLines: 0,
      },
    };
  }

  const scale = transform?.scale || 1;
  const translateX = transform?.x || 0;
  const translateY = transform?.y || 0;

  const viewportWidth = viewportSize?.width || 1;
  const viewportHeight = viewportSize?.height || 1;

  const visibleRect = {
    minX: -translateX / scale - buffer,
    minY: -translateY / scale - buffer,
    maxX: (viewportWidth - translateX) / scale + buffer,
    maxY: (viewportHeight - translateY) / scale + buffer,
  };

  const visibleNodes = layout.nodes.filter((node) => {
    return intersectsRect(nodeToRect(node), visibleRect);
  });

  const visibleLines = layout.lines.filter((line) => {
    return intersectsRect(lineToRect(line), visibleRect);
  });

  const solidPath = visibleLines
    .filter((line) => !line.dashed)
    .map((line) => line.d)
    .join(' ');

  const dashedPath = visibleLines
    .filter((line) => line.dashed)
    .map((line) => line.d)
    .join(' ');

  return {
    nodes: visibleNodes,
    lines: visibleLines,
    solidPath,
    dashedPath,
    visibleStats: {
      nodes: visibleNodes.length,
      lines: visibleLines.length,
      totalNodes: layout.nodes.length,
      totalLines: layout.lines.length,
    },
  };
}