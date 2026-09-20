"use client";

import { UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";
import { useEffect, useState } from "react";

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasValidClerkKey =
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  !pubKey.includes("REEMPLAZAR") &&
  pubKey.length > 20 &&
  pubKey.includes("$");

export function UserAvatar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !hasValidClerkKey) {
    return (
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: "0.8125rem",
          boxShadow: "var(--shadow-accent)",
          cursor: "pointer",
        }}
        title="Perfil de Usuario"
      >
        A
      </div>
    );
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: {
            width: 34,
            height: 34,
          },
        },
      }}
    />
  );
}
