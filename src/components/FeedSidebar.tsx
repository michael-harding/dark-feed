import { useState, useRef, useEffect } from 'react';
import { Plus, Rss, Settings, Bookmark, Star, Download, Upload, Trash2, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { faviconGenerator } from '@/utils/faviconGenerator';

interface Feed {
  id: string;
  title: string;
  url: string;
  unreadCount: number;
  category?: string;
}

interface FeedSidebarProps {
  feeds: Feed[];
  selectedFeed: string | null;
  onFeedSelect: (feedId: string) => void;
  onAddFeed: (url: string) => void;
  onImportFeeds: (feeds: Feed[]) => void;
  onRemoveFeed: (feedId: string) => void;
  isLoading?: boolean;
}

export const FeedSidebar = ({ feeds, selectedFeed, onFeedSelect, onAddFeed, onImportFeeds, onRemoveFeed, isLoading = false }: FeedSidebarProps) => {
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [accentColor, setAccentColor] = useState('46 87% 65%'); // Default yellow accent
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

  // Load saved accent color on mount
  useEffect(() => {
    const saved = localStorage.getItem('rss-accent-color');
    if (saved) {
      setAccentColor(saved);
      updateAccentColor(saved);
    }
    
    // Initialize favicon generator
    faviconGenerator.loadBaseImage().catch(console.error);
  }, []);

  // Update CSS variables when accent color changes
  const updateAccentColor = (color: string) => {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--ring', color);
    document.documentElement.style.setProperty('--feed-unread', color);
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    updateAccentColor(color);
    localStorage.setItem('rss-accent-color', color);
    
    // Update favicon to match new accent color
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
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-80 bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg">
              <Rss className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">RSS Reader</h1>
            <p className="text-sm text-muted-foreground">
              {totalUnread} unread articles
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowAddFeed(true)} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
          size="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add RSS Feed
        </Button>
      </div>

      {/* Add Feed Form */}
      {showAddFeed && (
        <div className="p-4 border-b border-sidebar-border bg-muted/30">
          <div className="space-y-3">
            <Input
              placeholder="Enter RSS feed URL..."
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
              className="bg-background"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleAddFeed} 
                size="sm" 
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add"}
              </Button>
              <Button 
                onClick={() => setShowAddFeed(false)} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="space-y-2">
          <button
            onClick={() => onFeedSelect('all')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              selectedFeed === 'all' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Rss className="w-4 h-4" />
            <span className="flex-1 text-left">All Articles</span>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="bg-feed-unread text-primary-foreground">
                {totalUnread}
              </Badge>
            )}
          </button>
          
          <button
            onClick={() => onFeedSelect('starred')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              selectedFeed === 'starred' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Star className="w-4 h-4" />
            <span className="flex-1 text-left">Starred</span>
          </button>
          
          <button
            onClick={() => onFeedSelect('bookmarks')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              selectedFeed === 'bookmarks' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Bookmark className="w-4 h-4" />
            <span className="flex-1 text-left">Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Feeds List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Feeds
          </h3>
          <div className="space-y-1">
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

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-start"
            onClick={handleExportFeeds}
            disabled={feeds.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-start"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-6">
              {/* Accent Color Section */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Accent Color
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleAccentColorChange(color.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        accentColor === color.value 
                          ? "border-accent bg-accent/10" 
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs font-medium">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manage Feeds Section */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Manage Feeds</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {feeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    No feeds added yet. Add a feed to get started.
                  </p>
                ) : (
                  feeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <Rss className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{feed.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                      </div>
                      <Badge variant="secondary" className="bg-feed-unread text-primary-foreground">
                        {feed.unreadCount}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveFeed(feed.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFeeds}
          className="hidden"
        />
      </div>
    </div>
  );
};