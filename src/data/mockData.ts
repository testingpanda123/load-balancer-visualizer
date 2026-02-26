import type { MonitorGroup, Pool, LoadBalancerConfig } from '../types';

export const monitorGroups: MonitorGroup[] = [
  {
    id: 'mg-eu',
    name: 'Europe Monitor Group',
    monitors: [
      {
        id: 'api',
        name: 'API Gateway',
        type: 'https',
        interval: 60,
        timeout: 5,
        retries: 2,
        must_be_healthy: true,
        monitoring_only: false,
        disabled: false,
      },
      {
        id: 'db',
        name: 'Database Connection',
        type: 'tcp',
        interval: 30,
        timeout: 3,
        retries: 2,
        must_be_healthy: false,
        monitoring_only: false,
        disabled: false,
      },
      {
        id: 'storage',
        name: 'S3 Storage',
        type: 'https',
        interval: 60,
        timeout: 5,
        retries: 1,
        must_be_healthy: false,
        monitoring_only: false,
        disabled: false,
      },
    ],
  },
];

export const initialPools: Pool[] = [
  {
    id: 'na',
    name: 'North America Pool',
    region: 'US-East',
    latency: '45ms',
    weight: 100,
    enabled: true,
    endpoints: [
      {
        id: 'na-1',
        name: 'Primary-NY-01',
        ip: '192.0.2.1',
        weight: 100,
        monitorStates: { default: 'healthy' },
      },
      {
        id: 'na-2',
        name: 'Secondary-VA-02',
        ip: '192.0.2.2',
        weight: 100,
        monitorStates: { default: 'healthy' },
      },
      {
        id: 'na-3',
        name: 'Legacy-DC-03',
        ip: '192.0.2.3',
        weight: 50,
        monitorStates: { default: 'healthy' },
      },
    ],
  },
  {
    id: 'eu',
    name: 'Europe Pool',
    region: 'EU-West',
    latency: '120ms',
    weight: 100,
    enabled: true,
    monitorGroupId: 'mg-eu',
    endpoints: [
      {
        id: 'eu-1',
        name: 'London-UK-01',
        ip: '198.51.100.1',
        weight: 100,
        monitorStates: {
          api: 'healthy',
          db: 'healthy',
          storage: 'healthy',
        },
      },
      {
        id: 'eu-2',
        name: 'Frankfurt-DE-02',
        ip: '198.51.100.2',
        weight: 100,
        monitorStates: {
          api: 'healthy',
          db: 'healthy',
          storage: 'healthy',
        },
      },
    ],
  },
  {
    id: 'as',
    name: 'Asia Pool',
    region: 'ASIA-East',
    latency: '280ms',
    weight: 100,
    enabled: true,
    endpoints: [
      {
        id: 'as-1',
        name: 'Tokyo-JP-01',
        ip: '203.0.113.1',
        weight: 100,
        monitorStates: { default: 'degraded' },
      },
      {
        id: 'as-2',
        name: 'Singapore-SG-02',
        ip: '203.0.113.2',
        weight: 100,
        monitorStates: { default: 'healthy' },
      },
    ],
  },
];

export const defaultConfig: LoadBalancerConfig = {
  name: 'Global Load Balancer',
  steeringMethod: 'geo',
  pools: initialPools,
  monitorGroups: monitorGroups,
};
