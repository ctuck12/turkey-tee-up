export default function handler(req, res) {
  res.json({ ok: true, env: {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeVersion: process.version,
  }});
}
