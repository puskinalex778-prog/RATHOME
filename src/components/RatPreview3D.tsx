import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LifeStage, RatAppearance } from '../types/game';
import { RatRig } from '../scene/RatMesh';

interface RatPreview3DProps {
  appearance: RatAppearance;
  lifeStage: LifeStage;
  height?: number;
}

/**
 * Interactive rotating 3D preview turntable for the Coat Editor & Adult Appearance Preview.
 */
export const RatPreview3D: React.FC<RatPreview3DProps> = ({
  appearance,
  lifeStage,
  height = 190,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<RatRig | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const w = Math.max(220, el.clientWidth);
    const h = height;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EFE7DB');

    const camera = new THREE.PerspectiveCamera(36, w / h, 0.05, 10);
    camera.position.set(0.48, 0.32, 0.56);
    camera.lookAt(0, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#FFF9F0', '#BBA68E', 1.25));
    const sun = new THREE.DirectionalLight('#FFF3DD', 1.3);
    sun.position.set(1.5, 2.5, 2.0);
    scene.add(sun);

    // Cozy turntable wooden disc
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.035, 28),
      new THREE.MeshStandardMaterial({ color: '#D8BC94', roughness: 0.78 })
    );
    base.position.y = -0.018;
    scene.add(base);

    const rig = new RatRig('preview', appearance, lifeStage);
    scene.add(rig.root);
    rigRef.current = rig;

    let raf = 0;
    let t = 0;
    let last = performance.now();

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      rig.root.rotation.y = Math.sin(t * 0.65) * 0.95 + 0.55;
      rig.update(dt, {
        behavior: 'sniff',
        speed: 0,
        time: t,
        headLookYaw: Math.sin(t * 1.4) * 0.18,
        headLookPitch: -0.05,
        holdingFood: false,
        holdingPaper: false,
        holdingBall: false,
      });
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      rigRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.applyAppearance(appearance, lifeStage);
    }
  }, [appearance, lifeStage]);

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1.5px solid rgba(111,134,114,0.28)',
      }}
    />
  );
};
