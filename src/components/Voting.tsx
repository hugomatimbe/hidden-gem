import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface VotingProps {
  gemId: string;
  submittedBy?: string | null;
  initialUpvotes?: number;
  initialDownvotes?: number;
}

const Voting = ({ gemId, submittedBy, initialUpvotes = 0, initialDownvotes = 0 }: VotingProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteError, setVoteError] = useState('');

  const isOwnGem = !!user && !!submittedBy && user.id === submittedBy;

  // Garantir que o estado seja o mesmo no cliente e no servidor
  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialUpvotes, initialDownvotes]);

  // Carregar contagem real e o voto deste visitante (se estiver logado) a
  // partir da API — quem votou agora vem da sessão, não de um id gerado no
  // cliente, então não visitantes anónimos não têm mais "o seu voto" a
  // carregar aqui.
  useEffect(() => {
    if (!gemId) return;

    fetch(`/api/gems/${gemId}/votes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
        setUserVote(data.userVote);
      })
      .catch((error) => {
        console.error('Error loading votes:', error);
      });
  }, [gemId]);

  const castVote = useCallback(
    async (type: 'up' | 'down' | 'undo') => {
      try {
        const res = await fetch(`/api/gems/${gemId}/votes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });
        const data = await res.json();
        if (res.ok) {
          setUpvotes(data.upvotes);
          setDownvotes(data.downvotes);
          setUserVote(data.userVote);
          setVoteError('');
        } else {
          setVoteError(data.error || '');
        }
      } catch (error) {
        console.error('Error voting:', error);
      }
    },
    [gemId]
  );

  const handleVote = (type: 'up' | 'down') => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    if (isOwnGem) return;

    const nextVote: 'up' | 'down' | 'undo' = userVote === type ? 'undo' : type;

    // Atualização otimista; a resposta da API confirma os valores reais
    setUpvotes((prev) => {
      let next = prev;
      if (userVote === 'up') next -= 1;
      if (nextVote === 'up') next += 1;
      return next;
    });
    setDownvotes((prev) => {
      let next = prev;
      if (userVote === 'down') next -= 1;
      if (nextVote === 'down') next += 1;
      return next;
    });
    setUserVote(nextVote === 'undo' ? null : nextVote);

    castVote(nextVote);
  };

  const totalVotes = upvotes + downvotes;
  const upvotePercentage = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 0;

  return (
    <div className="polaroid bg-white dark:bg-ink-800 p-6 mb-6 -rotate-1">
      <h3 className="text-lg font-display italic font-semibold mb-4 text-ink dark:text-sand-50">{t('voting.title')}</h3>
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => handleVote('up')}
          disabled={isOwnGem}
          className={`flex flex-col items-center p-3 border-2 transition-transform rotate-1 hover:rotate-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:rotate-1 ${
            userVote === 'up'
              ? 'bg-secondary text-white border-secondary shadow-[3px_3px_0_rgba(59,42,30,0.18)]'
              : 'border-ink/15 dark:border-sand-100/20 text-ink/70 dark:text-sand-300 hover:border-secondary'
          }`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="text-sm mt-1">{t('voting.useful')} ({upvotes})</span>
        </button>

        <button
          onClick={() => handleVote('down')}
          disabled={isOwnGem}
          className={`flex flex-col items-center p-3 border-2 transition-transform -rotate-1 hover:rotate-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:-rotate-1 ${
            userVote === 'down'
              ? 'bg-primary text-white border-primary shadow-[3px_3px_0_rgba(59,42,30,0.18)]'
              : 'border-ink/15 dark:border-sand-100/20 text-ink/70 dark:text-sand-300 hover:border-primary'
          }`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m0 0v6m0-6h2.765a2 2 0 011.789 2.894l-3.5 7A2 2 0 0116.263 17h-4.017c-.163 0-.326-.02-.485-.06L7 16m10 0h2M7 16H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="text-sm mt-1">{t('voting.not_useful')} ({downvotes})</span>
        </button>
      </div>
      <div className="w-full bg-sand-200 dark:bg-ink-700 h-2">
        <div
          className="bg-secondary h-2"
          style={{ width: `${upvotePercentage}%` }}
        ></div>
      </div>
      <p className="text-center text-sm text-ink/60 dark:text-sand-300 mt-2">
        {upvotePercentage}% {t('voting.percentage_suffix')}
      </p>
      {isOwnGem && (
        <p className="text-center text-sm text-ink/50 dark:text-sand-300/70 mt-3 italic">
          {t('voting.own_gem')}
        </p>
      )}
      {!isOwnGem && voteError && (
        <p className="text-center text-sm text-primary dark:text-primary-300 mt-3">
          {voteError}
        </p>
      )}
    </div>
  );
};

export default Voting;
