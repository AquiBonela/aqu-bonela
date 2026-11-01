import { normalize, type ListingType } from "@/lib/directory";

export type AdminListingFilters = { q: string; status: string; type: ListingType | ""; category: string; activity: string };
type FilterableListing = { name: string; status: string; type: ListingType; category_id: string | null; activity: string | null };

export const emptyAdminFilters: AdminListingFilters = { q: "", status: "", type: "", category: "", activity: "" };

export function changeAdminType(filters: AdminListingFilters, type: ListingType | ""): AdminListingFilters {
  return { ...filters, type, category: "", activity: "" };
}

export function changeAdminCategory(filters: AdminListingFilters, category: string, type?: ListingType): AdminListingFilters {
  return { ...filters, category, type: type ?? filters.type, activity: "" };
}

export function filterAdminListings<T extends FilterableListing>(listings: T[], filters: AdminListingFilters): T[] {
  return listings.filter((listing) =>
    (!filters.status || listing.status === filters.status) &&
    (!filters.type || listing.type === filters.type) &&
    (!filters.category || listing.category_id === filters.category) &&
    (!filters.activity || normalize(listing.activity ?? "") === normalize(filters.activity)) &&
    (!filters.q || normalize(`${listing.name} ${listing.activity ?? ""}`).includes(normalize(filters.q))),
  );
}