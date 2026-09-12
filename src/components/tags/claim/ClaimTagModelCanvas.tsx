"use client";

import { Suspense, useMemo, useRef, useState, useLayoutEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Box3,
  type Group,
  Mesh,
  MeshStandardMaterial,
  type Texture,
  Vector3,
} from "three";

import {
  applyBrushedSteelInPlace,
  applyStainlessInPlace,
  applyStainlessWithQrInPlace,
  type BrushedSteelMaps,
} from "./claim-tag-metal-material";
import { createClaimTagQrTexture } from "./claim-tag-qr-texture";
import {
  CLAIM_TAG_GLB_PATH,
  claimTagScanUrl,
  isTagFrontMaterial,
} from "./claim-tag-model";
import {
  TAG_BRUSHED_STEEL_TEXTURES,
  TAG_BRUSHED_STEEL_UV_REPEAT,
} from "./claim-tag-steel-textures";

const TARGET_SIZE = 1.48;

/** Flaches Tag (YZ-Ebene) zur Kamera auf +Z drehen. */
const TAG_FACE_CAMERA_Y = Math.PI / 2;

function sceneHasEmbeddedTextures(root: Group): boolean {
  let embedded = false;
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) {
        if (material.map || material.normalMap || material.metalnessMap) {
          embedded = true;
        }
      }
    }
  });
  return embedded;
}

function centerAndScale(model: Group): void {
  const box = new Box3().setFromObject(model);
  const center = new Vector3();
  const size = new Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxAxis = Math.max(size.x, size.y, size.z, 1e-6);
  model.position.sub(center);
  model.scale.setScalar(TARGET_SIZE / maxAxis);
}

function tuneMaterials(
  model: Group,
  options: {
    qrTexture?: Texture;
    useEmbeddedTextures: boolean;
    steel?: BrushedSteelMaps;
    maxAnisotropy: number;
  },
): void {
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.frustumCulled = false;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material, index) => {
      if (!(material instanceof MeshStandardMaterial)) return;

      if (options.useEmbeddedTextures && options.steel) {
        applyBrushedSteelInPlace(
          material,
          options.steel,
          TAG_BRUSHED_STEEL_UV_REPEAT,
          options.maxAnisotropy,
        );
        return;
      }

      if (options.useEmbeddedTextures) {
        applyStainlessInPlace(material);
        return;
      }

      const name = material.name ?? "";
      const useQr =
        Boolean(options.qrTexture) &&
        (isTagFrontMaterial(name) ||
          (materials.length > 1 && index === 0 && !/back/i.test(name)));

      if (useQr && options.qrTexture) {
        applyStainlessWithQrInPlace(material, options.qrTexture);
      } else {
        applyStainlessInPlace(material);
      }
    });
  });
}

function prepareTagModel(
  scene: Group,
  options: {
    qrTexture?: Texture;
    useEmbeddedTextures: boolean;
    steel?: BrushedSteelMaps;
    maxAnisotropy: number;
  },
): Group {
  const model = scene.clone(true);
  centerAndScale(model);
  tuneMaterials(model, options);
  return model;
}

type TagGlbProps = {
  tagUuid: string;
  animate: boolean;
};

function TagGlb({ tagUuid, animate }: TagGlbProps) {
  const motion = useRef<Group>(null);
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const { scene } = useGLTF(CLAIM_TAG_GLB_PATH);
  const steelMaps = useTexture(TAG_BRUSHED_STEEL_TEXTURES) as BrushedSteelMaps;
  const useEmbeddedTextures = useMemo(
    () => sceneHasEmbeddedTextures(scene),
    [scene],
  );
  const [qrTexture, setQrTexture] = useState<Texture | null>(null);

  useLayoutEffect(() => {
    if (useEmbeddedTextures) return;

    let cancelled = false;
    let texture: Texture | null = null;

    void createClaimTagQrTexture(claimTagScanUrl(tagUuid)).then((tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      texture = tex;
      setQrTexture(tex);
    });

    return () => {
      cancelled = true;
      texture?.dispose();
    };
  }, [tagUuid, useEmbeddedTextures]);

  const model = useMemo(
    () =>
      prepareTagModel(scene, {
        qrTexture: qrTexture ?? undefined,
        useEmbeddedTextures,
        steel: useEmbeddedTextures ? steelMaps : undefined,
        maxAnisotropy,
      }),
    [scene, qrTexture, useEmbeddedTextures, steelMaps, maxAnisotropy],
  );

  useFrame((state) => {
    if (!animate || !motion.current) return;
    const t = state.clock.elapsedTime;
    motion.current.rotation.y = Math.sin(t * 0.9) * 0.28;
    motion.current.position.y = Math.sin(t * 1.15) * 0.03;
  });

  return (
    <group rotation={[0, TAG_FACE_CAMERA_Y, 0]}>
      <group ref={motion}>
        <primitive object={model} />
      </group>
    </group>
  );
}

type ClaimTagModelCanvasProps = {
  tagUuid: string;
  reduceMotion: boolean;
};

export function ClaimTagModelCanvas({
  tagUuid,
  reduceMotion,
}: ClaimTagModelCanvasProps) {
  return (
    <Canvas
      className="claim-intro-model-canvas"
      style={{ width: "100%", height: "100%", display: "block" }}
      camera={{ position: [0, 0, 2.6], fov: 34, near: 0.05, far: 100 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.28,
      }}
      dpr={[1, 2.5]}
    >
      <ambientLight intensity={0.78} />
      <hemisphereLight args={["#ffffff", "#5a5a5a", 0.65]} />
      <directionalLight position={[4, 6, 5]} intensity={1.55} color="#fffefb" />
      <directionalLight position={[-3, 2, 4]} intensity={0.85} color="#f0f4f8" />
      <directionalLight position={[0, 0, 8]} intensity={0.45} color="#ffffff" />
      <Suspense fallback={null}>
        <TagGlb tagUuid={tagUuid} animate={!reduceMotion} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(CLAIM_TAG_GLB_PATH);
