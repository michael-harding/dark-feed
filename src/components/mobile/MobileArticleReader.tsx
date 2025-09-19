import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, Star, Bookmark, Share } from 'lucide-react';
import { parsePublishedDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Article } from '@/services/dataLayer';

interface MobileArticleReaderProps {
  article: Article | null;
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onBack: () => void;
}

export const MobileArticleReader = ({ article, onToggleStar, onToggleBookmark, onBack }: MobileArticleReaderProps) => {
  if (!article) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-accent-500 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Article Selected
          </h3>
          <p className="text-muted-foreground text-sm">
            Select an article from the list to start reading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Badge variant="outline" className="text-xs">
            {article.feedTitle}
          </Badge>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStar(article.id)}
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
            >
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
          {article.title}
        </h1>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {article.author && (
            <>
              <span>By {article.author}</span>
              <span>•</span>
            </>
          )}
          <span>{formatDistanceToNow(parsePublishedDate(article.publishedAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <article className="p-4">
          {/* Description */}
          {article.description && (
            <div className="text-base text-muted-foreground mb-6 font-medium leading-relaxed">
              {article.description}
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-invert max-w-none font-open-dyslexic prose-headings:text-foreground prose-headings:font-open-dyslexic prose-p:text-foreground prose-p:mb-4 prose-strong:text-foreground prose-a:text-accent prose-a:underline hover:prose-a:text-accent/80 prose-code:text-foreground prose-pre:bg-muted prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary prose-sm"
            dangerouslySetInnerHTML={{
              __html: article.content.replace(
                /<a\s+([^>]*?)>/gi,
                '<a $1 target="_blank" rel="noopener noreferrer">'
              )
            }}
          />
        </article>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open(article.url, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Read Original Article
        </Button>
      </div>
    </div>
  );
};