import { useSyncExternalStore } from "react";
import type { StudioCameraView } from "../../editor/studio-editor-context";

/** The camera presets the 3D viewer exposes. */
export type StudioCameraMode =
  | "guest"
  | "stage"
  | "corner"
  | "ceiling"
  | "walk"
  | "top"
  | "dollhouse"
  | "showcase"
  | "front";

export const DEFAULT_CAMERA_MODE: StudioCameraMode = "guest";

/** Modes that stand inside the room: first-person look, clamped to the floor plan. */
export function isInteriorMode(mode: StudioCameraMode): boolean {
  return mode !== "top" && mode !== "dollhouse";
}

export function cameraModeFromView(view: StudioCameraView): StudioCameraMode {
  return view === "perspective" ? "dollhouse" : view;
}

/** Requests from the viewer chrome (outside the canvas) to the camera rig. */
export type CameraRigCommand =
  | { type: "eye"; feet: number }
  | { type: "eye_step"; feet: number }
  | { type: "look_up"; up: boolean }
  /** Lie back on the floor and gaze straight up at the ceiling (toggle restores the eye). */
  | { type: "lie_back"; on: boolean };

type Snapshot = {
  mode: StudioCameraMode;
  /** Live eye height in feet while inside the room. */
  eyeHeight: number;
  /** Ceiling height minus the soffit clearance, feet. */
  maxEyeHeight: number;
  lookingUp: boolean;
  lyingBack: boolean;
  headBob: boolean;
  /** Click-to-mouse-look outside Walk (Walk always offers it). */
  mouseLook: boolean;
  /** The canvas holds the pointer lock: the mouse turns the head. */
  pointerLocked: boolean;
};

let state: Snapshot = {
  mode: DEFAULT_CAMERA_MODE,
  eyeHeight: 5.5,
  maxEyeHeight: 10.5,
  lookingUp: false,
  lyingBack: false,
  headBob: false,
  mouseLook: false,
  pointerLocked: false,
};
let mounted = false;
const listeners = new Set<() => void>();
const rigListeners = new Set<(command: CameraRigCommand) => void>();

function update(patch: Partial<Snapshot>) {
  const keys = Object.keys(patch) as Array<keyof Snapshot>;
  if (keys.every((key) => state[key] === patch[key])) return;
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const serverSnapshot: Snapshot = { ...state };

export function getStudioCameraMode(): StudioCameraMode {
  return state.mode;
}

export function setStudioCameraMode(next: StudioCameraMode) {
  update({ mode: next });
}

/** Published by the rig; rounded so the HUD only re-renders on visible changes. */
export function publishCameraRigState(
  eyeHeight: number,
  maxEyeHeight: number,
  lookingUp: boolean,
  lyingBack = false
) {
  update({
    eyeHeight: Math.round(eyeHeight * 12) / 12,
    maxEyeHeight: Math.round(maxEyeHeight * 12) / 12,
    lookingUp,
    lyingBack,
  });
}

export function getStudioHeadBob() {
  return state.headBob;
}

export function setStudioHeadBob(next: boolean) {
  update({ headBob: next });
}

/** Whether a click on empty canvas grabs the mouse in this mode. */
export function mouseLookAvailable(mode: StudioCameraMode, mouseLook: boolean): boolean {
  return isInteriorMode(mode) && (mode === "walk" || mouseLook);
}

export function getStudioMouseLook() {
  return state.mouseLook;
}

export function setStudioMouseLook(next: boolean) {
  update({ mouseLook: next });
}

export function isStudioPointerLocked() {
  return state.pointerLocked;
}

/** Published by the rig on `pointerlockchange`. */
export function setStudioPointerLocked(next: boolean) {
  update({ pointerLocked: next });
}

/** Called by the camera rig so keyboard guards only apply while it is live. */
export function setStudioCameraMounted(next: boolean) {
  if (next === mounted) return;
  mounted = next;
  if (!next) state = { ...state, mode: DEFAULT_CAMERA_MODE, pointerLocked: false };
  listeners.forEach((listener) => listener());
}

/** True while the 3D walk mode owns the arrow keys. */
export function isStudioWalkActive(): boolean {
  return mounted && state.mode === "walk";
}

export function sendCameraRigCommand(command: CameraRigCommand) {
  rigListeners.forEach((listener) => listener(command));
}

export function subscribeCameraRig(listener: (command: CameraRigCommand) => void) {
  rigListeners.add(listener);
  return () => {
    rigListeners.delete(listener);
  };
}

export function useStudioCameraMode(): StudioCameraMode {
  return useSyncExternalStore(
    subscribe,
    () => state.mode,
    () => DEFAULT_CAMERA_MODE
  );
}

export function useStudioMouseLook(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.mouseLook,
    () => false
  );
}

export function useStudioPointerLocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.pointerLocked,
    () => false
  );
}

export function useStudioCameraRig(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
