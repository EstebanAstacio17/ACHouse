import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ui/ToastContext";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "ACHouse — Finanzas Familiares",
    template: "%s | ACHouse",
  },
  description:
    "Plataforma de gestión financiera familiar. Controla ingresos, egresos, deudas y conciliaciones de tu hogar.",
  keywords: ["finanzas", "familia", "hogar", "presupuesto", "gastos", "ahorros"],
  authors: [{ name: "ACHouse" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_ES",
    title: "ACHouse — Finanzas Familiares",
    description: "Gestión financiera inteligente para tu hogar",
    siteName: "ACHouse",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ACHouse",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#111111" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
  width: "device-width",
  initialScale: 1,
};

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasValidClerkKey =
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  !pubKey.includes("REEMPLAZAR") &&
  pubKey.length > 20;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('achouse-theme');if(t==='light'){document.documentElement.classList.add('light');document.documentElement.setAttribute('data-theme','light');}else if(t==='dark'){document.documentElement.classList.remove('light');document.documentElement.setAttribute('data-theme','dark');}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.classList.add('light');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={jakarta.variable}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );

  if (!hasValidClerkKey) {
    return content;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#4285F4",
          borderRadius: "10px",
          fontFamily: "Plus Jakarta Sans, Inter, sans-serif",
        },
      }}
    >
      {content}
    </ClerkProvider>
  );
}
