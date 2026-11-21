import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/punto-vuela")({
  beforeLoad: () => {
    throw redirect({ to: "/servicios/$slug", params: { slug: "punto-vuela-casarabonela" }, statusCode: 301, replace: true });
  },
});
