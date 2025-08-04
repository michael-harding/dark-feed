import { useState, useEffect } from 'react';
import { FeedSidebar } from '@/components/FeedSidebar';
import { ArticleList } from '@/components/ArticleList';
import { ArticleReader } from '@/components/ArticleReader';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/rss-hero.jpg';

// Mock data for demonstration
const mockFeeds = [
  { id: '1', title: 'TechCrunch', url: 'https://techcrunch.com/feed/', unreadCount: 12 },
  { id: '2', title: 'The Verge', url: 'https://www.theverge.com/rss/', unreadCount: 8 },
  { id: '3', title: 'Hacker News', url: 'https://hnrss.org/frontpage', unreadCount: 25 },
  { id: '4', title: 'BBC Technology', url: 'http://feeds.bbci.co.uk/news/technology/rss.xml', unreadCount: 5 },
];

const mockArticles = [
  {
    id: '1',
    title: 'The Future of AI in Web Development',
    description: 'Exploring how artificial intelligence is transforming the way we build and maintain web applications, from automated testing to intelligent code generation.',
    content: `
      <p>Artificial Intelligence is revolutionizing web development in unprecedented ways. From automated code generation to intelligent testing frameworks, AI tools are becoming indispensable for modern developers.</p>
      
      <h2>Code Generation and Assistance</h2>
      <p>AI-powered code assistants like GitHub Copilot and ChatGPT are helping developers write code faster and more efficiently. These tools can:</p>
      <ul>
        <li>Generate boilerplate code automatically</li>
        <li>Suggest optimal solutions for complex problems</li>
        <li>Help debug and refactor existing code</li>
        <li>Provide documentation and explanations</li>
      </ul>
      
      <h2>Automated Testing</h2>
      <p>AI is making testing more intelligent by automatically generating test cases, identifying edge cases, and predicting potential failure points before they occur in production.</p>
      
      <blockquote>
        "The integration of AI in development workflows is not just a trend—it's becoming a necessity for staying competitive in the modern tech landscape."
      </blockquote>
      
      <p>As we move forward, we can expect even more sophisticated AI tools that will further streamline the development process while maintaining code quality and security standards.</p>
    `,
    url: 'https://example.com/ai-web-dev',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    feedId: '1',
    feedTitle: 'TechCrunch',
    isRead: false,
    isStarred: false,
    isBookmarked: false,
    author: 'Sarah Chen'
  },
  {
    id: '2',
    title: 'Modern CSS Frameworks: A Complete Guide',
    description: 'A comprehensive comparison of the latest CSS frameworks including Tailwind CSS, CSS-in-JS solutions, and utility-first approaches.',
    content: `
      <p>CSS frameworks have evolved significantly over the past few years. This guide explores the modern landscape of CSS frameworks and helps you choose the right one for your project.</p>
      
      <h2>Utility-First Frameworks</h2>
      <p>Tailwind CSS has popularized the utility-first approach, offering:</p>
      <ul>
        <li>Rapid prototyping capabilities</li>
        <li>Consistent design systems</li>
        <li>Smaller bundle sizes</li>
        <li>Better maintainability</li>
      </ul>
      
      <h2>CSS-in-JS Solutions</h2>
      <p>Libraries like styled-components and Emotion provide component-scoped styling with the full power of JavaScript.</p>
      
      <p>Choose based on your project needs, team expertise, and performance requirements.</p>
    `,
    url: 'https://example.com/css-frameworks',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    feedId: '2',
    feedTitle: 'The Verge',
    isRead: true,
    isStarred: true,
    isBookmarked: false,
    author: 'Michael Rodriguez'
  },
  {
    id: '3',
    title: 'Building Scalable React Applications',
    description: 'Best practices for structuring large React applications, including state management, component architecture, and performance optimization.',
    content: `
      <p>As React applications grow in complexity, following best practices becomes crucial for maintainability and performance.</p>
      
      <h2>Component Architecture</h2>
      <p>Organizing components effectively is key to scalable React apps:</p>
      <ul>
        <li>Follow the single responsibility principle</li>
        <li>Use composition over inheritance</li>
        <li>Implement proper prop drilling solutions</li>
        <li>Leverage custom hooks for reusable logic</li>
      </ul>
      
      <h2>State Management</h2>
      <p>Choose the right state management solution based on your app's complexity and requirements.</p>
    `,
    url: 'https://example.com/scalable-react',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    feedId: '3',
    feedTitle: 'Hacker News',
    isRead: false,
    isStarred: false,
    isBookmarked: true,
    author: 'Emma Thompson'
  },
];

const Index = () => {
  const [feeds, setFeeds] = useState(mockFeeds);
  const [articles, setArticles] = useState(mockArticles);
  const [selectedFeed, setSelectedFeed] = useState<string | null>('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [filteredArticles, setFilteredArticles] = useState(mockArticles);
  const { toast } = useToast();

  // Filter articles based on selected feed
  useEffect(() => {
    if (selectedFeed === 'all') {
      setFilteredArticles(articles);
    } else if (selectedFeed === 'starred') {
      setFilteredArticles(articles.filter(article => article.isStarred));
    } else if (selectedFeed === 'bookmarks') {
      setFilteredArticles(articles.filter(article => article.isBookmarked));
    } else {
      setFilteredArticles(articles.filter(article => article.feedId === selectedFeed));
    }
  }, [selectedFeed, articles]);

  const handleAddFeed = (url: string) => {
    // In a real app, this would parse the RSS feed and extract metadata
    const newFeed = {
      id: Date.now().toString(),
      title: `Feed ${feeds.length + 1}`,
      url,
      unreadCount: 0,
    };
    setFeeds([...feeds, newFeed]);
    toast({
      title: "Feed Added",
      description: `Successfully added ${url}`,
    });
  };

  const handleToggleStar = (articleId: string) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { ...article, isStarred: !article.isStarred }
        : article
    ));
  };

  const handleToggleBookmark = (articleId: string) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { ...article, isBookmarked: !article.isBookmarked }
        : article
    ));
  };

  const handleMarkAsRead = (articleId: string) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { ...article, isRead: true }
        : article
    ));

    // Update feed unread count
    const article = articles.find(a => a.id === articleId);
    if (article && !article.isRead) {
      setFeeds(prev => prev.map(feed => 
        feed.id === article.feedId 
          ? { ...feed, unreadCount: Math.max(0, feed.unreadCount - 1) }
          : feed
      ));
    }
  };

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <FeedSidebar
        feeds={feeds}
        selectedFeed={selectedFeed}
        onFeedSelect={setSelectedFeed}
        onAddFeed={handleAddFeed}
      />

      {/* Article List */}
      <ArticleList
        articles={filteredArticles}
        selectedArticle={selectedArticle}
        onArticleSelect={setSelectedArticle}
        onToggleStar={handleToggleStar}
        onToggleBookmark={handleToggleBookmark}
        onMarkAsRead={handleMarkAsRead}
      />

      {/* Article Reader */}
      <ArticleReader
        article={selectedArticleData || null}
        onToggleStar={handleToggleStar}
        onToggleBookmark={handleToggleBookmark}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default Index;