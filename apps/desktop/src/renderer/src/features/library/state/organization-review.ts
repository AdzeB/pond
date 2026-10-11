import { Store } from "@tanstack/store";

export interface OrganizationReviewRequest {
  id: string;
  ids: string[] | null;
}

export const organizationReview = new Store<OrganizationReviewRequest | null>(
  null,
);

export function openOrganizationReview(ids?: readonly string[]): void {
  organizationReview.setState(() => ({
    id: crypto.randomUUID(),
    ids: ids ? [...ids] : null,
  }));
}

export function closeOrganizationReview(): void {
  organizationReview.setState(() => null);
}
