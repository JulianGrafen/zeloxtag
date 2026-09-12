import {
  LinearFilter,
  LinearMipmapLinearFilter,
  type MeshStandardMaterial,
  type Texture,
} from "three";

export function sharpenTexture(texture: Texture, maxAnisotropy: number): void {
  texture.anisotropy = Math.min(maxAnisotropy, 16);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

export function sharpenMaterialTextures(
  material: MeshStandardMaterial,
  maxAnisotropy: number,
): void {
  const textures = [
    material.map,
    material.normalMap,
    material.roughnessMap,
    material.metalnessMap,
    material.aoMap,
    material.bumpMap,
    material.emissiveMap,
  ];

  for (const texture of textures) {
    if (texture) sharpenTexture(texture, maxAnisotropy);
  }
}
