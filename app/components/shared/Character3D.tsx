"use client";

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore, type BubbleVariant } from "@/app/lib/gameStore";
import { useHubStore } from "@/app/lib/hubStore";
import { CHARACTERS, type CharacterSlug } from "@/app/lib/characters";
import type { Facing } from "@/app/lib/maze";
import { cellToWorld } from "../game/Maze";
import Character from "../game/Character";

const FACING_YAW: Record<Facing, number> = {
  e: Math.PI / 2,
  s: 0,
  w: -Math.PI / 2,
  n: Math.PI,
};

const MOVE_DURATION = 0.55;
const TURN_DURATION = 0.25;

export default function Character3D() {
  const slug = useHubStore((s) => s.selectedCharacter);
  if (!slug || slug === "bear") return <Character />;
  return <GenericCharacter slug={slug} />;
}

function GenericCharacter({ slug }: { slug: CharacterSlug }) {
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);

  const pos = useGameStore((s) => s.pos);
  const facing = useGameStore((s) => s.facing);
  const status = useGameStore((s) => s.status);
  const finishMove = useGameStore((s) => s.finishMove);
  const bubbleText = useGameStore((s) => s.lastAgentMessage);
  const bubbleVariant = useGameStore((s) => s.bubbleVariant);
  const bubbleKey = useGameStore((s) => s.bubbleKey);
  const bubbleVisible = useGameStore((s) => s.bubbleVisible);

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

  const initialized = useRef(false);
  useLayoutEffect(() => {
    if (!group.current || initialized.current) return;
    group.current.position.copy(cellToWorld(pos.x, pos.y));
    group.current.rotation.y = FACING_YAW[facing];
    initialized.current = true;
    t.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!group.current || !initialized.current) return;
    const newWorld = cellToWorld(pos.x, pos.y);
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
      const bounce = Math.abs(Math.sin(walkClock.current)) * 0.08;
      if (body.current) body.current.position.y = 0.55 + bounce;
      if (t.current >= 1) {
        finishMove();
        if (body.current) body.current.position.y = 0.55;
      }
    } else {
      walkClock.current += delta * 2;
      const idleBob = Math.sin(walkClock.current) * 0.04;
      if (body.current) body.current.position.y = 0.55 + idleBob;
      if (status === "won" && body.current) {
        body.current.rotation.y += delta * 4;
      }
    }
  });

  return (
    <group ref={group}>
      {bubbleVisible && (
        <Html
          position={[0, 1.85, 0]}
          center
          distanceFactor={5}
          zIndexRange={[100, 0]}
          wrapperClass="bear-bubble-wrap"
        >
          <SpeechBubble
            text={bubbleText}
            variant={bubbleVariant}
            bubbleKey={bubbleKey}
          />
        </Html>
      )}
      <group ref={body} position={[0, 0.55, 0]}>
        <CharacterVisual slug={slug} />
      </group>
    </group>
  );
}

function CharacterVisual({ slug }: { slug: CharacterSlug }) {
  if (slug === "fox") return <FoxModel />;
  if (slug === "robot") return <RobotModel />;
  return <CatPrimitive />;
}

function FoxModel() {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF("/models/Fox.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const idle = actions[names.find((n) => /survey|idle/i.test(n)) ?? names[0]];
    idle?.reset().fadeIn(0.2).play();
    return () => {
      idle?.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={group}>
      <primitive object={scene} scale={0.012} position={[0, -0.55, 0]} />
    </group>
  );
}

function RobotModel() {
  const { scene } = useGLTF("/models/RobotExpressive.glb");
  return <primitive object={scene} scale={0.45} position={[0, -0.55, 0]} />;
}

function CatPrimitive() {
  const color = CHARACTERS.cat.color;
  const dark = "#a8924a";
  return (
    <group>
      <mesh castShadow position={[0, 0, 0]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <group position={[0, 0.42, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.27, 24, 24]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[-0.16, 0.22, -0.02]}>
          <coneGeometry args={[0.08, 0.18, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0.16, 0.22, -0.02]}>
          <coneGeometry args={[0.08, 0.18, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[-0.1, 0.05, 0.24]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0.1, 0.05, 0.24]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0, -0.04, 0.27]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload("/models/Fox.glb");
useGLTF.preload("/models/RobotExpressive.glb");

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function nearestYaw(current: number, target: number) {
  const TAU = Math.PI * 2;
  let diff = (((target - current) % TAU) + TAU) % TAU;
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
  const truncated =
    text.length > 110 ? `${text.slice(0, 108).trim()}…` : text;
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
