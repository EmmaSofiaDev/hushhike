"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Compass, Sun, Eye } from "lucide-react";

interface Alpine3DSceneProps {
  elevationGainM: number;
  departureTime: string; // HH:MM
  isDeficit: boolean;
  mountainDuskTime: string;
}

export const Alpine3DScene: React.FC<Alpine3DSceneProps> = ({
  elevationGainM,
  departureTime,
  isDeficit,
  mountainDuskTime,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [azimuthDeg, setAzimuthDeg] = useState<number>(242);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060c08, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 36);
    camera.lookAt(0, 4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. 3D Mountain Mesh (Procedural Alpine Topography)
    const gridSize = 56;
    const terrainGeo = new THREE.PlaneGeometry(44, 44, gridSize, gridSize);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from center ridge
      const d = Math.sqrt(x * x + z * z);
      // Alpine ridgeline equation
      const ridge = Math.exp(-d * 0.11) * 9.2;
      const noise =
        Math.sin(x * 0.38) * Math.cos(z * 0.38) * 2.4 +
        Math.sin(x * 0.75 + 1.2) * Math.sin(z * 0.65) * 1.3 +
        Math.cos(x * 1.5) * 0.6;

      const y = Math.max(0, ridge + noise);
      pos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    // Wireframe Topo Material
    const wireMat = new THREE.MeshBasicMaterial({
      color: isDeficit ? 0xff334b : 0x00f5a0,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, wireMat);
    scene.add(terrainMesh);

    // Subtle dark underlay surface to occlude backface lines
    const solidMat = new THREE.MeshBasicMaterial({
      color: 0x07110a,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const solidMesh = new THREE.Mesh(terrainGeo, solidMat);
    scene.add(solidMesh);

    // 3. Solar Trajectory Arc & 3D Sun Sphere
    const curvePoints: THREE.Vector3[] = [];
    const arcRadius = 26;
    for (let theta = 0; theta <= Math.PI; theta += Math.PI / 32) {
      const x = arcRadius * Math.cos(theta);
      const y = Math.sin(theta) * 18 + 2;
      const z = -Math.sin(theta) * 12;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0xffaa40,
      dashSize: 0.8,
      gapSize: 0.5,
      transparent: true,
      opacity: 0.55,
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    arcLine.computeLineDistances();
    scene.add(arcLine);

    // Sun Sphere
    const sunGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: isDeficit ? 0xff334b : 0xffaa40,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    // Position sun along arc based on departure time
    const [h, m] = departureTime.split(":").map(Number);
    const currentMins = (h || 12) * 60 + (m || 0);
    // Map 08:00 (480) -> 19:00 (1140) to 0 -> Math.PI
    const progress = Math.max(0, Math.min(1, (currentMins - 480) / (1140 - 480)));
    const sunAngle = Math.PI * (1 - progress);
    sunMesh.position.set(
      arcRadius * Math.cos(sunAngle),
      Math.sin(sunAngle) * 18 + 2,
      -Math.sin(sunAngle) * 12
    );

    // 4. Floating Atmospheric Alpine Particles
    const particleCount = 240;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 50;
      particlePos[i + 1] = Math.random() * 25 + 2;
      particlePos[i + 2] = (Math.random() - 0.5) * 50;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f5a0,
      size: 0.28,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Interactive Mouse Parallax & Drag Rotation
    let isDragging = false;
    let prevMouseX = 0;
    let targetRotY = 0.35;
    let targetRotX = 0.1;
    let currentRotY = 0.35;
    let currentRotX = 0.1;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        targetRotY += deltaX * 0.006;
        prevMouseX = e.clientX;
      } else {
        // Subtle hover parallax
        const normX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetRotY = 0.35 + normX * 0.15;
      }
      setAzimuthDeg(Math.round(((targetRotY % (Math.PI * 2)) * 180) / Math.PI + 180) % 360);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 6. Animation Loop (Zero Deprecations, 60 FPS)
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth camera orbit damping
      currentRotY += (targetRotY - currentRotY) * 0.05;
      currentRotX += (targetRotX - currentRotX) * 0.05;

      terrainMesh.rotation.y = currentRotY;
      solidMesh.rotation.y = currentRotY;
      arcLine.rotation.y = currentRotY;
      sunMesh.position.x = arcRadius * Math.cos(sunAngle + currentRotY * 0.2);

      // Pulse sun
      const scale = 1 + Math.sin(elapsedTime * 3) * 0.08;
      sunMesh.scale.set(scale, scale, scale);

      // Slow particle float
      particles.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      terrainGeo.dispose();
      wireMat.dispose();
      solidMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      renderer.dispose();
    };
  }, [elevationGainM, departureTime, isDeficit]);

  return (
    <div className="alpine-hero-container">
      {/* HUD Header Bar */}
      <div className="alpine-hud-header">
        <div className="hud-metric-group">
          <div className="hud-pill">
            <Compass size={12} className="text-mint" />
            <span>38°34&apos;N 78°21&apos;W</span>
          </div>
          <div className="hud-pill">
            <Sun size={12} className="text-amber" />
            <span>AZ: {azimuthDeg}° W</span>
          </div>
          <div className={`hud-pill ${isDeficit ? "alert" : "safe"}`}>
            <span className="pulse-dot-small" />
            <span>{isDeficit ? "RIDGE SHADOW COLLAPSED" : "RIDGE LIT // DAYLIGHT OPTIMAL"}</span>
          </div>
        </div>

        <div className="hud-engine-badge">
          <span>ALPINESCAPE 3D // 60 FPS</span>
        </div>
      </div>

      {/* Reticle HUD Corners */}
      <div className="alpine-reticles">
        <span className="reticle top-left">┌</span>
        <span className="reticle top-right">┐</span>
        <span className="reticle bottom-left">└</span>
        <span className="reticle bottom-right">┘</span>
      </div>

      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="alpine-canvas-mount" />

      {/* HUD Telemetry Footer */}
      <div className="alpine-hud-footer">
        <div className="hud-footer-item">
          <span className="lbl">DUSK HORIZON</span>
          <span className="val">{mountainDuskTime}</span>
        </div>
        <div className="hud-footer-item">
          <span className="lbl">PEAK ASCENT</span>
          <span className="val">+{elevationGainM}M</span>
        </div>
        <div className="hud-footer-item right">
          <span className="drag-hint">DRAG TO ORBIT 3D TOPOGRAPHY</span>
        </div>
      </div>
    </div>
  );
};
