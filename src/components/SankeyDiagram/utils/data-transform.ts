import type { SankeyDataInput, SankeyData } from '../types';

/**
 * Validates that the input data has the required structure
 */
export function validateSankeyData(data: SankeyDataInput): void {
  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new Error('Invalid Sankey data: nodes must be an array');
  }
  if (!data.links || !Array.isArray(data.links)) {
    throw new Error('Invalid Sankey data: links must be an array');
  }
  if (data.nodes.length === 0) {
    throw new Error('Invalid Sankey data: nodes array is empty');
  }
}

/**
 * Converts input data to the format expected by visx Sankey
 */
export function toSankeyData(data: SankeyDataInput): SankeyData {
  return {
    nodes: data.nodes.map(node => ({
      name: node.name,
      category: node.category
    })),
    links: data.links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value
    }))
  };
}

/**
 * Determines if a node is a source node (leftmost) based on its position
 */
export function isSourceNode(node: { x0?: number; x1?: number }, innerWidth: number): boolean {
  if (node.x0 === undefined) return false;
  return node.x0 < innerWidth / 2;
}
