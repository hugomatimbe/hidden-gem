/** @type {import('next').NextConfig} */
const nextConfig = {
  // On Railway (and anywhere else STORAGE_DIR is set), public/uploads is a
  // symlink out to the persistent volume — see scripts/prepare-storage.js.
  // Next's built-in static file server refuses to follow a symlink that
  // points outside the public/ directory (a sane default to stop symlink-
  // based path traversal), so requests to /uploads/* 404 there even though
  // the file genuinely exists. Route those requests to a small API handler
  // instead, which reads STORAGE_DIR/uploads directly with no such
  // restriction. Local dev never sets STORAGE_DIR, so this rewrite is a
  // no-op there and uploads keep being served the normal way.
  async rewrites() {
    if (!process.env.STORAGE_DIR) {
      return [];
    }
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
