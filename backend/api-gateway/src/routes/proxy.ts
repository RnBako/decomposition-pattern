import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage } from 'http';
import { config } from '../config';
import { HttpError } from '../middleware/errorHandler';

/**
 * Mount proxies at router root with pathFilter so Express does not strip the
 * `/api/...` prefix before rewrite. Strip `/api` → upstream service paths.
 * See README route map.
 */
function attachIdentityHeaders(proxyReq: ClientRequest, req: IncomingMessage): void {
  const auth = req.headers['authorization'];
  if (auth) {
    proxyReq.setHeader('Authorization', Array.isArray(auth) ? auth[0] : auth);
  }
  for (const key of ['x-user-id', 'x-user-role', 'x-user-email', 'x-user-display-name'] as const) {
    const v = req.headers[key];
    if (typeof v === 'string' && v) {
      proxyReq.setHeader(key, v);
    }
  }
}

function proxyErrorHandler(_err: Error, _req: Request, res: Response | import('net').Socket): void {
  if ('headersSent' in res && !res.headersSent) {
    res.status(502).json({
      error: 'bad_gateway',
      message: 'Upstream недоступен',
    });
  }
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function makeProxy(target: string, gatewayPrefix: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter: (pathname) => matchesPrefix(pathname, gatewayPrefix),
    pathRewrite: { '^/api': '' },
    proxyTimeout: 30_000,
    timeout: 30_000,
    on: {
      proxyReq: attachIdentityHeaders,
      error: proxyErrorHandler,
    },
  });
}

export function createProxyRouter(): Router {
  const router = Router();

  // No express.json() before proxies — preserves multipart image uploads.

  router.use(makeProxy(config.authServiceUrl, '/api/auth'));
  router.use(makeProxy(config.wishlistServiceUrl, '/api/wishlists'));
  router.use(makeProxy(config.wishlistServiceUrl, '/api/share'));
  router.use(makeProxy(config.wishlistServiceUrl, '/api/media'));
  router.use(makeProxy(config.bookingServiceUrl, '/api/bookings'));
  router.use(makeProxy(config.bookingServiceUrl, '/api/admin/bookings'));
  router.use(makeProxy(config.notificationServiceUrl, '/api/notifications'));

  router.use('/api', (_req: Request, _res: Response, next: NextFunction) => {
    next(new HttpError(404, 'not_found', 'Неизвестный API-маршрут'));
  });

  return router;
}
