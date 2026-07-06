export interface Gem {
  id: string;
  title: string;
  description: string;
  category: 'comida' | 'bar' | 'natureza' | 'arte' | 'vista' | 'peculiar' | string;
  tags: string[];
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  images?: string[];
  menuImages?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  submittedBy?: string;
  isAnonymous?: boolean;
  // Novos campos
  // Guardado como texto livre já formatado (ex: "Mon: 9-5, Tue: 9-5"),
  // não como objeto por dia — é assim que a API e o formulário o tratam.
  openingHours?: string;
  priceRange?: 'free' | 'cheap' | 'moderate' | 'expensive';
  accessibility?: {
    wheelchairAccessible?: boolean;
    familyFriendly?: boolean;
    petFriendly?: boolean;
  };
  safetyNotes?: string;
  bestTimeToVisit?: string;
  // Social media and contact information
  contact?: {
    website?: string;
    phone?: string;
    email?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    whatsapp?: string;
  };
  // Additional fields for restaurants/cafes/bars
  menuItems?: string[];
  specialDishes?: string[];
  atmosphere?: string;
  cuisine?: string;
  // Vote tally — only present on pages whose query joins the votes table
  // (maputo listing, homepage featured gems, gem detail). Optional so
  // GemCard can render gracefully on pages that don't fetch vote data.
  netVotes?: number;
  totalVotes?: number;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
}

// Mirrors AuthUser in src/contexts/AuthContext.tsx (the shape actually
// returned by /api/auth/*). Kept here too since other modules that deal with
// gem ownership (e.g. Gem.submittedBy) may want to reference it.
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
}