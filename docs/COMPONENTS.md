# Components Documentation

Complete documentation of all React components in the Oslavu application.

## Component Structure

Components are organized into the following directories:
- `components/ui/` - Reusable UI primitives (shadcn/ui based)
- `components/forms/` - Form components
- `components/sections/` - Page sections
- `components/layout/` - Layout components
- `components/analytics/` - Analytics integration components
- `components/data-visualization/` - Charts and visualizations
- `components/feedback/` - User feedback components
- `components/providers/` - Context providers

## UI Components (`components/ui/`)

### Badge (`badge.tsx`)

Reusable badge component for displaying labels and status indicators.

**Props:**
- `variant`: `"default" | "secondary" | "destructive" | "outline"`
- `className`: Additional CSS classes

**Usage:**
```tsx
<Badge variant="default">New</Badge>
```

### Button (`button.tsx`)

Button component with multiple variants and sizes.

**Props:**
- `variant`: `"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"`
- `size`: `"default" | "sm" | "lg" | "icon"`
- `disabled`: boolean
- `onClick`: Event handler
- `className`: Additional CSS classes

**Usage:**
```tsx
<Button variant="default" size="lg" onClick={handleClick}>
  Submit
</Button>
```

### Card (`card.tsx`)

Card container component with header, content, and footer sections.

**Sub-components:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Input (`input.tsx`)

Text input component.

**Props:**
- `type`: Input type (default: "text")
- `placeholder`: Placeholder text
- `value`: Input value
- `onChange`: Change handler
- `disabled`: boolean
- `className`: Additional CSS classes

**Usage:**
```tsx
<Input
  type="text"
  placeholder="Enter city"
  value={city}
  onChange={(e) => setCity(e.target.value)}
/>
```

### Label (`label.tsx`)

Label component for form inputs.

**Props:**
- `htmlFor`: Associated input ID
- `className`: Additional CSS classes

**Usage:**
```tsx
<Label htmlFor="city">City</Label>
<Input id="city" />
```

### Select (`select.tsx`)

Select dropdown component.

**Props:**
- `value`: Selected value
- `onValueChange`: Change handler
- `disabled`: boolean
- `placeholder`: Placeholder text

**Usage:**
```tsx
<Select value={category} onValueChange={setCategory}>
  <SelectTrigger>
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="technology">Technology</SelectItem>
  </SelectContent>
</Select>
```

### Toast (`toast.tsx`, `toaster.tsx`, `use-toast.ts`)

Toast notification system.

**Hook:**
```tsx
const { toast } = useToast();

toast({
  title: "Success",
  description: "Analysis completed",
  variant: "default"
});
```

**Variants:**
- `default` - Standard notification
- `destructive` - Error notification
- `success` - Success notification

### StatusBadge (`status-badge.tsx`)

Status badge component with predefined variants.

**Exports:**
- `StatusBadge` - Main component
- `SuccessBadge` - Success status
- `WarningBadge` - Warning status
- `ErrorBadge` - Error status
- `InfoBadge` - Info status

**Usage:**
```tsx
<SuccessBadge>Active</SuccessBadge>
<ErrorBadge>Failed</ErrorBadge>
```

### MetricCard (`metric-card.tsx`)

Card component for displaying metrics and statistics.

**Props:**
- `title`: Metric title
- `value`: Metric value
- `description`: Optional description
- `icon`: Optional icon component
- `trend`: Optional trend indicator

**Usage:**
```tsx
<MetricCard
  title="Total Events"
  value="1,000"
  description="From all sources"
  icon={<Calendar />}
/>
```

### ProgressIndicator (`progress-indicator.tsx`)

Progress indicator component for multi-step processes.

**Props:**
- `steps`: Array of progress steps
- `currentStep`: Current step ID

**Step Interface:**
```typescript
interface ProgressStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}
```

**Usage:**
```tsx
<ProgressIndicator
  steps={analysisSteps}
  currentStep={currentStepId}
/>
```

### VenueInput (`venue-input.tsx`)

Specialized input component for venue selection with validation.

**Props:**
- `value`: Venue value
- `onChange`: Change handler
- `city`: City for venue validation
- `onValidationChange`: Validation result callback

**Usage:**
```tsx
<VenueInput
  value={venue}
  onChange={setVenue}
  city={city}
  onValidationChange={handleValidation}
/>
```

## Form Components (`components/forms/`)

### ConflictAnalysisForm (`conflict-analysis-form.tsx`)

Main form component for conflict analysis input.

**Features:**
- City selection with autocomplete
- Category and subcategory selection
- Date range picker
- Expected attendees input
- Advanced options toggle
- Form validation

**Props:**
- `onSubmit`: Submit handler
- `initialValues`: Optional initial form values
- `loading`: Loading state

**Form Fields:**
- `city`: City name (required)
- `category`: Event category (required)
- `subcategory`: Event subcategory (required)
- `expectedAttendees`: Number of expected attendees (required)
- `dateRange`: Date range object with start and end dates (required)
- `preferredDates`: Array of preferred dates (optional)
- `enableAdvancedAnalysis`: Enable advanced analysis features (optional)
- `enablePerplexityResearch`: Enable Perplexity research (optional)
- `enableLLMRelevanceFilter`: Enable LLM relevance filtering (optional)

**Usage:**
```tsx
<ConflictAnalysisForm
  onSubmit={handleAnalysis}
  loading={isLoading}
/>
```

## Section Components (`components/sections/`)

### Hero (`hero.tsx`)

Hero section component for the landing page.

**Features:**
- Main headline and description
- Call-to-action buttons
- Key metrics display
- Responsive design

**Usage:**
```tsx
<Hero />
```

### ConflictAnalyzer (`conflict-analyzer.tsx`)

Main conflict analysis interface component.

**Features:**
- Analysis form integration
- Real-time progress tracking
- Results visualization
- Risk assessment display
- Event conflict details
- Interactive date recommendations

**State Management:**
- `analysisResult`: Analysis results state
- `loading`: Loading state
- `error`: Error state
- `currentAnalysisStep`: Current progress step

**Usage:**
```tsx
<ConflictAnalyzer />
```

### Features (`features.tsx`)

Features section component showcasing platform capabilities.

**Features:**
- Feature cards with icons
- Data sources list
- Responsive grid layout

**Usage:**
```tsx
<Features />
```

### FAQ (`faq.tsx`)

Frequently Asked Questions section.

**Features:**
- Accordion-style questions
- Expandable answers
- Responsive design

**Usage:**
```tsx
<FAQ />
```

### Pricing (`pricing.tsx`)

Pricing section component (if applicable).

**Usage:**
```tsx
<Pricing />
```

## Layout Components (`components/layout/`)

### Header (`header.tsx`)

Main navigation header component.

**Features:**
- Logo/branding
- Navigation links
- Responsive menu
- Mobile-friendly design

**Usage:**
```tsx
<Header />
```

### Footer (`footer.tsx`)

Footer component with links and information.

**Features:**
- Footer links
- Copyright information
- Social media links (if applicable)

**Usage:**
```tsx
<Footer />
```

## Analytics Components (`components/analytics/`)

### GTM (`GTM.tsx`)

Google Tag Manager integration component.

**Props:**
- `gtmId`: GTM container ID

**Exports:**
- `GTMHead` - Head script component
- `GTMNoscript` - Noscript fallback component

**Usage:**
```tsx
<GTMHead gtmId="GTM-XXXXXXX" />
<GTMNoscript gtmId="GTM-XXXXXXX" />
```

### GoogleTag (`GoogleTag.tsx`)

Direct Google Analytics (gtag.js) integration component.

**Props:**
- `measurementId`: GA4 measurement ID

**Usage:**
```tsx
<GoogleTag measurementId="G-XXXXXXXXXX" />
```

### CookieConsent (`CookieConsent.tsx`)

Cookie consent banner component.

**Features:**
- GDPR-compliant cookie consent
- Accept/reject functionality
- Persistent storage of consent

**Usage:**
```tsx
<CookieConsentBanner />
```

## Data Visualization Components (`components/data-visualization/`)

### ConflictHeatmap (`conflict-heatmap.tsx`)

Heatmap visualization for conflict scores across dates.

**Props:**
- `data`: Array of date conflict data
- `dateRange`: Date range object
- `onDateSelect`: Date selection handler

**Usage:**
```tsx
<ConflictHeatmap
  data={conflictData}
  dateRange={dateRange}
  onDateSelect={handleDateSelect}
/>
```

### AnalyticsChart (`analytics-chart.tsx`)

Chart component for analytics visualization.

**Props:**
- `data`: Chart data
- `type`: Chart type
- `options`: Chart options

**Usage:**
```tsx
<AnalyticsChart
  data={chartData}
  type="line"
  options={chartOptions}
/>
```

### DataSourcesList (`data-sources-list.tsx`)

Component displaying list of data sources.

**Features:**
- Source status indicators
- Event counts per source
- Last sync timestamps

**Usage:**
```tsx
<DataSourcesList />
```

## Feedback Components (`components/feedback/`)

### AttendeeFeedbackForm (`attendee-feedback-form.tsx`)

Form component for collecting attendee feedback on events.

**Features:**
- Event selection
- Attendee count input
- Feedback submission
- Validation

**Props:**
- `eventId`: Event ID (optional)
- `onSubmit`: Submit handler

**Usage:**
```tsx
<AttendeeFeedbackForm
  eventId={event.id}
  onSubmit={handleFeedback}
/>
```

## Provider Components (`components/providers/`)

### QueryProvider (`query-provider.tsx`)

React Query provider wrapper for server state management.

**Features:**
- React Query client setup
- Query configuration
- Error handling

**Usage:**
```tsx
<QueryProvider>
  {children}
</QueryProvider>
```

## Component Patterns

### Styling

All components use Tailwind CSS for styling with the `cn()` utility for conditional classes:

```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-classes", condition && "conditional-classes")} />
```

### TypeScript

All components are fully typed with TypeScript interfaces for props:

```tsx
interface ComponentProps {
  title: string;
  optional?: boolean;
}

export function Component({ title, optional = false }: ComponentProps) {
  // Component implementation
}
```

### Accessibility

Components follow accessibility best practices:
- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader compatibility

### Responsive Design

All components are mobile-responsive using Tailwind's responsive utilities:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

## Component Dependencies

### External Libraries
- `@radix-ui/*` - UI primitives (dialog, dropdown, select, etc.)
- `lucide-react` - Icon library
- `react-hook-form` - Form management
- `zod` - Schema validation
- `@tanstack/react-query` - Server state management
- `date-fns` - Date utilities

### Internal Dependencies
- `@/lib/utils` - Utility functions (cn, etc.)
- `@/lib/services/*` - Business logic services
- `@/types` - TypeScript type definitions

## Best Practices

1. **Component Composition**: Prefer composition over inheritance
2. **Props Interface**: Always define TypeScript interfaces for props
3. **Default Props**: Use default parameters for optional props
4. **Error Handling**: Handle errors gracefully with user-friendly messages
5. **Loading States**: Always show loading indicators for async operations
6. **Accessibility**: Ensure components are accessible to all users
7. **Performance**: Use React.memo for expensive components when appropriate
8. **Testing**: Write tests for complex component logic

