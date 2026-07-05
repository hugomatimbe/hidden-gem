import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';

const db = getDb();

// Validation schema for gem data
const gemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1),
  tags: z.array(z.string()).max(5),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  images: z.array(z.string()).optional(),
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
  contact: z.object({
    website: z.string().url().optional().or(z.literal('')),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    whatsapp: z.string().optional(),
  }).optional(),
});

function parseBoolean(value: any): number {
  return value ? 1 : 0;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Public listing only ever shows approved gems. Pending/rejected gems
    // are only visible through /api/admin/gems (admin-only).
    const rows = db.prepare("SELECT * FROM gems WHERE status = 'approved'").all();
    // Parse JSON fields and booleans
    const gems = rows.map((row: any) => {
      const { lat, lng, address, ...rest } = row;
      return {
        ...rest,
        location: {
          lat: Number(lat),
          lng: Number(lng),
          address: address || null,
        },
        tags: JSON.parse(row.tags),
        images: row.images ? JSON.parse(row.images) : [],
        menuImages: row.menuImages ? JSON.parse(row.menuImages) : [],
        isAnonymous: !!row.isAnonymous,
        wheelchairAccessible: !!row.wheelchairAccessible,
        familyFriendly: !!row.familyFriendly,
        petFriendly: !!row.petFriendly,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    });
    res.status(200).json(gems);
  } else if (req.method === 'POST') {
    try {
      // Adding a place requires an account. We ignore whatever the client
      // sent as `submittedBy` and always derive it from the session, so this
      // can't be spoofed by posting directly to the API.
      const sessionUser = getSessionUser(req, db);
      if (!sessionUser) {
        return res.status(401).json({ error: 'É preciso entrar na sua conta para adicionar um lugar.' });
      }

      // Validate input
      const validatedGem = gemSchema.parse(req.body);

      // Check for duplicates - same title with location within 100 meters
      const existingGems = db.prepare('SELECT * FROM gems WHERE title = ?').all(validatedGem.title);
      const duplicateGem = existingGems.find((gem: any) => {
        const distance = Math.sqrt(
          Math.pow(gem.lat - validatedGem.location.lat, 2) +
          Math.pow(gem.lng - validatedGem.location.lng, 2)
        );
        // Convert to approximate meters (rough approximation)
        const distanceInMeters = distance * 111000; // 1 degree ≈ 111km
        return distanceInMeters < 100; // Within 100 meters
      });

      if (duplicateGem) {
        return res.status(409).json({
          error: 'Este lugar já foi submetido nesta localização. Lugares duplicados só são permitidos em localizações diferentes.'
        });
      }

      const stmt = db.prepare(`
        INSERT INTO gems (
          id, title, description, category, tags, lat, lng, address, images, menuImages,
          createdAt, updatedAt, submittedBy, isAnonymous, openingHours, priceRange,
          wheelchairAccessible, familyFriendly, petFriendly, safetyNotes, bestTimeToVisit, contact, status
        ) VALUES (
          @id, @title, @description, @category, @tags, @lat, @lng, @address, @images, @menuImages,
          @createdAt, @updatedAt, @submittedBy, @isAnonymous, @openingHours, @priceRange,
          @wheelchairAccessible, @familyFriendly, @petFriendly, @safetyNotes, @bestTimeToVisit, @contact, @status
        )
      `);

      stmt.run({
        id: validatedGem.id,
        title: validatedGem.title,
        description: validatedGem.description,
        category: validatedGem.category,
        tags: JSON.stringify(validatedGem.tags || []),
        lat: validatedGem.location.lat,
        lng: validatedGem.location.lng,
        address: validatedGem.location.address || null,
        images: JSON.stringify(validatedGem.images || []),
        menuImages: JSON.stringify(validatedGem.menuImages || []),
        createdAt: validatedGem.createdAt,
        updatedAt: validatedGem.updatedAt,
        // Always the authenticated user's id, regardless of what the client
        // sent — `isAnonymous` only controls public display, not storage.
        submittedBy: sessionUser.id,
        isAnonymous: parseBoolean(validatedGem.isAnonymous),
        openingHours: validatedGem.openingHours || null,
        priceRange: validatedGem.priceRange || null,
        wheelchairAccessible: parseBoolean(validatedGem.accessibility?.wheelchairAccessible),
        familyFriendly: parseBoolean(validatedGem.accessibility?.familyFriendly),
        petFriendly: parseBoolean(validatedGem.accessibility?.petFriendly),
        safetyNotes: validatedGem.safetyNotes || null,
        bestTimeToVisit: validatedGem.bestTimeToVisit || null,
        contact: validatedGem.contact ? JSON.stringify(validatedGem.contact) : null,
        // Every new submission starts pending — there's no way for the
        // client to self-approve. Existing gems from before moderation
        // existed were backfilled to 'approved' in the db migration.
        status: 'pending',
      });

      res.status(201).json({ message: 'Gem saved successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid input', details: error.format() });
      } else {
        console.error('Error saving gem:', error);
        res.status(500).json({ error: 'Failed to save gem' });
      }
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
