import { useState, useEffect } from 'react';
import { Button } from '@cloudflare/kumo';
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
  Code,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pool, SteeringMethod, MonitorGroup } from './types';
import { defaultConfig } from './data/mockData';
import { getEndpointHealth, getPoolHealth, getHealthColor } from './utils/healthCalculations';

function App() {
  const [pools, setPools] = useState<Pool[]>(defaultConfig.pools);
  const [monitorGroups] = useState<MonitorGroup[]>(defaultConfig.monitorGroups);
  const [steeringMethod, setSteeringMethod] = useState<SteeringMethod>('geo');
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [showMonitors, setShowMonitors] = useState(true);
  const [showCodeView, setShowCodeView] = useState(false);
  const [animationKey] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

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
    <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex justify-between items-center shrink-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
            <Globe className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Cloudflare Load Balancing</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Monitor Group Architecture
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsDarkMode(!isDarkMode)}
            variant="secondary"
            shape="square"
            icon={isDarkMode ? Sun : Moon}
            aria-label="Toggle theme"
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

      {/* Secondary Toolbar */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
            {(['geo', 'dynamic'] as SteeringMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setSteeringMethod(m)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${
                  steeringMethod === m 
                    ? 'bg-orange-500 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-700 mx-2" />
          <button
            onClick={() => setShowMonitors(!showMonitors)}
            className={`p-2 rounded-lg border transition-all ${
              showMonitors 
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' 
                : 'border-slate-700 text-slate-500'
            }`}
          >
            <HeartPulse className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-80 border-r border-slate-800 p-6 overflow-y-auto shrink-0 bg-slate-900/50">
          <div className="mb-8">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
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
                  className="p-3 rounded-xl border bg-slate-800/30 border-slate-800 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={step.color}>{step.icon}</div>
                    <span className="text-sm font-bold">{step.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
              Active Pools
            </h2>
            <div className="space-y-2">
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
                        ? 'bg-orange-500/10 border-orange-500/50' 
                        : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
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
          </div>
        </aside>

        {/* Main Visualization Area */}
        <section className="flex-1 relative bg-slate-950 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedPoolId ? (
              <motion.div
                key="pool-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-slate-950 p-10 flex flex-col"
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
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                          <Database className="w-6 h-6 text-white" />
                        </div>
                        {selectedPool?.monitorGroupId && (
                          <div className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-bold border border-cyan-500/30">
                            MONITOR GROUP
                          </div>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{selectedPool?.name}</h2>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Aggregate health is calculated using collective monitor results and quorum logic.
                      </p>
                      
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Group Config</div>
                        {selectedMonitorGroup ? (
                          selectedMonitorGroup.monitors.map(m => (
                            <div 
                              key={m.id} 
                              className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <HeartPulse className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs">{m.name}</span>
                              </div>
                              {m.must_be_healthy && (
                                <div className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[8px] font-bold">CRITICAL</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 italic">No Monitor Group assigned</div>
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
                          className={`p-6 rounded-3xl border-2 transition-all duration-300 bg-slate-900/50 ${
                            health === 'healthy' 
                              ? 'border-green-500/20' 
                              : health === 'degraded' 
                              ? 'border-yellow-500/20' 
                              : 'border-red-900/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <Server className={`w-5 h-5 ${health === 'healthy' ? 'text-green-400' : 'text-slate-500'}`} />
                              <span className="font-bold">{ep.name}</span>
                            </div>
                            <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              health === 'healthy' 
                                ? 'bg-green-500/10 text-green-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {health.toUpperCase()}
                            </div>
                          </div>

                          {/* Monitor Group Interaction Grid */}
                          {selectedMonitorGroup ? (
                            <div className="mt-6 space-y-2">
                              <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">
                                Monitor Results
                              </div>
                              {selectedMonitorGroup.monitors.map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => toggleEndpointMonitor(selectedPool.id, ep.id, m.id)}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                    ep.monitorStates[m.id] === 'healthy' 
                                      ? 'bg-slate-800/40 border-slate-700 hover:border-cyan-500/30' 
                                      : 'bg-red-500/10 border-red-500/30'
                                  }`}
                                >
                                  <span className="text-xs font-medium text-slate-300">{m.name}</span>
                                  {ep.monitorStates[m.id] === 'healthy' 
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" /> 
                                    : <XCircle className="w-4 h-4 text-red-500" />
                                  }
                                </button>
                              ))}
                              <div className="mt-4 p-2 bg-slate-950/50 rounded-lg text-[10px] text-slate-500 italic flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Click monitors above to simulate failures.
                              </div>
                            </div>
                          ) : (
                            <div className="mt-6">
                              <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">
                                Endpoint Health
                              </div>
                              <button
                                onClick={() => toggleEndpointHealth(selectedPool.id, ep.id)}
                                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold hover:bg-slate-700 transition-all"
                              >
                                Toggle Primary Health
                              </button>
                              <div className="mt-4 p-2 bg-slate-950/50 rounded-lg text-[10px] text-slate-500 italic flex items-center gap-2">
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
                  <pre className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm overflow-x-auto">
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
                  <div className="flex flex-col items-center gap-3 z-10">
                    <div className="p-3 bg-blue-500/10 rounded-full border border-blue-400/20">
                      <Users className="w-8 h-8 text-blue-400" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Ingress</span>
                  </div>

                  <div className="flex-1 h-px bg-slate-800 mx-4 relative">
                    <motion.div
                      key={`traffic-${animationKey}`}
                      className="absolute top-0 left-0 w-3 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#3b82f6]"
                      animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>

                  <div className="relative flex flex-col items-center gap-4 z-10">
                    <div className="w-28 h-28 rounded-3xl bg-orange-600 flex flex-col items-center justify-center text-white shadow-2xl border-4 border-orange-400/20">
                      <Activity className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Cloudflare Edge</span>
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
                        <div key={pool.id} className="relative h-px w-full bg-slate-800/50">
                          {health !== 'critical' && isActiveRoute && (
                            <motion.div
                              key={`pkt-${pool.id}-${animationKey}`}
                              className={`absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 rounded-full ${
                                health === 'healthy' 
                                  ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' 
                                  : 'bg-yellow-400'
                              }`}
                              animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                              transition={{ 
                                duration: 3, 
                                repeat: Infinity, 
                                ease: 'linear',
                                delay: idx * 0.2 
                              }}
                            />
                          )}
                          {showMonitors && (
                            <motion.div
                              className={`absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-1.5 rounded-full opacity-50 ${
                                pool.monitorGroupId ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-pink-400 shadow-[0_0_8px_#f472b6]'
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
                        <div
                          key={pool.id}
                          onClick={() => setSelectedPoolId(pool.id)}
                          className={`w-48 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            health === 'healthy' 
                              ? 'bg-slate-900 border-green-500/20 shadow-lg shadow-green-500/5' 
                              : health === 'degraded' 
                              ? 'border-yellow-500/20' 
                              : 'bg-slate-950 border-red-900 opacity-60'
                          } hover:scale-105 hover:bg-slate-800/80`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-bold truncate">{pool.name}</h4>
                            {pool.monitorGroupId && <Layers className="w-3 h-3 text-cyan-400" />}
                          </div>
                          <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-3">{pool.latency} avg RTT</div>
                          <div className="flex gap-1.5">
                            {pool.endpoints.map(ep => {
                              const epHealth = getEndpointHealth(pool, ep, monitorGroup);
                              return (
                                <div 
                                  key={ep.id} 
                                  className={`flex-1 h-1 rounded-full transition-colors duration-500 ${getHealthColor(epHealth)}`} 
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <footer className="bg-slate-900/50 border-t border-slate-800 px-8 py-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
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
        <div className="flex items-center gap-2 italic normal-case font-medium text-slate-500">
          <Info className="w-3 h-3" />
          Click pools to explore endpoints and toggle monitor states
        </div>
      </footer>
    </div>
  );
}

export default App;
