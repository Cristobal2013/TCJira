# TCJira Dashboard — Documento de Diseño

**Fecha:** 2026-04-15  
**Repositorio:** https://github.com/Cristobal2013/TCJira.git  
**Estado:** Aprobado

---

## Resumen

Web app dashboard que se conecta a Jira Cloud (sovos.atlassian.net) para mostrar métricas por persona del proyecto PSTC, tablero Kanban 841. Autenticación via OAuth con Atlassian. Acceso para múltiples roles (todos tienen cuenta Jira).

---

## Arquitectura

```
Browser (React/Next.js)
        │ fetch /api/*
Next.js API Routes
  ├── /api/auth/*        → NextAuth OAuth Atlassian
  ├── /api/jira/issues   → proxy a Jira REST API (con caché 5 min)
  └── /api/jira/members  → usuarios del proyecto
        │ HTTPS + Bearer Token
Jira Cloud API
  sovos.atlassian.net/rest/api/3/*
  Proyecto: PSTC | Board: 841
```

**Sin base de datos propia.** Los datos vienen siempre de Jira. El caché es en memoria del servidor (5 minutos). El token OAuth se almacena en sesión del servidor y nunca se expone al browser.

---

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Redirige a `/dashboard` o `/login` según sesión |
| `/login` | Botón "Conectar con Atlassian" |
| `/dashboard` | Vista principal del equipo |
| `/dashboard/[member]` | Detalle de un miembro específico |

---

## Dashboard principal (`/dashboard`)

### Layout

- **Sidebar izquierdo:** Filtros (rango de fechas, tipo de ticket, estado)
- **Área principal:**
  - Cards de resumen del equipo (abiertos / en progreso / cerrados)
  - Lista de miembros con sus contadores por estado
  - Gráfico de barras: tickets por tipo (Bug / Task / Story)

### Comportamiento

- Auto-refresh cada 10 minutos via `swr`
- Botón "Actualizar" que invalida caché y fuerza nueva llamada a Jira
- Filtros: rango de fechas, tipo de ticket, estado

---

## Vista detalle de miembro (`/dashboard/[member]`)

- Tabla de tickets con columnas: resumen, estado, tipo, fecha creación, fecha resolución
- Tiempo promedio de resolución (solo tickets cerrados)
- Gráfico de distribución por tipo (Bug / Task / Story)
- Filtros heredados del dashboard principal

---

## Consultas JQL

```jql
project = PSTC AND assignee is not EMPTY
  [AND created >= "YYYY-MM-DD"]
  [AND issuetype in (Bug, Task, Story)]
  [AND status in ("To Do", "In Progress", "Done")]
ORDER BY updated DESC
```

### Campos extraídos por ticket

- `assignee` (nombre + avatarUrl)
- `status` (To Do / In Progress / Done)
- `issuetype` (Bug / Task / Story)
- `created`
- `resolutiondate`
- `summary`

---

## Métricas calculadas (server-side)

| Métrica | Definición |
|---|---|
| Tickets abiertos | `status = "To Do"` |
| En progreso | `status = "In Progress"` |
| Cerrados | `status = "Done"` con `resolutiondate` presente |
| Tiempo promedio de resolución | Promedio de `(resolutiondate - created)` en tickets cerrados |
| Distribución por tipo | `count` agrupado por `issuetype` |

---

## Stack técnico

| Paquete | Uso |
|---|---|
| `next` | Framework fullstack (App Router) |
| `next-auth` | OAuth 2.0 con Atlassian |
| `recharts` | Gráficos de barras y distribución |
| `tailwindcss` | Estilos |
| `shadcn/ui` | Componentes UI (tablas, filtros, cards) |
| `swr` | Data fetching con auto-refresh |

---

## Variables de entorno

```env
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
JIRA_BOARD_ID=841
JIRA_PROJECT_KEY=PSTC
JIRA_DOMAIN=sovos.atlassian.net
```

Las credenciales OAuth se obtienen desde [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/).

---

## Despliegue

- **Local:** `npm install && npm run dev` → http://localhost:3000
- **Producción:** Vercel (conectado al repo GitHub, deploy automático en push a `main`)

---

## Fuera de alcance (v1)

- Notificaciones o alertas
- Exportar a PDF/Excel
- Vista de historial de sprints (no aplica, es Kanban)
- Editar tickets desde el dashboard