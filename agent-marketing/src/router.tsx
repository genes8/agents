import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultNotFoundComponent: NotFoundPage,
  });
}

function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Not Found</p>
        <h1>Campaign route not found.</h1>
        <p>Go back to the campaign workspace and start from the main brief form.</p>
      </section>
    </main>
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
