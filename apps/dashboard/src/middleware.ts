import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect routes that require authentication
 * - Allows public routes: /login, /register
 * - Redirects unauthenticated users to /login on protected routes
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));

  // Get the auth token from cookies or localStorage (cookies are set by the API)
  const authCookie = request.cookies.get('samar_auth_token')?.value;
  const authHeader = request.headers.get('authorization');

  // Consider user authenticated if they have an auth token in cookies
  const isAuthenticated = !!authCookie || !!authHeader;

  // If the route is public, allow access
  if (isPublicRoute) {
    // If already authenticated, redirect from auth pages to dashboard
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // For protected routes, check if user is authenticated
  if (!isAuthenticated) {
    // Store the requested path to redirect after login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Configuration for the middleware
 * Specifies which routes the middleware should run on
 */
export const config = {
  matcher: [
    // Match all routes except:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};