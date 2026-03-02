import type { Pool, MonitorGroup, SteeringMethod } from '../types';
import { getPoolHealth } from './healthCalculations';

/**
 * Determines which pools should receive traffic based on the steering method
 * Returns an array of pool IDs that should show traffic flow
 */
export function getActivePoolsForSteering(
  pools: Pool[],
  monitorGroups: MonitorGroup[],
  steeringMethod: SteeringMethod
): string[] {
  const healthyPools = pools.filter(pool => {
    const monitorGroup = pool.monitorGroupId
      ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
      : undefined;
    const health = getPoolHealth(pool, monitorGroup);
    return health !== 'critical' && pool.enabled;
  });

  if (healthyPools.length === 0) {
    // Fallback: route to the last pool (failover behavior)
    return pools.length > 0 ? [pools[pools.length - 1].id] : [];
  }

  switch (steeringMethod) {
    case 'off':
      // Off/Failover: Route to first healthy pool only (active-passive)
      return healthyPools.length > 0 ? [healthyPools[0].id] : [];

    case 'random':
      // Random: Route to all healthy pools (active-active/round-robin)
      return healthyPools.map(p => p.id);

    case 'geo':
      // Geo: Route based on geographic regions
      // In a real implementation, this would consider user location
      // For visualization, show traffic to pools in different regions
      return healthyPools.map(p => p.id);

    case 'dynamic': {
      // Dynamic: Route to the pool with lowest latency (fastest RTT)
      const sortedByLatency = [...healthyPools].sort((a, b) => {
        const latencyA = parseFloat(a.latency.replace('ms', ''));
        const latencyB = parseFloat(b.latency.replace('ms', ''));
        return latencyA - latencyB;
      });
      return sortedByLatency.length > 0 ? [sortedByLatency[0].id] : [];
    }

    case 'proximity':
      // Proximity: Route to closest physical data center
      // For visualization, show traffic to geographically distributed pools
      return healthyPools.map(p => p.id);

    case 'least-outstanding-requests':
      // Least Outstanding Requests: Route to pools with lowest load
      // For visualization, distribute across all healthy pools
      // In reality, this would consider actual request counts
      return healthyPools.map(p => p.id);

    default:
      return healthyPools.map(p => p.id);
  }
}

/**
 * Gets a description of how the current steering method works
 */
export function getSteeringDescription(steeringMethod: SteeringMethod): string {
  switch (steeringMethod) {
    case 'off':
      return 'Failover: Routes to first healthy pool (active-passive)';
    case 'random':
      return 'Random: Distributes traffic equally across all healthy pools';
    case 'geo':
      return 'Geo: Routes traffic based on geographic location';
    case 'dynamic':
      return 'Dynamic: Routes to fastest pool based on RTT';
    case 'proximity':
      return 'Proximity: Routes to closest physical data center';
    case 'least-outstanding-requests':
      return 'Least Outstanding Requests: Routes to pools with lowest load';
    default:
      return 'Unknown steering method';
  }
}

/**
 * Gets the display name for a steering method
 */
export function getSteeringDisplayName(steeringMethod: SteeringMethod): string {
  switch (steeringMethod) {
    case 'off':
      return 'Off (Failover)';
    case 'random':
      return 'Random';
    case 'geo':
      return 'Geo';
    case 'dynamic':
      return 'Dynamic';
    case 'proximity':
      return 'Proximity';
    case 'least-outstanding-requests':
      return 'Least Outstanding Requests';
    default:
      return steeringMethod;
  }
}
