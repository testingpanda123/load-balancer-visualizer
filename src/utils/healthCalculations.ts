import type { Pool, Endpoint, HealthStatus, MonitorGroup } from '../types';

export function getEndpointHealth(
  _pool: Pool,
  endpoint: Endpoint,
  monitorGroup?: MonitorGroup
): HealthStatus {
  if (!monitorGroup) {
    const states = Object.values(endpoint.monitorStates);
    if (states.every(s => s === 'healthy')) return 'healthy';
    if (states.some(s => s === 'critical')) return 'critical';
    return 'degraded';
  }

  const activeMonitors = monitorGroup.monitors.filter(m => !m.disabled);
  
  const criticalMonitors = activeMonitors.filter(m => m.must_be_healthy);
  for (const monitor of criticalMonitors) {
    const state = endpoint.monitorStates[monitor.id];
    if (state !== 'healthy') {
      return 'critical';
    }
  }

  const votingMonitors = activeMonitors.filter(m => !m.monitoring_only);
  if (votingMonitors.length === 0) return 'healthy';

  const unhealthyCount = votingMonitors.filter(
    m => endpoint.monitorStates[m.id] !== 'healthy'
  ).length;

  if (unhealthyCount > votingMonitors.length / 2) {
    return 'critical';
  }
  
  if (unhealthyCount > 0) {
    return 'degraded';
  }

  return 'healthy';
}

export function getPoolHealth(
  pool: Pool,
  monitorGroup?: MonitorGroup
): HealthStatus {
  if (!pool.enabled) return 'critical';
  
  const healthStatuses = pool.endpoints.map(ep => 
    getEndpointHealth(pool, ep, monitorGroup)
  );

  const healthyCount = healthStatuses.filter(s => s === 'healthy').length;
  const criticalCount = healthStatuses.filter(s => s === 'critical').length;

  if (criticalCount === healthStatuses.length) return 'critical';
  if (healthyCount === healthStatuses.length) return 'healthy';
  return 'degraded';
}

export function calculatePoolLatency(
  pool: Pool,
  monitorGroup?: MonitorGroup
): number {
  if (!monitorGroup) {
    return parseFloat(pool.latency);
  }

  const eligibleMonitors = monitorGroup.monitors.filter(
    m => !m.disabled && !m.monitoring_only
  );

  if (eligibleMonitors.length === 0) {
    return parseFloat(pool.latency);
  }

  const totalLatency = eligibleMonitors.reduce((sum, monitor) => {
    const avgEndpointLatency = pool.endpoints.reduce((epSum, endpoint) => {
      return epSum + (endpoint.monitorStates[monitor.id] === 'healthy' ? 50 : 0);
    }, 0) / pool.endpoints.length;
    return sum + avgEndpointLatency;
  }, 0);

  return Math.round(totalLatency / eligibleMonitors.length);
}

export function getHealthColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
  }
}

export function getHealthTextColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-400';
    case 'degraded':
      return 'text-yellow-400';
    case 'critical':
      return 'text-red-400';
  }
}

export function getHealthBorderColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'border-green-500/20';
    case 'degraded':
      return 'border-yellow-500/20';
    case 'critical':
      return 'border-red-500/20';
  }
}
