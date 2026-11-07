"use client";

import { useQuery } from "convex/react";

import { api, type Doc } from "./convex";
import { useOptionalQuery, type Optional } from "./optional";
import {
  buildEngineConfig,
  knobsFromPublic,
  priceSample,
  type PriceEngineConfig,
  type PricingKnobs,
  type PublicPricingConfig,
} from "./engine";

/**
 * Everything the price screens read, in one hook, so the pricing panel and the
 * print type editor cannot disagree about what the current configuration is.
 *
 * `pricing:publicConfig` is addressed by name through `useOptionalQuery` and not
 * through `api.pricing`, because `convex/_generated/api.d.ts` in this repository
 * predates `convex/pricing.ts`. See `optional.ts` for the whole story.
 */
export type PricingSources = {
  printTypes: Doc<"printTypes">[] | undefined;
  colors: Doc<"filamentColors">[] | undefined;
  published: Optional<PublicPricingConfig>;
  reload: () => void;
  loading: boolean;
};

export function usePricingSources(): PricingSources {
  const printTypes = useQuery(api.printTypes.listAdmin, {});
  const colors = useQuery(api.filaments.listAdmin, {});
  const [published, reload] = useOptionalQuery<PublicPricingConfig>("pricing:publicConfig", {});

  return {
    printTypes,
    colors,
    published,
    reload,
    loading:
      printTypes === undefined || colors === undefined || published.status === "loading",
  };
}

export function publishedOrNull(state: Optional<PublicPricingConfig>): PublicPricingConfig | null {
  return state.status === "ready" ? state.data : null;
}

export function liveKnobs(state: Optional<PublicPricingConfig>): PricingKnobs {
  return knobsFromPublic(publishedOrNull(state));
}

/**
 * The one line under a base price field: what a middle size, plain material, one
 * colour, one unit actually costs with the number being typed. It runs the real
 * engine, so it moves for the same reasons the customer's price moves.
 */
export function previewUnitAgorot(args: {
  config: PriceEngineConfig;
  printTypeKey: string;
  sizeKey?: string;
}): { agorot: number; sizeLabelHe: string } | null {
  const printType = args.config.printTypes.find((pt) => pt.key === args.printTypeKey);
  if (!printType) return null;

  const sizes = printType.sizes.filter((size) => size.active);
  if (sizes.length === 0) return null;
  const size =
    (args.sizeKey ? sizes.find((option) => option.key === args.sizeKey) : undefined) ??
    sizes[Math.floor((sizes.length - 1) / 2)];

  const materialKey =
    printType.allowedMaterialKeys?.[0] ?? args.config.materials[0]?.key ?? "pla";
  const colorId = args.config.colors[0]?.id ?? "__preview__";

  const result = priceSample(
    {
      labelHe: size.labelHe,
      printTypeKey: printType.key,
      materialKey,
      sizeKey: size.key,
      colorIds: [colorId],
      quantity: 1,
      addonRuleIds: [],
      rush: false,
      deliveryMethod: "pickup",
    },
    args.config,
  );

  if (!result.ok) return null;
  return { agorot: result.breakdown.totalAgorot, sizeLabelHe: size.labelHe };
}

export { buildEngineConfig };
