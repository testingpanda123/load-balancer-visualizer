export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export type SteeringMethod = 'geo' | 'dynamic' | 'random' | 'proximity';

export interface Monitor {
  id: string;
  name: string;
  type: 'http' | 'https' | 'tcp' | 'icmp';
  interval: number;
  timeout: number;
  retries: number;
  must_be_healthy: boolean;
  monitoring_only: boolean;
  disabled: boolean;
}

export interface MonitorState {
  monitorId: string;
  status: HealthStatus;
  latency: number;
  lastChecked: number;
}

export interface MonitorGroup {
  id: string;
  name: string;
  monitors: Monitor[];
}

export interface Endpoint {
  id: string;
  name: string;
  ip: string;
  weight: number;
  monitorStates: Record<string, HealthStatus>;
}

export interface Pool {
  id: string;
  name: string;
  region: string;
  latency: string;
  weight: number;
  enabled: boolean;
  monitorGroupId?: string;
  endpoints: Endpoint[];
  fallbackPool?: string;
}

export interface LoadBalancerConfig {
  name: string;
  steeringMethod: SteeringMethod;
  pools: Pool[];
  monitorGroups: MonitorGroup[];
}

export interface RequestFlow {
  id: string;
  sourceRegion: string;
  targetPoolId: string;
  targetEndpointId: string;
  latency: number;
  timestamp: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  config: LoadBalancerConfig;
}
