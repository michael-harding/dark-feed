# RSS Reader Refactoring Architecture

## Overview
This document outlines a comprehensive refactoring strategy to eliminate redundant code identified in the RSS reader application. The analysis revealed significant duplication across mobile/desktop components, Redux slices, and service layers.

## Current Redundancy Issues

### 1. Component Duplication

#### FeedSidebar Components
**Files:** `src/components/FeedSidebar.tsx` (189 lines) and `src/components/mobile/MobileFeedSidebar.tsx` (157 lines)

**Duplicated Logic:**
- Header section with RSS icon and user profile display
- Navigation buttons (All Articles, Starred, Bookmarks)
- Feeds list rendering with unread counts
- Footer with refresh and settings buttons
- Total unread count calculation: `feeds.reduce((sum, feed) => sum + feed.unreadCount, 0)`

**Key Differences:**
- Mobile version has responsive sizing and mobile-specific UI state
- Different CSS classes for layout (`w-80` vs responsive classes)
- Mobile includes `mobileActionbarPadding` support

#### ArticleList Components
**Files:** `src/components/ArticleList.tsx` (186 lines) and `src/components/mobile/MobileArticleList.tsx` (238 lines)

**Duplicated Logic:**
- Article sorting and filtering logic
- Article action buttons (star, bookmark, mark as read)
- Article metadata display (author, date, read status)
- Empty state handling
- Click event handling for article selection

**Key Differences:**
- Mobile uses dropdown menus for actions vs individual buttons
- Different responsive layouts and styling
- Mobile includes loading states and back navigation

### 2. Redux Slice Pattern Repetition

#### Async Thunk Patterns
Both `articlesSlice.ts` and `feedsSlice.ts` share identical patterns:

```typescript
// Repeated pattern in both slices:
.addCase(loadData.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(loadData.fulfilled, (state, action) => {
  state.data = action.payload;
  state.loading = false;
})
.addCase(loadData.rejected, (state, action) => {
  state.loading = false;
  state.error = action.error.message || 'Failed to load data';
})
```

#### State Update Patterns
```typescript
// Repeated in both slices:
const plainData = JSON.parse(JSON.stringify(data));
DataLayer.saveData(plainData);
```

### 3. DataLayer Service Redundancy

#### Caching Logic Duplication
Three separate caching mechanisms with identical patterns:

```typescript
// Repeated pattern across userCache, profileCache, userProfileCache:
private static cacheName: { data: T; timestamp: number } | null = null;
private static readonly CACHE_TTL = 5 * 60 * 1000;

private static getCachedData = async () => {
  const now = Date.now();
  if (this.cacheName && (now - this.cacheName.timestamp) < this.CACHE_TTL) {
    return this.cacheName.data;
  }
  // Fetch and cache logic...
};
```

#### Database Operation Patterns
```typescript
// Repeated pattern across all CRUD methods:
static methodName = async (params): Promise<ReturnType> => {
  try {
    const { data: user } = await DataLayer.getCachedUser();
    if (!user.user) return defaultValue;

    const { data, error } = await supabase
      .from('table')
      .operation()
      .eq('user_id', user.user.id);

    if (error) {
      console.error('Error:', error);
      return defaultValue;
    }

    return data;
  } catch (error) {
    console.error('Error:', error);
    return defaultValue;
  }
};
```

### 4. Dead Code Identified

#### Unused Imports
- `src/components/mobile/MobileFeedSidebar.tsx`: `useState` and `useRef` imported but never used

## Refactoring Strategy

### Phase 1: Component Consolidation (High Priority)

#### 1.1 Unified FeedSidebar Component
**Goal:** Single responsive component replacing both desktop and mobile versions

**Implementation Approach:**
```typescript
// src/components/FeedSidebar.tsx
interface FeedSidebarProps {
  variant?: 'desktop' | 'mobile';
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const FeedSidebar = ({
  variant = 'desktop',
  onRefresh,
  isLoading = false
}: FeedSidebarProps) => {
  const isMobile = variant === 'mobile';
  const { mobileActionbarPadding } = useAppSelector(state => state.ui);

  return (
    <div className={cn(
      "bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen",
      isMobile ? "w-full" : "w-80"
    )}>
      {/* Responsive header */}
      <div className={cn(
        "p-6 border-b border-sidebar-border",
        isMobile && mobileActionbarPadding && "pt-10"
      )}>
        {/* Responsive layout */}
      </div>
      {/* Rest of component with responsive design tokens */}
    </div>
  );
};
```

**Design Tokens to Extract:**
- `sidebar-width`: `desktop: w-80`, `mobile: w-full`
- `icon-sizes`: `desktop: w-6 h-6`, `mobile: w-5 h-5`
- `spacing`: `desktop: p-6`, `mobile: p-4`
- `text-sizes`: `desktop: text-xl`, `mobile: text-lg`

#### 1.2 Shared Article Action Components
**Goal:** Reusable components for article interactions

```typescript
// src/components/articles/ArticleActions.tsx
interface ArticleActionsProps {
  article: Article;
  variant?: 'buttons' | 'dropdown';
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
  onOpenOriginal: (url: string) => void;
}

export const ArticleActions = ({ article, variant = 'buttons', ...handlers }: ArticleActionsProps) => {
  const actions = [
    { icon: Eye, label: 'Mark as read', handler: () => handlers.onMarkAsRead(article.id) },
    { icon: Star, label: 'Star', handler: () => handlers.onToggleStar(article.id) },
    { icon: Bookmark, label: 'Bookmark', handler: () => handlers.onToggleBookmark(article.id) },
    { icon: ExternalLink, label: 'Open original', handler: () => handlers.onOpenOriginal(article.url) }
  ];

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {actions.map((action, index) => (
            <DropdownMenuItem key={index} onClick={action.handler}>
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={action.handler}
        >
          <action.icon className="w-3 h-3" />
        </Button>
      ))}
    </div>
  );
};
```

#### 1.3 Unified Article List Component
**Goal:** Single component with responsive behavior

```typescript
// src/components/articles/ArticleList.tsx
interface ArticleListProps {
  articles: Article[];
  selectedArticle: string | null;
  onArticleSelect: (articleId: string) => void;
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
  variant?: 'desktop' | 'mobile';
  showHeader?: boolean;
  sortMode: 'chronological' | 'unreadOnTop';
  onToggleSortMode: () => void;
  onBack?: () => void; // Mobile only
}

export const ArticleList = ({ variant = 'desktop', ...props }: ArticleListProps) => {
  const isMobile = variant === 'mobile';

  return (
    <div className={cn(
      "bg-article-bg border-r border-border flex flex-col",
      isMobile ? "h-screen w-full" : "w-96 h-screen"
    )}>
      {props.showHeader !== false && (
        <ArticleListHeader variant={variant} {...props} />
      )}
      <ArticleListContent variant={variant} {...props} />
    </div>
  );
};
```

### Phase 2: Redux Pattern Standardization (High Priority)

#### 2.1 Generic Async Thunk Creator
```typescript
// src/store/utils/asyncThunkCreators.ts
interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export const createAsyncSlice = <T, Args = void>(
  name: string,
  initialState: AsyncState<T>,
  asyncFn: (args: Args) => Promise<T>
) => {
  return createSlice({
    name,
    initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(createAsyncThunk(name, asyncFn).pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(createAsyncThunk(name, asyncFn).fulfilled, (state, action) => {
          state.data = action.payload;
          state.loading = false;
        })
        .addCase(createAsyncThunk(name, asyncFn).rejected, (state, action) => {
          state.loading = false;
          state.error = action.error.message || `Failed to load ${name}`;
        });
    }
  });
};
```

#### 2.2 Standardized Database Operations
```typescript
// src/store/utils/databaseUtils.ts
export const withUserCheck = async <T>(
  operation: (userId: string) => Promise<T>,
  defaultValue: T
): Promise<T> => {
  try {
    const { data: user } = await DataLayer.getCachedUser();
    if (!user.user) return defaultValue;
    return await operation(user.user.id);
  } catch (error) {
    console.error('Database operation error:', error);
    return defaultValue;
  }
};

export const createDatabaseUpdater = <T extends { id: string }>(
  tableName: string,
  updateFields: (keyof T)[]
) => {
  return async (data: T): Promise<void> => {
    await withUserCheck(async (userId) => {
      const updateData = {
        id: data.id,
        user_id: userId,
        ...Object.fromEntries(
          updateFields.map(field => [field, data[field]])
        )
      };

      const { error } = await supabase
        .from(tableName)
        .upsert(updateData);

      if (error) {
        console.error(`Error updating ${tableName}:`, error);
      }
    }, undefined);
  };
};
```

### Phase 3: DataLayer Service Optimization (Medium Priority)

#### 3.1 Generic Cache Manager
```typescript
// src/services/cache/CacheManager.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheManager<T> {
  private cache: CacheEntry<T> | null = null;
  private readonly ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  async getOrFetch(fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.cache && (now - this.cache.timestamp) < this.ttl) {
      return this.cache.data;
    }

    const data = await fetchFn();
    this.cache = { data, timestamp: now };
    return data;
  }

  invalidate(): void {
    this.cache = null;
  }

  set(data: T): void {
    this.cache = { data, timestamp: Date.now() };
  }
}

// Usage in DataLayer:
private static userCache = new CacheManager(5);
private static profileCache = new CacheManager(5);
private static userProfileCache = new CacheManager(5);
```

#### 3.2 Database Operation Factory
```typescript
// src/services/database/DatabaseOperations.ts
export class DatabaseOperations<T extends { id: string }> {
  constructor(
    private tableName: string,
    private userIdField: string = 'user_id'
  ) {}

  async loadAll(userId: string): Promise<T[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId);

    if (error) {
      console.error(`Error loading ${this.tableName}:`, error);
      return [];
    }

    return data || [];
  }

  async save(userId: string, data: T, fieldsToUpdate?: (keyof T)[]): Promise<void> {
    const updateData = {
      id: data.id,
      [this.userIdField]: userId,
      ...(fieldsToUpdate
        ? Object.fromEntries(fieldsToUpdate.map(field => [field, data[field]]))
        : data
      )
    };

    const { error } = await supabase
      .from(this.tableName)
      .upsert(updateData);

    if (error) {
      console.error(`Error saving ${this.tableName}:`, error);
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq(this.userIdField, userId);

    if (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
    }
  }
}

// Usage in DataLayer:
private static feedOps = new DatabaseOperations<Feed>('feeds');
private static articleOps = new DatabaseOperations<Article>('articles');
```

### Phase 4: Quick Wins (Immediate)

#### 4.1 Remove Dead Code
```typescript
// src/components/mobile/MobileFeedSidebar.tsx
- import { useState, useRef } from 'react';
// Remove unused imports
```

#### 4.2 Extract Common Constants
```typescript
// src/constants/ui.ts
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: {
    DESKTOP: 'w-80',
    MOBILE: 'w-full'
  },
  ICON_SIZES: {
    DESKTOP: 'w-6 h-6',
    MOBILE: 'w-5 h-5'
  },
  SPACING: {
    DESKTOP: 'p-6',
    MOBILE: 'p-4'
  }
} as const;
```

## Implementation Priority

### Immediate (Next Sprint)
1. Remove unused imports in MobileFeedSidebar.tsx
2. Extract UI constants file
3. Create ArticleActions shared component

### Short Term (1-2 Sprints)
1. Implement unified FeedSidebar component
2. Create generic cache manager for DataLayer
3. Standardize Redux slice patterns

### Medium Term (2-3 Sprints)
1. Consolidate ArticleList components
2. Implement database operation factory
3. Extract article metadata display component

## Benefits

### Code Reduction
- **Estimated 300-400 lines** of duplicated code eliminated
- **Single source of truth** for common patterns
- **Reduced bundle size** through deduplication

### Maintainability
- **Easier updates** - changes apply to all instances
- **Consistent behavior** across mobile and desktop
- **Better testing** - fewer components to test

### Developer Experience
- **Faster development** - reuse existing components
- **Clearer architecture** - separation of concerns
- **Better debugging** - consolidated logic

## Migration Strategy

### Backward Compatibility
- Maintain existing component APIs during transition
- Use feature flags for gradual rollout
- Keep old components as fallbacks

### Testing Strategy
- Unit tests for new shared components
- Integration tests for component interactions
- Visual regression tests for UI consistency

### Rollout Plan
1. Create new shared components alongside existing ones
2. Migrate one component at a time
3. Remove old components after verification
4. Update imports across the application

## Success Metrics

- [ ] Reduce total lines of code by 15-20%
- [ ] Eliminate all identified dead code
- [ ] Achieve 100% test coverage on new shared components
- [ ] Zero regressions in existing functionality
- [ ] Improved Lighthouse performance scores

## Future Considerations

### Long-term Architecture
- Consider React Server Components for better performance
- Evaluate Zustand vs Redux for simpler state management
- Implement design system with consistent tokens
- Add automated dead code detection in CI/CD

### Scalability
- Component composition patterns for complex UIs
- Plugin architecture for extensibility
- Performance monitoring and optimization
- Accessibility improvements across all components