import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const AnimatedShape: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { theme } = useTheme();

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.25;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.35;
    
    // Parallax response to pointer
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, state.pointer.x * 0.4, 0.05);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, state.pointer.y * 0.4, 0.05);
  });

  const isDark = theme === 'dark';

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={1.8}>
        <icosahedronGeometry args={[1.2, 1]} />
        <MeshDistortMaterial
          color={isDark ? '#818CF8' : '#4F46E5'}
          roughness={0.2}
          metalness={0.8}
          distort={0.3}
          speed={2}
          wireframe={false}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
};

export const Hero3DCanvas: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[320px] max-h-[440px] relative flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#818CF8" />
        <pointLight position={[-10, -10, -5]} intensity={0.8} color="#6366F1" />
        <AnimatedShape />
      </Canvas>
    </div>
  );
};

export default Hero3DCanvas;
