import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Star, Bookmark, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  publishedAt: Date;
  feedId: string;
  feedTitle: string;
  isRead: boolean;
  isStarred: boolean;
  isBookmarked: boolean;
  author?: string;
}

interface ArticleListProps {
  articles: Article[];
  selectedArticle: string | null;
  onArticleSelect: (articleId: string) => void;
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
}

export const ArticleList = ({
  articles,
  selectedArticle,
  onArticleSelect,
  onToggleStar,
  onToggleBookmark,
  onMarkAsRead
}: ArticleListProps) => {
  return (
    <div className="w-96 bg-article-bg border-r border-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Articles</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {articles.filter(a => !a.isRead).length} unread of {articles.length} total
        </p>
      </div>

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto">
        {articles.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No articles found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add some RSS feeds to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <div
                key={article.id}
                className={cn(
                  "p-4 cursor-pointer transition-colors hover:bg-article-hover",
                  selectedArticle === article.id && "bg-accent-950",
                  !article.isRead && "border-l-4 border-l-feed-unread"
                )}
                onClick={() => {
                  onArticleSelect(article.id);
                  if (!article.isRead) {
                    onMarkAsRead(article.id);
                  }
                }}
              >
                <div className="space-y-3">
                  {/* Feed Badge */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {article.feedTitle}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(article.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Star
                          className={cn(
                            "w-3 h-3",
                            article.isStarred ? "fill-feed-unread text-feed-unread" : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(article.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Bookmark
                          className={cn(
                            "w-3 h-3",
                            article.isBookmarked ? "fill-feed-unread text-feed-unread" : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(article.url, '_blank');
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={cn(
                    "font-medium leading-tight",
                    !article.isRead ? "text-bright-foreground" : "text-muted-foreground"
                  )}>
                    {article.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {article.author && (
                      <>
                        <span>{article.author}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
                    {!article.isRead && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-feed-unread rounded-full" />
                          <span>Unread</span>
                        </div>
                      </>
                    )}
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