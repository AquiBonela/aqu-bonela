import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vida-diaria")({
  beforeLoad: ({ location }) => {
    if (location.pathname.replace(/\/$/, "") === "/vida-diaria")
      throw redirect({ to: "/servicios-publicos", hash: "vida-diaria" });
  },
});
