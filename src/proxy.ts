import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/integrations(.*)',
  '/agents(.*)',
  '/workflows(.*)',
  '/onboarding(.*)'
]);

// The landing page route
const isLandingPageRoute = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // 1. If the user is logged in and tries to access the landing page, redirect to dashboard
  if (userId && isLandingPageRoute(req)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 2. Protect relevant routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
