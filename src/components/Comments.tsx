// src/components/Comments.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface Comment {
  id: string;
  gemId: string;
  author: string;
  content: string;
  createdAt: string;
}

interface CommentsProps {
  gemId: string;
  initialComments?: Comment[];
}

const Comments = ({ gemId, initialComments = [] }: CommentsProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Manter a lista de comentários sincronizada com o servidor
  useEffect(() => {
    if (!gemId) return;
    fetch(`/api/gems/${gemId}/comments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setComments(data);
        }
      })
      .catch((err) => {
        console.error('Error loading comments:', err);
      });
  }, [gemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isClient) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/gems/${gemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to post comment');
      }

      const comment: Comment = await res.json();
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Error saving comment:', err);
      setError(t('comments.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="polaroid bg-white dark:bg-ink-800 p-6 rotate-1">
      <h3 className="text-xl font-display italic font-semibold mb-4 text-ink dark:text-sand-50">{t('comments.title')} ({comments.length})</h3>

      {/* Formulário de novo comentário — requer sessão iniciada */}
      {isClient && !user ? (
        <div className="border-2 border-dashed border-ink/15 dark:border-sand-100/20 px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-ink/60 dark:text-sand-300">{t('comments.login_required')}</p>
          <Link href={`/login?redirect=${encodeURIComponent(router.asPath)}`}>
            <a className="text-primary text-sm font-bold hover:underline flex-shrink-0">{t('nav.login')}</a>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.placeholder')}
            className="w-full px-4 py-3 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary mb-3"
            rows={3}
            maxLength={500}
            disabled={isSubmitting || !isClient}
          />
          {error && <p className="text-primary-700 dark:text-primary-300 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim() || !isClient}
            className="bg-primary text-white px-4 py-2 font-bold -rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
          >
            {isSubmitting ? t('comments.submitting') : t('comments.submit')}
          </button>
        </form>
      )}

      {/* Lista de comentários */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-ink/50 dark:text-sand-300/70 text-center py-4">{t('comments.empty')}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-dashed border-sand-300 dark:border-ink-700 pb-4 last:border-0 last:pb-0">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-primary/15 flex-shrink-0 mr-3 -rotate-3 flex items-center justify-center">
                  <span className="text-primary-700 dark:text-primary-300 text-sm font-display font-medium">
                    {comment.author.charAt(0)}
                  </span>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center mb-1">
                    <h4 className="font-medium text-ink dark:text-sand-50">{comment.author}</h4>
                    <span className="text-ink/50 dark:text-sand-300/70 text-sm ml-2">
                      {new Date(comment.createdAt).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>
                  <p className="text-ink/80 dark:text-sand-200">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
