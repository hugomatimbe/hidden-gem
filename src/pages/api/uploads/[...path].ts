// Serves files from STORAGE_DIR/uploads directly, bypassing Next's static
// file handler entirely. Only reached in production via the rewrite in
// next.config.js (see the comment there for why this exists) — local dev
// never sets STORAGE_DIR, so uploads are served the normal way from
// public/uploads and this route is unused.
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const storageDir = process.env.STORAGE_DIR;
  if (!storageDir) {
    res.status(404).end();
    return;
  }

  const parts = req.query.path;
  const relPath = Array.isArray(parts) ? parts.join('/') : parts || '';

  const uploadsRoot = path.join(storageDir, 'uploads');
  const filePath = path.join(uploadsRoot, relPath);

  // Make sure the resolved path can't escape the uploads directory
  // (e.g. via ../../ segments in the URL).
  if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) {
    res.status(400).end();
    return;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.status(404).end();
    return;
  }
  if (!stat.isFile()) {
    res.status(404).end();
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(filePath).pipe(res);
}
