# AGENTS.md - Coding Agent Guidelines

This file provides guidelines for AI coding agents working on the Cloudflare Load Balancing Visualization project.

## Project Overview

Interactive educational React app demonstrating Cloudflare's distributed load balancing with monitor groups, health checks, and traffic steering. Built with React 19, TypeScript, Vite 8, Kumo (Cloudflare's component library), Framer Motion, and Tailwind CSS.

## Build Commands

### Development
```bash
npm run dev              # Start dev server at http://localhost:5173
npm run build            # Type check with tsc -b && build with Vite
npm run preview          # Preview production build
npm run lint             # Run ESLint on all files
```

### Running Tests
**Note**: This project currently has no test suite configured. If adding tests:
- Consider Vitest for unit tests (integrates well with Vite)
- Consider Playwright or Cypress for E2E tests
- Run single test: `npx vitest run path/to/test.spec.ts`

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled**: All strict TypeScript checks are on
- **ES2022 target**: Modern JavaScript features available
- **No unused locals/parameters**: Clean up unused code immediately
- **Module resolution**: Bundler mode (Vite-specific)
- **JSX**: react-jsx transform (no React imports needed in components)

### Import Style
```typescript
// ✅ GOOD: External imports first, then internal, ordered logically
import { useState, useEffect } from 'react';
import { Button, Badge } from '@cloudflare/kumo';
import { Globe, Activity, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pool, SteeringMethod, MonitorGroup } from './types';
import { defaultConfig } from './data/mockData';
import { getEndpointHealth, getPoolHealth } from './utils/healthCalculations';

// ❌ BAD: Mixed order, types not separated
import { defaultConfig } from './data/mockData';
import { useState } from 'react';
import { Pool } from './types';
```

**Rules**:
1. Group imports: React hooks → UI libraries (Kumo, icons) → animation → types (with `type` keyword) → local modules
2. Use `type` keyword for type-only imports
3. No semicolons are used (but ESLint doesn't enforce this)
4. Prefer named imports over default when both available

### Naming Conventions

```typescript
// ✅ Component files: PascalCase.tsx
// App.tsx, LoadBalancerView.tsx

// ✅ Utility files: camelCase.ts
// healthCalculations.ts, formatters.ts

// ✅ Type files: index.ts or descriptive.ts
// types/index.ts, types/monitoring.ts

// ✅ Variables and functions: camelCase
const selectedPool = pools.find(p => p.id === selectedPoolId);
function getEndpointHealth(pool: Pool): HealthStatus { }

// ✅ Types and interfaces: PascalCase
type HealthStatus = 'healthy' | 'degraded' | 'critical';
interface Pool { id: string; name: string; }

// ✅ Constants: camelCase (not UPPER_CASE)
const defaultConfig = { pools: [], monitorGroups: [] };
```

### Type Definitions

```typescript
// ✅ GOOD: Explicit types, literal unions, clear interfaces
export type HealthStatus = 'healthy' | 'degraded' | 'critical';
export type SteeringMethod = 'geo' | 'dynamic' | 'random' | 'proximity';

export interface Monitor {
  id: string;
  name: string;
  type: 'http' | 'https' | 'tcp' | 'icmp';
  interval: number;
  must_be_healthy: boolean;
}

// ✅ GOOD: Type imports
import type { Pool, Endpoint } from '../types';

// ❌ BAD: Any types, missing explicit returns
function calculate(data: any): any { }
```

### Error Handling

```typescript
// ✅ GOOD: Defensive checks, fallback values
export function getEndpointHealth(
  _pool: Pool,
  endpoint: Endpoint,
  monitorGroup?: MonitorGroup
): HealthStatus {
  if (!monitorGroup) {
    // Fallback to simple logic
    const states = Object.values(endpoint.monitorStates);
    if (states.every(s => s === 'healthy')) return 'healthy';
    if (states.some(s => s === 'critical')) return 'critical';
    return 'degraded';
  }
  // ... monitor group logic
}

// ✅ GOOD: Safe array operations
const healthyCount = healthStatuses.filter(s => s === 'healthy').length;

// ❌ BAD: No null checks, assumes data exists
const health = monitorGroup.monitors[0].status; // May throw
```

### React Patterns

```typescript
// ✅ GOOD: Hooks at top, typed state, memoized callbacks
function App() {
  const [pools, setPools] = useState<Pool[]>(defaultConfig.pools);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  
  const selectedPool = pools.find(p => p.id === selectedPoolId);
  
  // Immutable updates
  setPools(currentPools => currentPools.map(pool => {
    if (pool.id !== poolId) return pool;
    return { ...pool, endpoints: updatedEndpoints };
  }));
}

// ✅ GOOD: Kumo components with proper props
<Button variant="primary" onClick={handleClick}>
  Click me
</Button>

<Badge variant="success">Healthy</Badge>
```

### Formatting
- **Indentation**: 2 spaces (not tabs)
- **Max line length**: ~100-120 chars (not strict)
- **Semicolons**: Not used (optional in this codebase)
- **Quotes**: Single quotes for strings
- **Trailing commas**: Used in multiline arrays/objects

### File Organization

```
src/
├── components/          # Reusable React components (currently empty)
├── data/               # Mock data, constants, configurations
��   └── mockData.ts     # Pool and monitor group data
├── hooks/              # Custom React hooks (currently empty)
├── types/              # TypeScript type definitions
│   └── index.ts        # All project types centralized
├── utils/              # Pure utility functions
│   └── healthCalculations.ts  # Business logic, no React
├── App.tsx             # Main app component (currently monolithic)
├── main.tsx            # Entry point, React DOM render
└── index.css           # Global Tailwind styles
```

## Project-Specific Guidelines

### Monitor Group Logic
This app implements Cloudflare's official monitor group algorithm:
1. **Critical override**: If any `must_be_healthy` monitor fails → endpoint is critical
2. **Quorum consensus**: Endpoint unhealthy if >50% of voting monitors fail
3. **Monitoring-only excluded**: `monitoring_only: true` monitors don't vote
4. See `src/utils/healthCalculations.ts` for implementation

### Styling
- Use Tailwind utility classes for all styling
- Use Kumo components for buttons, badges, inputs (maintains Cloudflare design system)
- Dark/light mode via `data-mode` attribute on `<html>`
- Color scheme: green (healthy), yellow (degraded), red (critical)

### State Management
- Currently uses React `useState` (no Redux/Zustand)
- State lifted to App.tsx (consider extracting to context if grows)
- Immutable updates with spread operators

### Animation
- Use Framer Motion for all animations
- AnimatePresence for mount/unmount animations
- Keep animations subtle and performant

## Common Tasks

### Adding a New Component
1. Create in `src/components/ComponentName.tsx`
2. Export types in `src/types/index.ts` if needed
3. Import in App.tsx or parent component
4. Use Kumo components where possible

### Adding Business Logic
1. Pure functions go in `src/utils/`
2. React hooks go in `src/hooks/`
3. Always add TypeScript types
4. Write defensive code with null checks

### Modifying Health Calculations
- All logic in `src/utils/healthCalculations.ts`
- Must match Cloudflare's official behavior
- Update tests if added

## ESLint Rules
- Recommended configs from @eslint/js, typescript-eslint, react-hooks, react-refresh
- No unused variables (enforced by TypeScript)
- React Hooks rules enforced
- Fast refresh patterns enforced for Vite

## Common Pitfalls
1. **Don't** import React in components (JSX transform handles it)
2. **Don't** mutate state directly (use setState with new objects)
3. **Don't** use `any` types (strict mode prevents this)
4. **Don't** forget to add Kumo component CSS in Tailwind content paths
5. **Don't** mix business logic in components (extract to utils/)

## Resources
- [Cloudflare Load Balancing Docs](https://developers.cloudflare.com/load-balancing/)
- [Monitor Groups](https://developers.cloudflare.com/load-balancing/monitors/monitor-groups/)
- [Kumo Components](https://github.com/cloudflare/kumo)
- [Vite Guide](https://vite.dev/guide/)
- [Framer Motion](https://www.framer.com/motion/)
