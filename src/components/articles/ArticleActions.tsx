import { ExternalLink, Star, Bookmark, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Article } from '@/services/dataLayer';

interface ArticleActionsProps {
  article: Article;
  variant?: 'buttons' | 'dropdown';
  onToggleStar: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
  onOpenOriginal: (url: string) => void;
}

export const ArticleActions = ({
  article,
  variant = 'buttons',
  onToggleStar,
  onToggleBookmark,
  onMarkAsRead,
  onOpenOriginal
}: ArticleActionsProps) => {
  const actions = [
    {
      icon: article.isRead ? EyeOff : Eye,
      label: article.isRead ? 'Mark as unread' : 'Mark as read',
      handler: () => onMarkAsRead(article.id),
      className: article.isRead ? 'text-muted-foreground' : 'text-feed-unread'
    },
    {
      icon: Star,
      label: article.isStarred ? 'Remove star' : 'Add star',
      handler: () => onToggleStar(article.id),
      className: article.isStarred ? 'fill-feed-unread text-feed-unread' : 'text-muted-foreground'
    },
    {
      icon: Bookmark,
      label: article.isBookmarked ? 'Remove bookmark' : 'Add bookmark',
      handler: () => onToggleBookmark(article.id),
      className: article.isBookmarked ? 'fill-feed-unread text-feed-unread' : 'text-muted-foreground'
    },
    {
      icon: ExternalLink,
      label: 'Open original',
      handler: () => onOpenOriginal(article.url),
      className: 'text-muted-foreground'
    }
  ];

  if (variant === 'dropdown') {
    return (
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
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.handler();
              }}
            >
              <action.icon className={cn("w-4 h-4 mr-2", action.className)} />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            action.handler();
          }}
          className="h-6 w-6 p-0"
          title={action.label}
        >
          <action.icon className={cn("w-3 h-3", action.className)} />
        </Button>
      ))}
    </div>
  );
};