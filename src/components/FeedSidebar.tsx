import { useState, useRef } from 'react';
import { Plus, Rss, Settings, Bookmark, Star, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  isLoading?: boolean;
}

export const FeedSidebar = ({ feeds, selectedFeed, onFeedSelect, onAddFeed, onImportFeeds, isLoading = false }: FeedSidebarProps) => {
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Rss className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">RSS Reader</h1>
            <p className="text-sm text-muted-foreground">
              {totalUnread} unread articles
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowAddFeed(true)} 
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Feed
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
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
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