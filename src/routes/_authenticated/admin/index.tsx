import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_AREAS, adminHead, type AdminRoute } from "@/components/admin/admin-areas";
import { Button } from "@/components/ui/button";
import { getMunicipality } from "@/config/municipality";
import {
  adminListingsQuery,
  adminReportsQuery,
  adminSuggestionsQuery,
  fmtDate,
  STATUSES,
} from "@/lib/admin";
import { isFeatured } from "@/lib/directory";
import { Text, useI18n } from "@/lib/i18n";
import { adminActivityQuery, adminDraftsQuery } from "@/lib/admin-overview";
import { describeActivity } from "@/lib/admin-activity";
import { draftScreen, STATUS_LABELS } from "@/lib/content-workflow";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => adminHead("Inicio", "Centro de gestión municipal de {app}."),
  component: () => (
    <AdminShell>
      <AdminHome />
    </AdminShell>
  ),
});

const statusLabel: Record<string, string> = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.label]),
);

function AdminHome() {
  const { tr } = useI18n();
  return (
    <>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Inicio" />
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {tr("Centro de gestión municipal de {app}.")}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-w-0 content-start gap-6">
          <MunicipalPublishing />
          <Indicators />
          <PendingWork />
          <RecentActivity />
          <RecentListings />
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <MunicipalitySummary />
          <QuickAccess />
        </div>
      </div>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border bg-card p-4">
      <h2 className="font-display text-lg font-bold">
        <Text text={title} />
      </h2>
      {children}
    </section>
  );
}

/** Datos de la instalación: solo los que existen en la identidad del municipio. */
function MunicipalitySummary() {
  const { tr } = useI18n();
  const m = getMunicipality();
  const rows = [
    { label: "Plataforma", value: m.appName },
    { label: "Municipio", value: m.name },
    { label: "Provincia", value: m.province },
    { label: "Comarca", value: m.region },
    { label: "Comunidad autónoma", value: m.autonomousCommunity },
    { label: "Ayuntamiento", value: m.institutional?.townHallName },
    { label: "Web pública", value: m.siteUrl },
  ].filter((row): row is { label: string; value: string } => !!row.value?.trim());
  if (rows.length === 0) return null;
  return (
    <Block title="Municipio">
      <dl className="mt-3 grid gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{tr(row.label)}</dt>
            <dd className="break-words font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}

function Indicators() {
  const listings = useQuery(adminListingsQuery);
  const reports = useQuery(adminReportsQuery);
  const suggestions = useQuery(adminSuggestionsQuery);
  const items: { label: string; value: number }[] = [];
  if (listings.isSuccess) {
    const count = (status: string) => listings.data.filter((l) => l.status === status).length;
    items.push(
      { label: "Fichas publicadas", value: count("publicada") },
      { label: "Pendientes de aprobación", value: count("pendiente") },
      { label: "Borradores", value: count("borrador") },
      { label: "Fichas resaltadas", value: listings.data.filter((l) => isFeatured(l)).length },
    );
  }
  if (reports.isSuccess)
    items.push({
      label: "Correcciones sin resolver",
      value: reports.data.filter((r) => !r.resolved).length,
    });
  if (suggestions.isSuccess)
    items.push({
      label: "Sugerencias sin atender",
      value: suggestions.data.filter((s) => !s.handled).length,
    });
  const failed = listings.isError || reports.isError || suggestions.isError;
  if (items.length === 0 && !failed) return null;
  return (
    <Block title="Indicadores">
      {items.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="border bg-background p-3">
              <dt className="text-xs text-muted-foreground">
                <Text text={item.label} />
              </dt>
              <dd className="font-display text-2xl font-bold">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {failed && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          <Text text="Algunos indicadores no se pudieron cargar." />
        </p>
      )}
    </Block>
  );
}

function PendingWork() {
  const listings = useQuery(adminListingsQuery);
  const reports = useQuery(adminReportsQuery);
  const suggestions = useQuery(adminSuggestionsQuery);
  if (!listings.isSuccess || !reports.isSuccess || !suggestions.isSuccess) return null;
  const allTasks: { to: AdminRoute; label: string; count: number }[] = [
    {
      to: "/admin/directorio",
      label: "Fichas pendientes de aprobación",
      count: listings.data.filter((l) => l.status === "pendiente").length,
    },
    {
      to: "/admin/avisos",
      label: "Correcciones de fichas sin resolver",
      count: reports.data.filter((r) => !r.resolved).length,
    },
    {
      to: "/admin/sugerencias",
      label: "Sugerencias sin atender",
      count: suggestions.data.filter((s) => !s.handled).length,
    },
  ];
  const tasks = allTasks.filter((task) => task.count > 0);
  return (
    <Block title="Pendiente de atender">
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Text text="No hay tareas pendientes." />
        </p>
      ) : (
        <ul className="mt-3 divide-y border">
          {tasks.map((task) => (
            <li key={task.label}>
              <Link to={task.to} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-terracotta px-2 text-xs font-semibold text-terracotta-foreground">
                  {task.count}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  <Text text={task.label} />
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function RecentListings() {
  const { tr } = useI18n();
  const { data, isSuccess } = useQuery(adminListingsQuery);
  if (!isSuccess || data.length === 0) return null;
  // La consulta ya llega ordenada por última modificación.
  const recent = data.slice(0, 5);
  return (
    <Block title="Últimas fichas modificadas">
      <ul className="mt-3 divide-y border">
        {recent.map((l) => (
          <li key={l.id}>
            <Link
              to="/admin/fichas/$id"
              params={{ id: l.id }}
              className="flex items-center gap-3 p-3 hover:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(l.updated_at)}</p>
              </div>
              <span className="shrink-0 border px-2 py-0.5 text-xs">
                {tr(statusLabel[l.status] ?? l.status)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function QuickAccess() {
  const { tr } = useI18n();
  return (
    <Block title="Accesos rápidos">
      <Button
        asChild
        className="mt-3 w-full bg-terracotta text-terracotta-foreground hover:bg-terracotta/90"
      >
        <Link to="/admin/fichas/$id" params={{ id: "nueva" }}>
          <Plus className="h-4 w-4" />
          <Text text="Nueva ficha" />
        </Link>
      </Button>
      <ul className="mt-3 grid gap-1">
        {ADMIN_AREAS.filter((area) => area.id !== "inicio").map((area) => {
          const Icon = area.icon;
          return (
            <li key={area.id}>
              <Link
                to={area.to}
                className="flex items-start gap-3 rounded-md p-2 hover:bg-secondary/50"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{tr(area.label)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {tr(area.description)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

/**
 * Circuito del contenido municipal: qué hay en borrador, qué espera la conformidad del Ayuntamiento
 * y qué está listo para que Groundwork lo publique. Solo datos reales de content_drafts.
 */
function MunicipalPublishing() {
  const { tr } = useI18n();
  const { data, isSuccess, isError } = useQuery(adminDraftsQuery);
  if (isError)
    return (
      <Block title="Publicación municipal">
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          <Text text="No se pudo cargar el estado de los borradores." />
        </p>
      </Block>
    );
  if (!isSuccess) return null;
  const groups = (["borrador", "presentado", "conforme"] as const).map((status) => ({
    status,
    drafts: data.drafts.filter((d) => d.status === status),
  }));
  const titles = {
    borrador: "En borrador",
    presentado: "Pendientes de conformidad municipal",
    conforme: "Pendientes de publicación por Groundwork",
  } as const;
  return (
    <Block title="Publicación municipal">
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {groups.map((g) => (
          <div key={g.status} className="border bg-background p-3">
            <dt className="text-xs text-muted-foreground">
              <Text text={titles[g.status]} />
            </dt>
            <dd className="font-display text-2xl font-bold">{g.drafts.length}</dd>
          </div>
        ))}
      </dl>
      {data.drafts.length > 0 && (
        <ul className="mt-3 divide-y border">
          {data.drafts.map((d) => {
            const screen = draftScreen(d.draft_key);
            return (
              <li key={d.draft_key}>
                <Link
                  to={(screen?.to ?? "/admin") as never}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {tr(screen?.label ?? d.draft_key)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {tr(STATUS_LABELS[d.status])} · {fmtDate(d.updated_at)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {data.lastPublication ? (
          <>
            <Text text="Última publicación:" />{" "}
            {tr(
              draftScreen(data.lastPublication.draft_key)?.label ?? data.lastPublication.draft_key,
            )}
            , {fmtDate(data.lastPublication.published_at)}
          </>
        ) : (
          <Text text="Aún no se ha publicado nada con el circuito de conformidad." />
        )}
      </p>
    </Block>
  );
}

/** Últimas operaciones del registro (sin valores), con enlace a su pantalla. */
function RecentActivity() {
  const { tr } = useI18n();
  const activity = useQuery(adminActivityQuery);
  const listings = useQuery(adminListingsQuery);
  if (!activity.isSuccess) return null;
  const names = new Map((listings.data ?? []).map((l) => [l.id, l.name]));
  const items = describeActivity(activity.data, (id) => names.get(id)).slice(0, 10);
  return (
    <Block title="Actividad reciente">
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Text text="Todavía no hay actividad registrada." />
        </p>
      ) : (
        <ul className="mt-3 divide-y border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1 break-words">
                {item.to ? (
                  <Link
                    to={item.to as never}
                    params={item.params as never}
                    className="hover:underline"
                  >
                    {tr(item.text)}
                  </Link>
                ) : (
                  tr(item.text)
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(item.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
