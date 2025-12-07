import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Magazine } from '@/types/database';
import { formatReadTime } from '@/lib/readTime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface MagazineViewerProps {
  magazine: Magazine;
  onBack: () => void;
}

export function MagazineViewer({ magazine, onBack }: MagazineViewerProps) {
  const statusColors = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    approved: 'bg-success/10 text-success border-success/20',
    disapproved: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <article className="mx-auto max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-6 -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to IITD Dashboard
      </Button>

      {/* Hero Image */}
      {magazine.hero_image_url && (
        <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-2xl bg-muted">
          <img
            src={magazine.hero_image_url}
            alt={magazine.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              console.error('Failed to load image:', magazine.hero_image_url);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <Badge variant="outline" className={`mb-4 ${statusColors[magazine.status]}`}>
          {magazine.status.charAt(0).toUpperCase() + magazine.status.slice(1)}
        </Badge>

        <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
          {magazine.title}
        </h1>

        {magazine.subtitle && (
          <p className="mt-4 text-xl text-muted-foreground leading-relaxed">
            {magazine.subtitle}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">{magazine.author_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(magazine.created_at), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatReadTime(magazine.read_time_minutes)}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {magazine.body_markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}
