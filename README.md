# Cloudflare Load Balancing Visualization

An interactive educational tool demonstrating how Cloudflare's distributed load balancing works with monitor groups, health checks, and traffic steering.

## Features

### 🎯 Core Functionality
- **Interactive Network Visualization**: Real-time animated traffic flow from users → edge → pools → endpoints
- **Monitor Groups**: Implements official Cloudflare monitor group logic with critical overrides and quorum consensus
- **Health Monitoring**: Visual health status indicators with interactive failure simulation
- **Traffic Steering**: Switch between geographic and dynamic steering methods
- **Code View**: See real-time Cloudflare API configuration as you interact with the visualization

### 🏗️ Monitor Group Logic (Official Cloudflare Implementation)

Based on [Cloudflare's official documentation](https://developers.cloudflare.com/load-balancing/monitors/monitor-groups/):

1. **Critical Monitor Override** (`must_be_healthy: true`)
   - If ANY critical monitor fails, endpoint is immediately marked unhealthy
   - Overrides all other monitor results

2. **Quorum-Based Consensus**
   - Endpoint is unhealthy only if >50% of monitors report unhealthy
   - Prevents premature failover from single transient failures
   - Excludes `monitoring_only: true` monitors from voting

3. **Monitor Types**
   - **Standard monitors**: Participate in quorum voting
   - **Critical monitors**: Override with `must_be_healthy: true`
   - **Monitoring-only**: Run checks and trigger alerts but don't affect health
   - **Disabled**: Don't run, don't vote

### 🎨 Built With Kumo

Uses Cloudflare's [Kumo component library](https://github.com/cloudflare/kumo) for:
- Accessible, design-system-compliant UI components
- Consistent Cloudflare branding and styling
- Built-in keyboard navigation and ARIA attributes

## Tech Stack

- **React 19** with TypeScript
- **Vite 8** for fast development
- **Kumo** - Cloudflare's component library
- **Framer Motion** - Smooth animations
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # React components (future expansion)
├── data/               # Mock data and configurations
│   └── mockData.ts     # Pool, endpoint, and monitor group data
├── hooks/              # Custom React hooks (future expansion)
├── types/              # TypeScript type definitions
│   └── index.ts        # Core types for pools, monitors, endpoints
├── utils/              # Utility functions
│   └── healthCalculations.ts  # Monitor group health logic
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles with Tailwind
```

## Usage

### Interactive Features

1. **View Global Traffic Flow**
   - See animated traffic flowing from users through the edge to different pools
   - Monitor probes are shown as smaller animated dots

2. **Explore Pools**
   - Click any pool card to drill down into its endpoints
   - Europe Pool uses Monitor Groups with quorum logic

3. **Simulate Failures**
   - In pool detail view, click individual monitors to toggle their status
   - Watch how the endpoint health changes based on monitor group rules
   - Critical monitors (API Gateway) immediately fail the endpoint
   - Non-critical monitors require >50% failure for quorum

4. **Toggle Monitor Visibility**
   - Click the Layers icon in the header to show/hide monitor probes

5. **View API Configuration**
   - Click the Code icon to see the equivalent Cloudflare API configuration
   - Configuration updates in real-time as you modify the visualization

6. **Switch Steering Methods**
   - Toggle between Geographic and Dynamic steering
   - See how different methods affect traffic distribution

## Monitor Group Example

The Europe Pool demonstrates monitor groups with:
- **API Gateway** (Critical - `must_be_healthy: true`)
- **Database Connection** (Standard - participates in quorum)
- **S3 Storage** (Standard - participates in quorum)

Try failing the API Gateway monitor to see the critical override in action!

## Future Enhancements

- Pool weight sliders for weighted load balancing
- Geographic map for geo-steering visualization
- Preset scenarios and challenge mode
- Export/import configuration as JSON
- Historical health data charts
- Session affinity visualization

## Learn More

- [Cloudflare Load Balancing Docs](https://developers.cloudflare.com/load-balancing/)
- [Monitor Groups Documentation](https://developers.cloudflare.com/load-balancing/monitors/monitor-groups/)
- [Kumo Component Library](https://github.com/cloudflare/kumo)

## License

MIT
