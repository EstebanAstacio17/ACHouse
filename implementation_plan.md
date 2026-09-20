# Plan de Implementación: ACHouse — Plataforma de Finanzas Familiares

## Resumen

**ACHouse** es una plataforma web full-stack para la gestión financiera de hogares familiares. Permite registrar ingresos, egresos, deudas y conciliaciones multidimensionales (por integrantes, negocios, proyectos, fechas y categorías). Un usuario puede gestionar múltiples hogares desde una misma cuenta.

---

## Decisiones de Diseño Confirmadas

| Decisión | Valor |
|---|---|
| **Nombre del producto** | ACHouse |
| **Tipo de proyecto** | Nuevo monorepo Turborepo (repositorio separado) |
| **Stack** | Next.js 15 + Drizzle ORM + Clerk + Neon PostgreSQL |
| **Monedas** | Configurables por hogar (definidas al crear el hogar) |
| **Préstamos** | Externos (banco/institución) + Internos (entre integrantes) |
| **Exportación** | Excel (.xlsx) + PDF |
| **Tarjetas de crédito** | Completas: ciclo de corte, pago mínimo, fecha límite |
| **Múltiples hogares** | Un usuario puede pertenecer a / administrar múltiples hogares |
| **Ruta del workspace** | `c:\Users\ESTEB\OneDrive\Documents\PORTAFORZA\Web App\ACHouse` |

---

## Arquitectura de Hogares Múltiples

Un usuario Clerk puede:
1. **Crear** un nuevo hogar (se convierte en Admin automáticamente)
2. **Ser invitado** a un hogar existente (con rol Contributor o Viewer)
3. **Cambiar entre hogares** desde el header (selector de hogar activo)

El `householdId` activo se gestiona vía cookie de sesión + middleware.

---

## Estructura del Monorepo

```
achouse/
├── apps/
│   └── web/                          # Next.js 15 App Router
│       ├── app/
│       │   ├── (auth)/               # Sign-in / Sign-up (Clerk)
│       │   ├── (marketing)/          # Landing page pública
│       │   ├── onboarding/           # Crear/unirse a un hogar
│       │   └── dashboard/
│       │       ├── layout.tsx        # Shell: sidebar + header + household switcher
│       │       ├── page.tsx          # Dashboard: KPIs generales
│       │       ├── transactions/
│       │       ├── accounts/
│       │       ├── members/
│       │       ├── businesses/
│       │       ├── projects/
│       │       ├── loans/
│       │       ├── categories/
│       │       └── reports/
│       ├── components/
│       │   ├── ui/                   # shadcn/ui
│       │   ├── layout/               # Sidebar, Header, HouseholdSwitcher
│       │   ├── transactions/
│       │   ├── charts/               # Recharts
│       │   └── shared/               # DateRangePicker, CurrencyInput, etc.
│       └── lib/
│           ├── auth.ts
│           ├── household.ts          # getActiveHousehold(), switchHousehold()
│           ├── utils.ts
│           └── validations/
├── packages/
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── index.ts
│   │   └── seed.ts
│   └── types/
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Modelo de Datos (Drizzle + PostgreSQL Neon)

### Hogares y Usuarios

```sql
households
  id, name, defaultCurrency, timezone, logoUrl, createdAt

household_members
  id, householdId, clerkUserId, role (admin/contributor/viewer),
  displayName, avatarUrl, isActive, joinedAt

member_income_sources
  id, memberId, type (job/business/project), name,
  expectedMonthlyAmount, currency, isActive
```

### Cuentas

```sql
accounts
  id, householdId, name, type (checking/savings/credit/cash),
  balance, currency, isActive,
  -- Solo para crédito:
  creditLimit, availableCredit, statementDay,
  paymentDueDay, minimumPayment, currentStatementBalance
```

### Transacciones

```sql
categories
  id, householdId, name, type (income/expense), color, icon,
  parentId (árbol jerárquico), isActive

transactions
  id, householdId, accountId, memberId?, businessId?, projectId?,
  categoryId, type (income/expense/transfer), amount, currency,
  exchangeRate?, description, date, referenceNo?,
  attachmentUrl?, isRecurring, recurringConfig (JSONB),
  status (pending/cleared/reconciled), createdBy, createdAt,
  updatedAt, deletedAt (soft delete)
```

### Negocios y Proyectos

```sql
businesses
  id, householdId, name, description, type, currency, isActive

business_transactions
  id, businessId, categoryId, type, amount, description,
  date, memberId?

projects
  id, householdId, memberId?, businessId?, name, description,
  budget, currency, startDate, endDate?, status, completedAt

project_transactions
  id, projectId, categoryId, type, amount, description, date
```

### Préstamos (Externos + Internos)

```sql
loans
  id, householdId, name,
  lenderType (bank/person/internal_member),
  lenderName, lenderMemberId? (para préstamos internos),
  borrowerMemberId?,
  principalAmount, remainingBalance, interestRate, interestType,
  monthlyPayment, startDate, endDate?,
  accountId? (cuenta vinculada), currency, isActive

loan_payments
  id, loanId, transactionId?, amount, date,
  principalPaid, interestPaid, notes
```

### Conciliación y Auditoría

```sql
reconciliation_entries
  id, householdId, accountId, date, expectedBalance,
  actualBalance, difference, notes, reconciledBy, reconciledAt

audit_log
  id, householdId, memberId, action, entityType, entityId,
  oldValues (JSONB), newValues (JSONB), createdAt
```

---

## Fases de Implementación

### FASE 0 — Setup del Monorepo (3-5 días)

| # | Tarea |
|---|-------|
| 0.1 | Inicializar Turborepo con pnpm en `/ACHouse` |
| 0.2 | Crear app `web` con Next.js 15 (App Router + TypeScript) |
| 0.3 | Configurar Tailwind CSS v4 + shadcn/ui |
| 0.4 | Crear paquetes `db` y `types` |
| 0.5 | Configurar Drizzle ORM + Neon PostgreSQL |
| 0.6 | Instalar y configurar Clerk |
| 0.7 | ESLint + Prettier + TypeScript estricto |
| 0.8 | Variables de entorno (`.env.local` con plantilla) |

### FASE 1 — Auth + Onboarding Multihogar (2-3 días)

| # | Tarea |
|---|-------|
| 1.1 | Páginas Sign-In / Sign-Up con Clerk |
| 1.2 | Middleware de protección de rutas |
| 1.3 | Webhook Clerk → sincronizar usuario en DB |
| 1.4 | Onboarding: crear hogar + configurar moneda/zona horaria |
| 1.5 | Selector de hogar activo en el header |
| 1.6 | Sistema de invitaciones por email |
| 1.7 | Roles: Admin / Contributor / Viewer con guards en Server Actions |

### FASE 2 — Núcleo: Cuentas, Categorías, Transacciones (7-10 días)

| # | Tarea |
|---|-------|
| 2.1 | CRUD de Categorías (árbol padre/hijo, color, ícono) |
| 2.2 | CRUD de Cuentas (bancaria, tarjeta de crédito completa, efectivo) |
| 2.3 | Formulario de transacción: tipo, monto, fecha, cuenta, categoría, integrante |
| 2.4 | Tabla de transacciones con filtros: fecha, tipo, categoría, integrante, cuenta |
| 2.5 | Soporte de transacciones recurrentes |
| 2.6 | Adjuntar comprobantes (Vercel Blob) |
| 2.7 | Dashboard KPIs: balance total, ingresos vs egresos del mes, top categorías |
| 2.8 | Gráfico de barras mensual (Recharts) |

### FASE 3 — Integrantes y Fuentes de Ingreso (3-4 días)

| # | Tarea |
|---|-------|
| 3.1 | Gestión de integrantes: perfil, rol, estado |
| 3.2 | Fuentes de ingreso: trabajo fijo, negocio, proyecto |
| 3.3 | Vista individual por integrante: transacciones + ingresos declarados vs reales |
| 3.4 | Filtro global de transacciones por integrante |

### FASE 4 — Negocios y Proyectos (5-7 días)

| # | Tarea |
|---|-------|
| 4.1 | CRUD de Negocios con dashboard P&L propio |
| 4.2 | Transacciones propias del negocio |
| 4.3 | CRUD de Proyectos con presupuesto y progreso visual |
| 4.4 | Vinculación Proyecto → Negocio o Integrante |
| 4.5 | Cierre de proyecto con resumen presupuestario |

### FASE 5 — Tarjetas de Crédito y Préstamos (4-5 días)

| # | Tarea |
|---|-------|
| 5.1 | Ciclo de corte, pago mínimo, fecha límite por tarjeta |
| 5.2 | Compras en tarjeta (reduce disponible) y pagos (reduce deuda) |
| 5.3 | CRUD de Préstamos: externos (banco) + internos (entre integrantes) |
| 5.4 | Tabla de amortización automática |
| 5.5 | Registro de cuotas vinculado a transacción de egreso |
| 5.6 | Alertas visuales: pagos próximos en 7/30 días |

### FASE 6 — Conciliación y Reportes Avanzados (5-7 días)

| # | Tarea |
|---|-------|
| 6.1 | Conciliación: saldo teórico vs real por cuenta y fecha |
| 6.2 | Marcar transacciones como reconciliadas |
| 6.3 | Reportes: por rango de fechas, integrante, negocio, proyecto, categoría |
| 6.4 | Reporte consolidado del hogar |
| 6.5 | Exportar a Excel (.xlsx) y PDF |
| 6.6 | Gráficos: línea de tendencia, dona por categoría, barras comparativas |

### FASE 7 — Pulido, Escalabilidad y PWA (3-4 días)

| # | Tarea |
|---|-------|
| 7.1 | Configuración del hogar: moneda, zona horaria, logo |
| 7.2 | Auditoría: log de cambios (quién hizo qué y cuándo) |
| 7.3 | Soft delete en todas las entidades |
| 7.4 | Búsqueda global |
| 7.5 | Diseño mobile-first responsivo |
| 7.6 | Dark mode / Light mode |
| 7.7 | Notificaciones in-app |
| 7.8 | PWA básico (instalable en móvil) |

---

## Dependencias Clave

| Paquete | Propósito |
|---------|-----------|
| `next@15` | Meta-framework full-stack |
| `@clerk/nextjs` | Autenticación y usuarios |
| `drizzle-orm` + `drizzle-kit` | ORM + migraciones |
| `@neondatabase/serverless` | Driver PostgreSQL serverless |
| `zod` | Validación tipo-segura |
| `recharts` | Gráficas interactivas |
| `@tanstack/react-table` | Tablas con filtros y paginación |
| `date-fns` | Manipulación de fechas |
| `xlsx` | Exportar a Excel |
| `jspdf` + `jspdf-autotable` | Exportar a PDF |
| `zustand` | Estado global del cliente |
| `nuqs` | Query params como estado (filtros en URL) |
| `lucide-react` | Íconos |
| `@vercel/blob` | Almacenamiento de comprobantes |

---

## Variables de Entorno Requeridas

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Neon PostgreSQL
DATABASE_URL=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Plan de Verificación

### Automatizado (CI)
```bash
pnpm run type-check   # tsc --noEmit
pnpm run lint         # ESLint
pnpm run build        # Build de producción sin errores
```

### Manual por Fase
- **Fase 1:** Registro, login, crear hogar, cambiar entre hogares, invitar integrante
- **Fase 2:** Crear categoría, cuenta, transacción, filtrar tabla, ver dashboard
- **Fase 4:** Crear negocio, asignar transacciones, ver P&L, crear proyecto
- **Fase 5:** Registrar préstamo interno (entre integrantes), ver amortización
- **Fase 6:** Generar reporte por rango, exportar Excel y PDF

---

## Hoja de Ruta (Timeline)

```
Semana 1:    Fase 0 + Fase 1  → Monorepo + Auth + Multihogar
Semana 2-3:  Fase 2           → Transacciones core
Semana 4:    Fase 3           → Integrantes
Semana 5-6:  Fase 4           → Negocios + Proyectos
Semana 7:    Fase 5           → Tarjetas + Préstamos
Semana 8-9:  Fase 6           → Reportes + Conciliación
Semana 10:   Fase 7           → PWA + Auditoría + Pulido
```

**Total estimado: 10 semanas para MVP completo production-ready**
