import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listingDetailQuery } from "@/lib/listing-detail";
import { listingHead } from "@/lib/listing-head";
import { ListingNotFound, ListingPage } from "@/components/ListingPage";

export const Route = createFileRoute("/comercios/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(listingDetailQuery("comercio", params.slug)),
  head: ({ loaderData }) => listingHead(loaderData),
  component: Page,
  notFoundComponent: ListingNotFound,
  errorComponent: () => <div role="alert" className="p-8 text-center">No hemos podido cargar esta ficha.</div>,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(listingDetailQuery("comercio", slug));
  return <ListingPage listing={data} />;
}
