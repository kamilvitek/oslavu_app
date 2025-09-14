# Oslavu Design System Guide

## Overview

The Oslavu design system has been enhanced to provide a modern, tech-friendly, and data-focused visual experience. This guide outlines the components, styling patterns, and best practices for maintaining consistency across the application.

## Design Philosophy

### Tech-Friendly & Data-Driven
- **Intelligent**: Adaptive visuals with data-driven interfaces
- **Clarity**: Utility-focused design with clear hierarchy
- **Modern**: Slightly futuristic edges where appropriate
- **Accessible**: WCAG AA compliant with semantic HTML

## Color System

### Primary Colors
```css
--primary: 222 84% 53%;        /* Modern blue for primary actions */
--chart-primary: 222 84% 53%;   /* Data visualization primary */
--chart-secondary: 262 83% 58%; /* Purple accent for secondary data */
```

### Data Visualization Palette
```css
--chart-success: 142 76% 36%;   /* Green for positive metrics */
--chart-warning: 38 92% 50%;    /* Amber for warnings */
--chart-error: 0 84% 60%;       /* Red for errors */
--chart-info: 199 89% 48%;      /* Blue for informational */
--chart-neutral: 240 3.8% 46.1%; /* Gray for neutral states */
```

### Interactive States
```css
--interactive-hover: 222 84% 48%;   /* Hover state */
--interactive-active: 222 84% 43%;  /* Active state */
--interactive-focus: 222 84% 53%;   /* Focus state */
```

## Typography

### Font Stack
- **Primary**: Inter (variable font)
- **Fallback**: system-ui, -apple-system, sans-serif

### Hierarchy
```css
.text-4xl md:text-6xl lg:text-7xl  /* Hero headings */
.text-3xl md:text-4xl              /* Section headings */
.text-2xl                          /* Subsection headings */
.text-lg md:text-xl                /* Large body text */
.text-base                         /* Regular body text */
.text-sm                           /* Small text */
.text-xs                           /* Caption text */
```

## Component Library

### 1. MetricCard
Displays key performance indicators with optional trend information.

```tsx
<MetricCard
  title="Conflict Score"
  value={23}
  change={-8.2}
  changeLabel="vs last month"
  icon={AlertTriangle}
  colorScheme="warning"
  trend="down"
  description="Current risk level"
/>
```

**Props:**
- `title`: Display name for the metric
- `value`: Number or string value
- `change`: Percentage change (optional)
- `icon`: Lucide icon component
- `colorScheme`: 'success' | 'warning' | 'error' | 'info' | 'neutral'
- `trend`: 'up' | 'down' | 'neutral'

### 2. StatusBadge
Indicates status with color-coded badges and optional icons.

```tsx
<StatusBadge
  status="success"
  label="Analysis Complete"
  variant="subtle"
  size="md"
  showIcon={true}
/>
```

**Variants:**
- `default`: Solid background
- `outline`: Border with transparent background
- `subtle`: Light background with border

### 3. ProgressIndicator
Shows multi-step process progress with status indicators.

```tsx
<ProgressIndicator
  steps={analysisSteps}
  currentStep="analyzing-conflicts"
  variant="horizontal"
  showLabels={true}
/>
```

**Step Status:**
- `pending`: Not started
- `in-progress`: Currently active
- `completed`: Finished successfully
- `error`: Failed with error

### 4. ConflictHeatmap
Visual calendar showing conflict intensity across dates.

```tsx
<ConflictHeatmap
  data={conflictData}
  title="March 2024 Conflict Analysis"
  onDateClick={(date) => handleDateSelection(date)}
  showLegend={true}
/>
```

### 5. AnalyticsChart
Flexible chart component supporting bar, line, and area charts.

```tsx
<AnalyticsChart
  data={chartData}
  title="Monthly Conflict Trends"
  type="bar"
  showTrend={true}
  formatValue={(value) => `${value}%`}
/>
```

## Utility Classes

### Layout & Spacing
```css
.container                  /* Max-width container with padding */
.glass-effect              /* Backdrop blur with transparency */
.interactive-element       /* Hover and focus states */
.data-visualization-container /* Standard chart container */
```

### Metric Cards
```css
.metric-card               /* Base metric card styling */
.metric-card--success      /* Success-themed card */
.metric-card--warning      /* Warning-themed card */
.metric-card--error        /* Error-themed card */
.metric-card--info         /* Info-themed card */
```

### Animations
```css
.animate-fade-in-up        /* Fade in with upward motion */
.animate-scale-in          /* Scale in animation */
.loading-shimmer           /* Shimmer effect for loading */
.skeleton                  /* Skeleton loading placeholder */
```

## Responsive Design

### Breakpoints
```css
sm: 640px    /* Small devices */
md: 768px    /* Medium devices */
lg: 1024px   /* Large devices */
xl: 1280px   /* Extra large devices */
2xl: 1536px  /* 2X large devices */
```

### Grid Patterns
```tsx
/* Mobile-first responsive grid */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Content */}
</div>

/* Dashboard layout */
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  {/* Form */}
  <div>{/* Left column */}</div>
  {/* Results */}
  <div>{/* Right column */}</div>
</div>
```

## Accessibility Guidelines

### Semantic HTML
- Use proper heading hierarchy (h1 → h2 → h3)
- Include ARIA labels for interactive elements
- Provide alt text for images and icons

### Color Contrast
- All text meets WCAG AA standards (4.5:1 ratio)
- Interactive elements have sufficient contrast
- Color is not the only way to convey information

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible
- Logical tab order throughout the interface

### Screen Reader Support
```tsx
<div role="status" aria-live="polite">
  Analysis in progress...
</div>

<button aria-label="Refresh analysis results">
  <RefreshIcon />
</button>
```

## Performance Optimization

### Code Splitting
```tsx
// Lazy load heavy components
const ConflictAnalyzer = lazy(() => import('./ConflictAnalyzer'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
```

### Memoization
```tsx
// Memoize expensive calculations
const conflictAnalysis = useMemo(() => 
  calculateConflicts(events, selectedDate), 
  [events, selectedDate]
);
```

### Image Optimization
```tsx
// Use Next.js Image component
<Image
  src="/hero-bg.jpg"
  alt="Event planning visualization"
  width={1200}
  height={600}
  priority
/>
```

## Animation Guidelines

### Timing
- **Fast**: 200ms for micro-interactions
- **Medium**: 300-500ms for component transitions
- **Slow**: 600ms+ for page transitions

### Easing
- `ease-out`: For entrances and reveals
- `ease-in-out`: For transitions between states
- `ease-in`: For exits and dismissals

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up {
    animation: none;
  }
}
```

## Dark Mode Support

### CSS Variables
All colors use CSS custom properties that automatically adapt:

```css
/* Light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
}

/* Dark mode */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
}
```

### Component Implementation
```tsx
// Components automatically adapt to theme
<div className="bg-background text-foreground">
  <Card className="bg-card border-border">
    Content adapts to theme
  </Card>
</div>
```

## Best Practices

### Component Naming
- Use descriptive, semantic names
- Follow PascalCase for components
- Use kebab-case for CSS classes

### State Management
- Keep loading states consistent
- Provide clear error messages
- Show progress for long operations

### Data Visualization
- Use consistent color mapping
- Provide tooltips for data points
- Include legends and axis labels
- Make charts keyboard accessible

### Testing
- Test all interactive states
- Verify keyboard navigation
- Check color contrast ratios
- Validate responsive behavior

## Migration Guide

### From Old Design System
1. Replace hardcoded colors with CSS variables
2. Update component imports to use new components
3. Add animation classes where appropriate
4. Test responsive behavior on all screen sizes

### Component Updates
```tsx
// Old
<div className="bg-blue-500 text-white p-4 rounded">
  Metric: {value}
</div>

// New
<MetricCard
  title="Metric Name"
  value={value}
  icon={BarChart3}
  colorScheme="info"
/>
```

## Future Enhancements

### Planned Features
- [ ] Theme customization system
- [ ] Advanced chart types (scatter, radar)
- [ ] Component composition patterns
- [ ] Automated accessibility testing
- [ ] Design token export for Figma

### Performance Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

---

This design system provides a solid foundation for building consistent, accessible, and performant user interfaces in the Oslavu application. Regular updates and community feedback help ensure it continues to meet evolving needs.
