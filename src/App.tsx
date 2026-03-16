import { useState, useEffect } from 'react';
import { 
  Layers,
  Activity,
  Server,
  Database,
  HeartPulse,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  ShieldCheck,
  Code,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pool, SteeringMethod, MonitorGroup } from './types';
import { defaultConfig } from './data/mockData';
import { getEndpointHealth, getPoolHealth, getHealthColor } from './utils/healthCalculations';
import { LoadBalancerDiagram } from './components/LoadBalancerDiagram';
import { FlowLoadBalancerDiagram } from './components/FlowLoadBalancerDiagram';
import { SankeyLoadBalancerDiagram } from './components/SankeyLoadBalancerDiagram';

function App() {
  const [pools, setPools] = useState<Pool[]>(defaultConfig.pools);
  const [monitorGroups] = useState<MonitorGroup[]>(defaultConfig.monitorGroups);
  const [steeringMethod, setSteeringMethod] = useState<SteeringMethod>('off');
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [showMonitors, setShowMonitors] = useState(true);
  const [showCodeView, setShowCodeView] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [diagramType, setDiagramType] = useState<'original' | 'flow' | 'sankey'>('original');

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const selectedPool = pools.find(p => p.id === selectedPoolId);
  const selectedMonitorGroup = selectedPool?.monitorGroupId 
    ? monitorGroups.find(mg => mg.id === selectedPool.monitorGroupId)
    : undefined;

  const toggleEndpointMonitor = (poolId: string, endpointId: string, monitorId: string) => {
    setPools(currentPools => currentPools.map(pool => {
      if (pool.id !== poolId) return pool;
      return {
        ...pool,
        endpoints: pool.endpoints.map(ep => {
          if (ep.id !== endpointId) return ep;
          const current = ep.monitorStates[monitorId];
          return {
            ...ep,
            monitorStates: {
              ...ep.monitorStates,
              [monitorId]: current === 'healthy' ? 'critical' : 'healthy'
            }
          };
        })
      };
    }));
  };

  const toggleEndpointHealth = (poolId: string, endpointId: string) => {
    setPools(currentPools => currentPools.map(pool => {
      if (pool.id !== poolId) return pool;
      return {
        ...pool,
        endpoints: pool.endpoints.map(ep => {
          if (ep.id !== endpointId) return ep;
          const currentState = ep.monitorStates['default'];
          const nextState = currentState === 'healthy' ? 'degraded' : currentState === 'degraded' ? 'critical' : 'healthy';
          return {
            ...ep,
            monitorStates: {
              ...ep.monitorStates,
              default: nextState
            }
          };
        })
      };
    }));
  };

  const getHealthiestPool = () => {
    const healthyPools = pools.filter(pool => {
      const monitorGroup = pool.monitorGroupId 
        ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
        : undefined;
      const health = getPoolHealth(pool, monitorGroup);
      return health === 'healthy';
    });

    if (healthyPools.length === 0) return null;

    if (steeringMethod === 'dynamic') {
      return healthyPools.reduce((best, current) => {
        const bestLatency = parseFloat(best.latency);
        const currentLatency = parseFloat(current.latency);
        return currentLatency < bestLatency ? current : best;
      });
    }

    return healthyPools[0];
  };

  const generateAPIConfig = () => {
    const config = {
      load_balancer: {
        name: defaultConfig.name,
        default_pools: pools.map(p => p.id),
        steering_policy: steeringMethod,
        pools: pools.map(pool => ({
          id: pool.id,
          name: pool.name,
          origins: pool.endpoints.map(ep => ({
            name: ep.name,
            address: ep.ip,
            enabled: true,
            weight: ep.weight
          })),
          monitor: pool.monitorGroupId || 'default',
          enabled: pool.enabled
        })),
        monitor_groups: monitorGroups.map(mg => ({
          id: mg.id,
          monitors: mg.monitors.map(m => ({
            id: m.id,
            type: m.type,
            interval: m.interval,
            timeout: m.timeout,
            retries: m.retries,
            must_be_healthy: m.must_be_healthy,
            monitoring_only: m.monitoring_only
          }))
        }))
      }
    };
    return JSON.stringify(config, null, 2);
  };

  return (
    <div className="flex flex-col h-screen bg-kumo-base font-sans text-kumo-default overflow-hidden">
      {/* Top Header Bar */}
      <header className="bg-kumo-elevated backdrop-blur-md border-b border-custom px-6 py-5 flex justify-between items-center shrink-0 z-[100]">
        <div>
          <h1 className="text-2xl font-bold leading-tight mb-1">Cloudflare Load Balancer Visualizer</h1>
          <h2 className="text-sm font-semibold text-kumo-default mb-1">
            Visualize traffic distribution from the Edge to your Origins.
          </h2>
          <p className="text-xs text-kumo-subtle leading-relaxed max-w-2xl">
            Use this tool to simulate steering policies, monitor pool health, and track request flow across the network.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-2 bg-kumo-elevated border border-custom text-kumo-subtle hover:text-kumo-default"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => setShowCodeView(!showCodeView)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-2 border ${
              showCodeView
                ? 'bg-kumo-brand text-white font-bold border-kumo-brand'
                : 'bg-kumo-elevated border-custom text-kumo-subtle hover:text-kumo-default'
            }`}
            aria-label="Toggle code view"
          >
            <Code className="w-4 h-4" />
            Code
          </button>
        </div>
      </header>

      {/* Secondary Toolbar */}
      <div className="bg-kumo-elevated border-b border-custom px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-kumo-elevated p-1 rounded-lg border border-custom">
            {(['off', 'random', 'geo', 'dynamic', 'proximity', 'least-outstanding-requests'] as SteeringMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setSteeringMethod(m)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  steeringMethod === m 
                    ? 'bg-kumo-brand text-white font-bold' 
                    : 'text-kumo-subtle hover:text-kumo-default'
                }`}
              >
                {m === 'off' ? 'Off' : m === 'least-outstanding-requests' ? 'LOR' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value as 'original' | 'flow' | 'sankey')}
            className="px-3 py-1.5 text-xs rounded-md transition-all border bg-kumo-elevated border-custom text-kumo-default hover:bg-kumo-control cursor-pointer"
          >
            <option value="original">Original View</option>
            <option value="flow">Flow View</option>
            <option value="sankey">Sankey View</option>
          </select>
          <button
            onClick={() => setShowMonitors(!showMonitors)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-2 border ${
              showMonitors
                ? 'bg-kumo-brand text-white font-bold border-kumo-brand'
                : 'bg-kumo-elevated border-custom text-kumo-subtle hover:text-kumo-default'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            Monitors
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-2 border ${
              showLegend
                ? 'bg-kumo-brand text-white font-bold border-kumo-brand'
                : 'bg-kumo-elevated border-custom text-kumo-subtle hover:text-kumo-default'
            }`}
          >
            <Layers className="w-4 h-4" />
            Legend
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-80 border-r border-custom p-6 overflow-y-auto shrink-0 bg-kumo-elevated">
          <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest mb-4">
            Active Pools
          </h2>
          <div className="space-y-2 mb-6">
            {pools.map(pool => {
              const monitorGroup = pool.monitorGroupId 
                ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                : undefined;
              const health = getPoolHealth(pool, monitorGroup);
              
              return (
                <div
                  key={pool.id}
                  onClick={() => setSelectedPoolId(pool.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPoolId === pool.id 
                      ? 'bg-kumo-brand/10 border-kumo-brand/50' 
                      : 'bg-kumo-control/30 border-custom hover:border-custom'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">{pool.name}</span>
                    <div className={`w-2 h-2 rounded-full ${getHealthColor(health)}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Pool Details */}
          {selectedPoolId && selectedPool && (
            <div className="border-t border-custom pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest">
                  Pool Details
                </h2>
                <button
                  onClick={() => setSelectedPoolId(null)}
                  className="text-kumo-subtle hover:text-kumo-default transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Pool Header */}
                <div className="bg-kumo-surface border border-custom p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-kumo-brand" />
                    <h3 className="text-sm font-bold">{selectedPool.name}</h3>
                  </div>
                  {selectedPool.monitorGroupId && (
                    <div className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-[9px] font-bold border border-cyan-500/30 inline-block">
                      MONITOR GROUP
                    </div>
                  )}
                </div>

                {/* Monitor Group Config */}
                {selectedMonitorGroup && (
                  <div className="space-y-2">
                    <div className="text-[9px] text-kumo-subtle uppercase font-bold">Monitor Group Config</div>
                    {selectedMonitorGroup.monitors.map(m => (
                      <div 
                        key={m.id} 
                        className="flex items-center justify-between bg-kumo-control/40 p-2 rounded-lg border border-custom"
                      >
                        <div className="flex items-center gap-2">
                          <HeartPulse className="w-3 h-3 text-cyan-400" />
                          <span className="text-[10px]">{m.name}</span>
                        </div>
                        {m.must_be_healthy && (
                          <div className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold">CRITICAL</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Endpoints */}
                <div className="space-y-3">
                  <div className="text-[9px] text-kumo-subtle uppercase font-bold">Endpoints</div>
                  {selectedPool.endpoints.map(ep => {
                    const health = getEndpointHealth(selectedPool, ep, selectedMonitorGroup);
                    return (
                      <div 
                        key={ep.id} 
                        className={`p-3 rounded-xl border transition-all bg-kumo-surface/50 ${
                          health === 'healthy' 
                            ? 'border-green-500/20' 
                            : health === 'degraded' 
                            ? 'border-yellow-500/20' 
                            : 'border-red-900/50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <Server className={`w-4 h-4 ${health === 'healthy' ? 'text-green-400' : 'text-kumo-subtle'}`} />
                            <span className="text-xs font-bold">{ep.name}</span>
                          </div>
                          <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            health === 'healthy' 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {health.toUpperCase()}
                          </div>
                        </div>

                        {/* Monitor Toggles */}
                        {selectedMonitorGroup ? (
                          <div className="space-y-1.5">
                            {selectedMonitorGroup.monitors.map(m => (
                              <button
                                key={m.id}
                                onClick={() => toggleEndpointMonitor(selectedPool.id, ep.id, m.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
                                  ep.monitorStates[m.id] === 'healthy' 
                                    ? 'bg-kumo-control/40 border-custom hover:border-cyan-500/30' 
                                    : 'bg-kumo-danger/10 border-kumo-danger/30'
                                }`}
                              >
                                <span className="text-[10px] font-medium">{m.name}</span>
                                {ep.monitorStates[m.id] === 'healthy' 
                                  ? <CheckCircle2 className="w-3 h-3 text-green-500" /> 
                                  : <XCircle className="w-3 h-3 text-red-500" />
                                }
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleEndpointHealth(selectedPool.id, ep.id)}
                            className="w-full p-2 rounded-lg bg-kumo-control border border-custom text-[10px] font-bold hover:bg-kumo-control/80 transition-all"
                          >
                            Toggle Health
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Visualization Area */}
        <section className="flex-1 relative bg-kumo-tint overflow-hidden">
          <AnimatePresence mode="wait">
            {showCodeView ? (
              <motion.div
                key="code-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-10 overflow-auto"
              >
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                    <Code className="w-6 h-6 text-green-400" />
                    Cloudflare API Configuration
                  </h2>
                  <pre className="bg-kumo-surface border border-custom rounded-xl p-6 text-sm overflow-x-auto">
                    <code className="text-green-400">{generateAPIConfig()}</code>
                  </pre>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="diagram"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  {diagramType === 'flow' ? (
                    <FlowLoadBalancerDiagram
                      pools={pools}
                      monitorGroups={monitorGroups}
                      steeringMethod={steeringMethod}
                      onPoolClick={(poolId) => setSelectedPoolId(poolId)}
                      showMonitors={showMonitors}
                      className="h-full"
                    />
                  ) : diagramType === 'sankey' ? (
                    <SankeyLoadBalancerDiagram
                      pools={pools}
                      monitorGroups={monitorGroups}
                      steeringMethod={steeringMethod}
                      className="h-full"
                    />
                  ) : (
                    <LoadBalancerDiagram
                      pools={pools}
                      monitorGroups={monitorGroups}
                      steeringMethod={steeringMethod}
                      onPoolClick={(poolId) => setSelectedPoolId(poolId)}
                      showMonitors={showMonitors}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </AnimatePresence>
        </section>

        {/* Right Sidebar - Legend Panel */}
        <AnimatePresence>
          {showLegend && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 border-l border-custom p-6 overflow-y-auto shrink-0 bg-kumo-elevated"
            >
              <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest mb-4">
                Traffic Flow
              </h2>
              <div className="space-y-3 mb-6">
                {[
                  { 
                    id: 'healthy', 
                    title: 'Healthy Traffic', 
                    icon: <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />, 
                    color: 'text-green-400', 
                    desc: 'Green dots indicate traffic flowing to healthy pools and endpoints.' 
                  },
                  { 
                    id: 'degraded', 
                    title: 'Degraded Traffic', 
                    icon: <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />, 
                    color: 'text-yellow-400', 
                    desc: 'Yellow dots indicate traffic to degraded pools or endpoints with partial health issues.' 
                  },
                  { 
                    id: 'critical', 
                    title: 'No Traffic', 
                    icon: <div className="w-3 h-3 rounded-full bg-red-400 opacity-30" />, 
                    color: 'text-red-400', 
                    desc: 'Critical pools and endpoints receive no traffic and show no flow animation.' 
                  },
                  { 
                    id: 'monitor-group', 
                    title: 'Monitor Group Probe', 
                    icon: <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />, 
                    color: 'text-cyan-400', 
                    desc: 'Small cyan dots show health check probes running for monitor group endpoints.' 
                  },
                  { 
                    id: 'standard-probe', 
                    title: 'Standard Probe', 
                    icon: <div className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.5)]" />, 
                    color: 'text-pink-400', 
                    desc: 'Small pink dots show health check probes for standard endpoints without monitor groups.' 
                  }
                ].map((status) => (
                  <div 
                    key={status.id} 
                    className="p-3 rounded-xl border bg-kumo-control/30 border-custom shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center justify-center w-6">{status.icon}</div>
                      <span className="text-sm font-bold">{status.title}</span>
                    </div>
                    <p className="text-[11px] text-kumo-subtle leading-relaxed">{status.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest mb-4">
                Monitor Logic
              </h2>
              <div className="space-y-3 mb-6">
                {[
                  { 
                    id: 'critical-override', 
                    title: 'Critical Override', 
                    icon: <AlertTriangle className="w-5 h-5" />, 
                    color: 'text-red-400', 
                    desc: 'If must_be_healthy monitors fail, endpoint is immediately marked unhealthy.' 
                  },
                  { 
                    id: 'quorum', 
                    title: 'Quorum Consensus', 
                    icon: <ShieldCheck className="w-5 h-5" />, 
                    color: 'text-green-400', 
                    desc: 'Endpoint unhealthy only if >50% of monitors report unhealthy.' 
                  },
                  { 
                    id: 'monitoring', 
                    title: 'Monitoring Only', 
                    icon: <Layers className="w-5 h-5" />, 
                    color: 'text-cyan-400', 
                    desc: 'Monitors with monitoring_only=true run checks but don\'t affect health.' 
                  }
                ].map((step) => (
                  <div 
                    key={step.id} 
                    className="p-3 rounded-xl border bg-kumo-control/30 border-custom shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className={step.color}>{step.icon}</div>
                      <span className="text-sm font-bold">{step.title}</span>
                    </div>
                    <p className="text-[11px] text-kumo-subtle leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest mb-4">
                Traffic Steering Methods
              </h2>
              <div className="space-y-3">
                {[
                  {
                    id: 'off',
                    title: 'Off (Failover)',
                    desc: 'Routes traffic to pools in order until a healthy one is found. This is active-passive failover where only the first healthy pool receives traffic.',
                    link: 'https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/standard-options/'
                  },
                  {
                    id: 'random',
                    title: 'Random',
                    desc: 'Distributes traffic equally across all healthy pools in a round-robin fashion. This enables active-active failover where traffic is split between multiple pools.',
                    link: 'https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/standard-options/'
                  },
                  {
                    id: 'geo',
                    title: 'Geo Steering',
                    desc: 'Routes traffic based on the geographic location of the visitor. Pools are assigned to specific countries, regions, or data centers to serve users from the closest location.',
                    link: 'https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/geo-steering/'
                  },
                  {
                    id: 'dynamic',
                    title: 'Dynamic Steering',
                    desc: 'Uses health monitor data to route traffic to the fastest pool based on Round Trip Time (RTT). Cloudflare automatically selects the pool with the lowest latency for each region.',
                    link: 'https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/dynamic-steering/'
                  },
                  {
                    id: 'proximity',
                    title: 'Proximity Steering',
                    desc: 'Routes visitors to the closest physical data center based on GPS coordinates. Each pool must have latitude/longitude coordinates configured for this method to work.',
                    link: 'https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/proximity-steering/'
                  },
                  {
                    id: 'lor',
                    title: 'Least Outstanding Requests',
                    desc: 'Routes traffic to pools with the lowest number of pending requests. This method is ideal for applications that can be easily overwhelmed by concurrent request spikes.',
                    link: 'https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/least-outstanding-requests/'
                  }
                ].map((method) => (
                  <div 
                    key={method.id} 
                    className="p-3 rounded-xl border bg-kumo-control/30 border-custom shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{method.title}</span>
                      <a
                        href={method.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View documentation"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <p className="text-[11px] text-kumo-subtle leading-relaxed">{method.desc}</p>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <footer className="bg-kumo-elevated border-t border-custom px-8 py-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-kumo-subtle shrink-0">
        <div className="flex gap-8 items-center">
          {steeringMethod === 'dynamic' && getHealthiestPool() && (
            <div className="flex items-center gap-2 text-blue-400">
              <Activity className="w-3 h-3" /> Dynamic: Routing to {getHealthiestPool()?.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 italic normal-case font-medium text-kumo-subtle">
          <Info className="w-3 h-3" />
          Click pools to explore endpoints and toggle monitor states
        </div>
      </footer>
    </div>
  );
}

export default App;
