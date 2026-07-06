import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getDb } from '../../../lib/db';
import { parseGemRow } from '../../../lib/gems';
import { getSessionUser } from '../../../lib/auth';
import { Gem } from '../../../lib/types';
import Layout from '../../../components/Layout';
import Form from '../../../components/Form';
import { useLanguage } from '../../../contexts/LanguageContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRESET_BEST_TIMES = ['Manhã', 'Tarde', 'Noite', 'Final de Semana', 'Feriados'];

// Inverse of the formatter in Form.tsx's handleSubmit, which turns the
// day-group editor's state into a flat "Mon: 09:00-17:00, Tue: ..." string
// for storage. Splitting only on the first ":" per segment matters — the
// time values themselves ("09:00-17:00") contain colons too.
function parseStoredOpeningHours(stored?: string | null): Record<string, string> {
  const result: Record<string, string> = DAYS.reduce((acc, day) => ({ ...acc, [day]: '' }), {});
  if (!stored) return result;

  stored.split(',').forEach((segment) => {
    const trimmed = segment.trim();
    const sepIndex = trimmed.indexOf(':');
    if (sepIndex === -1) return;
    const abbrev = trimmed.slice(0, sepIndex).trim();
    const hours = trimmed.slice(sepIndex + 1).trim();
    const fullDay = DAYS.find((day) => day.slice(0, 3) === abbrev);
    if (fullDay) result[fullDay] = hours;
  });

  return result;
}

// The form stores a preset ("Manhã", "Tarde", ...) or "Outro" + free text in
// two separate fields, but the gem only stores one plain string — so a
// stored value that isn't one of the presets must be the free-text case.
function splitBestTimeToVisit(stored?: string | null): { bestTimeToVisit: string; bestTimeToVisitCustom: string } {
  if (!stored) return { bestTimeToVisit: '', bestTimeToVisitCustom: '' };
  if (PRESET_BEST_TIMES.includes(stored)) return { bestTimeToVisit: stored, bestTimeToVisitCustom: '' };
  return { bestTimeToVisit: 'Outro', bestTimeToVisitCustom: stored };
}

// Converts a stored Gem back into the shape Form.tsx's `initialValues` prop
// expects — the inverse of what Form.tsx's handleSubmit builds for
// submission (comma-joined tags, not an array; a per-day openingHours
// object, not the flat stored string; etc).
function gemToFormInitialValues(gem: Gem) {
  const { bestTimeToVisit, bestTimeToVisitCustom } = splitBestTimeToVisit(gem.bestTimeToVisit);
  return {
    id: gem.id,
    createdAt: gem.createdAt,
    title: gem.title,
    description: gem.description,
    category: gem.category,
    tags: (gem.tags || []).join(', '),
    location: gem.location,
    isAnonymous: !!gem.isAnonymous,
    openingHours: parseStoredOpeningHours(gem.openingHours),
    priceRange: gem.priceRange || 'moderate',
    accessibility: gem.accessibility || { wheelchairAccessible: false, familyFriendly: false, petFriendly: false },
    safetyNotes: gem.safetyNotes || '',
    bestTimeToVisit,
    bestTimeToVisitCustom,
    images: gem.images || [],
    menuImages: gem.menuImages || [],
    contact: gem.contact || {},
  };
}

interface EditGemProps {
  gem: Gem;
}

export default function EditGemPage({ gem }: EditGemProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`/api/gems/${gem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update gem');
      }

      router.push(`/g/${gem.id}`);
    } catch (error) {
      console.error('Error updating gem:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro ao guardar as alterações. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title={`${t('edit_gem.title')} - ${gem.title}`}>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="text-sm text-ink/50 dark:text-sand-300/70 mb-6">
          <Link href={`/g/${gem.id}`}>
            <a className="hover:text-primary">{gem.title}</a>
          </Link>
          <span className="mx-2">/</span>
          <span>{t('edit_gem.title')}</span>
        </div>

        <h1 className="text-3xl font-display font-semibold mb-8 text-ink dark:text-sand-50">{t('edit_gem.title')}</h1>

        <div className="polaroid bg-white dark:bg-ink-800 p-6 md:p-8 rotate-1">
          {/* submitError is now shown inside <Form> itself, which also
              scrolls it into view — see the note in Form.tsx. */}
          <Form
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
            initialValues={gemToFormInitialValues(gem)}
          />
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<EditGemProps> = async ({ params, req }) => {
  const slug = params?.slug as string;

  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM gems WHERE id = ?').get(slug) as any;

    if (!row) {
      return { notFound: true };
    }

    // getSessionUser only reads req.cookies, which Next.js populates on the
    // getServerSideProps request object the same way it does for API routes.
    const sessionUser = getSessionUser(req as any, db);

    if (!sessionUser || (sessionUser.id !== row.submittedBy && !sessionUser.isAdmin)) {
      return {
        redirect: {
          destination: `/g/${slug}`,
          permanent: false,
        },
      };
    }

    const gem = parseGemRow(row);

    return { props: { gem } };
  } catch (error) {
    console.error('Error loading gem for edit:', error);
    return { notFound: true };
  }
};
