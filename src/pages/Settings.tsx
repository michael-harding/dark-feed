import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Rss, Settings as SettingsIcon, Download, Upload, Trash2, Palette, LogOut, User, Smartphone, ArrowLeft, GripVertical, MoreVertical, Edit, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { faviconGenerator } from '@/utils/faviconGenerator';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMobileActionbarPadding } from '@/store/slices/uiSlice';
import { useAuth } from '@/hooks/useAuth';
import { Feed } from '@/services/dataLayer';
import {
  addFeed,
  loadFeeds,
  refreshAllFeeds,
  removeFeed,
  renameFeed,
  reorderFeeds,
  updateFeedUnreadCount,
  importFeeds,
  setFeedUnreadCount,
  markAllAsRead,
} from '@/store/slices/feedsSlice';
import {
   loadArticles,
   toggleStar,
   toggleBookmark,
   markAsRead,
   removeArticlesByFeed,
   updateArticlesFeedTitle,
   updateFilteredArticles,
   markArticlesAsReadByAge,
 } from '@/store/slices/articlesSlice';
import {
   selectFeed,
   selectArticle,
   toggleSortMode,
   loadUserSettings,
   setAccentColor,
   setInitialLoading,
   setRefreshLimitInterval,
 } from '@/store/slices/uiSlice';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SettingsProps {
  isMobile?: boolean;
}

// Sortable Feed Item Component
interface SortableFeedItemProps {
  feed: Feed;
  onRemove: (feedId: string) => void;
  onRename: (feedId: string, newTitle: string) => void;
  onMarkAllAsRead: (feedId: string) => void;
  onMarkOlderThan30DaysAsRead: (feedId: string) => void;
  onMarkOlderThan2WeeksAsRead: (feedId: string) => void;
}

const SortableFeedItem = ({ feed, onRemove, onRename, onMarkAllAsRead, onMarkOlderThan30DaysAsRead, onMarkOlderThan2WeeksAsRead }: SortableFeedItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(feed.title);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feed.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== feed.title) {
      onRename(feed.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setRenameValue(feed.title);
      setIsRenaming(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
        <Rss className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 text-sm font-medium flex-1"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground"
              onClick={handleRename}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <p className="font-medium truncate">{feed.title}</p>
        )}
        <p className="text-xs text-muted-foreground truncate max-w-96">{feed.url}</p>
      </div>
      <Badge variant="secondary" className="bg-feed-unread text-primary-foreground">
        {feed.unreadCount}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setRenameValue(feed.title);
              setIsRenaming(true);
            }}
          >
            <Edit className="w-4 h-4 mr-2" />
            Rename Feed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onMarkAllAsRead(feed.id)}
            disabled={feed.unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onMarkOlderThan30DaysAsRead(feed.id)}
            disabled={feed.unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark Older than 30 Days as Read
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onMarkOlderThan2WeeksAsRead(feed.id)}
            disabled={feed.unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark Older than 2 Weeks as Read
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRemove(feed.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Feed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const Settings = ({ isMobile: propIsMobile = false }: SettingsProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Detect if this is a mobile view either from props or URL parameter
  const isMobile = propIsMobile || searchParams.get('isMobile') === 'true';

  // If accessed from mobile URL, redirect to mobile app when navigating back
  useEffect(() => {
    if (isMobile && !propIsMobile) {
      // This is accessed via direct URL navigation from mobile
      // We should handle back navigation properly
    }
  }, [isMobile, propIsMobile]);

  const { accentColor, mobileActionbarPadding, initialLoading, refreshLimitInterval } = useAppSelector((state) => state.ui);
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { feeds, isLoading } = useAppSelector((state) => state.feeds);
  const { articles, filteredArticles } = useAppSelector((state) => state.articles);
  const { selectedFeed, selectedArticle, sortMode } = useAppSelector((state) => state.ui);

  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user settings when component mounts and user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      dispatch(loadUserSettings());
    } else if (!user) {
      // If user is not authenticated, redirect to auth page
      navigate('/auth');
    }
  }, [user, authLoading, dispatch, navigate]);

  // Load feeds when component mounts and user is authenticated
  useEffect(() => {
    if (user) {
      dispatch(loadFeeds());
    }
  }, [user, dispatch]);

  // Update CSS variables when accent color changes (from database or user selection)
  useEffect(() => {
    if (accentColor) {
      updateAccentColor(accentColor);
    }
  }, [accentColor]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Predefined accent colors
  const accentColors = [
    { name: 'Yellow', value: '46 87% 65%', hex: '#fbbf24' },
    { name: 'Blue', value: '217 91% 60%', hex: '#3b82f6' },
    { name: 'Green', value: '142 76% 36%', hex: '#10b981' },
    { name: 'Purple', value: '262 83% 58%', hex: '#8b5cf6' },
    { name: 'Pink', value: '330 81% 60%', hex: '#ec4899' },
    { name: 'Orange', value: '25 95% 53%', hex: '#f97316' },
    { name: 'Red', value: '0 84% 60%', hex: '#ef4444' },
    { name: 'Teal', value: '173 80% 40%', hex: '#14b8a6' },
  ];

  // Refresh limit interval options
  const refreshLimitOptions = [
    { value: 0, label: 'No limit' },
    // Half hour increments up to 3 hours (30, 60, 90, 120, 150, 180 minutes)
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2.5 hours' },
    { value: 180, label: '3 hours' },
    // 1 hour increments up to 6 hours (240, 300, 360 minutes)
    { value: 240, label: '4 hours' },
    { value: 300, label: '5 hours' },
    { value: 360, label: '6 hours' },
    // 3 hour increments up to 24 hours (480, 720, 960, 1200, 1440 minutes)
    { value: 480, label: '8 hours' },
    { value: 720, label: '12 hours' },
    { value: 960, label: '16 hours' },
    { value: 1200, label: '20 hours' },
    { value: 1440, label: '24 hours' },
  ];

  // Update CSS variables when accent color changes
  const updateAccentColor = (color: string) => {
    // Parse the HSL color string (e.g., "46 87% 65%")
    const [hue, saturation, lightness] = color.split(' ');
    const h = parseInt(hue);
    const s = parseInt(saturation.replace('%', ''));
    const l = parseInt(lightness.replace('%', ''));

    // Update main accent color
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--ring', color);
    document.documentElement.style.setProperty('--feed-unread', color);

    // Generate and update all accent shades
    const shades = [
      { name: '50', lightness: Math.min(95, l + 30) },
      { name: '100', lightness: Math.min(90, l + 25) },
      { name: '200', lightness: Math.min(85, l + 20) },
      { name: '300', lightness: Math.min(80, l + 15) },
      { name: '400', lightness: Math.min(75, l + 10) },
      { name: '500', lightness: l }, // Default
      { name: '600', lightness: Math.max(10, l - 10) },
      { name: '700', lightness: Math.max(15, l - 20) },
      { name: '800', lightness: Math.max(20, l - 30) },
      { name: '900', lightness: Math.max(25, l - 40) },
      { name: '950', lightness: Math.max(15, l - 50) },
    ];

    shades.forEach(shade => {
      const shadeColor = `${h} ${s}% ${shade.lightness}%`;
      document.documentElement.style.setProperty(`--accent-${shade.name}`, shadeColor);
    });
  };

  const handleAccentColorChange = (color: string) => {
    dispatch(setAccentColor(color));
    updateAccentColor(color);

    // Update favicon to match new accent color
    faviconGenerator.generateAndUpdateFavicon(color);
  };

  const handleRefreshLimitChange = (value: string) => {
    const interval = parseInt(value);
    dispatch(setRefreshLimitInterval(interval));
  };

  const handleAddFeed = async () => {
    if (newFeedUrl.trim()) {
      try {
        const result = await dispatch(addFeed(newFeedUrl.trim())).unwrap();
        // Update filtered articles to include new feed's articles
        dispatch(updateFilteredArticles({ selectedFeed, sortMode }));
        toast({
          title: "Feed Added",
          description: `Successfully added ${result.feed.title}`,
        });
        setNewFeedUrl('');
        setShowAddFeed(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add RSS feed. Please check the URL.",
          variant: "destructive",
        });
      }
    }
  };

  const handleImportFeeds = async (importedFeeds: Feed[]) => {
    // Filter out feeds that already exist (by URL)
    const existingUrls = feeds.map(f => f.url);
    const newFeeds = importedFeeds.filter(feed => !existingUrls.includes(feed.url));

    if (newFeeds.length === 0) {
      toast({
        title: "No New Feeds",
        description: "All feeds in the import file already exist.",
      });
      return;
    }

    try {
      const results = await dispatch(importFeeds(newFeeds)).unwrap();

      // Get current articles state to calculate existing articles
      const currentArticles = articles;

      // Separate successful and failed imports
      const successfulResults = results.filter(result => !result.error);
      const failedResults = results.filter(result => result.error);

      // Calculate correct unread counts for imported feeds
      successfulResults.forEach(({ articles: newArticles, feed }) => {
        if (newArticles.length > 0) {
          // Get all articles for this feed (existing + new)
          const existingFeedArticles = currentArticles.filter(a => a.feedId === feed.id);
          const newFeedArticles = newArticles.filter(a => a.feedId === feed.id);
          const allFeedArticles = [...existingFeedArticles, ...newFeedArticles];
          const unreadCount = allFeedArticles.filter(a => !a.isRead).length;

          // Update the feed's unread count
          dispatch(setFeedUnreadCount({ feedId: feed.id, count: unreadCount }));
        }
      });

      // Update filtered articles to include new feeds' articles
      dispatch(updateFilteredArticles({ selectedFeed, sortMode }));

      const successfulCount = successfulResults.length;
      const failedCount = failedResults.length;

      let description = `Successfully imported ${successfulCount} feed(s).`;
      if (failedCount > 0) {
        description += ` ${failedCount} feed(s) failed to import.`;
      }

      toast({
        title: "Feeds Imported",
        description,
        variant: failedCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to import some feeds. Check the console for details.",
        variant: "destructive",
      });
    }
  };

  const handleImportFeedsFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        if (importData.feeds && Array.isArray(importData.feeds)) {
          handleImportFeeds(importData.feeds);
        } else {
          toast({
            title: "Invalid File",
            description: "Invalid feed file format",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to import feeds. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFeed = (feedId: string) => {
    dispatch(removeFeed(feedId));
    dispatch(removeArticlesByFeed(feedId));

    // If the removed feed was selected, switch to "all"
    if (selectedFeed === feedId) {
      dispatch(selectFeed('all'));
    }

    toast({
      title: "Feed Removed",
      description: "Feed and its articles have been removed.",
    });
  };

  const handleReorderFeeds = (reorderedFeeds: Feed[]) => {
    dispatch(reorderFeeds(reorderedFeeds));
    toast({
      title: "Feeds Reordered",
      description: "Feed order has been updated.",
    });
  };

  const handleRenameFeed = (feedId: string, newTitle: string) => {
    dispatch(renameFeed({ id: feedId, newTitle }));
    dispatch(updateArticlesFeedTitle({ feedId, newTitle }));

    toast({
      title: "Feed Renamed",
      description: `Feed renamed to "${newTitle}".`,
    });
  };

  const handleMarkAllAsRead = (feedId: string) => {
    dispatch(markArticlesAsReadByAge({ feedId, daysThreshold: 0 }));
    dispatch(markAllAsRead(feedId));

    const feed = feeds.find(f => f.id === feedId);
    toast({
      title: "Articles Marked as Read",
      description: `All articles in "${feed?.title}" have been marked as read.`,
    });
  };

  const handleMarkOlderThan30DaysAsRead = (feedId: string) => {
    dispatch(markArticlesAsReadByAge({ feedId, daysThreshold: 30 }));

    const feed = feeds.find(f => f.id === feedId);
    toast({
      title: "Older Articles Marked as Read",
      description: `Articles older than 30 days in "${feed?.title}" have been marked as read.`,
    });
  };

  const handleMarkOlderThan2WeeksAsRead = (feedId: string) => {
    dispatch(markArticlesAsReadByAge({ feedId, daysThreshold: 14 }));

    const feed = feeds.find(f => f.id === feedId);
    toast({
      title: "Older Articles Marked as Read",
      description: `Articles older than 2 weeks in "${feed?.title}" have been marked as read.`,
    });
  };

  const handleExportFeeds = () => {
    const exportData = {
      feeds,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rss-feeds-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Feeds Exported",
      description: "Your feeds have been exported successfully.",
    });
  };


  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = feeds.findIndex((feed) => feed.id === active.id);
      const newIndex = feeds.findIndex((feed) => feed.id === over.id);

      const reorderedFeeds = arrayMove(feeds, oldIndex, newIndex);
      handleReorderFeeds(reorderedFeeds);
    }
  };

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

  return (
    <div className={cn("min-h-screen bg-background flex justify-center", isMobile ? "p-4" : "p-6")}>
      <div className={cn("w-full", isMobile ? "max-w-none" : "max-w-4xl")}>
        {/* Header */}
        <div className={cn("flex items-center gap-4 mb-6", isMobile && "mb-4")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Desktop: go to main page, Mobile: smart back navigation
            if (isMobile) {
              // If accessed from mobile app, go back to mobile app
              if (searchParams.get('isMobile') === 'true') {
                window.history.length > 1 ? navigate(-1) : navigate('/m');
              } else {
                navigate(-1);
              }
            } else {
              // Desktop: navigate to main page
              navigate('/');
            }
          }}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <SettingsIcon className={cn(isMobile ? "w-5 h-5" : "w-6 h-6", "text-primary-foreground")} />
            </div>
          </div>
          <div>
            <h1 className={cn("font-bold text-foreground", isMobile ? "text-lg" : "text-xl")}>
              Settings
            </h1>
            {profile?.display_name && (
              <p className={cn("text-muted-foreground font-medium", isMobile ? "text-sm" : "text-sm")}>
                <User className={cn(isMobile ? "w-4 h-4" : "w-4 h-4", "inline mt-0 mr-1")} />
                {profile.display_name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* User Account Section */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </h3>
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="text-sm">
              <span className="text-muted-foreground">Signed in as:</span>
              <div className={cn("font-medium text-foreground mt-1", isMobile ? "break-all" : "")}>
                {user?.email}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Feed Management Section */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Rss className="w-4 h-4" />
            Feed Management
          </h3>

          {/* Add Feed Form */}
          <div className={cn("space-y-3 mb-4 p-4 border rounded-lg bg-muted/30", isMobile && "p-3")}>
            <label className="text-sm font-medium">Add New Feed</label>
            <Input
              placeholder="Enter RSS feed URL..."
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
              className="bg-background"
            />
            <Button
              onClick={handleAddFeed}
              size="sm"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isLoading || !newFeedUrl.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isLoading ? "Adding..." : "Add Feed"}
            </Button>
          </div>

          {/* Import/Export */}
          <div className={cn("flex gap-2 mb-4", isMobile && "flex-col")}>
            <Button
              variant="outline"
              size="sm"
              className={isMobile ? "flex-1" : "flex-1"}
              onClick={handleExportFeeds}
              disabled={feeds.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Feeds
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={isMobile ? "flex-1" : "flex-1"}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Feeds
            </Button>
          </div>
        </div>

        {/* Accent Color Section */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Accent Color
          </h3>
          <div className={cn("grid gap-3", isMobile ? "grid-cols-4" : "grid-cols-8")}>
            {accentColors.map((colorOption) => (
              <button
                key={colorOption.name}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 transition-all relative overflow-hidden group",
                  accentColor === colorOption.value
                    ? "border-ring shadow-lg scale-105"
                    : "border-border hover:border-muted-foreground hover:scale-102"
                )}
                onClick={() => handleAccentColorChange(colorOption.value)}
                style={{ backgroundColor: colorOption.hex }}
                title={colorOption.name}
              >
                {accentColor === colorOption.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-white drop-shadow-lg")} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {colorOption.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Refresh Limit Interval Section */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Rss className="w-4 h-4" />
            Feed Refresh Settings
          </h3>
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="text-sm">
              <label className="text-sm font-medium text-foreground">Refresh Limit Interval</label>
              <p className="text-xs text-muted-foreground mt-1">
                Minimum time between RSS feed refreshes. Set to "No limit" to refresh on every request.
              </p>
            </div>
            <Select value={refreshLimitInterval.toString()} onValueChange={handleRefreshLimitChange}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select refresh interval" />
              </SelectTrigger>
              <SelectContent>
                {refreshLimitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile-specific settings */}
        {isMobile && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Mobile Settings
            </h3>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground">
                Actionbar Padding
              </div>
              <Switch
                checked={mobileActionbarPadding}
                onCheckedChange={(checked) => dispatch(setMobileActionbarPadding(checked))}
              />
            </div>
          </div>
        )}

        {/* Feed Management Section */}
        {feeds.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              Manage Feeds ({feeds.length})
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Drag feeds to reorder them in the sidebar
            </p>
            <div className={cn("max-h-96 overflow-y-auto", isMobile && "max-h-80")}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={feeds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {feeds.map((feed) => (
                      <SortableFeedItem
                        key={feed.id}
                        feed={feed}
                        onRemove={handleRemoveFeed}
                        onRename={handleRenameFeed}
                        onMarkAllAsRead={handleMarkAllAsRead}
                        onMarkOlderThan30DaysAsRead={handleMarkOlderThan30DaysAsRead}
                        onMarkOlderThan2WeeksAsRead={handleMarkOlderThan2WeeksAsRead}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* Feed Statistics */}
        {feeds.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Feed Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-foreground">{feeds.length}</div>
                <div className="text-xs text-muted-foreground">Total Feeds</div>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-foreground">{totalUnread}</div>
                <div className="text-xs text-muted-foreground">Unread Articles</div>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {articles.filter(a => a.isStarred).length}
                </div>
                <div className="text-xs text-muted-foreground">Starred</div>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {articles.filter(a => a.isBookmarked).length}
                </div>
                <div className="text-xs text-muted-foreground">Bookmarked</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFeedsFromFile}
        className="hidden"
      />
      </div>
    </div>
  );
};

export default Settings;