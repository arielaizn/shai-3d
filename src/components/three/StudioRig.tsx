"use client";

/**
 * src/components/three/StudioRig.tsx
 *
 * Doc 05 §A.3. The lighting rig, defined in scene units and scaled by the fit
 * distance so it is model-size independent: a keychain and a wall piece get the same
 * light, not the same lamp positions.
 *
 * The warm-key and cool-fill split is the whole difference between "toy" and
 * "artisan". An all-warm rig with a golden bounce reads as a craft workshop, which
 * DECISIONS.md rejects outright. One cool light at about a third of the key's power
 * shifts the read without tinting the plastic.
 *
 * The environment is four hand-built lightformers baked to a 64px cube target at
 * `frames={1}`. A real HDRI is 1.5-4MB, larger than the model, and drei's presets
 * fetch from an external CDN that stalls behind exactly the in-app webviews most of
 * this site's traffic arrives in. This costs zero bytes over the wire and is
 * art-directable to the palette.
 *
 * `lightScaleRef` is a ref rather than a prop because the lights-off ramp runs at
 * frame rate: turning it into React state would re-render the whole scene sixty times
 * a second to move one float.
 */

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as React from "react";
import type * as THREE from "three";

import { RIG } from "@/lib/three/constants";

import type { QualityRung } from "./types";

export type StudioRigProps = {
  /** The camera fit distance. Every lamp sits on a multiple of it. */
  distance: number;
  /** Doc 05 §B.5.3. A lithophane under the full studio key is a flat grey slab. */
  backlit?: boolean;
  /** 1 with the lights on, `GITD.darkLightScale` with them off. Read every frame. */
  lightScaleRef?: React.RefObject<number>;
  quality: QualityRung;
};

export function StudioRig({ distance, backlit = false, lightScaleRef, quality }: StudioRigProps) {
  const D = Math.max(1, distance);
  const keyScale = backlit ? RIG.backlitKeyScale : 1;
  const fillScale = backlit ? RIG.backlitFillScale : 1;

  const ambient = React.useRef<THREE.AmbientLight>(null);
  const key = React.useRef<THREE.DirectionalLight>(null);
  const fill = React.useRef<THREE.DirectionalLight>(null);
  const rim = React.useRef<THREE.DirectionalLight>(null);
  const hemi = React.useRef<THREE.HemisphereLight>(null);

  useFrame(() => {
    const scale = lightScaleRef?.current ?? 1;
    if (ambient.current) ambient.current.intensity = RIG.ambient.intensity * scale;
    if (key.current) key.current.intensity = RIG.key.intensity * keyScale * scale;
    if (fill.current) fill.current.intensity = RIG.fill.intensity * fillScale * scale;
    if (rim.current) rim.current.intensity = RIG.rim.intensity * scale;
    if (hemi.current) hemi.current.intensity = RIG.hemi.intensity * scale;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={RIG.ambient.intensity} color={RIG.ambient.color} />
      <directionalLight
        ref={key}
        position={[D * RIG.key.pos[0], D * RIG.key.pos[1], D * RIG.key.pos[2]]}
        intensity={RIG.key.intensity * keyScale}
        color={RIG.key.color}
      />
      <directionalLight
        ref={fill}
        position={[D * RIG.fill.pos[0], D * RIG.fill.pos[1], D * RIG.fill.pos[2]]}
        intensity={RIG.fill.intensity * fillScale}
        color={RIG.fill.color}
      />
      <directionalLight
        ref={rim}
        position={[D * RIG.rim.pos[0], D * RIG.rim.pos[1], D * RIG.rim.pos[2]]}
        intensity={RIG.rim.intensity}
        color={RIG.rim.color}
      />
      <hemisphereLight
        ref={hemi}
        args={[RIG.hemi.sky, RIG.hemi.ground, RIG.hemi.intensity]}
      />

      {/* Rung 2 of the quality ladder halves the environment rather than dropping it:
          with no environment at all a matte print loses its sheen and looks like clay. */}
      <Environment resolution={quality >= 2 ? 32 : 64} frames={1} background={false} blur={0.6}>
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#FFFFFF"
          position={[0, D * 1.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[D * 2.2, D * 1.6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#9FE9E5"
          position={[-D * 1.3, D * 0.3, D * 0.4]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[D * 1.4, D * 1.1, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.9}
          color="#FFE2AE"
          position={[D * 1.3, D * 0.2, D * 0.3]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[D * 1.2, D * 1.0, 1]}
        />
        {/* the cream floor card, which kills the black underside reflection */}
        <Lightformer
          form="rect"
          intensity={0.5}
          color="#FFF7EC"
          position={[0, -D * 0.9, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[D * 2.0, D * 2.0, 1]}
        />
      </Environment>
    </>
  );
}
