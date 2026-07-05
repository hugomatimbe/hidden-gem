import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

const db = getDb();

// Same shape as the create schema in api/gems.ts, minus id/createdAt/status/
// submittedBy — those are server-controlled on update, not client-supplied.
const gemUpdateSchema = z.object({
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
  const id = req.query.id;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Missing gem id' });
  }

  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    res.setHeader('Allow', ['PATCH', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const sessionUser = getSessionUser(req, db);
  if (!sessionUser) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  const existing = db.prepare('SELECT * FROM gems WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Lugar não encontrado.' });
  }

  // Only the original submitter or an admin can edit — everyone else gets a
  // 403, matching the delete/moderation authorization pattern used elsewhere.
  if (existing.submittedBy !== sessionUser.id && !sessionUser.isAdmin) {
    return res.status(403).json({ error: 'Não tem permissão para editar este lugar.' });
  }

  try {
    const data = gemUpdateSchema.parse(req.body);

    // Edits apply immediately rather than resetting to a pending-review
    // state — the gem already passed moderation once, and re-queuing every
    // small fix (like adding a menu photo) would be more friction than it's
    // worth. Ownership, submission date, and moderation status are
    // deliberately left untouched by an edit.
    db.prepare(
      `UPDATE gems SET
         title = @title,
         description = @description,
         category = @category,
         tags = @tags,
         lat = @lat,
         lng = @lng,
         address = @address,
         images = @images,
         menuImages = @menuImages,
         isAnonymous = @isAnonymous,
         openingHours = @openingHours,
         priceRange = @priceRange,
         wheelchairAccessible = @wheelchairAccessible,
         familyFriendly = @familyFriendly,
         petFriendly = @petFriendly,
         safetyNotes = @safetyNotes,
         bestTimeToVisit = @bestTimeToVisit,
         contact = @contact,
         updatedAt = @updatedAt
       WHERE id = @id`
    ).run({
      id,
      title: data.title,
      description: data.description,
      category: data.category,
      tags: JSON.stringify(data.tags || []),
      lat: data.location.lat,
      lng: data.location.lng,
      address: data.location.address || null,
      images: JSON.stringify(data.images || []),
      menuImages: JSON.stringify(data.menuImages || []),
      isAnonymous: parseBoolean(data.isAnonymous),
      openingHours: data.openingHours || null,
      priceRange: data.priceRange || null,
      wheelchairAccessible: parseBoolean(data.accessibility?.wheelchairAccessible),
      familyFriendly: parseBoolean(data.accessibility?.familyFriendly),
      petFriendly: parseBoolean(data.accessibility?.petFriendly),
      safetyNotes: data.safetyNotes || null,
      bestTimeToVisit: data.bestTimeToVisit || null,
      contact: data.contact ? JSON.stringify(data.contact) : null,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ message: 'Gem updated successfully', id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.format() });
    }
    console.error('Error updating gem:', error);
    return res.status(500).json({ error: 'Failed to update gem' });
  }
}
