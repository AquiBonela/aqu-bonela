import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tramites/")({
  beforeLoad: () => {
    throw redirect({ to: "/servicios-publicos", hash: "tramites", statusCode: 301 });
  },
});
