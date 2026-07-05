import { useSavedGems } from '../contexts/SavedGemsContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface SaveButtonProps {
  gemId: string;
  className?: string;
}

const SaveButton = ({ gemId, className = '' }: SaveButtonProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { saveGem, unsaveGem, isGemSaved } = useSavedGems();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  // Sincronizar estado do cliente com o contexto
  useEffect(() => {
    setSaved(isGemSaved(gemId));
  }, [isGemSaved, gemId]);

  const handleClick = () => {
    // Saved gems are tied to an account (see SavedGemsContext) — there's
    // nowhere to persist a bookmark for a logged-out visitor, so send them
    // to log in instead of silently doing nothing.
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    if (saved) {
      unsaveGem(gemId);
      setSaved(false);
    } else {
      saveGem(gemId);
      setSaved(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 ${saved ? 'text-primary' : 'text-ink/60 dark:text-sand-300'} ${className}`}
    >
      <svg className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {saved ? t('save.saved') : t('save.save')}
    </button>
  );
};

export default SaveButton;