export type AvatarAction =
  | 'idle'
  | 'walk'
  | 'jog'
  | 'pick_up'
  | 'place'
  | 'carry'
  | 'pour'
  | 'scrub'
  | 'wipe'
  | 'wash'
  | 'cut'
  | 'stir'
  | 'fold'
  | 'water'
  | 'hand_over'
  | 'receive'
  | 'sit'
  | 'sleep'
  | 'cycle'
  | 'scooter'
  | 'kayak'
  | 'type'
  | 'wave'
  | 'point'
  | 'laugh'
  | 'nod'
  | 'high_five';

export type AvatarMotionState = {
  action: AvatarAction;
  elapsedSeconds: number;
  speed: number;
};

export type AvatarPoseSample = {
  leftArmPitch: number;
  rightArmPitch: number;
  leftArmRoll: number;
  rightArmRoll: number;
  leftLegPitch: number;
  rightLegPitch: number;
  torsoPitch: number;
  torsoYaw: number;
  breath: number;
  leftHandX: number;
  leftHandY: number;
  leftHandZ: number;
  rightHandX: number;
  rightHandY: number;
  rightHandZ: number;
};

const base = (): AvatarPoseSample => ({
  leftArmPitch: 0,
  rightArmPitch: 0,
  leftArmRoll: 0,
  rightArmRoll: 0,
  leftLegPitch: 0,
  rightLegPitch: 0,
  torsoPitch: 0,
  torsoYaw: 0,
  breath: 0,
  leftHandX: -0.35,
  leftHandY: 0,
  leftHandZ: 0,
  rightHandX: 0.35,
  rightHandY: 0,
  rightHandZ: 0,
});

export function sampleAvatarMotion(state: AvatarMotionState): AvatarPoseSample {
  const pose = base();
  const t = Math.max(0, state.elapsedSeconds);
  pose.breath = Math.sin(t * Math.PI * 1.4) * 0.008;

  if (state.action === 'walk' || state.action === 'jog') {
    const jog = state.action === 'jog';
    const frequency = jog ? 7.8 : 6.8;
    const phase = Math.sin(t * frequency);
    const armAmplitude = jog ? 0.65 : 0.38;
    const legAmplitude = jog ? 0.62 : 0.42;
    pose.leftArmPitch = phase * armAmplitude;
    pose.rightArmPitch = -phase * armAmplitude;
    pose.leftLegPitch = -phase * legAmplitude;
    pose.rightLegPitch = phase * legAmplitude;
    pose.torsoYaw = phase * (jog ? 0.045 : 0.025);
    pose.torsoPitch = jog ? 0.08 : 0.025;
    return pose;
  }

  const loop = Math.sin(t * Math.PI * 2.8);
  const fast = Math.sin(t * Math.PI * 6.2);

  switch (state.action) {
    case 'idle':
      pose.leftArmPitch = Math.sin(t * 0.75) * 0.018;
      pose.rightArmPitch = -Math.sin(t * 0.75) * 0.018;
      return pose;
    case 'pick_up':
      pose.torsoPitch = 0.23;
      pose.leftArmPitch = -0.72;
      pose.rightArmPitch = -0.72;
      pose.leftHandY = -0.16;
      pose.rightHandY = -0.16;
      pose.leftHandZ = -0.18;
      pose.rightHandZ = -0.18;
      return pose;
    case 'place':
      pose.torsoPitch = 0.12;
      pose.leftArmPitch = -0.55;
      pose.rightArmPitch = -0.55;
      pose.leftHandZ = -0.28;
      pose.rightHandZ = -0.28;
      return pose;
    case 'carry':
      pose.leftArmPitch = -0.72;
      pose.rightArmPitch = -0.72;
      pose.leftArmRoll = -0.18;
      pose.rightArmRoll = 0.18;
      pose.leftHandX = -0.2;
      pose.rightHandX = 0.2;
      pose.leftHandY = 0.08;
      pose.rightHandY = 0.08;
      pose.leftHandZ = -0.24;
      pose.rightHandZ = -0.24;
      return pose;
    case 'pour':
      pose.leftArmPitch = -0.55;
      pose.rightArmPitch = -0.82;
      pose.rightArmRoll = 0.28 + loop * 0.08;
      pose.leftHandZ = -0.22;
      pose.rightHandZ = -0.34;
      return pose;
    case 'scrub':
      pose.torsoPitch = 0.12;
      pose.leftArmPitch = -0.62;
      pose.rightArmPitch = -0.82 + loop * 0.12;
      pose.rightArmRoll = 0.18 + Math.cos(t * Math.PI * 2.8) * 0.15;
      pose.leftHandX = -0.18;
      pose.rightHandX = 0.16 + loop * 0.08;
      pose.leftHandY = -0.05;
      pose.rightHandY = -0.02 + Math.cos(t * Math.PI * 2.8) * 0.05;
      pose.leftHandZ = -0.3;
      pose.rightHandZ = -0.38;
      return pose;
    case 'wipe':
      pose.torsoPitch = 0.1;
      pose.leftArmPitch = -0.35;
      pose.rightArmPitch = -0.68;
      pose.rightArmRoll = 0.08;
      pose.rightHandX = 0.22 + loop * 0.16;
      pose.rightHandY = -0.08;
      pose.rightHandZ = -0.43;
      return pose;
    case 'wash':
      pose.torsoPitch = 0.1;
      pose.leftArmPitch = -0.7;
      pose.rightArmPitch = -0.72;
      pose.leftHandX = -0.13 + loop * 0.04;
      pose.rightHandX = 0.13 - loop * 0.04;
      pose.leftHandZ = -0.33;
      pose.rightHandZ = -0.33;
      return pose;
    case 'cut':
      pose.torsoPitch = 0.09;
      pose.leftArmPitch = -0.55;
      pose.rightArmPitch = -0.72 + fast * 0.15;
      pose.leftHandX = -0.1;
      pose.rightHandX = 0.12;
      pose.leftHandY = -0.1;
      pose.rightHandY = -0.1 + Math.max(0, fast) * 0.12;
      pose.leftHandZ = -0.36;
      pose.rightHandZ = -0.39;
      return pose;
    case 'stir':
      pose.torsoPitch = 0.06;
      pose.leftArmPitch = -0.38;
      pose.rightArmPitch = -0.72;
      pose.rightArmRoll = 0.21 + Math.cos(t * Math.PI * 2.8) * 0.08;
      pose.rightHandX = 0.12 + loop * 0.07;
      pose.rightHandY = -0.03 + Math.cos(t * Math.PI * 2.8) * 0.04;
      pose.rightHandZ = -0.34;
      return pose;
    case 'fold':
      pose.leftArmPitch = -0.58 + loop * 0.05;
      pose.rightArmPitch = -0.58 - loop * 0.05;
      pose.leftHandX = -0.18 + loop * 0.08;
      pose.rightHandX = 0.18 - loop * 0.08;
      pose.leftHandZ = -0.32;
      pose.rightHandZ = -0.32;
      return pose;
    case 'water':
      pose.leftArmPitch = -0.45;
      pose.rightArmPitch = -0.9;
      pose.rightArmRoll = 0.38 + loop * 0.04;
      pose.leftHandZ = -0.16;
      pose.rightHandX = 0.26;
      pose.rightHandY = -0.1;
      pose.rightHandZ = -0.48;
      return pose;
    case 'hand_over':
      pose.leftArmPitch = -0.32;
      pose.rightArmPitch = -1.08;
      pose.rightHandX = 0.18;
      pose.rightHandY = 0.1;
      pose.rightHandZ = -0.58;
      return pose;
    case 'receive':
      pose.leftArmPitch = -0.78;
      pose.rightArmPitch = -0.78;
      pose.leftHandX = -0.17;
      pose.rightHandX = 0.17;
      pose.leftHandZ = -0.44;
      pose.rightHandZ = -0.44;
      return pose;
    case 'sit':
      pose.leftLegPitch = -1.15;
      pose.rightLegPitch = -1.15;
      pose.leftArmPitch = -0.15;
      pose.rightArmPitch = -0.15;
      pose.torsoPitch = 0.04;
      return pose;
    case 'sleep':
      pose.leftArmPitch = -0.22;
      pose.rightArmPitch = -0.3;
      pose.leftLegPitch = 0.08;
      pose.rightLegPitch = -0.08;
      pose.breath = Math.sin(t * Math.PI * 0.7) * 0.011;
      return pose;
    case 'cycle': {
      const pedal = Math.sin(t * Math.PI * 3.8);
      pose.torsoPitch = 0.16;
      pose.leftArmPitch = -0.62;
      pose.rightArmPitch = -0.62;
      pose.leftArmRoll = -0.1;
      pose.rightArmRoll = 0.1;
      pose.leftHandX = -0.24;
      pose.rightHandX = 0.24;
      pose.leftHandZ = -0.48;
      pose.rightHandZ = -0.48;
      pose.leftLegPitch = pedal * 0.62;
      pose.rightLegPitch = -pedal * 0.62;
      return pose;
    }
    case 'scooter':
      pose.torsoPitch = 0.04;
      pose.leftArmPitch = -0.5;
      pose.rightArmPitch = -0.5;
      pose.leftHandX = -0.25;
      pose.rightHandX = 0.25;
      pose.leftHandZ = -0.5;
      pose.rightHandZ = -0.5;
      pose.leftLegPitch = 0.06;
      pose.rightLegPitch = -0.04;
      return pose;
    case 'kayak': {
      const paddle = Math.sin(t * Math.PI * 2.2);
      pose.torsoPitch = 0.1;
      pose.torsoYaw = paddle * 0.2;
      pose.leftArmPitch = -0.45 + paddle * 0.24;
      pose.rightArmPitch = -0.45 - paddle * 0.24;
      pose.leftArmRoll = -0.35;
      pose.rightArmRoll = 0.35;
      pose.leftHandZ = -0.25 - paddle * 0.12;
      pose.rightHandZ = -0.25 + paddle * 0.12;
      return pose;
    }
    case 'type':
      pose.torsoPitch = 0.06;
      pose.leftArmPitch = -0.72;
      pose.rightArmPitch = -0.72;
      pose.leftHandX = -0.2 + fast * 0.02;
      pose.rightHandX = 0.2 - fast * 0.02;
      pose.leftHandY = -0.08 + Math.max(0, fast) * 0.025;
      pose.rightHandY = -0.08 + Math.max(0, -fast) * 0.025;
      pose.leftHandZ = -0.35;
      pose.rightHandZ = -0.35;
      return pose;
    case 'wave':
      pose.rightArmPitch = -1.05;
      pose.rightArmRoll = 0.42 + loop * 0.28;
      pose.rightHandY = 0.42;
      pose.rightHandZ = -0.08;
      return pose;
    case 'point':
      pose.rightArmPitch = -1.18;
      pose.rightHandY = 0.15;
      pose.rightHandZ = -0.62;
      return pose;
    case 'laugh':
      pose.torsoPitch = -0.03 + Math.abs(fast) * 0.05;
      pose.leftArmPitch = -0.28;
      pose.rightArmPitch = -0.38;
      pose.rightHandY = 0.1;
      return pose;
    case 'nod':
      pose.torsoPitch = Math.sin(t * Math.PI * 3.2) * 0.035;
      return pose;
    case 'high_five':
      pose.rightArmPitch = -1.32;
      pose.rightArmRoll = 0.08;
      pose.rightHandY = 0.52;
      pose.rightHandZ = -0.35;
      return pose;
  }
}
