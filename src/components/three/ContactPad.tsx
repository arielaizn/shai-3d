"use client";

/**
 * src/components/three/ContactPad.tsx
 *
 * Doc 05 §A.5. The shadow the object sits in.
 *
 * `frames={1}` bakes one depth pass and stops. The model never moves, only the
 * camera does, so re-rendering the shadow every frame buys nothing and costs a full
 * pass on the device least able to afford one.
 *
 * The warm pool under the shadow is a CSS radial gradient on the canvas wrapper, not
 * a floor plane in the scene. A real plane would need lighting of its own, would clip
 * on wide models, and would show its own edge the moment the camera drops low, which
 * is exactly the angle a relief panel is most interesting from.
 *
 * Rung 2 of the quality ladder drops this component entirely.
 */

import { ContactShadows } from "@react-three/drei";
import * as React from "react";

import { CONTACT } from "@/lib/three/constants";

export type ContactPadProps = {
  /** Bounding radius of the object, scene units. */
  radius: number;
  /** The lowest point of the object, so the pad sits under it and never through it. */
  floorY: number;
  /** 0 fades the pad out with the lights. */
  opacity?: number;
};

export function ContactPad({ radius, floorY, opacity = CONTACT.opacity }: ContactPadProps) {
  // A hair below the object. Coincident with it, the shadow z-fights the back face.
  const y = floorY - 0.02;
  return (
    <ContactShadows
      position={[0, y, 0]}
      scale={Math.max(1, radius * CONTACT.scaleFactor)}
      resolution={CONTACT.resolution}
      blur={CONTACT.blur}
      far={Math.max(1, radius * CONTACT.farFactor)}
      opacity={opacity}
      color={CONTACT.color}
      frames={1}
    />
  );
}

export default React.memo(ContactPad);
