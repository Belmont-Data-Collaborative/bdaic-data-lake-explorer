# Frontend Module Documentation

## Overview

The Data Lake Explorer frontend is built with React 18, Vite, TanStack Query, and Tailwind CSS. It provides a sophisticated data exploration interface with advanced features including AI-powered dataset analysis, animated statistics, role-based access control, and comprehensive accessibility support.

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with plugins for development and error handling
- **State Management**: TanStack Query v5 for server state
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: JWT-based with localStorage persistence
- **Icons**: Lucide React for consistent iconography

---

## Application Structure

### Entry Point (`main.tsx`)
```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

The main entry point is minimal, focusing on rendering the root App component with global styles.

### Application Root (`App.tsx`)

The App component provides the foundational structure:

```typescript
function App() {
  return (
    <ErrorBoundaryWrapper level="page" componentName="DataLakeExplorerApp">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundaryWrapper>
  );
}
```

#### Key Features:
- **Error Boundary**: Top-level error handling for the entire application
- **Query Client Provider**: TanStack Query configuration for server state management
- **Tooltip Provider**: Global tooltip functionality via Radix UI
- **Toast System**: Global notification system via shadcn/ui

### Router Component

The Router handles authentication state, JWT verification, and route management:

#### Authentication Flow:
1. **JWT Verification**: Automatic token validation on app startup
2. **State Management**: Dual authentication support (JWT + legacy)
3. **Route Protection**: Role-based access control for admin routes
4. **Clean State**: Comprehensive cleanup on logout

#### Route Structure:
```typescript
<Switch>
  <Route path="/" component={() => <UserPanel currentUser={currentUser} />} />
  <Route path="/datasets" component={() => <Home />} />
  <Route path="/user-panel" component={() => <UserPanel currentUser={currentUser} />} />
  <Route path="/aws-config" component={() => {
    // Role-based access control for AWS configuration
    if (currentUser?.role !== 'admin') {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to access AWS configuration.</p>
          </div>
        </div>
      );
    }
    return <AwsConfiguration />;
  }} />
  <Route path="/admin" component={() => {
    // Role-based access control for admin dashboard
    if (currentUser?.role !== 'admin') {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      );
    }
    return <AdminDashboard currentUser={currentUser} />;
  }} />
  <Route path="/admin/users" component={() => {
    // Role-based access control for user management
    if (currentUser?.role !== 'admin') {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      );
    }
    return <AdminUsers currentUser={currentUser} />;
  }} />
  <Route path="/admin/folders" component={() => {
    // Role-based access control for folder management
    if (currentUser?.role !== 'admin') {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      );
    }
    return <AdminFolders currentUser={currentUser} />;
  }} />
  <Route path="/admin-legacy" component={() => {
    // Keep legacy admin panel for backwards compatibility
    if (currentUser?.role !== 'admin') {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      );
    }
    return <AdminPanel currentUser={currentUser} />;
  }} />
  <Route component={NotFound} />
</Switch>
```

---

## Page Components

### Core Pages

#### 1. **Home/Dataset Explorer** (`pages/home.tsx`)
The primary data exploration interface featuring:

- **Dataset Browsing**: Folder-based navigation with search and filtering
- **Statistics Dashboard**: Animated statistics cards with real-time data
- **AI Integration**: Multi-dataset chat capabilities for power users
- **Performance Optimization**: Cached queries and lazy loading

**Key Features:**
- Folder-based dataset organization
- Advanced search with semantic filtering
- Real-time statistics with animation
- AI-powered dataset interaction (role-dependent)

#### 2. **User Panel** (`pages/user-panel.tsx`)
Comprehensive user dashboard providing:

- **Account Details**: User information and role display
- **Access Summary**: Folder permissions and capability overview
- **Activity Tracking**: Download history and frequently visited datasets
- **Quick Actions**: Navigation shortcuts to key features

**Information Architecture:**
```typescript
// User Information Cards
- Account Details (username, email, role, user ID)
- Access Summary (permissions, folder count, AI status)  
- Activity Overview (downloads, visits, recent activity)

// Tabbed Content
- My Folders: Detailed folder access permissions
- Frequently Visited: Dataset usage patterns
- Download History: Complete download audit trail
```

#### 3. **Admin Dashboard** (`pages/admin/dashboard.tsx`)
Administrative control center featuring:

- **System Overview**: User statistics and system health
- **Quick Actions**: Direct navigation to user and folder management
- **Resource Management**: System statistics and monitoring

#### 4. **Landing Page** (`pages/landing.tsx`)
Authentication gateway with:
- Login/Register forms with validation
- JWT token handling
- Error messaging and user feedback

### Admin Pages

#### **User Management** (`pages/admin/users.tsx`)
- User listing with role management
- Account activation/deactivation
- Bulk operations support

#### **Folder Management** (`pages/admin/folders.tsx`)
- Folder access control configuration
- User permission assignment
- Bulk permission management

#### **AWS Configuration** (`pages/aws-configuration.tsx`)
- S3 bucket configuration
- Connection testing and validation
- Credential management interface

#### **Legacy Admin Panel** (`pages/admin-panel.tsx`)
- Legacy administrative interface
- Accessible via `/admin-legacy` route
- Provides alternative admin workflow

---

## UI Components System

### shadcn/ui Integration

The application uses a complete shadcn/ui component system with 40+ components:

#### Core Components:
- **Layout**: `card`, `tabs`, `separator`, `scroll-area`
- **Forms**: `form`, `input`, `select`, `button`, `checkbox`
- **Data Display**: `table`, `badge`, `tooltip`, `popover`
- **Feedback**: `alert`, `toast`, `progress`, `skeleton`
- **Navigation**: `navigation-menu`, `breadcrumb`, `pagination`

#### Component Customization:
All shadcn components are customized with:
- Consistent color scheme using CSS custom properties
- Accessibility enhancements (ARIA labels, keyboard navigation)
- Animation support via Tailwind CSS
- Dark mode compatibility

### Custom Components

#### 1. **DatasetCard** (`components/dataset-card.tsx`)
Sophisticated dataset display component featuring:

```typescript
interface DatasetCardProps {
  dataset: Dataset;
  initiallyOpen?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionClick?: (event: React.MouseEvent) => void;
  userAiEnabled?: boolean;
  currentFolder?: string | null;
}
```

**Advanced Features:**
- **Collapsible Content**: Expandable dataset details
- **Column Exploration**: Searchable column metadata with pagination
- **AI-Powered Search**: Semantic column search using OpenAI embeddings
- **Download Integration**: Sample and full dataset download capabilities
- **Chat Integration**: AI dataset interaction for enabled users

#### 2. **StatsCards** (`components/stats-cards.tsx`)
Animated statistics display with:

```typescript
interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints?: number;
}
```

**Animation Features:**
- **Count Animation**: Smooth number transitions using `useCountAnimation`
- **Staggered Loading**: Sequential card animations with delays
- **Accessibility**: Respects `prefers-reduced-motion`
- **Real-time Updates**: Dynamic timestamp updates via `useDynamicTime`

#### 3. **FolderCard** (`components/folder-card.tsx`)
Interactive folder navigation component:
- Dataset count per folder
- Loading animations with staggered reveals
- Click-to-filter functionality
- Visual feedback for active selection

#### 4. **MainLayout** (`components/main-layout.tsx`)
Application shell providing:

```typescript
interface MainLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  currentUser?: User | null;
}
```

**Layout Features:**
- **Responsive Header**: User info, AWS status, navigation tabs
- **Skip Links**: Accessibility navigation shortcuts
- **Keyboard Navigation**: Arrow key navigation between tabs
- **Role-based UI**: Admin-only navigation elements

#### 5. **Multi-Dataset Chat** (`components/multi-dataset-chat.tsx`)
AI-powered analysis interface:
- Multiple dataset selection
- Context-aware AI responses
- Streaming response handling
- Error recovery and retry logic

---

## Hooks System

### Custom Hooks Overview

The application implements 13 specialized custom hooks for various functionalities:

#### 1. **Animation Hooks**

**`useCountAnimation`** - Smooth number animations
```typescript
interface UseCountAnimationOptions {
  target: number;
  duration?: number;
  delay?: number;
  respectMotionPreference?: boolean;
  easing?: (t: number) => number;
}
```

Features:
- Smooth easing functions (easeOutQuart default)
- Accessibility: respects `prefers-reduced-motion`
- Staggered animations support
- Performance optimized with `requestAnimationFrame`

#### 2. **State Management Hooks**

**`useMultiSelect`** - Multi-item selection management
```typescript
interface UseMultiSelectReturn<T> {
  selectedItems: Set<T>;
  isSelectionMode: boolean;
  isSelected: (item: T) => boolean;
  toggleSelection: (item: T) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  // ... additional methods
}
```

**`useDatasetFiltering`** - Dataset filtering logic
```typescript
interface FilteredDatasetResult {
  filteredDatasets: Dataset[];
  totalCount: number;
  searchCount: number;
  formatCount: number;
  folderCount: number;
}
```

#### 3. **API Interaction Hooks**

**`useApiMutations`** - Standardized API operations
```typescript
// Pre-configured mutations for common operations
- useDatasetRefresh(): Dataset synchronization from S3
- useGenerateInsights(): AI insight generation
- useDownloadSample(): Dataset download handling
```

Features:
- Automatic error handling with toast notifications
- Cache invalidation management
- Loading state handling
- Consistent success/error messaging

#### 4. **Utility Hooks**

**Additional Hooks:**
- `useDynamicTime`: Real-time timestamp updates
- `useErrorHandler`: Global error handling
- `useFocusTrap`: Accessibility focus management
- `useKeyboardNavigation`: Keyboard shortcut handling
- `useLoadingState`: Loading state coordination
- `usePerformanceMonitor`: Performance tracking
- `usePreloadData`: Data prefetching

---

## Utilities and Libraries

### Core Utilities

#### 1. **Query Client** (`lib/queryClient.ts`)

TanStack Query configuration with:

```typescript
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  customHeaders?: Record<string, string>,
): Promise<Response>
```

**Features:**
- **JWT Integration**: Automatic bearer token injection
- **Error Handling**: Consistent error processing
- **Request Interceptors**: Authentication and headers management
- **Response Processing**: JSON/text response handling

#### 2. **Authentication Utilities** (`lib/auth-utils.ts`)

Secure token management:

```typescript
export function getSafeAuthToken(): string | null
export function getAuthHeaders(): Record<string, string>
export function isTokenValid(): boolean
```

**Security Features:**
- Token format validation (JWT structure)
- Automatic cleanup of corrupted tokens
- Safe localStorage access with error handling
- Bearer token formatting

#### 3. **Number Formatting** (`lib/format-number.ts`)

Intelligent number display:

```typescript
export function formatNumber(num: number): string
// Examples:
// 100,000 -> "100,000"
// 1,500,000 -> "1.5M"
// 5,100,000,000 -> "5.1B"
```

#### 4. **CSS Utilities** (`lib/utils.ts`)

Tailwind CSS class management:
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Combines `clsx` for conditional classes with `tailwind-merge` for duplicate resolution.

---

## Styling System

### Tailwind CSS Configuration

#### Core Configuration
- **Design System**: HSL color system with CSS custom properties
- **Dark Mode**: Class-based dark mode with comprehensive coverage
- **Responsive Design**: Mobile-first approach with breakpoint system
- **Animation System**: Custom animations with accessibility considerations

### Color System

#### Light Mode Palette:
```css
:root {
  --background: hsl(0, 0%, 100%);
  --foreground: hsl(0, 0%, 9%);
  --primary: hsl(210, 82%, 41%);
  --primary-foreground: hsl(0, 0%, 100%);
  /* ... additional colors */
}
```

#### Dark Mode Palette:
```css
.dark {
  --background: hsl(222, 84%, 5%);
  --foreground: hsl(210, 40%, 98%);
  --primary: hsl(210, 82%, 60%);
  /* ... additional colors */
}
```

#### Extended Color Palette:
- **Primary Scale**: 50-900 intensity levels
- **Accent Scale**: Complementary color system
- **Semantic Colors**: Success, warning, error, info
- **WCAG AA Compliance**: 4.5:1 contrast ratio minimum

### Animation System

#### Custom Animations (`index.css`):

**Statistical Animations:**
```css
@keyframes stat-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}

@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
```

**Staggered Card Animations:**
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Staggered delays: .stagger-0 through .stagger-11 */
.stagger-1 { animation-delay: 150ms; }
.stagger-2 { animation-delay: 300ms; }
```

#### Accessibility Considerations:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-stat-pulse,
  .animate-pulse,
  .shimmer,
  .animate-slide-up {
    animation: none;
  }
}
```

### Accessibility Features

#### WCAG Compliance:
- **Color Contrast**: AA compliant color combinations
- **Focus Management**: Visible focus indicators
- **Skip Links**: Navigation shortcuts for screen readers
- **ARIA Labels**: Comprehensive labeling system
- **Touch Targets**: 44px minimum touch target size

#### Utility Classes:
```css
.touch-target { min-height: 44px; min-width: 44px; }
.focus-ring { @apply focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2; }
.skip-link { @apply sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4; }
```

---

## State Management Strategy

### TanStack Query Implementation

#### Query Configuration:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      gcTime: 300000,   // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### Query Patterns:

**Data Fetching:**
```typescript
// Datasets with filtering
const { data: datasets } = useQuery({
  queryKey: ['/api/datasets', searchTerm, formatFilter, selectedFolder],
  queryFn: ({ queryKey }) => fetchWithParams(queryKey),
  staleTime: 0, // Always fresh for filtered data
});

// Cached statistics
const { data: stats } = useQuery({
  queryKey: ['/api/stats'],
  staleTime: 60000, // Cache for 1 minute
});
```

**Optimistic Updates:**
```typescript
const mutation = useMutation({
  mutationFn: updateDataset,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['/api/datasets'] });
    const previousData = queryClient.getQueryData(['/api/datasets']);
    queryClient.setQueryData(['/api/datasets'], newData);
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['/api/datasets'], context.previousData);
  },
});
```

### Local State Management

#### Authentication State:
- JWT token in localStorage with validation
- User context via React state
- Automatic cleanup on logout/token expiry

#### UI State:
- Component-level state for interactions
- Custom hooks for complex state logic
- No global state management beyond auth

---

## Performance Optimizations

### Code Splitting
- Route-based code splitting with React.lazy
- Component-level splitting for heavy components
- Dynamic imports for conditional features

### Query Optimization
- Strategic caching with appropriate stale times
- Background refetching for critical data
- Infinite queries for large datasets
- Optimistic updates for instant feedback

### Animation Performance
- CSS animations over JavaScript when possible
- `transform` and `opacity` properties for GPU acceleration
- `will-change` hints for complex animations
- Accessibility-aware animation disabling

### Bundle Optimization
- Tree shaking for unused code
- Component library optimization
- SVG icon optimization via Lucide React
- CSS purging via Tailwind CSS

---

## Development Patterns

### Component Architecture

#### Composition Pattern:
```typescript
// Flexible component composition
<Card>
  <CardHeader>
    <CardTitle>Dataset Information</CardTitle>
  </CardHeader>
  <CardContent>
    <DatasetMetadata dataset={dataset} />
  </CardContent>
</Card>
```

#### Compound Components:
```typescript
// Multi-dataset chat with internal state management
<MultiDatasetChat>
  <MultiDatasetChat.Selector datasets={selectedDatasets} />
  <MultiDatasetChat.Conversation />
  <MultiDatasetChat.Input />
</MultiDatasetChat>
```

### Error Handling

#### Error Boundary Strategy:
```typescript
// Hierarchical error boundaries
<ErrorBoundaryWrapper level="page">
  <ErrorBoundaryWrapper level="section">
    <ErrorBoundaryWrapper level="component">
      <DatasetCard />
    </ErrorBoundaryWrapper>
  </ErrorBoundaryWrapper>
</ErrorBoundaryWrapper>
```

#### Query Error Handling:
```typescript
const { data, error, isError } = useQuery({
  queryKey: ['datasets'],
  queryFn: fetchDatasets,
  onError: (error) => {
    toast({
      title: "Failed to load datasets",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

### Testing Approach

#### Component Testing:
- Unit tests for utility functions
- Component integration tests with React Testing Library
- Accessibility testing with jest-axe
- Visual regression testing capabilities

#### API Integration Testing:
- Mock service worker for API testing
- Query client testing utilities
- Authentication flow testing
- Error scenario coverage

---

## Best Practices

### Code Organization
1. **Feature-based organization**: Group related components, hooks, and utilities
2. **Clear file naming**: Descriptive names following kebab-case convention
3. **Export patterns**: Named exports for utilities, default for components
4. **Type definitions**: Co-located TypeScript interfaces and types

### Performance Best Practices
1. **Memoization**: React.memo for expensive components
2. **Callback optimization**: useCallback for stable references
3. **Effect optimization**: Proper dependency arrays
4. **Bundle splitting**: Strategic code splitting

### Accessibility Best Practices
1. **Semantic HTML**: Proper heading hierarchy and landmarks
2. **ARIA integration**: Comprehensive labeling and states
3. **Keyboard navigation**: Full keyboard accessibility
4. **Screen reader support**: Skip links and live regions

### Security Best Practices
1. **Token management**: Secure JWT handling and validation
2. **Input sanitization**: XSS prevention measures
3. **Error handling**: No sensitive data in error messages
4. **HTTPS enforcement**: Secure communication requirements

---

This documentation provides a comprehensive overview of the Data Lake Explorer frontend architecture, demonstrating a sophisticated, accessible, and performant React application built with modern best practices and comprehensive user experience considerations.