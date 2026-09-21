import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasValidClerkKey =
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  !pubKey.includes("REEMPLAZAR") &&
  pubKey.length > 20;

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite(.*)",
  "/api/webhooks/(.*)",
  "/api/invitations/(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isInviteRoute = createRouteMatcher(["/invite(.*)"]);

// When valid Clerk keys are configured, protect routes with Clerk
const clerkHandler = clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Allow all API routes to proceed (they handle their own auth checks)
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const householdCookie = req.cookies.get("household_id")?.value;
  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const hasHousehold = Boolean(householdCookie || metadata?.householdId);

  if (!hasHousehold && !isOnboardingRoute(req) && !isInviteRoute(req)) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

// Resilient middleware that doesn't crash during local dev before Clerk keys are configured
export default function middleware(req: NextRequest) {
  if (hasValidClerkKey) {
    return (clerkHandler as any)(req);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
