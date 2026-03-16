/**
 * SankeyDiagram Types
 *
 * These types build on top of @visx/sankey (which re-exports d3-sankey types)
 * to provide a clean, simplified API for consumers while maintaining full
 * compatibility with visx components.
 *
 * Performance Note: Sankey layouts can be computationally expensive.
 * Recommended limit: <100 nodes for optimal performance.
 */

import type {
  SankeyGraph,
  SankeyNode as D3SankeyNode,
  SankeyLink as D3SankeyLink,
  SankeyExtraProperties
} from '@visx/sankey';

// =============================================================================
// Custom Node/Link Properties (user-defined extras)
// =============================================================================

/**
 * Custom properties we add to each node beyond what d3-sankey provides.
 * These are the "extra properties" that get merged with SankeyNodeMinimal.
 */
export interface SankeyNodeExtra extends SankeyExtraProperties {
  /** Display name for the node */
  name: string;
  /** Optional category for grouping/coloring */
  category?: string;
}

/**
 * Custom properties we add to each link beyond what d3-sankey provides.
 * Currently empty, but available for future extensions.
 */
export interface SankeyLinkExtra extends SankeyExtraProperties {}

// =============================================================================
// Concrete Types (built from d3-sankey generics)
// =============================================================================

/**
 * A node in the Sankey diagram.
 *
 * This combines our custom properties (name, category) with d3-sankey's
 * computed properties (x0, x1, y0, y1, value, index, etc.)
 *
 * Before layout: only `name` and `category` are defined
 * After layout: all positional properties are populated
 */
export type SankeyNode = D3SankeyNode<SankeyNodeExtra, SankeyLinkExtra>;

/**
 * A link between two nodes in the Sankey diagram.
 *
 * Before layout: source/target are node indices (numbers)
 * After layout: source/target are resolved to full SankeyNode objects,
 * and positional properties (y0, y1, width) are populated
 */
export type SankeyLink = D3SankeyLink<SankeyNodeExtra, SankeyLinkExtra>;

/**
 * The complete Sankey graph data structure.
 *
 * This is the type expected by the visx <Sankey> component's `root` prop.
 * It contains arrays of nodes and links that will be laid out by d3-sankey.
 */
export type SankeyData = SankeyGraph<SankeyNodeExtra, SankeyLinkExtra>;

// =============================================================================
// Input Types (for creating Sankey data)
// =============================================================================

/**
 * Input node type for creating Sankey data.
 * Only requires the user-defined properties; d3-sankey will compute the rest.
 */
export interface SankeyNodeInput {
  /** Display name for the node */
  name: string;
  /** Optional category for grouping/coloring */
  category?: string;
}

/**
 * Input link type for creating Sankey data.
 * Uses numeric indices for source/target; d3-sankey will resolve to node objects.
 */
export interface SankeyLinkInput {
  /** Index of the source node in the nodes array */
  source: number;
  /** Index of the target node in the nodes array */
  target: number;
  /** Flow value (determines link width) */
  value: number;
}

/**
 * Input data structure for creating a Sankey diagram.
 * This is the simplified type consumers should use when constructing data.
 */
export interface SankeyDataInput {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
}

// =============================================================================
// Computed Types (after layout)
// =============================================================================

/**
 * A node after the Sankey layout has been computed.
 * All positional properties are guaranteed to be defined.
 */
export interface ComputedSankeyNode extends SankeyNodeExtra {
  /** Node's minimum horizontal position */
  x0: number;
  /** Node's maximum horizontal position */
  x1: number;
  /** Node's minimum vertical position */
  y0: number;
  /** Node's maximum vertical position */
  y1: number;
  /** Node's computed value (sum of incoming link values) */
  value: number;
  /** Node's zero-based index in the nodes array */
  index: number;
  /** Node's graph depth (derived from topology) */
  depth: number;
  /** Node's graph height (derived from topology) */
  height: number;
  /** Outgoing links from this node */
  sourceLinks: ComputedSankeyLink[];
  /** Incoming links to this node */
  targetLinks: ComputedSankeyLink[];
}

/**
 * A link after the Sankey layout has been computed.
 * Source/target are resolved to node objects, and positional properties are defined.
 */
export interface ComputedSankeyLink extends SankeyLinkExtra {
  /** Source node (resolved from index to object) */
  source: ComputedSankeyNode;
  /** Target node (resolved from index to object) */
  target: ComputedSankeyNode;
  /** Link's flow value */
  value: number;
  /** Link's vertical starting position (at source node) */
  y0: number;
  /** Link's vertical end position (at target node) */
  y1: number;
  /** Link's width (proportional to value) */
  width: number;
  /** Link's zero-based index in the links array */
  index: number;
}

// =============================================================================
// Component Props & Config Types
// =============================================================================

/** Node alignment options */
export type SankeyNodeAlign = 'left' | 'right' | 'center' | 'justify';

/** Margin configuration */
export interface SankeyMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Props for the SankeyDiagram component */
export interface SankeyDiagramProps {
  /** The data to visualize (nodes and links) */
  data: SankeyDataInput;

  /** Height of the chart in pixels (width is responsive) */
  height: number;

  /** Node alignment within the diagram. Default: 'justify' */
  nodeAlign?: SankeyNodeAlign;

  /** Padding between nodes in pixels. Default: 8 */
  nodePadding?: number;

  /** Width of node rectangles in pixels. Default: 16 */
  nodeWidth?: number;

  /** Custom margin override. Default: { top: 20, right: 20, bottom: 20, left: 20 } */
  margin?: SankeyMargin;

  /** Custom label formatter. Default: (node) => node.name */
  formatLabel?: (node: ComputedSankeyNode) => string;

  /** Custom value formatter for the tooltip. Default: (value) => value.toLocaleString() */
  formatTooltipValue?: (value: number) => string;

  /** Custom label formatter for tooltip source/destination labels. Default: (node) => node.name */
  formatTooltipLabel?: (node: ComputedSankeyNode) => string;

  /** Accessible label for the chart */
  ariaLabel?: string;

  /** Label to display at the bottom left of the chart (e.g., "Origin") */
  sourceLabel?: string;

  /** Label to display at the bottom right of the chart (e.g., "Target") */
  targetLabel?: string;

  /** Callback for user clicking retry button when diagram is in an error state. */
  onRefreshClick?: () => void;
}

/** Tooltip data structure */
export interface SankeyTooltipData {
  type: 'node' | 'link';
  node?: ComputedSankeyNode;
  link?: ComputedSankeyLink;
}
