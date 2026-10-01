export function gazeAngles(cameraYaw: number, cameraPitch: number, bodyYaw: number): { yaw: number; pitch: number } {
  if (![cameraYaw, cameraPitch, bodyYaw].every(Number.isFinite)) return { yaw: 0, pitch: 0 };
  const relative = Math.atan2(Math.sin(cameraYaw - bodyYaw), Math.cos(cameraYaw - bodyYaw));
  return { yaw: Math.max(-.8, Math.min(.8, relative)), pitch: Math.max(-.45, Math.min(.45, cameraPitch)) };
}
