import { useState } from 'react';
import { Comment, useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Send, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CommentSectionProps {
    contentId: string;
    comments: Comment[];
    onCommentAdded?: (comment: Comment) => void;
    onCommentRemoved?: (commentId: string) => void;
}

export function CommentSection({
    contentId,
    comments,
    onCommentAdded,
    onCommentRemoved,
}: CommentSectionProps) {
    const { user, role } = useAuth();
    const { addComment, removeComment, loading } = useAnalytics();
    const { toast } = useToast();
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await addComment(contentId, newComment.trim());
            if (result.success && result.comment) {
                setNewComment('');
                onCommentAdded?.(result.comment);
                toast({
                    title: 'Comment added',
                    description: 'Your comment has been posted successfully.',
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to add comment',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (deletingId) return;

        setDeletingId(commentId);
        try {
            const result = await removeComment(contentId, commentId);
            if (result.success) {
                onCommentRemoved?.(commentId);
                toast({
                    title: 'Comment deleted',
                    description: 'The comment has been removed.',
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to delete comment',
                    variant: 'destructive',
                });
            }
        } finally {
            setDeletingId(null);
        }
    };

    const canDeleteComment = (comment: Comment): boolean => {
        if (!user) return false;
        if (role === 'admin') return true;
        if (comment.created_by && comment.created_by._id === user.id) return true;
        return false;
    };

    const getInitials = (name: string | null): string => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold">
                    Comments ({comments.length})
                </h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none"
                    disabled={isSubmitting}
                />
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        size="sm"
                    >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Post Comment
                    </Button>
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                        No comments yet. Be the first to comment!
                    </p>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment._id}
                            className="flex gap-3 rounded-lg border border-border/50 bg-card/50 p-4"
                        >
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs">
                                    {getInitials(comment.created_by?.name || null)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium">
                                            {comment.created_by?.name || 'Anonymous'}
                                        </span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground">
                                            {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    {canDeleteComment(comment) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(comment._id)}
                                            disabled={deletingId === comment._id}
                                        >
                                            {deletingId === comment._id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                                    {comment.body}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
