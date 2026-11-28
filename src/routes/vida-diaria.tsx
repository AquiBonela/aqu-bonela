import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { sectionVisible } from "@/lib/site-availability";

export const Route = createFileRoute("/vida-diaria")({
  beforeLoad: ({ location }) => {
    if (!sectionVisible("servicios-publicos", "vida-cotidiana")) throw notFound();
    if (location.pathname.replace(/\/$/, "") === "/vida-diaria")
      throw redirect({ to: "/servicios-publicos", hash: "vida-diaria" });
  },
});
