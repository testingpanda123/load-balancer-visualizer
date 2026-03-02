# Color Reference - Gemini Style with Kumo

Quick reference for maintaining consistent colors throughout the app.

---

## 🎨 Core Color Palette

### Backgrounds
```css
bg-slate-950          /* Main app background - very dark */
bg-slate-900          /* Card backgrounds, sidebar */
bg-slate-900/50       /* Semi-transparent surfaces */
bg-slate-800/80       /* Header with transparency */
bg-slate-800/40       /* Monitor state buttons */
bg-slate-800/30       /* Sidebar cards */
```

### Borders
```css
border-slate-700      /* Primary borders (header, toolbar) */
border-slate-800      /* Secondary borders (cards, footer) */
border-slate-800/50   /* Subtle separators */
```

### Text
```css
text-slate-100        /* Primary text */
text-slate-300        /* Secondary text */
text-slate-400        /* Tertiary text, labels */
text-slate-500        /* Muted text, uppercase labels */
```

---

## ���� Brand Orange (Cloudflare)

```css
/* Backgrounds */
bg-orange-600         /* Primary brand (logo, edge node) */
bg-orange-500         /* Active states, buttons */
bg-orange-500/10      /* Selected pool highlight */

/* Borders */
border-orange-500/50  /* Selected pool border */
border-orange-400/20  /* Edge node border accent */

/* Shadows */
shadow-orange-500/20  /* Logo glow */
```

---

## 🚦 Health Status Colors

### Healthy (Green)
```css
bg-green-500          /* Endpoint bars */
bg-green-500/10       /* Status badge background */
bg-green-500/20       /* Card border */
text-green-400        /* Status text */
shadow-[0_0_10px_#4ade80]  /* Packet glow */
shadow-green-500/5    /* Card subtle glow */
```

### Degraded (Yellow)
```css
bg-yellow-500         /* Endpoint bars, packets */
bg-yellow-500/10      /* Status backgrounds */
border-yellow-500/20  /* Card borders */
text-yellow-400       /* Warnings */
```

### Critical (Red)
```css
bg-red-500            /* Endpoint bars, icons */
bg-red-500/10         /* Failed monitor background */
bg-red-900/50         /* Critical card border */
border-red-500/30     /* Failed monitor border */
border-red-900        /* Critical pool border */
text-red-400          /* Error text */
```

---

## 🔵 Accent Colors

### Cyan (Monitor Groups)
```css
bg-cyan-500/20        /* Monitor group badge bg */
bg-cyan-500/10        /* Monitor button active */
border-cyan-500/50    /* Monitor button border */
border-cyan-500/30    /* Monitor group indicators */
text-cyan-400         /* Monitor group icons/text */
shadow-[0_0_8px_#22d3ee]  /* Monitor probe glow */
```

### Blue (Traffic)
```css
bg-blue-500/10        /* User ingress circle bg */
bg-blue-400           /* Traffic packets */
border-blue-400/20    /* Ingress circle border */
text-blue-400         /* Dynamic routing indicator */
shadow-[0_0_8px_#3b82f6]  /* Traffic packet glow */
```

### Pink (Standard Probes)
```css
bg-pink-400           /* Standard probe dots */
text-pink-400         /* Standard probe label */
shadow-[0_0_8px_#f472b6]  /* Probe glow */
```

---

## 🌈 Special Effects

### Shadows
```css
shadow-sm             /* Subtle card depth */
shadow-lg             /* Card elevation */
shadow-2xl            /* Modal/dialog depth */
shadow-[0_0_10px_COLOR]  /* Custom glow effects */
```

### Blur Effects
```css
backdrop-blur-md      /* Header glassmorphism */
backdrop-blur-xl      /* Modal overlay */
```

### Opacity Modifiers
```css
/10   /* 10% opacity - very subtle highlights */
/20   /* 20% opacity - borders, accents */
/30   /* 30% opacity - hover states */
/40   /* 40% opacity - active backgrounds */
/50   /* 50% opacity - semi-transparent surfaces */
/80   /* 80% opacity - near-opaque overlays */
```

---

## 📋 Common Patterns

### Pool Card (Healthy)
```tsx
className="bg-slate-900 border-green-500/20 shadow-lg shadow-green-500/5"
```

### Pool Card (Degraded)
```tsx
className="border-yellow-500/20"
```

### Pool Card (Critical)
```tsx
className="bg-slate-950 border-red-900 opacity-60"
```

### Selected Pool
```tsx
className="bg-orange-500/10 border-orange-500/50"
```

### Monitor Button (Healthy)
```tsx
className="bg-slate-800/40 border-slate-700 hover:border-cyan-500/30"
```

### Monitor Button (Failed)
```tsx
className="bg-red-500/10 border-red-500/30"
```

### Status Badge
```tsx
{/* Healthy */}
<div className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-bold">

{/* Critical */}
<div className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">
```

---

## 🎯 Key Principles

1. **Use slate-950/900 for backgrounds** - Creates dark, focused aesthetic
2. **Orange for all branding** - Not blue (that's for traffic/accents)
3. **Green/Yellow/Red exact shades** - Health indicators need consistency
4. **Opacity for depth** - /10, /20, /50 create layering
5. **Cyan for monitor groups** - Distinguishes from standard monitors (pink)
6. **Shadows add polish** - Use glows on animated elements
7. **Border opacity** - /20 for subtle, /50 for prominent

---

## 🚫 Colors to Avoid

- ❌ `kumo-brand` - Use `orange-500/600` instead
- ❌ `kumo-base` - Use `slate-950` instead
- ❌ `kumo-surface` - Use `slate-900` instead
- ❌ Kumo semantic tokens for health - Use direct green/yellow/red
- ❌ Pure white backgrounds - App is dark-only

---

## ✅ When to Use Kumo Tokens

You can still use these Kumo utilities:
- Typography utilities (font-sans, etc.)
- Spacing utilities (p-4, gap-3, etc.)
- Border radius (rounded-xl, rounded-3xl, etc.)
- Transitions (transition-all, duration-300, etc.)

Just override the colors with slate/orange palette!
