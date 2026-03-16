import { useCallback, useMemo, useRef, useState } from 'react';
import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { withParentSize, type WithParentSizeProvidedProps } from '@visx/responsive';
import { sankeyCenter, sankeyJustify, sankeyLeft, sankeyRight } from '@visx/sankey';
import { sankey as d3Sankey } from 'd3-sankey';
import { linkHorizontal } from 'd3-shape';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type {
  ComputedSankeyLink,
  ComputedSankeyNode,
  SankeyDiagramProps,
  SankeyLinkExtra,
  SankeyNodeAlign,
  SankeyNodeExtra,
  SankeyTooltipData
} from './types';
import { toSankeyData, validateSankeyData, isSourceNode } from './utils/data-transform';
import { getTruncateText } from './utils/text';

const DEFAULT_MARGIN = { top: 20, right: 30, bottom: 40, left: 30 };
const DEFAULT_NODE_WIDTH = 12;
const DEFAULT_NODE_PADDING = 8;
const DIMMED_OPACITY = 0.25;

const alignmentMap: Record<
  SankeyNodeAlign,
  typeof sankeyCenter | typeof sankeyLeft | typeof sankeyRight | typeof sankeyJustify
> = {
  center: sankeyCenter,
  left: sankeyLeft,
  right: sankeyRight,
  justify: sankeyJustify
};

// Color utilities
const SANKEY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316'  // orange
];

const getColorForCategory = (category?: string): string => {
  if (!category) return SANKEY_COLORS[0];
  
  switch (category) {
    case 'healthy':
      return '#10b981'; // green
    case 'degraded':
      return '#f59e0b'; // amber
    case 'critical':
      return '#ef4444'; // red
    case 'source':
      return '#3b82f6'; // blue
    default:
      return SANKEY_COLORS[0];
  }
};

function SankeyDiagramComponent({
  data,
  height,
  nodeAlign = 'justify',
  nodePadding = DEFAULT_NODE_PADDING,
  nodeWidth = DEFAULT_NODE_WIDTH,
  margin = DEFAULT_MARGIN,
  formatLabel = node => node.name,
  formatTooltipValue = value => value.toLocaleString(),
  formatTooltipLabel = node => node.name,
  ariaLabel,
  sourceLabel,
  targetLabel,
  parentWidth
}: SankeyDiagramProps & WithParentSizeProvidedProps) {
  const [hoveredLink, setHoveredLink] = useState<ComputedSankeyLink | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ComputedSankeyNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<SankeyTooltipData>();

  const width = parentWidth || 800;
  const diagramWidth = width * 2; // Make diagram wider to accommodate all nodes
  const innerWidth = diagramWidth - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const sankeyData = useMemo(() => {
    try {
      validateSankeyData(data);
      return toSankeyData(data);
    } catch (error) {
      console.error('Invalid Sankey data:', error);
      return { nodes: [], links: [] };
    }
  }, [data]);

  // For manual layout computation using d3-sankey's sankey() function
  const layoutData = useMemo(() => {
    const sankeyGenerator = d3Sankey<SankeyNodeExtra, SankeyLinkExtra>()
      .nodeAlign(alignmentMap[nodeAlign])
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [0, 0],
        [innerWidth, innerHeight]
      ]);
    return sankeyGenerator(sankeyData);
  }, [nodeAlign, nodeWidth, nodePadding, innerWidth, innerHeight, sankeyData]);

  const nodes = layoutData.nodes;
  const links = layoutData.links;

  // Create path generator for Sankey links
  const sankeyLinkPath = useCallback((link: ComputedSankeyLink) => {
    const path = linkHorizontal<ComputedSankeyLink, { x: number; y: number }>()
      .source(d => ({ x: d.source.x1 || 0, y: d.y0 || 0 }))
      .target(d => ({ x: d.target.x0 || 0, y: d.y1 || 0 }));
    return path(link) || '';
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z / 1.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleNodeMouseEnter = useCallback(
    (event: React.MouseEvent<SVGRectElement>, node: ComputedSankeyNode) => {
      const svgElement = (event.target as SVGElement).ownerSVGElement;
      if (!svgElement) return;
      const coords = localPoint(svgElement, event);
      if (coords) {
        setHoveredNode(node);
        showTooltip({
          tooltipData: { type: 'node', node },
          tooltipLeft: coords.x,
          tooltipTop: coords.y
        });
      }
    },
    [showTooltip]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
    hideTooltip();
  }, [hideTooltip]);

  const handleLinkMouseEnter = useCallback(
    (event: React.MouseEvent<SVGPathElement>, link: ComputedSankeyLink) => {
      const svgElement = (event.target as SVGElement).ownerSVGElement;
      if (!svgElement) return;
      const coords = localPoint(svgElement, event);
      if (coords) {
        setHoveredLink(link);
        showTooltip({
          tooltipData: { type: 'link', link },
          tooltipLeft: coords.x,
          tooltipTop: coords.y
        });
      }
    },
    [showTooltip]
  );

  const handleLinkMouseLeave = useCallback(() => {
    setHoveredLink(null);
    hideTooltip();
  }, [hideTooltip]);

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-kumo-subtle">
        No data to display
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-kumo-elevated border border-custom rounded-lg p-2 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-kumo-control rounded transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-kumo-control rounded transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-kumo-control rounded transition-colors"
          aria-label="Reset zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <svg 
        ref={svgRef} 
        width={diagramWidth} 
        height={height} 
        aria-label={ariaLabel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <Group 
          left={margin.left + pan.x} 
          top={margin.top + pan.y}
          transform={`scale(${zoom})`}
          style={{ transformOrigin: '0 0' }}
        >
          {/* Render links */}
          {links.map((link, i) => {
            // After layout, links have resolved source/target nodes
            const computedLink = link as unknown as ComputedSankeyLink;
            const isHovered = hoveredLink === computedLink;
            const isConnectedToHoveredNode =
              hoveredNode && (computedLink.source === hoveredNode || computedLink.target === hoveredNode);
            const shouldDim = (hoveredLink || hoveredNode) && !isHovered && !isConnectedToHoveredNode;

            return (
              <path
                key={`link-${i}`}
                d={sankeyLinkPath(computedLink)}
                stroke={getColorForCategory(computedLink.source.category)}
                strokeWidth={Math.max(1, computedLink.width || 0)}
                strokeOpacity={shouldDim ? DIMMED_OPACITY : 0.5}
                fill="none"
                onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => handleLinkMouseEnter(e, computedLink)}
                onMouseLeave={handleLinkMouseLeave}
                style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s' }}
              />
            );
          })}

          {/* Render nodes */}
          {nodes.map((node, i) => {
            // After layout, nodes have computed positions
            const computedNode = node as unknown as ComputedSankeyNode;
            const isHovered = hoveredNode === computedNode;
            const isConnectedToHoveredLink =
              hoveredLink && (hoveredLink.source === computedNode || hoveredLink.target === computedNode);
            const shouldDim = (hoveredLink || hoveredNode) && !isHovered && !isConnectedToHoveredLink;

            // Type guard: skip if positions aren't computed yet
            if (!computedNode.x0 || !computedNode.x1 || !computedNode.y0 || !computedNode.y1) {
              return null;
            }

            return (
              <Group key={`node-${i}`}>
                <rect
                  x={computedNode.x0}
                  y={computedNode.y0}
                  width={computedNode.x1 - computedNode.x0}
                  height={computedNode.y1 - computedNode.y0}
                  fill={getColorForCategory(computedNode.category)}
                  fillOpacity={shouldDim ? DIMMED_OPACITY : 1}
                  stroke="none"
                  onMouseEnter={e => handleNodeMouseEnter(e, computedNode)}
                  onMouseLeave={handleNodeMouseLeave}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s' }}
                />
                <text
                  x={isSourceNode(computedNode, innerWidth) ? computedNode.x0 - 6 : computedNode.x1 + 6}
                  y={(computedNode.y0 + computedNode.y1) / 2}
                  dy="0.35em"
                  textAnchor={isSourceNode(computedNode, innerWidth) ? 'end' : 'start'}
                  fontSize={12}
                  fill="currentColor"
                  className="pointer-events-none"
                >
                  {getTruncateText(formatLabel(computedNode), 20)}
                </text>
              </Group>
            );
          })}

          {/* Labels */}
          {sourceLabel && (
            <text
              x={0}
              y={innerHeight + 30}
              fontSize={12}
              fill="currentColor"
              className="text-kumo-subtle"
            >
              {sourceLabel}
            </text>
          )}
          {targetLabel && (
            <text
              x={innerWidth}
              y={innerHeight + 30}
              fontSize={12}
              fill="currentColor"
              textAnchor="end"
              className="text-kumo-subtle"
            >
              {targetLabel}
            </text>
          )}
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          {tooltipData.type === 'node' && tooltipData.node && (
            <div>
              <strong>{formatTooltipLabel(tooltipData.node)}</strong>
              <div>Value: {formatTooltipValue(tooltipData.node.value)}</div>
            </div>
          )}
          {tooltipData.type === 'link' && tooltipData.link && (
            <div>
              <div>
                {formatTooltipLabel(tooltipData.link.source)} →{' '}
                {formatTooltipLabel(tooltipData.link.target)}
              </div>
              <div>Flow: {formatTooltipValue(tooltipData.link.value)}</div>
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default withParentSize(SankeyDiagramComponent);
export type { SankeyDataInput, SankeyNodeInput, SankeyLinkInput, SankeyDiagramProps } from './types';
