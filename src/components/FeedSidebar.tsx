import { useNavigate } from "react-router-dom";
import {
   Rss,
   Settings,
   Bookmark,
   Star,
   User,
   RefreshCw,
 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Feed } from "@/services/dataLayer";

interface FeedSidebarProps {
    feeds: Feed[];
    selectedFeed: string | null;
    onFeedSelect: (feedId: string) => void;
    onRefreshFeeds?: () => void;
    isLoading?: boolean;
  }


export const FeedSidebar = ({
    feeds,
    selectedFeed,
    onFeedSelect,
    onRefreshFeeds,
    isLoading = false,
  }: FeedSidebarProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

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
      </div>
    </div>
  );
};
