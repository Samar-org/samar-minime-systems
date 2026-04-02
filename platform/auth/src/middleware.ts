import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { getLogger } from '@samar/observability';

const logger = getLogger('auth-middleware');
const authService = new AuthService();

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        projectId?: string;
      };
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization scheme' });
      return;
    }

    const payload = authService.verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      projectId: payload.projectId,
    };

    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
