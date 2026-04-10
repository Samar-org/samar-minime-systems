import jwt from 'jsonwebtoken';
import { getConfig } from '@samar/config';
import { getLogger } from '@samar/observability';

const logger = getLogger('auth-service');

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  projectId?: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiry: string = '24h';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret';
  }

  generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    try {
      const options: jwt.SignOptions = {
        expiresIn: this.jwtExpiry,
      };
      const token = jwt.sign(payload as jwt.JwtPayload, this.jwtSecret, options);
      logger.info(`Token generated for user: ${payload.userId}`);
      return token;
    } catch (error) {
      logger.error('Failed to generate token', error);
      throw error;
    }
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.error('Token verification failed', error);
      throw new Error('Invalid or expired token');
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload | null;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  refreshToken(token: string): string {
    const payload = this.verifyToken(token);
    const { iat, exp, ...cleanPayload } = payload;
    return this.generateToken(cleanPayload);
  }
}
