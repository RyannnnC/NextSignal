import { bridge } from '../../../lib/bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) { return bridge(request, (await context.params).path.join('/')); }
export { handler as GET, handler as POST, handler as DELETE };
