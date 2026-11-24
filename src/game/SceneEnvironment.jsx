import { useEffect } from 'react';
import { useStore } from '@react-three/fiber';
import * as THREE from 'three';
import { envCanvas } from './textures';

// Installs a procedurally-painted image-based light as `scene.environment`.
//
// Without this, every metallic material (gold trim, joints, the whole inner
// frame, hangar steel) has nothing to reflect and renders close to black —
// metalness in a PBR renderer is almost entirely reflected environment.
// The source is painted in textures.js rather than fetched as an HDR so the
// site stays fully self-contained.
//
// PMREM pre-filters the map into roughness mip levels, so rough surfaces
// get a soft blurred reflection and polished ones a sharp highlight,
// instead of every surface sampling the same sharp image.
//
// The filtered map is cached PER RENDERER: a remount inside the same Canvas
// (StrictMode, an intensity change) reuses it instead of re-running the
// PMREM passes. It lives as long as its renderer — a Canvas unmounting loses
// its WebGL context, and the texture with it.
//
// The renderer/scene are pulled off the R3F store inside the effect rather
// than via useThree(): assigning `scene.environment` is the required
// Three.js API, but that reads as mutating a hook's return value.
const _envByRenderer = new WeakMap();

function environmentFor(gl) {
  let tex = _envByRenderer.get(gl);
  if (tex) return tex;
  const source = new THREE.CanvasTexture(envCanvas());
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(gl);
  pmrem.compileEquirectangularShader();
  tex = pmrem.fromEquirectangular(source).texture;
  pmrem.dispose();
  source.dispose();
  _envByRenderer.set(gl, tex);
  return tex;
}

export function SceneEnvironment({ intensity = 1 }) {
  const store = useStore();

  useEffect(() => {
    const { gl, scene } = store.getState();
    const prev = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = environmentFor(gl);
    scene.environmentIntensity = intensity;

    return () => {
      scene.environment = prev;
      scene.environmentIntensity = prevIntensity;
    };
  }, [store, intensity]);

  return null;
}
