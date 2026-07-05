import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// formidable's `keepExtensions: true` blindly reuses whatever suffix the
// client's filename happened to have. Photos saved from some sites/apps end
// up with browser-assigned filenames like "abc123.com" or "xyz.to" (picked
// up from the source URL, not a real file extension) — those aren't
// recognized image extensions, so Next's static file server won't serve them
// with an image Content-Type and the <img> tag fails to render (showing the
// alt text instead, as if the image were missing). To avoid this, we ignore
// the client filename entirely and derive the extension from the detected
// MIME type instead, which `filter` below has already confirmed is an image.
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: (part) => {
        return part.mimetype?.startsWith('image/') || false;
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(500).json({ error: 'Error uploading files' });
      }

      const uploadedFiles = files.images;
      if (!uploadedFiles) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
      const imageUrls: string[] = [];

      fileArray.forEach((file) => {
        if (file && file.filepath) {
          // Rename the file formidable wrote (extensionless, since
          // keepExtensions is off above) to have a real image extension
          // based on its actual MIME type.
          const properExt = MIME_EXTENSIONS[file.mimetype || ''] || '.jpg';
          const finalPath = `${file.filepath}${properExt}`;
          fs.renameSync(file.filepath, finalPath);

          const filename = path.basename(finalPath);
          const publicUrl = `/uploads/${filename}`;
          imageUrls.push(publicUrl);
        }
      });

      res.status(200).json({ urls: imageUrls });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
