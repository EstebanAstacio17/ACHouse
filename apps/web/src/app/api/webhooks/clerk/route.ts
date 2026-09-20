import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { db } from "@achouse/db";
import { householdMembers } from "@achouse/db/schema";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing CLERK_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type } = evt;

  // Handle user.created
  if (type === "user.created") {
    // User is created in Clerk. We don't auto-create a household here.
    // That happens in the onboarding flow. We just log it.
    console.log(`[Clerk Webhook] New user: ${evt.data.id}`);
  }

  // Handle user.deleted
  if (type === "user.deleted") {
    const clerkUserId = evt.data.id;
    if (clerkUserId) {
      // Mark all member records as inactive
      // In production: handle cascade deactivation
      console.log(`[Clerk Webhook] User deleted: ${clerkUserId}`);
    }
  }

  return NextResponse.json({ received: true });
}
