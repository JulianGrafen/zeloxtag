import {
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  type Texture,
} from "three";

import { sharpenMaterialTextures, sharpenTexture } from "./claim-tag-texture-sharpen";

export type BrushedSteelMaps = {
  normal: Texture;
  roughness: Texture;
  metalness: Texture;
};

function tileTexture(texture: Texture, repeat: number): void {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
}

/** GLB-Material behalten, nur Metall-Look nachjustieren (kein Material-Tausch). */
export function applyStainlessInPlace(material: MeshStandardMaterial): void {
  material.side = DoubleSide;
  material.metalness = 1;
  material.roughness = 0.42;
  material.envMapIntensity = 0.65;

  if (material.map) {
    material.color.setRGB(1, 1, 1);
  }

  material.needsUpdate = true;
}

/** Gebürsteter Stahl von Poliigon — Gravur/QR bleiben auf `map` aus dem GLB. */
export function applyBrushedSteelInPlace(
  material: MeshStandardMaterial,
  steel: BrushedSteelMaps,
  uvRepeat: number,
  maxAnisotropy: number,
): void {
  const engravingMap = material.map;

  material.side = DoubleSide;
  material.metalness = 0.94;
  material.roughness = 0.82;
  material.envMapIntensity = 0.85;
  material.emissive.set("#8a9199");
  material.emissiveIntensity = 0.06;

  for (const texture of [steel.normal, steel.roughness, steel.metalness]) {
    tileTexture(texture, uvRepeat);
    sharpenTexture(texture, maxAnisotropy);
  }

  material.normalMap = steel.normal;
  material.roughnessMap = steel.roughness;
  material.metalnessMap = steel.metalness;
  material.normalScale.set(0.75, 0.75);

  if (engravingMap) {
    material.map = engravingMap;
    material.color.setRGB(1.18, 1.2, 1.22);
  } else {
    material.color.setRGB(1.12, 1.14, 1.16);
  }

  sharpenMaterialTextures(material, maxAnisotropy);
  material.needsUpdate = true;
}

export function applyStainlessWithQrInPlace(
  material: MeshStandardMaterial,
  qrTexture: Texture,
): void {
  applyStainlessInPlace(material);
  material.map = qrTexture;
  material.bumpMap = qrTexture;
  material.bumpScale = 0.03;
  material.roughness = 0.36;
}
