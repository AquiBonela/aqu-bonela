import { Text } from "@/lib/i18n";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { pageVisible } from "@/lib/site-availability";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listingDetailQuery } from "@/lib/listing-detail";
import { listingHead } from "@/lib/listing-head";
import { ListingNotFound, ListingPage } from "@/components/ListingPage";

export const Route = createFileRoute("/servicios/$slug")({
  // Sin su página o su sección en la configuración publicada, la ruta no existe.
  beforeLoad: () => {
    if (!pageVisible("servicios-publicos")) throw notFound();
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(listingDetailQuery("publico", params.slug)),
  head: ({ loaderData }) => listingHead(loaderData),
  component: Page,
  notFoundComponent: ListingNotFound,
  errorComponent: () => (
    <div role="alert" className="p-8 text-center">
      <Text text="No hemos podido cargar esta ficha." />
    </div>
  ),
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(listingDetailQuery("publico", slug));
  return <ListingPage listing={data} />;
}
