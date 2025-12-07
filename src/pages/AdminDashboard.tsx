import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MagazineCard } from '@/components/magazine/MagazineCard';
import { MagazineViewer } from '@/components/magazine/MagazineViewer';
import { useMagazines } from '@/hooks/useMagazines';
import { Magazine, MagazineStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Clock, CheckCircle, XCircle, Users } from 'lucide-react';

type ViewMode = 'grid' | 'viewer';

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { magazines, loading, deleteMagazine, updateStatus } = useMagazines();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
  const [statusFilter, setStatusFilter] = useState<MagazineStatus | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [magazineToDelete, setMagazineToDelete] = useState<Magazine | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
    if (!authLoading && role !== 'admin') {
      navigate('/dashboard/user', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const filteredMagazines = statusFilter === 'all'
    ? magazines
    : magazines.filter((m) => m.status === statusFilter);

  const stats = {
    total: magazines.length,
    pending: magazines.filter((m) => m.status === 'pending').length,
    approved: magazines.filter((m) => m.status === 'approved').length,
    disapproved: magazines.filter((m) => m.status === 'disapproved').length,
    authors: new Set(magazines.map((m) => m.author_id)).size,
  };

  const handleView = (magazine: Magazine) => {
    setSelectedMagazine(magazine);
    setViewMode('viewer');
  };

  const handleDelete = (magazine: Magazine) => {
    setMagazineToDelete(magazine);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!magazineToDelete) return;

    const { error } = await deleteMagazine(magazineToDelete.id);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete submission.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Submission deleted',
        description: 'The submission has been deleted successfully.',
      });
    }

    setDeleteDialogOpen(false);
    setMagazineToDelete(null);
  };

  const handleApprove = async (magazine: Magazine) => {
    const { error } = await updateStatus(magazine.id, 'approved');
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve submission.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Submission approved',
        description: `"${magazine.title}" has been approved.`,
      });
    }
  };

  const handleDisapprove = async (magazine: Magazine) => {
    const { error } = await updateStatus(magazine.id, 'disapproved');
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to disapprove submission.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Submission disapproved',
        description: `"${magazine.title}" has been disapproved.`,
      });
    }
  };

  const handleBack = () => {
    setViewMode('grid');
    setSelectedMagazine(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (viewMode === 'viewer' && selectedMagazine) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <MagazineViewer magazine={selectedMagazine} onBack={handleBack} />
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      description="Manage IITD Research submissions and approvals"
    >
      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-warning/10 p-3">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-success/10 p-3">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-destructive/10 p-3">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.disapproved}</p>
              <p className="text-sm text-muted-foreground">Disapproved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent p-3">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.authors}</p>
              <p className="text-sm text-muted-foreground">Authors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MagazineStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="disapproved">Disapproved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredMagazines.length} submission{filteredMagazines.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Magazine Grid */}
      {filteredMagazines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 py-20">
          <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
          <h3 className="font-display text-xl font-semibold text-foreground">No submissions found</h3>
          <p className="mt-2 text-muted-foreground">
            {statusFilter === 'all' ? 'No submissions have been created yet' : `No ${statusFilter} submissions`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMagazines.map((magazine, index) => (
            <div
              key={magazine.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MagazineCard
                magazine={magazine}
                isAdmin
                onView={() => handleView(magazine)}
                onDelete={() => handleDelete(magazine)}
                onApprove={() => handleApprove(magazine)}
                onDisapprove={() => handleDisapprove(magazine)}
              />
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{magazineToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
