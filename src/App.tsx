import { useState } from 'react';
import { Button, Badge } from '@cloudflare/kumo';
import { 
  Globe, 
  Layers,
  Activity,
  Users,
  Server,
  Database,
  HeartPulse,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  ShieldCheck,
  ArrowLeft,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pool, SteeringMethod, MonitorGroup } from './types';
import { defaultConfig } from './data/mockData';
import { getEndpointHealth, getPoolHealth, getHealthColor, getHealthBorderColor } from './utils/healthCalculations';

function App() {
  const [pools, setPools] = useState<Pool[]>(defaultConfig.pools);
  const [monitorGroups] = useState<MonitorGroup[]>(defaultConfig.monitorGroups);
  const [steeringMethod, setSteeringMethod] = useState<SteeringMethod>('geo');
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [showMonitors, setShowMonitors] = useState(true);
  const [showCodeView, setShowCodeView] = useState(false);
  const [animationKey] = useState(0);

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
      {/* Header */}
      <header className="bg-kumo-surface border-b border-kumo-line px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-kumo-brand p-2 rounded-xl shadow-lg">
            <Globe className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Cloudflare Load Balancing</h1>
            <p className="text-[10px] text-kumo-subtle uppercase tracking-widest font-semibold">
              Monitor Group Architecture
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {(['geo', 'dynamic'] as SteeringMethod[]).map(m => (
              <Button
                key={m}
                onClick={() => setSteeringMethod(m)}
                variant={steeringMethod === m ? 'primary' : 'secondary'}
                size="sm"
              >
                {m.charAt(0).toUpperCase() + m.slice(1)} Steering
              </Button>
            ))}
          </div>
          <Button
            onClick={() => setShowMonitors(!showMonitors)}
            variant={showMonitors ? 'primary' : 'secondary'}
            shape="square"
            icon={Layers}
            aria-label="Toggle monitors"
          />
          <Button
            onClick={() => setShowCodeView(!showCodeView)}
            variant={showCodeView ? 'primary' : 'secondary'}
            shape="square"
            icon={Code}
            aria-label="Toggle code view"
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-80 border-r border-kumo-line p-6 overflow-y-auto shrink-0 bg-kumo-surface">
          <div className="mb-8">
            <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest mb-4">
              Monitor Logic
            </h2>
            <div className="space-y-3">
              {[
                { 
                  id: 'critical', 
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
                  className="p-3 rounded-xl border bg-kumo-control border-kumo-line shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={step.color}>{step.icon}</div>
                    <span className="text-sm font-bold">{step.title}</span>
                  </div>
                  <p className="text-[11px] text-kumo-subtle leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-kumo-line">
            <h2 className="text-[10px] font-bold text-kumo-subtle uppercase tracking-widest mb-4">
              Active Pools
            </h2>
            <div className="space-y-3">
              {pools.map(pool => {
                const monitorGroup = pool.monitorGroupId 
                  ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                  : undefined;
                const health = getPoolHealth(pool, monitorGroup);
                
                return (
                  <button
                    key={pool.id}
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={`w-full p-3 rounded-xl border cursor-pointer transition-all text-left ${
                      selectedPoolId === pool.id 
                        ? 'bg-kumo-brand/10 border-kumo-brand' 
                        : 'bg-kumo-control border-kumo-line hover:border-kumo-brand/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{pool.name}</span>
                        {pool.monitorGroupId && (
                          <Layers className="w-3 h-3 text-cyan-400" />
                        )}
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getHealthColor(health)}`} />
                    </div>
                    <div className="text-[10px] text-kumo-subtle mt-1">
                      {pool.endpoints.length} Endpoints • {pool.region}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Visualization Area */}
        <section className="flex-1 relative bg-kumo-base overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedPoolId ? (
              <motion.div
                key="pool-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-kumo-base/95 backdrop-blur-xl p-10 flex flex-col"
              >
                <Button
                  onClick={() => setSelectedPoolId(null)}
                  variant="secondary"
                  icon={ArrowLeft}
                  className="mb-6 self-start"
                >
                  Back to Global Map
                </Button>

                <div className="flex-1 flex gap-10">
                  {/* Pool Detail */}
                  <div className="w-1/3 space-y-6">
                    <div className="bg-kumo-surface border border-kumo-line p-8 rounded-3xl">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-kumo-brand rounded-xl flex items-center justify-center">
                          <Database className="w-6 h-6 text-white" />
                        </div>
                        {selectedPool?.monitorGroupId && (
                          <Badge variant="primary">MONITOR GROUP ACTIVE</Badge>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{selectedPool?.name}</h2>
                      <p className="text-kumo-subtle text-xs mb-6">
                        Aggregate health is calculated using collective monitor results and quorum logic.
                      </p>
                      
                      <div className="space-y-3">
                        <div className="text-[10px] text-kumo-subtle uppercase font-bold">Group Config</div>
                        {selectedMonitorGroup ? (
                          selectedMonitorGroup.monitors.map(m => (
                            <div 
                              key={m.id} 
                              className="flex items-center justify-between bg-kumo-control p-2.5 rounded-xl border border-kumo-line"
                            >
                              <div className="flex items-center gap-2">
                                <HeartPulse className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs">{m.name}</span>
                              </div>
                              {m.must_be_healthy && (
                                <Badge variant="destructive" className="text-[8px]">CRITICAL</Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-kumo-subtle italic">No Monitor Group assigned</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Endpoint Drill-down */}
                  <div className="flex-1 grid grid-cols-2 gap-6 content-start">
                    {selectedPool?.endpoints.map(ep => {
                      const health = getEndpointHealth(selectedPool, ep, selectedMonitorGroup);
                      return (
                        <div 
                          key={ep.id} 
                          className={`p-6 rounded-3xl border-2 transition-all duration-300 bg-kumo-surface ${getHealthBorderColor(health)}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <Server className={`w-5 h-5 ${health === 'healthy' ? 'text-green-400' : 'text-slate-500'}`} />
                              <span className="font-bold">{ep.name}</span>
                            </div>
                            <Badge variant={health === 'healthy' ? 'primary' : 'destructive'}>
                              {health.toUpperCase()}
                            </Badge>
                          </div>

                          {/* Monitor Group Interaction Grid */}
                          {selectedMonitorGroup ? (
                            <div className="mt-6 space-y-2">
                              <div className="text-[9px] text-kumo-subtle uppercase font-bold mb-2">
                                Monitor Results
                              </div>
                              {selectedMonitorGroup.monitors.map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => toggleEndpointMonitor(selectedPool.id, ep.id, m.id)}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                    ep.monitorStates[m.id] === 'healthy' 
                                      ? 'bg-kumo-control border-kumo-line hover:border-kumo-brand' 
                                      : 'bg-kumo-danger/10 border-kumo-danger/30'
                                  }`}
                                >
                                  <span className="text-xs font-medium text-kumo-default">{m.name}</span>
                                  {ep.monitorStates[m.id] === 'healthy' 
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" /> 
                                    : <XCircle className="w-4 h-4 text-red-500" />
                                  }
                                </button>
                              ))}
                              <div className="mt-4 p-2 bg-kumo-base/50 rounded-lg text-[10px] text-kumo-subtle italic flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Click monitors above to simulate failures.
                              </div>
                            </div>
                          ) : (
                            <div className="mt-6">
                              <div className="text-[9px] text-kumo-subtle uppercase font-bold mb-2">
                                Endpoint Health
                              </div>
                              <button
                                onClick={() => toggleEndpointHealth(selectedPool.id, ep.id)}
                                className="w-full p-3 rounded-xl border border-kumo-line bg-kumo-control hover:border-kumo-brand transition-all"
                              >
                                <div className="text-xs text-kumo-default">
                                  Click to cycle: Healthy → Degraded → Critical
                                </div>
                              </button>
                              <div className="mt-4 p-2 bg-kumo-base/50 rounded-lg text-[10px] text-kumo-subtle italic flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Click to simulate endpoint failures.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : showCodeView ? (
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
                  <pre className="bg-kumo-surface border border-kumo-line rounded-xl p-6 text-sm overflow-x-auto">
                    <code className="text-green-400">{generateAPIConfig()}</code>
                  </pre>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="global-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center p-10"
              >
                <div className="relative w-full max-w-5xl aspect-[16/8] flex items-center justify-between">
                  <div className="flex flex-col items-center gap-4 z-10">
                    <Users className="w-8 h-8 text-kumo-brand" />
                    <span className="text-[10px] font-bold text-kumo-subtle uppercase">Traffic</span>
                  </div>

                  <div className="flex-1 h-px bg-kumo-line mx-4 relative">
                    <motion.div
                      key={`traffic-${animationKey}`}
                      className="absolute top-0 left-0 w-3 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#3b82f6]"
                      animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>

                  <div className="relative flex flex-col items-center gap-4 z-10">
                    <div className="w-28 h-28 rounded-3xl bg-kumo-brand flex flex-col items-center justify-center text-white shadow-2xl">
                      <Activity className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-black uppercase">Edge</span>
                    </div>
                  </div>

                  <div className="flex-1 relative mx-6 h-full flex flex-col justify-around py-12">
                    {pools.map((pool, idx) => {
                      const monitorGroup = pool.monitorGroupId 
                        ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                        : undefined;
                      const health = getPoolHealth(pool, monitorGroup);
                      const healthiestPool = getHealthiestPool();
                      const isActiveRoute = steeringMethod === 'dynamic' 
                        ? healthiestPool?.id === pool.id
                        : health === 'healthy';
                      
                      return (
                        <div key={pool.id} className="relative h-px w-full bg-kumo-line/50">
                          {health !== 'critical' && isActiveRoute && (
                            <motion.div
                              key={`pkt-${pool.id}-${animationKey}`}
                              className={`absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 rounded-full ${
                                steeringMethod === 'dynamic' && healthiestPool?.id === pool.id
                                  ? 'bg-blue-400 shadow-[0_0_12px_#3b82f6]'
                                  : health === 'healthy' 
                                  ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' 
                                  : 'bg-yellow-400'
                              }`}
                              animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                              transition={{ 
                                duration: 3, 
                                repeat: Infinity, 
                                ease: 'linear',
                                delay: idx * 0.5 
                              }}
                            />
                          )}
                          {showMonitors && (
                            <motion.div
                              className={`absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-1.5 rounded-full opacity-50 ${
                                pool.monitorGroupId ? 'bg-cyan-400' : 'bg-pink-400'
                              }`}
                              animate={{ left: ['0%', '100%'], opacity: [0, 0.5, 0.5, 0] }}
                              transition={{ 
                                duration: 1.5, 
                                repeat: Infinity, 
                                ease: 'linear',
                                delay: idx * 0.4 
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col justify-around h-full py-4 gap-6">
                    {pools.map(pool => {
                      const monitorGroup = pool.monitorGroupId 
                        ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                        : undefined;
                      const health = getPoolHealth(pool, monitorGroup);
                      
                      return (
                        <button
                          key={pool.id}
                          onClick={() => setSelectedPoolId(pool.id)}
                          className={`w-44 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            health === 'healthy' 
                              ? 'bg-kumo-surface border-green-500/20' 
                              : health === 'degraded' 
                              ? 'bg-kumo-surface border-yellow-500/20' 
                              : 'bg-kumo-surface border-kumo-danger'
                          } hover:scale-105`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-bold truncate">{pool.name}</h4>
                            {pool.monitorGroupId && <Layers className="w-3 h-3 text-cyan-400" />}
                          </div>
                          <div className="text-[9px] text-kumo-subtle mb-2 uppercase">{pool.latency}</div>
                          <div className="flex gap-1">
                            {pool.endpoints.map(ep => {
                              const epHealth = getEndpointHealth(pool, ep, monitorGroup);
                              return (
                                <div 
                                  key={ep.id} 
                                  className={`flex-1 h-1 rounded-full ${getHealthColor(epHealth)}`} 
                                />
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <footer className="bg-kumo-surface border-t border-kumo-line px-8 py-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-kumo-subtle shrink-0">
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-2">
            <Layers className="w-3 h-3 text-cyan-400" /> Monitor Group Probe
          </div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-3 h-3 text-pink-400" /> Standard Probe
          </div>
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
