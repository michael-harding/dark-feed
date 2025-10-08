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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Feed } from "@/services/dataLayer";
import { UI_CONSTANTS } from "@/constants/ui";

interface FeedSidebarProps {
     feeds: Feed[];
     selectedFeed: string | null;
     onFeedSelect: (feedId: string) => void;
     onRefreshFeeds?: () => void;
     isLoading?: boolean;
     variant?: 'desktop' | 'mobile';
   }


export const FeedSidebar = ({
     feeds,
     selectedFeed,
     onFeedSelect,
     onRefreshFeeds,
     isLoading = false,
     variant = 'desktop',
   }: FeedSidebarProps) => {
   const dispatch = useAppDispatch();
   const navigate = useNavigate();
   const { user, profile } = useAuth();
   const { mobileActionbarPadding } = useAppSelector((state) => state.ui);

   const isMobile = variant === 'mobile';
   const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

   return (
     <div className={cn(
       "bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen",
       isMobile ? UI_CONSTANTS.SIDEBAR_WIDTH.MOBILE : UI_CONSTANTS.SIDEBAR_WIDTH.DESKTOP
     )}>
      {/* Header */}
      <div className={cn(
        UI_CONSTANTS.SPACING.DESKTOP,
        "border-b border-sidebar-border",
        isMobile && mobileActionbarPadding && "pt-10"
      )}>
        <div className={cn(
          "flex items-center gap-3",
          isMobile ? "mb-4" : "mb-6"
        )}>
          <div className='relative'>
            <div className={cn(
              "bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <Rss className={cn(
                "text-primary-foreground",
                isMobile ? UI_CONSTANTS.ICON_SIZES.MOBILE : UI_CONSTANTS.ICON_SIZES.DESKTOP
              )} />
            </div>
            <div className={cn(
              "bg-accent rounded-full flex items-center justify-center absolute",
              isMobile ? "-top-0.5 -right-0.5 w-3 h-3" : "-top-1 -right-1 w-4 h-4"
            )}>
              <div className={cn(
                "bg-primary-foreground rounded-full animate-pulse",
                isMobile ? "w-1.5 h-1.5" : "w-2 h-2"
              )} />
            </div>
          </div>
          <div className='flex-1'>
            <h1 className={cn(
              "font-bold text-foreground",
              isMobile ? UI_CONSTANTS.TEXT_SIZES.MOBILE : UI_CONSTANTS.TEXT_SIZES.DESKTOP
            )}>RSS Reader</h1>
            {(profile?.display_name || user?.email) && (
              <p className='text-sm text-muted-foreground font-medium'>
                <User className={cn(
                  "inline mr-1",
                  isMobile ? UI_CONSTANTS.ICON_SIZES.MOBILE : "w-4 h-4"
                )} />
                {profile?.display_name || user?.email?.split('@')[0] || 'User'}
              </p>
            )}
          </div>
          {isMobile && onRefreshFeeds && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onRefreshFeeds}
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                `${isLoading ? 'animate-spin' : ''}`,
                UI_CONSTANTS.ICON_SIZES.MOBILE
              )} />
            </Button>
          )}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/settings?isMobile=true')}
            >
              <Settings className={UI_CONSTANTS.ICON_SIZES.MOBILE} />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className={cn(
        UI_CONSTANTS.SPACING.MOBILE,
        "border-b border-sidebar-border"
      )}>
        <div className='space-y-2'>
          <button
            onClick={() => onFeedSelect("all")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFeed === "all"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Rss className={UI_CONSTANTS.ICON_SIZES.MOBILE} />
            <span className='flex-1'>All Articles</span>
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
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFeed === "starred"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Star className={UI_CONSTANTS.ICON_SIZES.MOBILE} />
            <span className='flex-1'>Starred</span>
          </button>

          <button
            onClick={() => onFeedSelect("bookmarks")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFeed === "bookmarks"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Bookmark className={UI_CONSTANTS.ICON_SIZES.MOBILE} />
            <span className='flex-1'>Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Feeds List */}
      <div className='flex-1 overflow-y-auto'>
        <div className={UI_CONSTANTS.SPACING.MOBILE}>
          <h3 className='text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide'>
            Feeds
          </h3>
          <div className='space-y-2'>
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
                <div className={cn(
                  "bg-muted rounded-full flex items-center justify-center flex-shrink-0",
                  isMobile ? "w-8 h-8" : "w-8 h-8"
                )}>
                  <Rss className={UI_CONSTANTS.ICON_SIZES.MOBILE} />
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

      {/* Footer - Only for desktop */}
      {!isMobile && (
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
                <RefreshCw className='w-4 h-4 mr-2' />
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
      )}
    </div>
  );
};
