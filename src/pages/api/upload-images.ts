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
      keepExtensions: true,
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
          // Generate public URL for the uploaded file
          const filename = path.basename(file.filepath);
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
