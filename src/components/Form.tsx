import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ImageUpload from './ImageUpload';
import { z } from 'zod';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

function MapLoading() {
  const { t } = useLanguage();
  return (
    <div className="w-full h-64 bg-sand-100 dark:bg-ink-700 rounded-lg flex items-center justify-center">
      <p className="text-ink/50 dark:text-sand-300/70">{t('common.loading_map')}</p>
    </div>
  );
}

// maplibre-gl touches `window` at module-load time, which crashes Next.js's
// server-side render — load it client-only.
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: MapLoading,
});

interface FormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  isSubmitting?: boolean;
  submitError?: string;
  resetForm?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_OPENING_HOURS: Record<string, string> = DAYS.reduce(
  (acc, day) => ({ ...acc, [day]: '' }),
  {}
);

// <input type="time"> renders in 12h or 24h format based on the browser's
// OS-level locale setting — there's no reliable way to force 24h display
// through HTML alone (the `lang` attribute doesn't control it in current
// Chrome/Firefox). Plain hour/minute dropdowns sidestep the problem
// entirely: they always show 00-23, regardless of the visitor's device.
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function parseTimeValue(value: string): { hour: string; minute: string } {
  const [hour, minute] = value ? value.split(':') : ['', ''];
  return { hour: hour || '', minute: minute || '' };
}

interface HourGroup {
  id: string;
  days: string[];
  start: string;
  end: string;
}

// Groups days that currently share the exact same hours string together —
// used to seed the day-group editor below from a flat per-day object (e.g.
// when editing an existing gem, or from the default all-blank state, which
// naturally becomes a single group covering all 7 days).
function groupsFromOpeningHours(openingHours: Record<string, string>): HourGroup[] {
  const byValue = new Map<string, string[]>();
  DAYS.forEach((day) => {
    const value = (openingHours[day] as string) || '';
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value)!.push(day);
  });
  return Array.from(byValue.entries()).map(([value, days]) => {
    const [start, end] = value ? value.split('-') : ['', ''];
    return {
      id: `${days[0]}_${Math.random().toString(36).substr(2, 9)}`,
      days,
      start: start || '',
      end: end || '',
    };
  });
}

// The reverse direction — flattens the day-group editor's state back into
// the plain { Monday: 'HH:MM-HH:MM', ... } shape the rest of the form (and
// the API) already expects, so nothing downstream needs to change.
function openingHoursFromGroups(groups: HourGroup[]): Record<string, string> {
  const result = { ...EMPTY_OPENING_HOURS };
  groups.forEach((group) => {
    const value = group.start || group.end ? `${group.start}${group.end ? '-' + group.end : ''}` : '';
    group.days.forEach((day) => {
      result[day] = value;
    });
  });
  return result;
}

// Validation schema
const formSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título deve ter no máximo 100 caracteres'),
  description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição deve ter no máximo 500 caracteres'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  tags: z.array(z.string()).min(1, 'Pelo menos uma tag é obrigatória').max(5, 'Máximo de 5 tags'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  images: z.array(z.string()).min(1, 'Pelo menos uma foto é obrigatória'),
  menuImages: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedBy: z.string().optional(),
  isAnonymous: z.boolean().optional(),
  openingHours: z.string().optional(),
  priceRange: z.string().optional(),
  accessibility: z.object({
    wheelchairAccessible: z.boolean().optional(),
    familyFriendly: z.boolean().optional(),
    petFriendly: z.boolean().optional(),
  }).optional(),
  safetyNotes: z.string().optional(),
  bestTimeToVisit: z.string().optional(),
});

export default function Form({ onSubmit, initialValues = {}, isSubmitting = false, submitError, resetForm = false }: FormProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: initialValues.title || '',
    description: initialValues.description || '',
    category: initialValues.category || '',
    tags: initialValues.tags || '',
    location: initialValues.location || { lat: -25.9655, lng: 32.6086 },
    isAnonymous: initialValues.isAnonymous || false,
    // Novos campos
    openingHours: initialValues.openingHours || {
      Monday: '',
      Tuesday: '',
      Wednesday: '',
      Thursday: '',
      Friday: '',
      Saturday: '',
      Sunday: ''
    },
    priceRange: initialValues.priceRange || 'moderate',
    accessibility: initialValues.accessibility || {
      wheelchairAccessible: false,
      familyFriendly: false,
      petFriendly: false
    },
    safetyNotes: initialValues.safetyNotes || '',
    bestTimeToVisit: initialValues.bestTimeToVisit || '',
    bestTimeToVisitCustom: initialValues.bestTimeToVisitCustom || '',
    menuImages: initialValues.menuImages || [],
    contact: initialValues.contact || {
      website: '',
      phone: '',
      email: '',
      instagram: '',
      facebook: '',
      twitter: '',
      whatsapp: '',
    },
  });

  const [tagInput, setTagInput] = useState('');

  const [images, setImages] = useState<string[]>(initialValues.images || []);
  const [menuImages, setMenuImages] = useState<string[]>(initialValues.menuImages || []);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // On a long form, a rejection (duplicate gem, validation, etc.) can land
  // while the person is scrolled down near the Submit button, far below
  // where the error banner renders — without this it just looks like
  // clicking Submit did nothing.
  const errorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (submitError || errors.general) {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitError, errors.general]);

  // Day-group hours editor: each group is a set of days that share one
  // start/end time (e.g. "Mon-Thu" at 09:00-17:00, "Fri-Sat" at 09:00-22:00,
  // Sunday closed). Seeded from formData.openingHours so a plain default
  // (all days blank) starts as a single all-days group — the common case
  // needs zero extra clicks, and splitting off different days is additive.
  const [hourGroups, setHourGroups] = useState<HourGroup[]>(() =>
    groupsFromOpeningHours(formData.openingHours as Record<string, string>)
  );

  const updateHourGroups = (groups: HourGroup[]) => {
    setHourGroups(groups);
    setFormData(prev => ({ ...prev, openingHours: openingHoursFromGroups(groups) }));
  };

  const addHourGroup = () => {
    updateHourGroups([...hourGroups, { id: `group_${Math.random().toString(36).substr(2, 9)}`, days: [], start: '', end: '' }]);
  };

  const removeHourGroup = (groupId: string) => {
    updateHourGroups(hourGroups.filter(g => g.id !== groupId));
  };

  const updateHourGroupTime = (groupId: string, field: 'start' | 'end', value: string) => {
    updateHourGroups(hourGroups.map(g => (g.id === groupId ? { ...g, [field]: value } : g)));
  };

  // A day can only belong to one group at a time — selecting it here drops
  // it from wherever else it currently lives, so the underlying per-day
  // data never has two conflicting values for the same day.
  const toggleDayInGroup = (groupId: string, day: string) => {
    updateHourGroups(
      hourGroups.map(g => {
        if (g.id === groupId) {
          const has = g.days.includes(day);
          return { ...g, days: has ? g.days.filter(d => d !== day) : [...g.days, day] };
        }
        return { ...g, days: g.days.filter(d => d !== day) };
      })
    );
  };

  // Reset form when resetForm prop changes
  useEffect(() => {
    if (resetForm) {
      setFormData({
        title: '',
        description: '',
        category: '',
        tags: '',
        location: { lat: -25.9655, lng: 32.6086 },
        isAnonymous: false,
        openingHours: {
          Monday: '',
          Tuesday: '',
          Wednesday: '',
          Thursday: '',
          Friday: '',
          Saturday: '',
          Sunday: ''
        },
        priceRange: 'moderate',
        accessibility: {
          wheelchairAccessible: false,
          familyFriendly: false,
          petFriendly: false
        },
        safetyNotes: '',
        bestTimeToVisit: '',
        bestTimeToVisitCustom: '',
        menuImages: [],
        contact: {
          website: '',
          phone: '',
          email: '',
          instagram: '',
          facebook: '',
          twitter: '',
          whatsapp: '',
        },
      });
      setTagInput('');
      setImages([]);
      setMenuImages([]);
      setErrors({});
      setHourGroups(groupsFromOpeningHours(EMPTY_OPENING_HOURS));
    }
  }, [resetForm]);

  const getTagSuggestions = (category: string): string[] => {
    const allSuggestions: { [key: string]: string[] } = {
      restaurant: ['café', 'restaurante', 'tradicional', 'italiano', 'asiático', 'vegetariano', 'romântico', 'família', 'fast food', 'gourmet', 'local', 'internacional'],
      bar: ['cerveja', 'vinho', 'coquetéis', 'happy hour', 'música ao vivo', 'esportivo', 'craft beer', 'pub', 'lounge', 'karaokê'],
      natureza: ['trilha', 'praia', 'montanha', 'cachoeira', 'parque', 'observação de aves', 'camping', 'jardim', 'floresta', 'rio'],
      arte: ['galeria', 'mural', 'escultura', 'fotografia', 'música', 'teatro', 'dança', 'cinema', 'exposição', 'oficina'],
      vista: ['pôr do sol', 'panorâmica', 'miradouro', 'oceano', 'cidade', 'montanha', 'vale', 'lago', 'rio', 'horizonte'],
      peculiar: ['único', 'estranho', 'secreto', 'oculto', 'misterioso', 'incomum', 'curioso', 'diferente', 'exótico', 'surpreendente']
    };
    return allSuggestions[category] || [];
  };

  const getCurrentSelectedTags = (): string[] => {
    return formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  };

  const getAvailableTags = () => {
    const allTags = getTagSuggestions(formData.category);
    const selectedTags = getCurrentSelectedTags();
    return allTags.filter(tag => !selectedTags.includes(tag));
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const currentTags = getCurrentSelectedTags();
    if (!currentTags.includes(trimmedTag) && currentTags.length < 5) {
      const newTags = [...currentTags, trimmedTag];
      setFormData(prev => ({ ...prev, tags: newTags.join(', ') }));
      setTagInput(''); // Clear the manual input
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = getCurrentSelectedTags();
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    setFormData(prev => ({ ...prev, tags: newTags.join(', ') }));
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow letters, numbers, spaces, and basic punctuation for tags
    const sanitizedValue = value.replace(/[^a-zA-Z0-9À-ÿ\s\-_,]/g, '');
    setTagInput(sanitizedValue);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !getCurrentSelectedTags().includes(value)) {
        addTag(value);
      }
    } else if (e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !getCurrentSelectedTags().includes(value)) {
        addTag(value);
      }
    } else if (e.key === 'Backspace' && tagInput === '') {
      // Remove last tag when backspace is pressed on empty input
      const currentTags = getCurrentSelectedTags();
      if (currentTags.length > 0) {
        removeTag(currentTags[currentTags.length - 1]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    if (name.startsWith('accessibility.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        accessibility: {
          ...prev.accessibility,
          [field]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleLocationChange = (location: { lat: number; lng: number }) => {
    setFormData(prev => ({
      ...prev,
      location
    }));
  };

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      // If there's text in the tag input, add it as a tag before submitting
      if (tagInput.trim()) {
        const trimmedTag = tagInput.trim();
        const currentTags = getCurrentSelectedTags();
        if (!currentTags.includes(trimmedTag) && currentTags.length < 5) {
          const newTags = [...currentTags, trimmedTag];
          setFormData(prev => ({ ...prev, tags: newTags.join(', ') }));
        }
        setTagInput('');
      }

      // Convert tags string to array
      const tagsArray = formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);

      // Format opening hours
      const formattedOpeningHours = Object.entries(formData.openingHours)
        .filter(([_, hours]) => (hours as string).trim())
        .map(([day, hours]) => `${day.slice(0, 3)}: ${hours as string}`)
        .join(', ');

      // Prepare data for submission. When editing (initialValues.id set), we
      // reuse the existing gem's id/createdAt instead of minting new ones —
      // otherwise saving an edit would silently create a second gem.
      const data = {
        id: initialValues.id || `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
        location: {
          lat: formData.location.lat,
          lng: formData.location.lng,
          address: formData.location.address || '',
        },
        images: images,
        menuImages: menuImages,
        createdAt: initialValues.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // The server always derives submittedBy from the logged-in session
        // regardless of what's sent here (see /api/gems.ts) — this is just
        // kept consistent for local validation/display purposes.
        submittedBy: user?.id || null,
        isAnonymous: formData.isAnonymous,
        openingHours: formattedOpeningHours,
        priceRange: formData.priceRange,
        accessibility: formData.accessibility,
        safetyNotes: formData.safetyNotes,
        bestTimeToVisit: formData.bestTimeToVisit === 'Outro' ? formData.bestTimeToVisitCustom : formData.bestTimeToVisit,
        contact: formData.contact,
      };

      // Validate the data
      formSchema.parse(data);

      await onSubmit(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            fieldErrors[issue.path[0]] = issue.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Error submitting form:', error);
        setErrors({ general: 'Ocorreu um erro ao enviar o formulário. Tente novamente.' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Server-side rejections (e.g. the duplicate-gem check in
          /api/gems.ts) were being caught and stored in `submitError` by the
          submit/edit pages, but this component never actually rendered
          them — so someone submitting a duplicate just saw the button stop
          loading with no explanation at all. The ref lets the effect above
          scroll this into view, since on a long form it can land well
          above whatever's currently on screen. */}
      <div ref={errorBannerRef}>
        {submitError && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-400">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {errors.general && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-400">{errors.general}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 1: The basics */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-2 border-dashed border-primary rounded-full flex items-center justify-center -rotate-3 flex-shrink-0">
          <span className="text-sm font-display font-bold text-primary">1</span>
        </div>
        <h2 className="text-lg font-display font-semibold text-ink dark:text-sand-50">{t('form.section_basics')}</h2>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.title')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={!!errors.title}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary ${
            errors.title ? 'border-red-500' : 'border-sand-300 dark:border-ink-700'
          }`}
          placeholder={t('placeholder.title')}
        />
        {errors.title && <p id="title-error" className="text-red-500 text-sm mt-1" role="alert">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.description')} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          aria-describedby={errors.description ? "description-error" : undefined}
          aria-invalid={!!errors.description}
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary ${
            errors.description ? 'border-red-500' : 'border-sand-300 dark:border-ink-700'
          }`}
          placeholder={t('placeholder.description')}
        />
        {errors.description && <p id="description-error" className="text-red-500 text-sm mt-1" role="alert">{errors.description}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.category')}
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
        >
          <option value="">{t('placeholder.select_category')}</option>
          <option value="restaurant">{t('category.restaurant')}</option>
          <option value="bar">{t('category.bar')}</option>
          <option value="natureza">{t('category.nature')}</option>
          <option value="arte">{t('category.art')}</option>
          <option value="vista">{t('category.view')}</option>
          <option value="peculiar">{t('category.peculiar')}</option>
        </select>
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.tags')} <span className="text-red-500">*</span>
        </label>

        {/* Selected Tags Display */}
        {getCurrentSelectedTags().length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {getCurrentSelectedTags().map((tag: string, index: number) => (
              <div
                key={index}
                className="bg-primary/10 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200 px-3 py-1 rounded-full text-sm flex items-center gap-1"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-100 ml-1"
                  title={`${t('common.delete')} tag: ${tag}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Available Tags */}
        {formData.category && getAvailableTags().length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {getAvailableTags().map((tag: string) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="bg-sand-100 dark:bg-ink-700 text-ink/80 dark:text-sand-200 px-3 py-1 rounded-full text-sm hover:bg-sand-200 dark:hover:bg-ink-700/70 transition"
                title={`${t('common.add')} tag: ${tag}`}
              >
                + {tag}
              </button>
            ))}
          </div>
        )}

        {/* Tag Input */}
        <input
          type="text"
          id="tagInput"
          name="tagInput"
          value={tagInput}
          onChange={handleTagInputChange}
          onKeyDown={handleTagInputKeyDown}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary ${
            errors.tags ? 'border-red-500' : 'border-sand-300 dark:border-ink-700'
          }`}
          placeholder={getCurrentSelectedTags().length >= 5 ? t('form.tag_limit_reached') : t('form.tag_input_placeholder')}
          disabled={getCurrentSelectedTags().length >= 5}
        />

        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-ink/50 dark:text-sand-300/70">
            {t('form.tags_selected_count').replace('{count}', getCurrentSelectedTags().length.toString())}
          </p>
          {getCurrentSelectedTags().length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, tags: '' }));
                setTagInput('');
              }}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              {t('common.clear_all')}
            </button>
          )}
        </div>

        {errors.tags && <p className="text-red-500 text-sm mt-1" role="alert">{errors.tags}</p>}
      </div>

      {/* Section 2: Photos (required) */}
      <div className="flex items-center gap-3 pt-8 border-t border-dashed border-sand-300 dark:border-ink-700">
        <div className="w-8 h-8 border-2 border-dashed border-primary rounded-full flex items-center justify-center rotate-2 flex-shrink-0">
          <span className="text-sm font-display font-bold text-primary">2</span>
        </div>
        <h2 className="text-lg font-display font-semibold text-ink dark:text-sand-50">{t('form.section_photos')}</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.place_photos')} <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-ink/60 dark:text-sand-300 mb-3">{t('form.place_photos_hint')}</p>
        <ImageUpload
          onImagesChange={handleImagesChange}
          initialImages={images}
        />
        {errors.images && <p className="text-red-500 text-sm mt-2" role="alert">{errors.images}</p>}
      </div>

      {formData.category === 'restaurant' && (
        <div>
          <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
            {t('form.menu_photos')}
          </label>
          <ImageUpload
            onImagesChange={(newImages) => setMenuImages(newImages)}
            initialImages={menuImages}
          />
        </div>
      )}

      {/* Section 3: Location */}
      <div className="flex items-center gap-3 pt-8 border-t border-dashed border-sand-300 dark:border-ink-700">
        <div className="w-8 h-8 border-2 border-dashed border-primary rounded-full flex items-center justify-center -rotate-2 flex-shrink-0">
          <span className="text-sm font-display font-bold text-primary">3</span>
        </div>
        <h2 className="text-lg font-display font-semibold text-ink dark:text-sand-50">{t('form.section_location')}</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.location')} <span className="text-red-500">*</span>
        </label>
        <div className="mb-2">
          <LocationPicker
            initialLocation={formData.location}
            onLocationChange={handleLocationChange}
          />
        </div>
        <div className="text-sm text-ink/50 dark:text-sand-300/70">
          {t('form.location_hint')}
        </div>
        {errors.location && <p className="text-red-500 text-sm mt-1" role="alert">{errors.location}</p>}
      </div>

      {/* Section 4: Good to know */}
      <div className="flex items-center gap-3 pt-8 border-t border-dashed border-sand-300 dark:border-ink-700">
        <div className="w-8 h-8 border-2 border-dashed border-primary rounded-full flex items-center justify-center rotate-3 flex-shrink-0">
          <span className="text-sm font-display font-bold text-primary">4</span>
        </div>
        <h2 className="text-lg font-display font-semibold text-ink dark:text-sand-50">{t('form.section_details')}</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.opening_hours')}
        </label>
        <p className="text-xs text-ink/50 dark:text-sand-300/70 mb-3">{t('form.hour_groups_hint')}</p>

        <div className="space-y-3">
          {hourGroups.map((group) => (
            <div key={group.id} className="border border-dashed border-sand-300 dark:border-ink-700 rounded-lg p-3">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DAYS.map((day) => {
                  const active = group.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDayInGroup(group.id, day)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-sand-100 dark:bg-ink-700 text-ink/60 dark:text-sand-300/80 hover:bg-sand-200 dark:hover:bg-ink-700/70'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const startParts = parseTimeValue(group.start);
                const endParts = parseTimeValue(group.end);
                const timeSelectClass =
                  'px-2 py-1 border border-sand-300 dark:border-ink-700 rounded bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary text-sm';
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <select
                        value={startParts.hour}
                        onChange={(e) =>
                          updateHourGroupTime(group.id, 'start', `${e.target.value}:${startParts.minute || '00'}`)
                        }
                        className={timeSelectClass}
                      >
                        <option value="">--</option>
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-ink/50 dark:text-sand-300/70">:</span>
                      <select
                        value={startParts.minute}
                        onChange={(e) =>
                          updateHourGroupTime(group.id, 'start', `${startParts.hour || '00'}:${e.target.value}`)
                        }
                        className={timeSelectClass}
                      >
                        <option value="">--</option>
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <span className="text-ink/50 dark:text-sand-300/70">{t('form.to')}</span>

                    <div className="flex items-center gap-1">
                      <select
                        value={endParts.hour}
                        onChange={(e) =>
                          updateHourGroupTime(group.id, 'end', `${e.target.value}:${endParts.minute || '00'}`)
                        }
                        className={timeSelectClass}
                      >
                        <option value="">--</option>
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-ink/50 dark:text-sand-300/70">:</span>
                      <select
                        value={endParts.minute}
                        onChange={(e) =>
                          updateHourGroupTime(group.id, 'end', `${endParts.hour || '00'}:${e.target.value}`)
                        }
                        className={timeSelectClass}
                      >
                        <option value="">--</option>
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeHourGroup(group.id)}
                      className="ml-auto text-ink/40 dark:text-sand-300/50 hover:text-primary text-sm"
                      aria-label={t('form.remove_hour_group')}
                    >
                      ×
                    </button>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addHourGroup}
          className="mt-3 text-sm font-bold text-primary hover:underline"
        >
          + {t('form.add_hour_group')}
        </button>

        <p className="text-xs text-ink/50 dark:text-sand-300/70 mt-3">
          {t('form.opening_hours_note')}
        </p>
      </div>

      <div>
        <label htmlFor="priceRange" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.price_range')}
        </label>
        <select
          id="priceRange"
          name="priceRange"
          value={formData.priceRange}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
        >
          <option value="free">{t('form.price_free')}</option>
          <option value="cheap">{t('form.price_cheap')}</option>
          <option value="moderate">{t('form.price_moderate')}</option>
          <option value="expensive">{t('form.price_expensive')}</option>
        </select>
      </div>

      <div>
        <label htmlFor="bestTimeToVisit" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.best_time_to_visit')}
        </label>
        <select
          id="bestTimeToVisit"
          name="bestTimeToVisit"
          value={formData.bestTimeToVisit}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
        >
          <option value="">{t('form.select_option')}</option>
          <option value="Manhã">{t('form.morning')}</option>
          <option value="Tarde">{t('form.afternoon')}</option>
          <option value="Noite">{t('form.evening')}</option>
          <option value="Final de Semana">{t('form.weekend')}</option>
          <option value="Feriados">{t('form.holidays')}</option>
          <option value="Outro">{t('form.other')}</option>
        </select>
        {formData.bestTimeToVisit === 'Outro' && (
          <input
            type="text"
            id="bestTimeToVisitCustom"
            name="bestTimeToVisitCustom"
            value={formData.bestTimeToVisitCustom || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, bestTimeToVisitCustom: e.target.value }))}
            className="w-full mt-2 px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
            placeholder={t('form.specify_best_time')}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.accessibility')}
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="wheelchairAccessible"
              name="accessibility.wheelchairAccessible"
              checked={formData.accessibility.wheelchairAccessible}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-sand-300 dark:border-ink-700 rounded"
            />
            <label htmlFor="wheelchairAccessible" className="ml-2 block text-sm text-ink/80 dark:text-sand-200">
              {t('form.wheelchair_accessible')}
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="familyFriendly"
              name="accessibility.familyFriendly"
              checked={formData.accessibility.familyFriendly}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-sand-300 dark:border-ink-700 rounded"
            />
            <label htmlFor="familyFriendly" className="ml-2 block text-sm text-ink/80 dark:text-sand-200">
              {t('form.family_friendly')}
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="petFriendly"
              name="accessibility.petFriendly"
              checked={formData.accessibility.petFriendly}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-sand-300 dark:border-ink-700 rounded"
            />
            <label htmlFor="petFriendly" className="ml-2 block text-sm text-ink/80 dark:text-sand-200">
              {t('form.pet_friendly')}
            </label>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="safetyNotes" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
          {t('form.safety_notes')}
        </label>
        <textarea
          id="safetyNotes"
          name="safetyNotes"
          value={formData.safetyNotes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
          placeholder={t('form.safety_notes_placeholder')}
        />
      </div>

      {formData.category && formData.category !== 'vista' && formData.category !== 'peculiar' && (
        <div>
          {/* Section 5: Contact info */}
          <div className="flex items-center gap-3 pt-8 mb-5 border-t border-dashed border-sand-300 dark:border-ink-700">
            <div className="w-8 h-8 border-2 border-dashed border-primary rounded-full flex items-center justify-center -rotate-3 flex-shrink-0">
              <span className="text-sm font-display font-bold text-primary">5</span>
            </div>
            <h2 className="text-lg font-display font-semibold text-ink dark:text-sand-50">{t('form.section_contact')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="contact.website" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                {t('form.website')}
              </label>
              <input
                type="url"
                id="contact.website"
                name="contact.website"
                value={formData.contact.website}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contact: { ...prev.contact, website: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                placeholder="https://exemplo.com"
              />
            </div>

            <div>
              <label htmlFor="contact.phone" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                {t('form.phone')}
              </label>
              <input
                type="tel"
                id="contact.phone"
                name="contact.phone"
                value={formData.contact.phone}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contact: { ...prev.contact, phone: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                placeholder="+258 84 123 4567"
              />
            </div>

            <div>
              <label htmlFor="contact.email" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                {t('form.email')}
              </label>
              <input
                type="email"
                id="contact.email"
                name="contact.email"
                value={formData.contact.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contact: { ...prev.contact, email: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                placeholder="contato@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact.instagram" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                  {t('form.instagram')}
                </label>
                <input
                  type="text"
                  id="contact.instagram"
                  name="contact.instagram"
                  value={formData.contact.instagram}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contact: { ...prev.contact, instagram: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                  placeholder="@usuario ou link completo"
                />
              </div>

              <div>
                <label htmlFor="contact.facebook" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                  {t('form.facebook')}
                </label>
                <input
                  type="text"
                  id="contact.facebook"
                  name="contact.facebook"
                  value={formData.contact.facebook}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contact: { ...prev.contact, facebook: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                  placeholder="Página ou perfil"
                />
              </div>

              <div>
                <label htmlFor="contact.twitter" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                  {t('form.twitter')}
                </label>
                <input
                  type="text"
                  id="contact.twitter"
                  name="contact.twitter"
                  value={formData.contact.twitter}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contact: { ...prev.contact, twitter: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                  placeholder="@usuario ou link completo"
                />
              </div>

              <div>
                <label htmlFor="contact.whatsapp" className="block text-sm text-ink/70 dark:text-sand-300 mb-1">
                  {t('form.whatsapp')}
                </label>
                <input
                  type="tel"
                  id="contact.whatsapp"
                  name="contact.whatsapp"
                  value={formData.contact.whatsapp}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contact: { ...prev.contact, whatsapp: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                  placeholder="+258 84 123 4567"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Finishing touches */}
      <div className="flex items-center gap-3 pt-8 border-t border-dashed border-sand-300 dark:border-ink-700">
        <div className="w-8 h-8 border-2 border-dashed border-primary rounded-full flex items-center justify-center rotate-1 flex-shrink-0">
          <span className="text-sm font-display font-bold text-primary">6</span>
        </div>
        <h2 className="text-lg font-display font-semibold text-ink dark:text-sand-50">{t('form.section_finish')}</h2>
      </div>

      {user && (
        <p className="text-sm text-ink/60 dark:text-sand-300">
          {t('auth.posting_as')} <span className="font-medium text-ink dark:text-sand-50">{user.displayName}</span>
        </p>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isAnonymous"
          name="isAnonymous"
          checked={formData.isAnonymous}
          onChange={handleChange}
          className="h-4 w-4 text-primary focus:ring-primary border-sand-300 dark:border-ink-700 rounded"
        />
        <label htmlFor="isAnonymous" className="ml-2 block text-sm text-ink/80 dark:text-sand-200">
          {t('form.submit_anonymously')}
        </label>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white py-3 px-4 font-bold hover:rotate-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0_rgba(59,42,30,0.18)]"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {t('form.submitting')}
            </div>
          ) : (
            t('form.submit')
          )}
        </button>
      </div>
    </form>
  );
}
