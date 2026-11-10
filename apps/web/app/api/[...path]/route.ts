import { bridge } from '../../../lib/bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
/** 将动态路由的路径和请求传给本地网关。 */
async function handler(request: Request, context: Context) { return bridge(request, (await context.params).path.join('/')); }
export { handler as GET, handler as POST, handler as DELETE };
