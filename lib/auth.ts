export function requireAdmin(request: Request): Response | null {
  const auth = request.headers.get('Authorization');
  const token = process.env.ADMIN_TOKEN;
  if (!token || !auth || auth !== `Bearer ${token}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
