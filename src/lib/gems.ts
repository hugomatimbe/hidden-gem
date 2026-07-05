import { Gem } from './types';

// Shared between the gem detail page (getStaticProps) and the edit page
// (getServerSideProps) — both read a raw `gems` row straight from SQLite
// and need it turned into the same shape.
export function parseGemRow(row: any): Gem {
  // getStaticProps/getServerSideProps reject `undefined` in serialized
  // props (Next.js requires valid JSON), so every optional field below
  // must resolve to a real value, `null`, or be omitted entirely — never
  // `undefined`.
  let contact;
  try {
    contact = row.contact ? JSON.parse(row.contact) : undefined;
  } catch {
    contact = undefined;
  }

  const { lat, lng, address, contact: _rawContact, ...rest } = row;

  return {
    ...rest,
    location: {
      lat: Number(lat),
      lng: Number(lng),
      address: address || '',
    },
    tags: JSON.parse(row.tags),
    images: row.images ? JSON.parse(row.images) : [],
    menuImages: row.menuImages ? JSON.parse(row.menuImages) : [],
    isAnonymous: !!row.isAnonymous,
    accessibility: {
      wheelchairAccessible: !!row.wheelchairAccessible,
      familyFriendly: !!row.familyFriendly,
      petFriendly: !!row.petFriendly,
    },
    ...(contact ? { contact } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } as Gem;
}
