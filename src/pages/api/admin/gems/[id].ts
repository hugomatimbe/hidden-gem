import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { sendGemModerationEmail, getBaseUrl } from '../../../../lib/email';
import { logAdminAction } from '../../../../lib/adminLog';

const db = getDb();

const moderateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending']),
  reason: z.string().max(500).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const id = req.query.id as string;

  if (req.method === 'PATCH') {
    try {
      const data = moderateSchema.parse(req.body);

      // Fetch title + submitter before updating, both for the notification
      // email and for a readable audit-log entry (the id alone isn't much
      // use when reviewing the log later).
      const existing = db
        .prepare(
          `SELECT gems.title, gems.submittedBy, users.email as submitterEmail
           FROM gems LEFT JOIN users ON gems.submittedBy = users.id
           WHERE gems.id = ?`
        )
        .get(id) as { title: string; submittedBy: string | null; submitterEmail: string | null } | undefined;

      const result = db
        .prepare('UPDATE gems SET status = ?, rejectionReason = ?, updatedAt = ? WHERE id = ?')
        .run(data.status, data.status === 'rejected' ? data.reason || null : null, new Date().toISOString(), id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Lugar não encontrado.' });
      }

      if (existing) {
        logAdminAction(
          db,
          admin.id,
          `gem_${data.status}`,
          'gem',
          id,
          `${existing.title}${data.status === 'rejected' && data.reason ? ` — ${data.reason}` : ''}`
        );

        // Best-effort — a failed/unconfigured email shouldn't fail the
        // moderation action itself, so this is deliberately not awaited
        // into the try/catch that would 500 the response.
        if (existing.submitterEmail && (data.status === 'approved' || data.status === 'rejected')) {
          sendGemModerationEmail(
            existing.submitterEmail,
            existing.title,
            data.status,
            `${getBaseUrl(req)}/g/${id}`,
            data.reason
          ).catch((err) => console.error('Error sending moderation email:', err));
        }
      }

      res.status(200).json({ message: 'Estado atualizado' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Dados inválidos' });
      } else {
        console.error('Error moderating gem:', error);
        res.status(500).json({ error: 'Erro ao atualizar o lugar.' });
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      const existing = db.prepare('SELECT title FROM gems WHERE id = ?').get(id) as { title: string } | undefined;

      db.prepare('DELETE FROM votes WHERE gemId = ?').run(id);
      db.prepare('DELETE FROM comments WHERE gemId = ?').run(id);
      // Everything else that can reference a gem — visitor photos,
      // bookmarks, curated-list memberships, and reports filed against it —
      // used to be left behind as orphaned rows once the gem itself was
      // gone. Clean those up too so a deleted gem doesn't linger anywhere.
      db.prepare('DELETE FROM gem_photos WHERE gemId = ?').run(id);
      db.prepare('DELETE FROM saved_gems WHERE gemId = ?').run(id);
      db.prepare('DELETE FROM list_items WHERE gemId = ?').run(id);
      db.prepare("DELETE FROM reports WHERE targetType = 'gem' AND targetId = ?").run(id);

      const result = db.prepare('DELETE FROM gems WHERE id = ?').run(id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Lugar não encontrado.' });
      }

      logAdminAction(db, admin.id, 'gem_delete', 'gem', id, existing?.title);

      res.status(200).json({ message: 'Lugar removido' });
    } catch (error) {
      console.error('Error deleting gem:', error);
      res.status(500).json({ error: 'Erro ao remover o lugar.' });
    }
  } else {
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
