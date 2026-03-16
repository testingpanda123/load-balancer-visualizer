import { Users, Database, Server } from 'lucide-react';
import { Flow } from './Flow';
import type { Pool, MonitorGroup, HealthStatus, SteeringMethod } from '../types';
import { getPoolHealth, getEndpointHealth } from '../utils/healthCalculations';
import { getSteeringDisplayName } from '../utils/trafficSteering';
import { getActivePoolsForSteering } from '../utils/trafficSteering';

interface FlowLoadBalancerDiagramProps {
  pools: Pool[];
  monitorGroups: MonitorGroup[];
  steeringMethod: SteeringMethod;
  onPoolClick?: (poolId: string) => void;
  showMonitors?: boolean;
  className?: string;
}

function getHealthColor(health: HealthStatus): string {
  const colors = {
    healthy: 'bg-green-50 dark:bg-green-900/30 ring-green-500/50 dark:ring-green-500/30 text-green-700 dark:text-green-300',
    degraded: 'bg-yellow-50 dark:bg-yellow-900/30 ring-yellow-500/50 dark:ring-yellow-500/30 text-yellow-700 dark:text-yellow-300',
    critical: 'bg-red-50 dark:bg-red-900/30 ring-red-500/50 dark:ring-red-500/30 text-red-700 dark:text-red-300'
  };
  return colors[health];
}

export function FlowLoadBalancerDiagram({
  pools,
  monitorGroups,
  steeringMethod,
  onPoolClick,
  showMonitors = true,
  className
}: FlowLoadBalancerDiagramProps) {
  const activePoolIds = getActivePoolsForSteering(pools, monitorGroups, steeringMethod);

  return (
    <div className={className}>
      <Flow orientation="horizontal" align="center" canvas={true} className="h-full">
        <Flow.Node
          render={
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/50 dark:ring-blue-500/30">
              <Users className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">Incoming Traffic</p>
                <p className="text-xs text-blue-600 dark:text-blue-300">{getSteeringDisplayName(steeringMethod)}</p>
              </div>
            </div>
          }
        />

        <Flow.Parallel align="start">
          {pools.map((pool, poolIdx) => {
            const monitorGroup = pool.monitorGroupId
              ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
              : undefined;
            const poolHealth = getPoolHealth(pool, monitorGroup);
            const isActive = activePoolIds.includes(pool.id);

            return (
              <Flow.Node
                key={pool.id}
                disabled={poolHealth === 'critical'}
                animated={isActive && poolHealth !== 'critical'}
                animationColor={poolHealth === 'healthy' ? '#4ade80' : '#facc15'}
                animationDelay={poolIdx * 0.3}
                render={
                  <button
                    onClick={() => onPoolClick?.(pool.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md ring-2 transition-all ${
                      onPoolClick ? 'hover:ring-4 cursor-pointer' : ''
                    } ${getHealthColor(poolHealth)}`}
                  >
                    <Database className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-xs font-medium opacity-70">Pool</p>
                      <p className="font-mono text-sm font-semibold">{pool.name}</p>
                    </div>
                  </button>
                }
              />
            );
          })}
        </Flow.Parallel>

        <Flow.Parallel align="start">
          {pools.flatMap((pool, poolIdx) => {
            const monitorGroup = pool.monitorGroupId
              ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
              : undefined;
            const poolHealth = getPoolHealth(pool, monitorGroup);
            const isPoolActive = activePoolIds.includes(pool.id);

            return pool.endpoints.map((endpoint, endpointIdx) => {
              const endpointHealth = getEndpointHealth(pool, endpoint, monitorGroup);
              const shouldShowTraffic = isPoolActive && poolHealth !== 'critical' && endpointHealth !== 'critical';
              const shouldShowMonitor = showMonitors && shouldShowTraffic;

              return (
                <Flow.Node
                  key={endpoint.id}
                  disabled={endpointHealth === 'critical'}
                  animated={shouldShowTraffic}
                  animationColor={endpointHealth === 'healthy' ? '#4ade80' : '#facc15'}
                  animationDelay={poolIdx * 0.3 + endpointIdx * 0.15}
                  secondaryAnimated={shouldShowMonitor}
                  secondaryAnimationColor={pool.monitorGroupId ? '#22d3ee' : '#f472b6'}
                  secondaryAnimationDelay={poolIdx * 0.2 + endpointIdx * 0.1}
                  render={
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md ring-2 ${getHealthColor(
                        endpointHealth
                      )}`}
                    >
                      <Server className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-xs font-medium opacity-70">Endpoint</p>
                        <p className="font-mono text-sm font-semibold">{endpoint.name}</p>
                      </div>
                    </div>
                  }
                />
              );
            });
          })}
        </Flow.Parallel>
      </Flow>
    </div>
  );
}
