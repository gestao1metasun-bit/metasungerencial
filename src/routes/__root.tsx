import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/app/AppLayout";
import { useEffect } from "react";
import { bootstrapSeedIfPending } from "@/lib/dev-seed";
import { wireSessionLogger } from "@/lib/session-logger";
import { installLsGuard } from "@/lib/ls-guard";
import { perfMark, perfMeasure } from "@/lib/perf";
import { useAuth } from "@/lib/auth-store";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meta Sun Gerencial" },
      { name: "description", content: "Plataforma interna de gestão operacional, comercial, financeira e de engenharia da Meta Sun Energia Solar." },
      { name: "author", content: "Meta Sun" },
      { property: "og:title", content: "Meta Sun Gerencial" },
      { property: "og:description", content: "Plataforma interna de gestão operacional, comercial, financeira e de engenharia da Meta Sun Energia Solar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Meta Sun Gerencial" },
      { name: "twitter:description", content: "Plataforma interna de gestão operacional, comercial, financeira e de engenharia da Meta Sun Energia Solar." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c02b2a43-3137-4606-9a12-caa4c233f702/id-preview-4c3decc2--55eb209b-3c9f-49b7-808a-4ba1686c95d7.lovable.app-1778628832590.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c02b2a43-3137-4606-9a12-caa4c233f702/id-preview-4c3decc2--55eb209b-3c9f-49b7-808a-4ba1686c95d7.lovable.app-1778628832590.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
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
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, session, loading } = useAuth();
  const isPublicRoute = path === "/login" || path === "/cadastrar" || path === "/reset-password";
  const shouldHoldPrivateRoute = !isPublicRoute && loading;
  const hasValidSession = !!session && !!user;
  const shouldBlockPrivateRoute = !isPublicRoute && !loading && !hasValidSession;
  useEffect(() => { bootstrapSeedIfPending(); wireSessionLogger(); installLsGuard(); }, []);

  // D16.PERF — marca shell.ready uma vez quando rota privada renderiza com sessão válida
  useEffect(() => {
    if (!isPublicRoute && hasValidSession && !loading) {
      perfMark("shell.ready");
      // Se houve login nesta sessão, mede login → shell
      perfMeasure("login.start", "shell.ready", "shell.ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidSession, loading, isPublicRoute]);

  return (
    <QueryClientProvider client={queryClient}>
      {shouldHoldPrivateRoute ? <AuthBootstrapScreen /> : shouldBlockPrivateRoute ? <LoginRedirect /> : isPublicRoute ? <Outlet /> : <AppLayout />}
      <Toaster />
    </QueryClientProvider>
  );
}

function LoginRedirect() {
  return <Navigate to="/login" replace />;
}

function AuthBootstrapScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="text-sm font-medium text-foreground">Validando autenticação…</div>
        <div className="mt-1 text-xs text-muted-foreground">Aguardando sessão segura do ERP.</div>
      </div>
    </div>
  );
}
