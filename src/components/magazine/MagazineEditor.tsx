import { useState, useRef, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Magazine } from '@/types/database';
import { calculateReadTime, formatReadTime } from '@/lib/readTime';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MagazineEditorProps {
  magazine?: Magazine | null;
  onSubmit: (data: { title: string; subtitle: string; body_markdown: string }, heroImage?: File | null) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function MagazineEditor({ magazine, onSubmit, onCancel, isSubmitting = false }: MagazineEditorProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState(magazine?.title || '');
  const [subtitle, setSubtitle] = useState(magazine?.subtitle || '');
  const [bodyMarkdown, setBodyMarkdown] = useState(magazine?.body_markdown || '');
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(magazine?.hero_image_url || null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readTime = calculateReadTime(bodyMarkdown);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Please upload a valid image (JPG, PNG, or WebP)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError('Image must be less than 8MB');
      return;
    }

    setHeroImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setHeroPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setHeroImage(null);
    setHeroPreview(magazine?.hero_image_url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [magazine?.hero_image_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    if (!bodyMarkdown.trim()) return;

    await onSubmit(
      { title: title.trim(), subtitle: subtitle.trim(), body_markdown: bodyMarkdown },
      heroImage
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hero Image Upload */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Label className="mb-2 block">Hero Image</Label>
          
          {heroPreview ? (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <img
                src={heroPreview}
                alt="Hero preview"
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload hero image</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP (max 8MB)</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {imageError && (
            <p className="mt-2 text-sm text-destructive">{imageError}</p>
          )}
        </CardContent>
      </Card>

      {/* Title & Subtitle */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter magazine title"
            required
            className="font-display text-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Enter subtitle (optional)"
          />
        </div>
      </div>

      {/* Metadata (Read-only) */}
      <div className="flex items-center gap-6 rounded-lg bg-muted/50 p-4">
        <div>
          <Label className="text-xs text-muted-foreground">Author</Label>
          <p className="font-medium">{profile?.name || 'Unknown'}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Estimated Read Time</Label>
          <p className="font-medium">{formatReadTime(readTime)}</p>
        </div>
      </div>

      {/* Markdown Editor with Live Preview */}
      <div className="space-y-2">
        <Label>Body Content *</Label>
        <div data-color-mode="light" className="rounded-lg border border-border overflow-hidden">
          <MDEditor
            value={bodyMarkdown}
            onChange={(val) => setBodyMarkdown(val || '')}
            height={500}
            preview="live"
            visibleDragbar={false}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use Markdown to format your content. The preview updates in real-time.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !title.trim() || !bodyMarkdown.trim()}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {magazine ? 'Update Magazine' : 'Create Magazine'}
        </Button>
      </div>
    </form>
  );
}
