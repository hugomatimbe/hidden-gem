// Runs once before `next start` in production (see package.json's "start"
// script). No-ops entirely in local dev, where STORAGE_DIR is never set.
//
// The problem this solves: Next serves public/uploads straight off disk at
// request time, but uploaded photos need to live on a persistent volume, not
// the container's throwaway filesystem. Hosts like Railway only give a
// service one mount path, so both the sqlite db (see lib/db.ts) and the
// uploads folder have to share that one mounted volume as subfolders. This
// script points public/uploads at the real uploads folder on the volume via
// a symlink, so nothing else in the app (upload-images.ts, <img> tags, etc.)
// needs to know or care where the volume is actually mounted.
const fs = require('fs');
const path = require('path');

const storageDir = process.env.STORAGE_DIR;
if (!storageDir) {
  process.exit(0);
}

const uploadsTarget = path.join(storageDir, 'uploads');
fs.mkdirSync(uploadsTarget, { recursive: true });

const publicUploads = path.join(process.cwd(), 'public', 'uploads');

let existing;
try {
  existing = fs.lstatSync(publicUploads);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  existing = null;
}

if (existing?.isSymbolicLink()) {
  // Already set up from a previous deploy — nothing to do.
} else {
  if (existing) {
    // The built image ships public/uploads as a plain (likely empty, or
    // containing whatever was committed to git) directory — clear it so the
    // symlink can take its place.
    fs.rmSync(publicUploads, { recursive: true, force: true });
  }
  fs.symlinkSync(uploadsTarget, publicUploads, 'dir');
}

console.log(`[prepare-storage] public/uploads -> ${uploadsTarget}`);
