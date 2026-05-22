"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Lightweight Three.js backdrop for the 404 page — floating textile-inspired threads.
 */
export default function NotFoundCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f0f12, 0.035);

    const camera = new THREE.PerspectiveCamera(
      48,
      host.clientWidth / Math.max(host.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x0f0f12, 1);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const threadMaterial = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x5c1010,
      emissiveIntensity: 0.35,
      metalness: 0.25,
      roughness: 0.45,
      wireframe: true,
    });

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(2.4, 0.55, 140, 18),
      threadMaterial,
    );
    group.add(knot);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.06, 12, 80),
      new THREE.MeshBasicMaterial({
        color: 0xf5f5f4,
        transparent: true,
        opacity: 0.22,
      }),
    );
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.07,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    const count = reducedMotion ? 120 : 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particles.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    scene.add(particles);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 6, 8);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffe8e8, 0.35));

    let raf = 0;
    const clock = new THREE.Clock();

    const resize = () => {
      const w = host.clientWidth;
      const h = Math.max(host.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!reducedMotion) {
        knot.rotation.x = t * 0.38;
        knot.rotation.y = t * 0.52;
        ring.rotation.z = t * 0.18;
        group.rotation.y = Math.sin(t * 0.22) * 0.12;
        particles.rotation.y = t * 0.05;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      knot.geometry.dispose();
      knot.material.dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className="sarjan-not-found-canvas" aria-hidden />;
}
