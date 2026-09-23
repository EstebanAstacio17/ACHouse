import type { Metadata } from "next";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import { getHouseholdNotifications } from "@/lib/actions/notifications";
import { getActiveHousehold } from "@/lib/household";

export const metadata: Metadata = {
  title: "Centro de Notificaciones | ACHouse",
  description: "Notificaciones de actividad financiera y novedades de la plataforma.",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const activeHousehold = await getActiveHousehold();
  const res = await getHouseholdNotifications(activeHousehold?.id);

  return (
    <NotificationsClient
      initialNotifications={res.notifications || []}
      householdName={activeHousehold?.name || "Mi Hogar"}
    />
  );
}
