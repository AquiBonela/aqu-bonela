import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { I18nProvider, Text } from "@/lib/i18n";
import {
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { SiteFooter } from "@/components/SiteFooter";
import { LocalizedHead } from "@/components/LocalizedHead";
import { BackToTop } from "@/components/BackToTop";
import { InstallPromptProvider } from "@/components/InstallPrompt";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import {
  getMunicipality,
  getMunicipalityThemeCss,
  getSiteConfigSnapshot,
  setSiteConfig,
} from "@/config/municipality";
import { getPublicEnv } from "@/lib/public-env.functions";
import { publicEnvScript } from "@/lib/public-env";
import { getSiteConfig } from "@/lib/site-config.functions";
import { EMPTY_SITE_CONFIG, siteConfigScript } from "@/lib/site-identity";

// El tema se calcula en cada render con la configuración aplicada (colores de Supabase o el tema
// compilado): nunca se guarda en una constante de módulo, que conservaría la identidad anterior.

function NotFoundContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          <Text text="Página no encontrada" />
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text text="La página que buscas no existe o se ha movido." />
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Text text="Volver al inicio" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <I18nProvider>
      <NotFoundContent />
    </I18nProvider>
  );
}

function ErrorContent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          <Text text="Esta página no se ha cargado" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text text="Algo ha fallado. Puedes volver a intentarlo o regresar al inicio." />
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Text text="Intentar de nuevo" />
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Text text="Volver al inicio" />
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Identidad de esta instalación desde su Supabase (caché de 60 s), antes de los loaders y head() de las páginas.
  // En el navegador ya llega en el HTML (window.__SITE_CONFIG__).
  beforeLoad: async () => {
    if (typeof window === "undefined") setSiteConfig(await getSiteConfig());
  },
  // Configuración pública de Supabase, resuelta en el servidor (bindings o process.env).
  loader: async () => {
    const siteConfig = getSiteConfigSnapshot();
    if (typeof window !== "undefined" && window.__PUBLIC_ENV__)
      return { publicEnv: window.__PUBLIC_ENV__, siteConfig };
    return { publicEnv: await getPublicEnv(), siteConfig };
  },
  staleTime: Infinity,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: getMunicipality().appName },
      {
        name: "description",
        content: `Directorio de comercios y profesionales de ${getMunicipality().name}.`,
      },
      { name: "theme-color", content: getMunicipality().theme.themeColor },
      { name: "apple-mobile-web-app-title", content: getMunicipality().appName },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: getMunicipality().assets.favicon, type: "image/png" },
      { rel: "apple-touch-icon", href: getMunicipality().assets.appleTouchIcon },
      // Manifiesto generado con la identidad de esta instalación (src/routes/app[.]webmanifest.ts).
      { rel: "manifest", href: "/app.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function ErrorComponent(props: ErrorComponentProps) {
  return (
    <I18nProvider>
      <ErrorContent {...props} />
    </I18nProvider>
  );
}

function RootShell({ children }: { children: ReactNode }) {
  const publicEnv = Route.useLoaderData({ select: (d) => d?.publicEnv }) ?? {};
  const siteConfig = Route.useLoaderData({ select: (d) => d?.siteConfig }) ?? EMPTY_SITE_CONFIG;
  return (
    <html lang="es">
      <head>
        {/* Antes de cualquier script de la app: el cliente Supabase lee esta configuración. */}
        <script id="public-env" dangerouslySetInnerHTML={{ __html: publicEnvScript(publicEnv) }} />
        {/* La misma identidad que ha usado el servidor, para que el navegador hidrate sin diferencias. */}
        <script
          id="site-config"
          dangerouslySetInnerHTML={{ __html: siteConfigScript(siteConfig) }}
        />
        <HeadContent />
        {/* Tras la hoja principal: el tema municipal prevalece desde el primer render SSR. */}
        <style
          id="municipality-theme"
          dangerouslySetInnerHTML={{ __html: getMunicipalityThemeCss(getMunicipality().theme) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const adminPage = useRouterState({
    select: (state) => state.location.pathname.startsWith("/admin"),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider {...(adminPage ? { fixedLanguage: "es" as const } : {})}>
        <InstallPromptProvider>
          <LocalizedHead />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <SiteFooter />
          <BackToTop />
          <Toaster
            position="bottom-center"
            offset={100}
            duration={3500}
            closeButton
            toastOptions={{
              classNames: {
                toast: "!bg-card !text-card-foreground !border-border !rounded-none !shadow-none",
                description: "!text-muted-foreground",
              },
            }}
          />
        </InstallPromptProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
