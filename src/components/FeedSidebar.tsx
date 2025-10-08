import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rss,
  Settings,
  Bookmark,
  Star,
  Trash2,
  GripVertical,
  MoreVertical,
  Edit,
  Check,
  User,
  RefreshCw,
} from "lucide-react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { faviconGenerator } from "@/utils/faviconGenerator";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAccentColor } from "@/store/slices/uiSlice";
import { useAuth } from "@/hooks/useAuth";
import { Feed } from "@/services/dataLayer";

interface FeedSidebarProps {
  feeds: Feed[];
  selectedFeed: string | null;
  onFeedSelect: (feedId: string) => void;
  onAddFeed: (url: string) => void;
  onImportFeeds: (feeds: Feed[]) => void;
  onRemoveFeed: (feedId: string) => void;
  onRenameFeed: (feedId: string, newTitle: string) => void;
  onReorderFeeds: (reorderedFeeds: Feed[]) => void;
  onRefreshFeeds?: () => void;
  isLoading?: boolean;
}

// Sortable Feed Item Component
interface SortableFeedItemProps {
  feed: Feed;
  onRemove: (feedId: string) => void;
  onRename: (feedId: string, newTitle: string) => void;
}

const SortableFeedItem = ({
  feed,
  onRemove,
  onRename
}: SortableFeedItemProps) => {
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
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setRenameValue(feed.title);
      setIsRenaming(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='flex items-center gap-3 p-3 border rounded-lg bg-card'
    >
      <button
        {...attributes}
        {...listeners}
        className='cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors'
        aria-label='Drag to reorder'
      >
        <GripVertical className='w-4 h-4 text-muted-foreground' />
      </button>
      <div className='w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0'>
        <Rss className='w-4 h-4' />
      </div>
      <div className='flex-1 min-w-0'>
        {isRenaming ? (
          <div className='flex items-center gap-1'>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className='h-6 text-sm font-medium flex-1'
              autoFocus
            />
            <Button
              size='sm'
              variant='ghost'
              className='h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground'
              onClick={handleRename}
            >
              <Check className='w-3 h-3' />
            </Button>
          </div>
        ) : (
          <p className='font-medium truncate'>{feed.title}</p>
        )}
        <p className='text-xs text-muted-foreground truncate max-w-96'>
          {feed.url}
        </p>
      </div>
      <Badge
        variant='secondary'
        className='bg-feed-unread text-primary-foreground'
      >
        {feed.unreadCount}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-muted'
          >
            <MoreVertical className='w-4 h-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => {
              setRenameValue(feed.title);
              setIsRenaming(true);
            }}
          >
            <Edit className='w-4 h-4 mr-2' />
            Rename Feed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRemove(feed.id)}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='w-4 h-4 mr-2' />
            Delete Feed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const FeedSidebar = ({
  feeds,
  selectedFeed,
  onFeedSelect,
  onAddFeed,
  onImportFeeds,
  onRemoveFeed,
  onRenameFeed,
  onReorderFeeds,
  onRefreshFeeds,
  isLoading = false,
}: FeedSidebarProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accentColor } = useAppSelector((state) => state.ui);
  const { user, profile, signOut } = useAuth();
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Predefined accent colors
  const accentColors = [
    { name: "Yellow", value: "46 87% 65%", hex: "#fbbf24" },
    { name: "Blue", value: "217 91% 60%", hex: "#3b82f6" },
    { name: "Green", value: "142 76% 36%", hex: "#10b981" },
    { name: "Purple", value: "262 83% 58%", hex: "#8b5cf6" },
    { name: "Pink", value: "330 81% 60%", hex: "#ec4899" },
    { name: "Orange", value: "25 95% 53%", hex: "#f97316" },
    { name: "Red", value: "0 84% 60%", hex: "#ef4444" },
    { name: "Teal", value: "173 80% 40%", hex: "#14b8a6" },
  ];

  // Update CSS variables when accent color changes
  const updateAccentColor = (color: string) => {
    // Parse the HSL color string (e.g., "46 87% 65%")
    const [hue, saturation, lightness] = color.split(" ");
    const h = parseInt(hue);
    const s = parseInt(saturation.replace("%", ""));
    const l = parseInt(lightness.replace("%", ""));

    // Update main accent color
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--ring", color);
    document.documentElement.style.setProperty("--feed-unread", color);

    // Generate and update all accent shades
    const shades = [
      { name: "50", lightness: Math.min(95, l + 30) },
      { name: "100", lightness: Math.min(90, l + 25) },
      { name: "200", lightness: Math.min(85, l + 20) },
      { name: "300", lightness: Math.min(80, l + 15) },
      { name: "400", lightness: Math.min(75, l + 10) },
      { name: "500", lightness: l }, // Default
      { name: "600", lightness: Math.max(10, l - 10) },
      { name: "700", lightness: Math.max(15, l - 20) },
      { name: "800", lightness: Math.max(20, l - 30) },
      { name: "900", lightness: Math.max(25, l - 40) },
      { name: "950", lightness: Math.max(15, l - 50) },
    ];

    shades.forEach((shade) => {
      const shadeColor = `${h} ${s}% ${shade.lightness}%`;
      document.documentElement.style.setProperty(
        `--accent-${shade.name}`,
        shadeColor
      );
    });
  };

  const handleAccentColorChange = (color: string) => {
    dispatch(setAccentColor(color));
    updateAccentColor(color);

    // Update favicon to match new accent color
    faviconGenerator.generateAndUpdateFavicon(color);
  };

  const handleAddFeed = () => {
    if (newFeedUrl.trim()) {
      onAddFeed(newFeedUrl.trim());
      setNewFeedUrl("");
      setShowAddFeed(false);
    }
  };

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

  const handleExportFeeds = () => {
    const exportData = {
      feeds,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rss-feeds-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFeeds = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        if (importData.feeds && Array.isArray(importData.feeds)) {
          onImportFeeds(importData.feeds);
        } else {
          alert("Invalid feed file format");
        }
      } catch (error) {
        alert("Failed to import feeds. Please check the file format.");
      }
    };
    reader.readAsText(file);

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = feeds.findIndex((feed) => feed.id === active.id);
      const newIndex = feeds.findIndex((feed) => feed.id === over.id);

      const reorderedFeeds = arrayMove(feeds, oldIndex, newIndex);
      onReorderFeeds(reorderedFeeds);
    }
  };

  return (
    <div className='w-80 bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen'>
      {/* Header */}
      <div className='p-6 border-b border-sidebar-border'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='relative'>
            <div className='w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg'>
              <Rss className='w-6 h-6 text-primary-foreground' />
            </div>
            <div className='absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center'>
              <div className='w-2 h-2 bg-primary-foreground rounded-full animate-pulse' />
            </div>
          </div>
          <div className='flex-1'>
            <h1 className='text-xl font-bold text-foreground'>RSS Reader</h1>
            {profile?.display_name && (
              <p className='text-sm text-muted-foreground font-medium'>
                <User className='w-4 h-4 inline mt-0 mr-1' />
                {profile.display_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className='p-4 border-b border-sidebar-border'>
        <div className='space-y-2'>
          <button
            onClick={() => onFeedSelect("all")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              selectedFeed === "all"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Rss className='w-4 h-4' />
            <span className='flex-1 text-left'>All Articles</span>
            {totalUnread > 0 && (
              <Badge
                variant='secondary'
                className='bg-feed-unread text-primary-foreground'
              >
                {totalUnread}
              </Badge>
            )}
          </button>

          <button
            onClick={() => onFeedSelect("starred")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              selectedFeed === "starred"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Star className='w-4 h-4' />
            <span className='flex-1 text-left'>Starred</span>
          </button>

          <button
            onClick={() => onFeedSelect("bookmarks")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              selectedFeed === "bookmarks"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Bookmark className='w-4 h-4' />
            <span className='flex-1 text-left'>Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Feeds List */}
      <div className='flex-1 overflow-y-auto'>
        <div className='p-4'>
          <h3 className='text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide'>
            Feeds
          </h3>
          <div className='space-y-1'>
            {feeds.map((feed) => (
              <button
                key={feed.id}
                onClick={() => onFeedSelect(feed.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedFeed === feed.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <div className='w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0'>
                  <Rss className='w-4 h-4' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium truncate'>{feed.title}</p>
                  <p className='text-xs text-muted-foreground truncate'>
                    {feed.url}
                  </p>
                </div>
                {feed.unreadCount > 0 && (
                  <Badge
                    variant='secondary'
                    className='bg-feed-unread text-primary-foreground'
                  >
                    {feed.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='p-4 border-t border-sidebar-border'>
        <div className='flex gap-2'>
          {onRefreshFeeds && (
            <Button
              variant='ghost'
              size='sm'
              className='flex-1 justify-start'
              onClick={onRefreshFeeds}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
          <Button
            variant='ghost'
            size='sm'
            className={
              onRefreshFeeds ? "flex-1 justify-start" : "w-full justify-start"
            }
            onClick={() => navigate("/settings")}
          >
            <Settings className='w-4 h-4 mr-2' />
            Settings
          </Button>
        </div>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type='file'
          accept='.json'
          onChange={handleImportFeeds}
          className='hidden'
        />
      </div>
    </div>
  );
};
