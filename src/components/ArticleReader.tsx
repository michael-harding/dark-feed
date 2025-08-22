import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Star, Bookmark, Share, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface ArticleReaderProps {
  article: Article | null;
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onClose: () => void;
}

export const ArticleReader = ({ article, onToggleStar, onToggleBookmark, onClose }: ArticleReaderProps) => {
  if (!article) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-accent-500 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Welcome to RSS Reader
          </h3>
          <p className="text-muted-foreground mb-6">
            Select an article from the sidebar to start reading, or add some RSS feeds to get started.
          </p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>• Browse articles from your favorite feeds</p>
            <p>• Star important articles for later</p>
            <p>• Bookmark articles to read offline</p>
            <p>• Enjoy a clean, distraction-free reading experience</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="md:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Badge variant="outline">
            {article.feedTitle}
          </Badge>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStar(article.id)}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  article.isStarred ? "fill-feed-unread text-feed-unread" : "text-muted-foreground"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleBookmark(article.id)}
            >
              <Bookmark
                className={cn(
                  "w-4 h-4",
                  article.isBookmarked ? "fill-feed-unread text-feed-unread" : "text-muted-foreground"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.share?.({ title: article.title, url: article.url })}
            >
              <Share className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(article.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Original
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground leading-tight mb-3">
          {article.title}
        </h1>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {article.author && (
            <>
              <span>By {article.author}</span>
              <span>•</span>
            </>
          )}
          <span>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto p-8">
          {/* Description */}
          {article.description && (
            <div className="text-lg text-muted-foreground mb-8 font-medium leading-relaxed line-clamp-5">
              {article.description}
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-invert max-w-none font-open-dyslexic prose-headings:text-foreground prose-headings:font-open-dyslexic prose-p:text-foreground prose-p:mb-4 prose-strong:text-foreground prose-a:text-accent prose-a:underline hover:prose-a:text-accent/80 prose-code:text-foreground prose-pre:bg-muted prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary"
            dangerouslySetInnerHTML={{
              __html: article.content.replace(
                /<a\s+([^>]*?)>/gi,
                '<a $1 target="_blank" rel="noopener noreferrer">'
              )
            }}
          />
        </article>
      </div>
    </div>
  );
};