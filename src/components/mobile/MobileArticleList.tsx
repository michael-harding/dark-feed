import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, Star, Bookmark, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { parsePublishedDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Article, Feed } from '@/services/dataLayer';
import { useAppSelector } from '@/store/hooks';

interface MobileArticleListProps {
  articles: Article[];
  selectedArticle: string | null;
  onArticleSelect: (articleId: string) => void;
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
  sortMode: 'chronological' | 'unreadOnTop';
  onToggleSortMode: () => void;
  onBack: () => void;
  selectedFeed: string | null;
  feeds: Feed[];
  isLoading?: boolean;
}

export const MobileArticleList = ({
  articles,
  selectedArticle,
  onArticleSelect,
  onToggleStar,
  onToggleBookmark,
  onMarkAsRead,
  sortMode,
  onToggleSortMode,
  onBack,
  selectedFeed,
  feeds,
  isLoading = false
}: MobileArticleListProps) => {
  const sortedArticles = [...articles].sort((a, b) => a.sortOrder - b.sortOrder);
  const { mobileActionbarPadding } = useAppSelector((state) => state.ui);

  // Show loading state when feeds are loading or when we have a selected feed but no articles yet
  const showLoading = isLoading || (selectedFeed && articles.length === 0 && feeds.length === 0);

  const getFeedTitle = () => {
    if (selectedFeed === 'all') return 'All Articles';
    if (selectedFeed === 'starred') return 'Starred Articles';
    if (selectedFeed === 'bookmarks') return 'Bookmarked Articles';
    const feed = feeds.find(f => f.id === selectedFeed);
    return feed?.title || 'Articles';
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className={cn("p-4 border-b border-border bg-card", mobileActionbarPadding && "pt-10")}>
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{getFeedTitle()}</h2>
            <p className="text-sm text-muted-foreground">
              {articles.filter(a => !a.isRead).length} unread of {articles.length} total
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSortMode}
            className="text-xs px-2 py-1 h-7"
          >
            {sortMode === 'chronological' ? 'Chronological' : 'Unread First'}
          </Button>
        </div>
      </div>

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto">
        {showLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No articles found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add some RSS feeds to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedArticles.map((article) => (
              <div
                key={article.id}
                className={cn(
                  "p-4 transition-colors",
                  selectedArticle === article.id && "bg-accent-950",
                  !article.isRead && "border-l-4 border-l-feed-unread"
                )}
              >
                <div className="space-y-3">
                  {/* Feed Badge and Actions */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {article.feedTitle}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(article.id);
                          }}
                        >
                          {article.isRead ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Mark as unread
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Mark as read
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(article.id);
                          }}
                        >
                          <Star className={cn(
                            "w-4 h-4 mr-2",
                            article.isStarred ? "fill-feed-unread text-feed-unread" : ""
                          )} />
                          {article.isStarred ? 'Remove star' : 'Add star'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(article.id);
                          }}
                        >
                          <Bookmark className={cn(
                            "w-4 h-4 mr-2",
                            article.isBookmarked ? "fill-feed-unread text-feed-unread" : ""
                          )} />
                          {article.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(article.url, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open original
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title */}
                  <div onClick={() => onArticleSelect(article.id)} className="cursor-pointer">
                    <h3 className={cn(
                      "font-medium leading-tight transition-colors",
                      !article.isRead ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
                      {article.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {article.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                      {article.author && (
                        <>
                          <span>{article.author}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDistanceToNow(parsePublishedDate(article.publishedAt), { addSuffix: true })}</span>
                      {!article.isRead && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-feed-unread rounded-full" />
                            <span>Unread</span>
                          </div>
                        </>
                      )}
                      {article.isStarred && (
                        <>
                          <span>•</span>
                          <Star className="w-3 h-3 fill-feed-unread text-feed-unread" />
                        </>
                      )}
                      {article.isBookmarked && (
                        <>
                          <span>•</span>
                          <Bookmark className="w-3 h-3 fill-feed-unread text-feed-unread" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};