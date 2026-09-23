"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Tag,
} from "lucide-react";
import { PlatformNotification, getHouseholdNotifications } from "@/lib/actions/notifications";
import { useToast } from "@/components/ui/ToastContext";

interface NotificationsClientProps {
  initialNotifications: PlatformNotification[];
  householdName?: string;
}

const READ_STORAGE_KEY = "achouse_read_notifications_v1";

export function NotificationsClient({
  initialNotifications,
  householdName = "Mi Hogar",
}: NotificationsClientProps) {
  const toast = useToast();
  const [notifications, setNotifications] = useState<PlatformNotification[]>(initialNotifications);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "income" | "expense" | "system">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReadIds(new Set(parsed));
        }
      }
    } catch {}
  }, []);

  // Save read notifications to localStorage
  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      // Dispatch custom event to sync with Header in real time
      window.dispatchEvent(new Event("notifications_updated"));
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getHouseholdNotifications();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
        toast.success("Notificaciones actualizadas");
      }
    } catch {
      toast.error("Error al actualizar notificaciones");
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSet = new Set(readIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      toast.info("Marcada como no leída");
    } else {
      newSet.add(id);
      toast.success("Marcada como leída");
    }
    saveReadIds(newSet);
  };

  const markAllAsRead = () => {
    const newSet = new Set(readIds);
    notifications.forEach((n) => newSet.add(n.id));
    saveReadIds(newSet);
    toast.success("Todas las notificaciones marcadas como leídas");
  };

  const clearAllRead = () => {
    const newSet = new Set<string>();
    saveReadIds(newSet);
    toast.info("Se reinició el estado de lectura");
  };

  // KPIs
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const activityCount = notifications.filter((n) => n.category === "activity").length;
  const systemCount = notifications.filter((n) => n.category === "system").length;

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isRead = readIds.has(n.id);

      // Tab filter
      if (activeTab === "unread" && isRead) return false;
      if (activeTab === "income" && n.type !== "income" && n.type !== "receivable") return false;
      if (activeTab === "expense" && n.type !== "expense") return false;
      if (activeTab === "system" && n.category !== "system") return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesMessage = n.message.toLowerCase().includes(query);
        const matchesMember = n.memberName?.toLowerCase().includes(query);
        const matchesAccount = n.accountName?.toLowerCase().includes(query);
        const matchesBiz = n.businessName?.toLowerCase().includes(query);
        const matchesCat = n.categoryName?.toLowerCase().includes(query);
        return matchesTitle || matchesMessage || matchesMember || matchesAccount || matchesBiz || matchesCat;
      }

      return true;
    });
  }, [notifications, readIds, activeTab, searchQuery]);

  const getIconForType = (type: string, category: string) => {
    if (category === "system") {
      return <Sparkles size={18} color="var(--accent)" />;
    }
    switch (type) {
      case "income":
        return <ArrowUpCircle size={18} color="var(--color-income)" />;
      case "receivable":
        return <Clock size={18} color="var(--color-warning)" />;
      case "expense":
        return <ArrowDownCircle size={18} color="var(--color-expense)" />;
      case "transfer":
        return <ArrowLeftRight size={18} color="var(--color-transfer)" />;
      case "loan":
        return <Building2 size={18} color="var(--accent)" />;
      default:
        return <Bell size={18} color="var(--accent)" />;
    }
  };

  return (
    <div style={{ paddingBottom: "3rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🔔</span>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Centro de Notificaciones
            </h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
            Historial de actividad financiera en vivo y novedades de la plataforma para <strong>{householdName}</strong>.
          </p>
        </div>

        {/* Top Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem" }}
            title="Recargar notificaciones"
          >
            <RefreshCw size={14} className={isRefreshing ? "spin" : ""} />
            <span>Actualizar</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem" }}
            >
              <CheckCheck size={14} />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Card 1: Total */}
        <div
          className="card"
          style={{
            padding: "1.125rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-lg)",
              background: "var(--accent-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
              Total Notificaciones
            </span>
            <div style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {totalCount}
            </div>
          </div>
        </div>

        {/* Card 2: No leídas */}
        <div
          className="card"
          style={{
            padding: "1.125rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            borderColor: unreadCount > 0 ? "var(--color-warning-dim)" : undefined,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-lg)",
              background: unreadCount > 0 ? "rgba(245, 158, 11, 0.12)" : "var(--bg-active)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: unreadCount > 0 ? "var(--color-warning)" : "var(--text-tertiary)",
              flexShrink: 0,
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
              Pendientes por Leer
            </span>
            <div style={{ fontSize: "1.375rem", fontWeight: 700, color: unreadCount > 0 ? "var(--color-warning)" : "var(--text-primary)" }}>
              {unreadCount}
            </div>
          </div>
        </div>

        {/* Card 3: Actividad Financiera */}
        <div
          className="card"
          style={{
            padding: "1.125rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-lg)",
              background: "rgba(16, 185, 129, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-income)",
              flexShrink: 0,
            }}
          >
            <ArrowUpCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
              Actividad Financiera
            </span>
            <div style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {activityCount}
            </div>
          </div>
        </div>

        {/* Card 4: Novedades ACHouse */}
        <div
          className="card"
          style={{
            padding: "1.125rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-lg)",
              background: "rgba(99, 102, 241, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
              Novedades del Sistema
            </span>
            <div style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {systemCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", width: "100%" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por movimiento, integrante, cuenta, negocio, o novedad..."
            style={{ paddingLeft: "2.5rem", width: "100%", fontSize: "0.875rem" }}
          />
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            borderTop: "1px solid var(--border-hair)",
            paddingTop: "0.75rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", marginRight: "0.25rem" }}>
            FILTRAR:
          </span>

          <button
            className={`btn ${activeTab === "all" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("all")}
            style={{ fontSize: "0.78125rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)" }}
          >
            Todas ({totalCount})
          </button>

          <button
            className={`btn ${activeTab === "unread" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("unread")}
            style={{ fontSize: "0.78125rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)" }}
          >
            No Leídas ({unreadCount})
          </button>

          <button
            className={`btn ${activeTab === "income" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("income")}
            style={{ fontSize: "0.78125rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)" }}
          >
            💰 Ingresos & Cobros
          </button>

          <button
            className={`btn ${activeTab === "expense" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("expense")}
            style={{ fontSize: "0.78125rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)" }}
          >
            💳 Egresos & Pagos
          </button>

          <button
            className={`btn ${activeTab === "system" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("system")}
            style={{ fontSize: "0.78125rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)" }}
          >
            ✨ Novedades de la App ({systemCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredNotifications.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "3.5rem 1.5rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--bg-active)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                No hay notificaciones para mostrar
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem", margin: 0 }}>
                {searchQuery
                  ? "No se encontraron resultados que coincidan con tu búsqueda."
                  : activeTab === "unread"
                  ? "¡Estás al día! No tienes notificaciones pendientes de leer."
                  : "Los nuevos movimientos financieros y actualizaciones de la app aparecerán aquí."}
              </p>
            </div>
            {searchQuery && (
              <button
                className="btn btn-secondary"
                onClick={() => setSearchQuery("")}
                style={{ fontSize: "0.8125rem", marginTop: "0.5rem" }}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isRead = readIds.has(notif.id);

            return (
              <div
                key={notif.id}
                className="card"
                style={{
                  padding: "1.125rem 1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  background: isRead ? "var(--bg-card)" : "var(--bg-hover)",
                  borderColor: isRead ? "var(--border-subtle)" : "var(--accent-glow)",
                  transition: "all var(--transition-normal)",
                  position: "relative",
                  boxShadow: isRead ? "var(--shadow-sm)" : "var(--shadow-md)",
                }}
              >
                {/* Left Icon Badge */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-lg)",
                    background:
                      notif.category === "system"
                        ? "rgba(99, 102, 241, 0.12)"
                        : notif.type === "income"
                        ? "rgba(16, 185, 129, 0.12)"
                        : notif.type === "receivable"
                        ? "rgba(245, 158, 11, 0.12)"
                        : notif.type === "expense"
                        ? "rgba(239, 68, 68, 0.12)"
                        : "var(--bg-active)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "0.125rem",
                  }}
                >
                  {getIconForType(notif.type, notif.category)}
                </div>

                {/* Center Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: isRead ? 600 : 700,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {notif.title}
                      </span>

                      {!isRead && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            background: "var(--accent)",
                            color: "#ffffff",
                          }}
                        >
                          Nueva
                        </span>
                      )}

                      {notif.category === "system" && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(99, 102, 241, 0.15)",
                            color: "var(--accent)",
                          }}
                        >
                          Plataforma
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {notif.relativeTime} • {notif.formattedDate}
                    </span>
                  </div>

                  {/* Message */}
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: isRead ? "var(--text-secondary)" : "var(--text-primary)",
                      lineHeight: 1.5,
                      margin: "0 0 0.5rem 0",
                    }}
                  >
                    {notif.message}
                  </p>

                  {/* Tags / Details */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                    {notif.memberName && (
                      <span
                        style={{
                          fontSize: "0.71875rem",
                          color: "var(--text-secondary)",
                          background: "var(--bg-active)",
                          padding: "0.1875rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        👤 {notif.memberName}
                      </span>
                    )}

                    {notif.accountName && (
                      <span
                        style={{
                          fontSize: "0.71875rem",
                          color: "var(--text-secondary)",
                          background: "var(--bg-active)",
                          padding: "0.1875rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        🏦 {notif.accountName}
                      </span>
                    )}

                    {notif.businessName && (
                      <span
                        style={{
                          fontSize: "0.71875rem",
                          color: "var(--accent)",
                          background: "rgba(99, 102, 241, 0.1)",
                          padding: "0.1875rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 600,
                        }}
                      >
                        🏢 {notif.businessName}
                      </span>
                    )}

                    {notif.categoryName && (
                      <span
                        style={{
                          fontSize: "0.71875rem",
                          color: "var(--text-tertiary)",
                          background: "var(--bg-hover)",
                          padding: "0.1875rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        🏷️ {notif.categoryName}
                      </span>
                    )}

                    {notif.amount && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color:
                            notif.type === "income"
                              ? "var(--color-income)"
                              : notif.type === "receivable"
                              ? "var(--color-warning)"
                              : "var(--color-expense)",
                        }}
                      >
                        {notif.amount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flexShrink: 0 }}>
                  <button
                    onClick={(e) => toggleRead(notif.id, e)}
                    className="btn btn-ghost btn-icon"
                    title={isRead ? "Marcar como no leída" : "Marcar como leída"}
                    style={{ color: isRead ? "var(--text-tertiary)" : "var(--accent)" }}
                  >
                    <CheckCircle2 size={16} />
                  </button>

                  {notif.actionUrl && (
                    <Link
                      href={notif.actionUrl}
                      className="btn btn-ghost btn-icon"
                      title="Ir a la sección"
                    >
                      <ExternalLink size={15} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
