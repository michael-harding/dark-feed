import { useState, useRef } from 'react';
import { Plus, Rss, Settings, Bookmark, Star, Download, Upload, Trash2, Palette, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { faviconGenerator } from '@/utils/faviconGenerator';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAccentColor } from '@/store/slices/uiSlice';
import { useAuth } from '@/hooks/useAuth';
import { Feed } from '@/services/dataLayer';

interface MobileFeedSidebarProps {
  feeds: Feed[];
  selectedFeed: string | null;
  onFeedSelect: (feedId: string) => void;
  onAddFeed: (url: string) => void;
  onImportFeeds: (feeds: Feed[]) => void;
  onRemoveFeed: (feedId: string) => void;
  onRenameFeed: (feedId: string, newTitle: string) => void;
  onMarkAllAsRead: (feedId: string) => void;
  onReorderFeeds: (reorderedFeeds: Feed[]) => void;
  isLoading?: boolean;
}

export const MobileFeedSidebar = ({
  feeds,
  selectedFeed,
  onFeedSelect,
  onAddFeed,
  onImportFeeds,
  onRemoveFeed,
  onRenameFeed,
  onMarkAllAsRead,
  onReorderFeeds,
  isLoading = false
}: MobileFeedSidebarProps) => {
  const dispatch = useAppDispatch();
  const { accentColor } = useAppSelector((state) => state.ui);
  const { user, profile, signOut } = useAuth();
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const updateAccentColor = (color: string) => {
    const [hue, saturation, lightness] = color.split(' ');
    const h = parseInt(hue);
    const s = parseInt(saturation.replace('%', ''));
    const l = parseInt(lightness.replace('%', ''));

    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--ring', color);
    document.documentElement.style.setProperty('--feed-unread', color);

    const shades = [
      { name: '50', lightness: Math.min(95, l + 30) },
      { name: '100', lightness: Math.min(90, l + 25) },
      { name: '200', lightness: Math.min(85, l + 20) },
      { name: '300', lightness: Math.min(80, l + 15) },
      { name: '400', lightness: Math.min(75, l + 10) },
      { name: '500', lightness: l },
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
    faviconGenerator.generateAndUpdateFavicon(color);
  };

  const handleAddFeed = () => {
    if (newFeedUrl.trim()) {
      onAddFeed(newFeedUrl.trim());
      setNewFeedUrl('');
      setShowAddFeed(false);
    }
  };

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

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
          alert('Invalid feed file format');
        }
      } catch (error) {
        alert('Failed to import feeds. Please check the file format.');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-screen bg-sidebar-bg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border pt-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg">
              <Rss className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">RSS Reader</h1>
            {profile?.display_name && (
              <p className="text-xs text-muted-foreground font-medium">
                <User className="w-3 h-3 inline mr-1" />
                {profile.display_name}
              </p>
            )}
          </div>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                {/* User Account Section */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Account
                  </h3>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Signed in as:</span>
                      <div className="font-medium text-foreground mt-1 break-all">{user?.email}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        await signOut();
                        setShowSettings(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>

                {/* Add Feed Form */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Add New Feed</h3>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter RSS feed URL..."
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
                      className="bg-background text-sm"
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
                </div>

                {/* Import/Export */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Import/Export</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleExportFeeds}
                      disabled={feeds.length === 0}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                  </div>
                </div>

                {/* Accent Color Section */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Theme Color
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {accentColors.map((colorOption) => (
                      <button
                        key={colorOption.name}
                        className={cn(
                          "w-full aspect-square rounded-lg border-2 transition-all relative overflow-hidden",
                          accentColor === colorOption.value
                            ? "border-ring shadow-lg scale-105"
                            : "border-border hover:border-muted-foreground"
                        )}
                        onClick={() => handleAccentColorChange(colorOption.value)}
                        style={{ backgroundColor: colorOption.hex }}
                        title={colorOption.name}
                      >
                        {accentColor === colorOption.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="space-y-2">
          <button
            onClick={() => onFeedSelect('all')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFeed === 'all' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Rss className="w-4 h-4" />
            <span className="flex-1">All Articles</span>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="bg-feed-unread text-primary-foreground">
                {totalUnread}
              </Badge>
            )}
          </button>

          <button
            onClick={() => onFeedSelect('starred')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFeed === 'starred' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Star className="w-4 h-4" />
            <span className="flex-1">Starred</span>
          </button>

          <button
            onClick={() => onFeedSelect('bookmarks')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFeed === 'bookmarks' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Bookmark className="w-4 h-4" />
            <span className="flex-1">Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Feeds List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Feeds
          </h3>
          <div className="space-y-2">
            {feeds.map((feed) => (
              <button
                key={feed.id}
                onClick={() => onFeedSelect(feed.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedFeed === feed.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <Rss className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{feed.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                </div>
                {feed.unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-feed-unread text-primary-foreground">
                    {feed.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFeeds}
        className="hidden"
      />
    </div>
  );
};