import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rss, Settings, Bookmark, Star, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { Feed } from '@/services/dataLayer';

interface MobileFeedSidebarProps {
   feeds: Feed[];
   selectedFeed: string | null;
   onFeedSelect: (feedId: string) => void;
   onRefreshFeeds?: () => void;
   isLoading?: boolean;
 }

export const MobileFeedSidebar = ({
   feeds,
   selectedFeed,
   onFeedSelect,
   onRefreshFeeds,
   isLoading = false
 }: MobileFeedSidebarProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accentColor, mobileActionbarPadding } = useAppSelector((state) => state.ui);
  const { user, profile, signOut } = useAuth();

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);


  return (
    <div className="h-screen bg-sidebar-bg flex flex-col">
      {/* Header */}
      <div className={cn("p-4 border-b border-sidebar-border", mobileActionbarPadding && "pt-10")}>
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
          {onRefreshFeeds && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onRefreshFeeds}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate('/settings?isMobile=true')}
          >
            <Settings className="w-4 h-4" />
          </Button>
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

    </div>
  );
};