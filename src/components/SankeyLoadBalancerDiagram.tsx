import { useMemo } from 'react';
import SankeyDiagram from './SankeyDiagram/index';
import type { SankeyDataInput } from './SankeyDiagram/types';
import type { Pool, MonitorGroup, SteeringMethod } from '../types';
import { getPoolHealth, getEndpointHealth } from '../utils/healthCalculations';
import { getActivePoolsForSteering } from '../utils/trafficSteering';

interface SankeyLoadBalancerDiagramProps {
  pools: Pool[];
  monitorGroups: MonitorGroup[];
  steeringMethod: SteeringMethod;
  className?: string;
}

export function SankeyLoadBalancerDiagram({
  pools,
  monitorGroups,
  steeringMethod,
  className = ''
}: SankeyLoadBalancerDiagramProps) {
  const activePoolIds = getActivePoolsForSteering(pools, monitorGroups, steeringMethod);

  const sankeyData: SankeyDataInput = useMemo(() => {
    const nodes: Array<{ name: string; category?: string }> = [];
    const links: Array<{ source: number; target: number; value: number }> = [];

    // Node 0: Incoming Traffic
    nodes.push({ name: 'Incoming Traffic', category: 'source' });

    // Add pool nodes
    const poolStartIdx = nodes.length;
    pools.forEach(pool => {
      const monitorGroup = pool.monitorGroupId
        ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
        : undefined;
      const health = getPoolHealth(pool, monitorGroup);
      nodes.push({ name: pool.name, category: health });
    });

    // Add endpoint nodes
    const endpointStartIdx = nodes.length;
    pools.forEach(pool => {
      const monitorGroup = pool.monitorGroupId
        ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
        : undefined;
      
      pool.endpoints.forEach(endpoint => {
        const health = getEndpointHealth(pool, endpoint, monitorGroup);
        nodes.push({ name: endpoint.name, category: health });
      });
    });

    // Create links from Incoming Traffic to Pools
    pools.forEach((pool, poolIdx) => {
      const isActive = activePoolIds.includes(pool.id);
      if (isActive) {
        links.push({
          source: 0, // Incoming Traffic
          target: poolStartIdx + poolIdx,
          value: 100 // Equal distribution for now
        });
      }
    });

    // Create links from Pools to Endpoints
    let endpointOffset = 0;
    pools.forEach((pool, poolIdx) => {
      const monitorGroup = pool.monitorGroupId
        ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
        : undefined;
      const poolHealth = getPoolHealth(pool, monitorGroup);
      const isActive = activePoolIds.includes(pool.id);

      pool.endpoints.forEach((endpoint, endpointIdx) => {
        const endpointHealth = getEndpointHealth(pool, endpoint, monitorGroup);
        
        // Only create link if pool is active and neither pool nor endpoint is critical
        if (isActive && poolHealth !== 'critical' && endpointHealth !== 'critical') {
          links.push({
            source: poolStartIdx + poolIdx,
            target: endpointStartIdx + endpointOffset + endpointIdx,
            value: 100 / pool.endpoints.length // Distribute evenly across endpoints
          });
        }
      });
      
      endpointOffset += pool.endpoints.length;
    });

    console.log('Sankey Data:', { nodes, links, activePoolIds });
    return { nodes, links };
  }, [pools, monitorGroups, steeringMethod, activePoolIds]);

  if (sankeyData.links.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center h-full`}>
        <div className="text-center text-kumo-subtle">
          <p className="text-lg mb-2">No traffic flows to display</p>
          <p className="text-sm">
            {steeringMethod === 'off' 
              ? 'Enable a steering method to see traffic distribution'
              : 'No active pools or endpoints available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-auto`}>
      <SankeyDiagram
        data={sankeyData}
        height={800}
        nodeAlign="justify"
        nodePadding={24}
        nodeWidth={20}
        margin={{ top: 40, right: 180, bottom: 60, left: 180 }}
        sourceLabel="Origin"
        targetLabel="Destination"
        ariaLabel="Load Balancer Traffic Flow"
      />
    </div>
  );
}
