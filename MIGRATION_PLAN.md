# Visual Styling Migration Plan
## Gemini → Kumo Design System

This document outlines how to restore the original Gemini visual aesthetic while using proper Kumo components and tokens.

---

## 🎯 Migration Goals

1. **Restore Gemini's darker, moodier aesthetic** (slate-900/950 backgrounds)
2. **Keep orange branding** instead of Kumo's default blue
3. **Use Kumo components** (Switch, proper Button variants, semantic Badge colors)
4. **Map to Kumo semantic tokens** for maintainability
5. **Add back visual depth** (shadows, glows, backdrop blur)

---

## 🎨 Color Token Mapping

### Background Colors
| Gemini Original | Current | Kumo Solution |
|----------------|---------|---------------|
| `bg-slate-900` | `bg-kumo-base` | Override: `bg-[rgb(15_23_42)]` or custom CSS var |
| `bg-slate-950` | `bg-kumo-base` | Override: `bg-[rgb(2_6_23)]` |
| `bg-slate-800/80` | `bg-kumo-surface` | Use `bg-kumo-surface` with `backdrop-blur-md` |
| `bg-slate-800/30` | `bg-kumo-control` | Keep `bg-kumo-control` |

### Border Colors
| Gemini Original | Current | Kumo Solution |
|----------------|---------|---------------|
| `border-slate-700` | `border-kumo-line` | Override: `border-[rgb(51_65_85)]` or adjust `kumo-line` |
| `border-slate-800` | `border-kumo-line` | Override: `border-[rgb(30_41_59)]` |

### Text Colors
| Gemini Original | Current | Kumo Solution |
|----------------|---------|---------------|
| `text-slate-100` | `text-kumo-default` | Keep `text-kumo-default` |
| `text-slate-400` | `text-kumo-subtle` | Keep `text-kumo-subtle` |
| `text-slate-500` | `text-kumo-subtle` | Keep `text-kumo-subtle` |

### Brand Colors (Orange vs Blue)
| Gemini Original | Current | Fix |
|----------------|---------|-----|
| `bg-orange-600` | `bg-kumo-brand` | Override: `bg-orange-600` |
| `bg-orange-500` | `bg-kumo-brand` | Override: `bg-orange-500` |
| `text-orange-400` | - | Add: `text-orange-400` |
| `border-orange-500` | `border-kumo-brand` | Override: `border-orange-500` |

### Status/Health Colors
| Purpose | Gemini | Current | Kumo Semantic Token |
|---------|--------|---------|---------------------|
| Healthy | `bg-green-500` | Hardcoded | `bg-kumo-success` or keep green-500 |
| Degraded | `bg-yellow-500` | Hardcoded | `bg-kumo-warning` or keep yellow-500 |
| Critical | `bg-red-500` | Hardcoded | `bg-kumo-danger` or keep red-500 |

**Recommendation**: Keep hardcoded for now since Kumo's semantic colors may not match exact shades.

---

## 🧩 Component Replacements

### 1. Custom Toggle → Kumo Switch
**Before (Custom):**
```tsx
<button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${...}`}>
  <div className={`w-8 h-5 rounded-full p-0.5 ${...}`}>
    <div className={`w-4 h-4 rounded-full bg-white ${...}`} />
  </div>
  <span>Monitor probes</span>
</button>
```

**After (Kumo Switch):**
```tsx
import { Switch } from '@cloudflare/kumo';

<Switch
  checked={showMonitors}
  onCheckedChange={setShowMonitors}
  label="Monitor probes"
/>
```

### 2. Raw Buttons → Kumo Button
**Before:**
```tsx
<button onClick={...} className="p-3 rounded-xl border...">
  {pool.name}
</button>
```

**After:**
```tsx
<Button
  variant="secondary"
  onClick={...}
  className="w-full justify-between"
>
  {pool.name}
</Button>
```

### 3. Status Badges
**Use Kumo Badge with custom classes:**
```tsx
<Badge variant="success">HEALTHY</Badge>
<Badge variant="warning">DEGRADED</Badge>
<Badge variant="destructive">CRITICAL</Badge>
```

---

## 🌈 Visual Effects to Restore

### Shadows & Glows
```css
/* Gemini had these effects */
shadow-2xl
shadow-lg shadow-orange-500/20
shadow-[0_0_8px_#3b82f6]
shadow-[0_0_10px_#4ade80]
```

**Action**: Add these back to:
- Brand logo container
- Pool cards
- Animated traffic particles
- Active navigation states

### Backdrop Blur
```tsx
/* Gemini header had this */
<header className="bg-slate-800/80 backdrop-blur-md">
```

**Action**: Add `backdrop-blur-md` or `backdrop-blur-xl` to:
- Header
- Modal overlays
- Pool detail view

### Border Treatments
Gemini used more subtle borders with opacity:
```tsx
border-slate-700/50
border-orange-500/50
border-green-500/20
```

**Action**: Restore opacity variations for depth.

---

## 🎬 Animation Adjustments

### Gemini Animation Timings
```css
@keyframes flowHorizontal {
  0% { left: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}

animation: flowHorizontal 3s infinite linear;
```

### Current Animation
Uses Framer Motion `animate` prop - keep this but match timing:
```tsx
transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
```

**Action**: Verify animation speeds match (3s for traffic, 1.5s for monitors).

---

## ���� Implementation Steps

### Phase 1: Color Overrides (High Priority)
1. ✅ Keep Kumo tokens where they work (`text-kumo-default`, `bg-kumo-control`)
2. ✅ Override backgrounds to darker slate shades
3. ✅ Replace `kumo-brand` blue with orange-600/500
4. ✅ Add border opacity variations

### Phase 2: Component Migration (Medium Priority)
1. ✅ Replace custom toggle with Kumo `Switch`
2. ✅ Convert raw `<button>` to Kumo `Button`
3. ✅ Use semantic Badge variants

### Phase 3: Visual Effects (Medium Priority)
1. ✅ Restore shadow-2xl and custom glows
2. ✅ Add backdrop-blur to header
3. ✅ Restore border opacity treatments

### Phase 4: Testing (High Priority)
1. ✅ Test dark mode (Gemini was dark-only)
2. ✅ Verify animations match timing
3. ✅ Check contrast ratios for accessibility
4. ✅ Test on different screen sizes

---

## ���� Trade-offs & Decisions

### Decision 1: Custom Colors vs Kumo Tokens
**Issue**: Gemini uses slate-900/950, Kumo uses lighter grays  
**Decision**: Override with custom colors where needed, keep tokens for text/controls  
**Rationale**: Preserves Gemini's dark aesthetic while maintaining Kumo structure

### Decision 2: Orange vs Blue Brand
**Issue**: Kumo defaults to blue (`kumo-brand`), Gemini uses orange  
**Decision**: Override all `kumo-brand` with `orange-600`  
**Rationale**: Orange is distinctive and matches original design

### Decision 3: Health Status Colors
**Issue**: Should we use Kumo semantic tokens or keep hardcoded?  
**Decision**: Keep hardcoded `green-500`, `yellow-500`, `red-500`  
**Rationale**: Kumo semantics may not match exact shades; health colors are critical

---

## 📦 Files to Modify

1. **src/App.tsx** - Main component styling
2. **src/index.css** - Add custom CSS overrides if needed
3. **src/App.css** - Clean up unused Vite template code
4. **tailwind.config.js** - Extend theme if needed

---

## ✅ Success Criteria

- [ ] Background matches Gemini's dark slate aesthetic
- [ ] Orange branding throughout (not blue)
- [ ] Custom toggle replaced with Kumo Switch
- [ ] All buttons use Kumo Button component
- [ ] Shadows and glows restored
- [ ] Backdrop blur on header
- [ ] Animations match original timing
- [ ] Dark mode works correctly
- [ ] No accessibility regressions
