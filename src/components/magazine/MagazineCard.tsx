import { Magazine, MagazineStatus } from '@/types/database';
import { formatReadTime } from '@/lib/readTime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface MagazineCardProps {
  magazine: Magazine;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onApprove?: () => void;
  onDisapprove?: () => void;
}

const statusConfig: Record<MagazineStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle },
  disapproved: { label: 'Disapproved', variant: 'destructive', icon: XCircle },
};

export function MagazineCard({
  magazine,
  isAdmin = false,
  onEdit,
  onDelete,
  onView,
  onApprove,
  onDisapprove,
}: MagazineCardProps) {
  const status = statusConfig[magazine.status];
  const StatusIcon = status.icon;

  return (
    <Card className="group overflow-hidden border-border/50 bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {magazine.hero_image_url || magazine.hero_thumbnail_url ? (
          <img
            src={magazine.hero_thumbnail_url || magazine.hero_image_url}
            alt={magazine.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Fallback to full image if thumbnail fails
              if (magazine.hero_thumbnail_url && e.currentTarget.src !== magazine.hero_image_url) {
                e.currentTarget.src = magazine.hero_image_url || '';
              } else {
                // Hide image if both fail
                e.currentTarget.style.display = 'none';
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/30">
            <span className="font-display text-3xl text-primary/40">IITD</span>
          </div>
        )}
        
        <div className="absolute right-2 top-2">
          <Badge variant={status.variant} className="gap-1 shadow-sm">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2 leading-tight">
              {magazine.title}
            </h3>
            {magazine.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {magazine.subtitle}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {isAdmin && onApprove && magazine.status !== 'approved' && (
                <DropdownMenuItem onClick={onApprove} className="text-success">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
              )}
              {isAdmin && onDisapprove && magazine.status !== 'disapproved' && (
                <DropdownMenuItem onClick={onDisapprove} className="text-warning">
                  <XCircle className="mr-2 h-4 w-4" />
                  Disapprove
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium">{magazine.author_name}</span>
          <span>•</span>
          <span>{format(new Date(magazine.created_at), 'MMM d, yyyy')}</span>
          <span>•</span>
          <span>{formatReadTime(magazine.read_time_minutes)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
