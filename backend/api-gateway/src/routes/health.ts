import { Router, Request, Response } from 'express';
import { config } from '../config';

export type UpstreamHealth = {
  name: string;
  url: string;
  status: 'ok' | 'down' | 'skipped';
  httpStatus?: number;
};

async function pingUpstream(name: string, baseUrl: string): Promise<UpstreamHealth> {
  const url = `${baseUrl.replace(/\/$/, '')}/health`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return {
      name,
      url,
      status: res.ok ? 'ok' : 'down',
      httpStatus: res.status,
    };
  } catch {
    return { name, url, status: 'down' };
  }
}

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'api-gateway' });
  });

  router.get('/api/health', async (_req: Request, res: Response) => {
    const upstreams = await Promise.all([
      pingUpstream('auth-service', config.authServiceUrl),
      pingUpstream('wishlist-service', config.wishlistServiceUrl),
      pingUpstream('booking-service', config.bookingServiceUrl),
      pingUpstream('notification-service', config.notificationServiceUrl),
    ]);
    const allOk = upstreams.every((u) => u.status === 'ok');
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      service: 'api-gateway',
      upstreams,
    });
  });

  return router;
}
