import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MagazineCard } from '@/components/magazine/MagazineCard';
import { MagazineEditor } from '@/components/magazine/MagazineEditor';
import { MagazineViewer } from '@/components/magazine/MagazineViewer';
import { useMagazines } from '@/hooks/useMagazines';
import { Magazine } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, BookOpen } from 'lucide-react';

type ViewMode = 'grid' | 'editor' | 'viewer';

export default function UserDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { magazines, loading, createMagazine, updateMagazine, deleteMagazine } = useMagazines({ mine: true });
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [magazineToDelete, setMagazineToDelete] = useState<Magazine | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
    if (!authLoading && role === 'admin') {
      navigate('/dashboard/admin', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleCreateNew = () => {
    setSelectedMagazine(null);
    setViewMode('editor');
  };

  const handleEdit = (magazine: Magazine) => {
    setSelectedMagazine(magazine);
    setViewMode('editor');
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
        description: 'Failed to delete submission. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Submission deleted',
        description: 'Your submission has been deleted successfully.',
      });
    }

    setDeleteDialogOpen(false);
    setMagazineToDelete(null);
  };

  const handleSubmit = async (
    data: { title: string; subtitle: string; body_markdown: string },
    heroImage?: File | null
  ) => {
    setIsSubmitting(true);

    try {
      let result;
      
      if (selectedMagazine) {
        result = await updateMagazine(selectedMagazine.id, data, heroImage);
      } else {
        result = await createMagazine(data, heroImage);
      }

      if (result.error) {
        toast({
          title: 'Error',
          description: `Failed to ${selectedMagazine ? 'update' : 'create'} submission.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: selectedMagazine ? 'Submission updated' : 'Submission created',
          description: `Your submission has been ${selectedMagazine ? 'updated' : 'created'} successfully.`,
        });
        setViewMode('grid');
        setSelectedMagazine(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
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
          <MagazineViewer magazine={selectedMagazine} onBack={handleCancel} />
        </div>
      </div>
    );
  }

  if (viewMode === 'editor') {
    return (
      <DashboardLayout
        title={selectedMagazine ? 'Edit Issue' : 'Create New Issue'}
        description={selectedMagazine ? 'Update your article content' : 'Write and submit a new research article'}
      >
        <MagazineEditor
          magazine={selectedMagazine}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My IITD Submissions"
      description="Manage your research submissions"
      action={
        <Button onClick={handleCreateNew} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Submission
        </Button>
      }
    >
      {magazines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 py-20">
          <BookOpen className="mb-4 h-16 w-16 text-muted-foreground/50" />
          <h3 className="font-display text-xl font-semibold text-foreground">No submissions yet</h3>
          <p className="mt-2 text-muted-foreground">Create your first submission to get started</p>
          <Button onClick={handleCreateNew} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Submission
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {magazines.map((magazine, index) => (
            <div
              key={magazine.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MagazineCard
                magazine={magazine}
                onEdit={() => handleEdit(magazine)}
                onView={() => handleView(magazine)}
                onDelete={() => handleDelete(magazine)}
              />
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Magazine</AlertDialogTitle>
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
