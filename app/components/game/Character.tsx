"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore, type BubbleVariant } from "@/app/lib/gameStore";
import type { Facing } from "@/app/lib/maze";
import { cellToWorld } from "./Maze";

// Bear model is built with snout pointing +Z. Rotate so +Z aligns with each
// world direction. (Three.js +Y rotation: +Z -> +X at +π/2.)
const FACING_YAW: Record<Facing, number> = {
  e: Math.PI / 2,
  s: 0,
  w: -Math.PI / 2,
  n: Math.PI,
};

const MOVE_DURATION = 0.55;
const TURN_DURATION = 0.25;

export default function Character() {
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const leftArm = useRef<THREE.Mesh>(null!);
  const rightArm = useRef<THREE.Mesh>(null!);
  const leftLeg = useRef<THREE.Mesh>(null!);
  const rightLeg = useRef<THREE.Mesh>(null!);

  const pos = useGameStore((s) => s.pos);
  const facing = useGameStore((s) => s.facing);
  const status = useGameStore((s) => s.status);
  const finishMove = useGameStore((s) => s.finishMove);
  const bubbleText = useGameStore((s) => s.lastAgentMessage);
  const bubbleVariant = useGameStore((s) => s.bubbleVariant);
  const bubbleKey = useGameStore((s) => s.bubbleKey);

  // Tween targets.
  const target = useRef({
    pos: cellToWorld(pos.x, pos.y),
    yaw: FACING_YAW[facing],
  });
  const start = useRef({
    pos: cellToWorld(pos.x, pos.y),
    yaw: FACING_YAW[facing],
  });
  const t = useRef(1);
  const duration = useRef(MOVE_DURATION);
  const walkClock = useRef(0);

  // Set initial position + rotation imperatively, before first paint.
  // We do NOT pass position/rotation as JSX props because R3F would override
  // our useFrame tween on every render.
  const initialized = useRef(false);
  useLayoutEffect(() => {
    if (!group.current || initialized.current) return;
    group.current.position.copy(cellToWorld(pos.x, pos.y));
    group.current.rotation.y = FACING_YAW[facing];
    initialized.current = true;
    t.current = 1; // no tween on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!group.current || !initialized.current) return;
    const newWorld = cellToWorld(pos.x, pos.y);
    // If the jump is more than one cell, this is a reset — snap, don't tween.
    if (group.current.position.distanceTo(newWorld) > 3) {
      group.current.position.copy(newWorld);
      group.current.rotation.y = FACING_YAW[facing];
      t.current = 1;
      return;
    }
    start.current = {
      pos: group.current.position.clone(),
      yaw: group.current.rotation.y,
    };
    target.current = {
      pos: newWorld,
      yaw: nearestYaw(group.current.rotation.y, FACING_YAW[facing]),
    };
    const isMove = !start.current.pos.equals(target.current.pos);
    duration.current = isMove ? MOVE_DURATION : TURN_DURATION;
    t.current = 0;
  }, [pos.x, pos.y, facing]);

  useFrame((_, delta) => {
    if (!group.current) return;

    if (t.current < 1) {
      t.current = Math.min(1, t.current + delta / duration.current);
      const e = easeInOut(t.current);
      group.current.position.lerpVectors(
        start.current.pos,
        target.current.pos,
        e,
      );
      group.current.rotation.y =
        start.current.yaw + (target.current.yaw - start.current.yaw) * e;

      walkClock.current += delta * 9;
      const swing = Math.sin(walkClock.current) * 0.6;
      const bounce = Math.abs(Math.sin(walkClock.current)) * 0.08;
      if (body.current) body.current.position.y = 0.55 + bounce;
      if (leftArm.current) leftArm.current.rotation.x = swing;
      if (rightArm.current) rightArm.current.rotation.x = -swing;
      if (leftLeg.current) leftLeg.current.rotation.x = -swing;
      if (rightLeg.current) rightLeg.current.rotation.x = swing;

      if (t.current >= 1) {
        finishMove();
        if (body.current) body.current.position.y = 0.55;
        if (leftArm.current) leftArm.current.rotation.x = 0;
        if (rightArm.current) rightArm.current.rotation.x = 0;
        if (leftLeg.current) leftLeg.current.rotation.x = 0;
        if (rightLeg.current) rightLeg.current.rotation.x = 0;
      }
    } else {
      // Idle bobbing.
      walkClock.current += delta * 2;
      const idleBob = Math.sin(walkClock.current) * 0.04;
      if (body.current) body.current.position.y = 0.55 + idleBob;
      if (status === "won" && body.current) {
        // Spin happily.
        body.current.rotation.y += delta * 4;
      }
    }
  });

  return (
    <group ref={group}>
      <Html
        position={[0, 1.85, 0]}
        center
        distanceFactor={5}
        zIndexRange={[100, 0]}
        wrapperClass="bear-bubble-wrap"
      >
        <SpeechBubble text={bubbleText} variant={bubbleVariant} bubbleKey={bubbleKey} />
      </Html>
      <group ref={body} position={[0, 0.55, 0]}>
        {/* Body */}
        <mesh castShadow position={[0, 0, 0]}>
          <sphereGeometry args={[0.35, 24, 24]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
        {/* Belly */}
        <mesh position={[0, -0.05, 0.18]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#e9caa6" roughness={0.8} />
        </mesh>
        {/* Head */}
        <group position={[0, 0.45, 0.05]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 24, 24]} />
            <meshStandardMaterial color="#a86b3d" roughness={0.7} />
          </mesh>
          {/* Snout */}
          <mesh position={[0, -0.05, 0.22]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color="#e9caa6" roughness={0.8} />
          </mesh>
          {/* Nose */}
          <mesh position={[0, 0.0, 0.34]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#231a14" roughness={0.5} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.1, 0.07, 0.26]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.1, 0.07, 0.26]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          {/* Eye glints */}
          <mesh position={[-0.085, 0.085, 0.295]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
          </mesh>
          <mesh position={[0.115, 0.085, 0.295]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
          </mesh>
          {/* Ears */}
          <mesh position={[-0.21, 0.22, -0.02]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#a86b3d" roughness={0.7} />
          </mesh>
          <mesh position={[0.21, 0.22, -0.02]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#a86b3d" roughness={0.7} />
          </mesh>
          <mesh position={[-0.21, 0.22, 0.0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#e9caa6" roughness={0.8} />
          </mesh>
          <mesh position={[0.21, 0.22, 0.0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#e9caa6" roughness={0.8} />
          </mesh>
        </group>
        {/* Arms */}
        <mesh ref={leftArm} castShadow position={[-0.32, 0.05, 0]}>
          <capsuleGeometry args={[0.09, 0.22, 8, 16]} />
          <meshStandardMaterial color="#8a5530" roughness={0.7} />
        </mesh>
        <mesh ref={rightArm} castShadow position={[0.32, 0.05, 0]}>
          <capsuleGeometry args={[0.09, 0.22, 8, 16]} />
          <meshStandardMaterial color="#8a5530" roughness={0.7} />
        </mesh>
        {/* Legs */}
        <mesh ref={leftLeg} castShadow position={[-0.16, -0.4, 0]}>
          <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
          <meshStandardMaterial color="#8a5530" roughness={0.7} />
        </mesh>
        <mesh ref={rightLeg} castShadow position={[0.16, -0.4, 0]}>
          <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
          <meshStandardMaterial color="#8a5530" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function nearestYaw(current: number, target: number) {
  const TAU = Math.PI * 2;
  let diff = ((target - current) % TAU + TAU) % TAU;
  if (diff > Math.PI) diff -= TAU;
  return current + diff;
}

const VARIANT_STYLES: Record<
  BubbleVariant,
  { bg: string; ring: string; emoji: string }
> = {
  intro: { bg: "bg-white", ring: "ring-indigo-200", emoji: "👋" },
  question: { bg: "bg-white", ring: "ring-indigo-200", emoji: "🤔" },
  encouragement: { bg: "bg-amber-50", ring: "ring-amber-200", emoji: "💛" },
  celebration: { bg: "bg-emerald-50", ring: "ring-emerald-200", emoji: "✨" },
  victory: { bg: "bg-yellow-50", ring: "ring-yellow-300", emoji: "🏆" },
};

function SpeechBubble({
  text,
  variant,
  bubbleKey,
}: {
  text: string;
  variant: BubbleVariant;
  bubbleKey: number;
}) {
  const style = VARIANT_STYLES[variant];
  const truncated = text.length > 110 ? `${text.slice(0, 108).trim()}…` : text;
  return (
    <div
      key={bubbleKey}
      className="bear-bubble-pop pointer-events-none select-none"
      style={{ width: 240, transformOrigin: "50% 100%" }}
    >
      <div
        className={`relative rounded-2xl px-3 py-2 text-center text-[13px] font-semibold leading-snug text-slate-800 shadow-2xl ring-2 ${style.bg} ${style.ring}`}
      >
        <span className="mr-1">{style.emoji}</span>
        {truncated}
        <div
          className={`absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 ${style.bg}`}
        />
      </div>
    </div>
  );
}
