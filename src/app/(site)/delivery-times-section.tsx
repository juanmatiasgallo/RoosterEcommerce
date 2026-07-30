import { getActiveDeliveryTiers } from "@/lib/site-content/actions";
import { DeliveryTimesSectionClient } from "./delivery-times-section-client";

export async function DeliveryTimesSection() {
  const tiers = await getActiveDeliveryTiers();
  if (tiers.length === 0) return null;

  return <DeliveryTimesSectionClient tiers={tiers} />;
}
