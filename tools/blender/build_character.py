# Phase 1 character build for Together / Amaya Bay (Blender 5.x, headless bpy).
#
# Produces skinned, vertex-coloured GLBs under client/public/assets/models/characters/,
# all sharing one humanoid rig (bone names from docs/ART_PRODUCTION_PLAN.md Phase 1,
# including finger bones) with idle/walk/jog/sit clips on the body files:
#   body_average / body_slim / body_broad, face_01..03, hair_01..04,
#   outfit_terracotta/blue/sage/mustard, outfit_home, outfit_sleep, crowd_01..05.
# Run: blender --background --factory-startup --python tools/blender/build_character.py -- --out <dir>

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import struct
import sys

import bpy
from mathutils import Vector

Vec3 = Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshgen import MeshBuilder, lerp, clamp  # noqa: E402

# ---------------------------------------------------------------- palette
PALETTE = {
    'terracotta': (0.92, 0.42, 0.32),
    'blue': (0.30, 0.55, 0.83),
    'sage': (0.33, 0.66, 0.46),
    'mustard': (0.92, 0.78, 0.36),
    'home': (0.55, 0.71, 0.60),
    'sleep': (0.84, 0.76, 0.86),
    'trousers': (0.28, 0.30, 0.33),
    'shoe': (0.22, 0.17, 0.14),
    'eye_white': (0.95, 0.94, 0.92),
    'iris': (0.23, 0.15, 0.10),
    'pupil': (0.09, 0.09, 0.09),
    'brow': (0.20, 0.15, 0.12),
    'mouth': (0.45, 0.26, 0.24),
    'hair_band': (0.85, 0.62, 0.55),
    'barista': (0.95, 0.93, 0.89),
    'barista_trouser': (0.23, 0.25, 0.29),
    'garden': (0.50, 0.68, 0.42),
    'garden_trouser': (0.35, 0.29, 0.22),
    'delivery': (0.89, 0.41, 0.24),
    'delivery_trouser': (0.18, 0.24, 0.34),
    'market': (0.91, 0.77, 0.42),
    'market_trouser': (0.29, 0.33, 0.41),
    'apron': (0.24, 0.22, 0.21),
    'stripe': (0.82, 0.92, 0.55),
    'lens': (0.90, 0.93, 0.95),
    'rim': (0.13, 0.11, 0.10),
}
SKINS = {
    'average': (0.86, 0.62, 0.47),
    'slim': (0.95, 0.78, 0.64),
    'broad': (0.63, 0.43, 0.29),
}
HAIRS = {
    'black': (0.12, 0.10, 0.10),
    'brown': (0.30, 0.19, 0.12),
    'dark': (0.17, 0.14, 0.12),
    'auburn': (0.48, 0.24, 0.13),
    'grey': (0.60, 0.58, 0.56),
}

CROWD_SKINS = [SKINS['average'], SKINS['light'] if False else (0.95, 0.78, 0.64), (0.71, 0.48, 0.33), SKINS['broad'], (0.64, 0.44, 0.30)]
CROWD_HAIRS = [HAIRS['black'], HAIRS['brown'], HAIRS['dark'], HAIRS['auburn'], HAIRS['grey']]

# ---------------------------------------------------------------- body frames
BODY_FRAMES = {
    'average': {'shoulder': 1.00, 'hip': 1.00, 'belly': 0.0, 'arm_r': 1.00, 'head_r': 1.00},
    'slim': {'shoulder': 0.90, 'hip': 0.90, 'belly': -0.012, 'arm_r': 0.88, 'head_r': 0.97},
    'broad': {'shoulder': 1.14, 'hip': 1.11, 'belly': 0.016, 'arm_r': 1.14, 'head_r': 1.03},
}

FACE_VARIANTS = {
    'face_01': {'w': 1.00, 'h': 1.00, 'eye_x': 1.00, 'eye_ry': 0.0, 'eye_r': 1.00, 'nose': 1.0, 'mouth': 1.0, 'jaw': 1.0, 'ear': 1.0, 'brow_tilt': 0.0, 'luck': 0.0},
    'face_02': {'w': 0.93, 'h': 0.97, 'eye_x': 1.04, 'eye_ry': 0.006, 'eye_r': 1.1, 'nose': 0.85, 'mouth': 1.05, 'jaw': 0.94, 'ear': 0.92, 'brow_tilt': -0.05, 'luck': 0.0},
    'face_03': {'w': 0.86, 'h': 1.08, 'eye_x': 0.95, 'eye_ry': -0.008, 'eye_r': 0.9, 'nose': 0.8, 'mouth': 0.9, 'jaw': 0.88, 'ear': 1.05, 'brow_tilt': 0.08, 'luck': 0.0},
}

# ---------------------------------------------------------------- skeleton
# Character facing +Y; .L on x<0 (three.js later mirrors back to -Z facing).
RIG = {
    'hips': ((0.0, 0.0, 0.94), (0.0, 0.0, 1.10)),
    'spine': ((0.0, 0.0, 1.10), (0.0, 0.0, 1.30)),
    'chest': ((0.0, 0.0, 1.30), (0.0, 0.0, 1.50)),
    'neck': ((0.0, 0.0, 1.50), (0.0, 0.0, 1.58)),
    'head': ((0.0, 0.0, 1.58), (0.0, 0.0, 1.86)),
}
SIDE_BONES = [
    ('shoulder', ((-0.05, 0.0, 1.43), (-0.165, 0.0, 1.38)), 'chest'),
    ('upper_arm', ((-0.165, 0.0, 1.38), (-0.188, 0.0, 1.06)), 'shoulder'),
    ('forearm', ((-0.188, 0.0, 1.06), (-0.188, 0.0, 0.68)), 'upper_arm'),
    ('hand', ((-0.188, 0.0, 0.68), (-0.188, 0.03, 0.58)), 'forearm'),
    ('thumb', ((-0.205, 0.02, 0.645), (-0.208, 0.09, 0.575)), 'hand'),
    ('finger01', ((-0.176, 0.02, 0.65), (-0.178, 0.105, 0.615)), 'hand'),
    ('finger02', ((-0.189, 0.02, 0.655), (-0.191, 0.11, 0.62)), 'hand'),
    ('finger03', ((-0.202, 0.02, 0.65), (-0.204, 0.105, 0.615)), 'hand'),
    ('finger04', ((-0.212, 0.02, 0.645), (-0.214, 0.098, 0.612)), 'hand'),
    ('thigh', ((-0.104, 0.0, 0.93), (-0.114, 0.0, 0.48)), 'hips'),
    ('shin', ((-0.114, 0.0, 0.48), (-0.114, 0.0, 0.10)), 'thigh'),
    ('foot', ((-0.114, 0.0, 0.10), (-0.114, 0.15, 0.045)), 'shin'),
]
SIDES = ('left', 'right')
RIG_ROOT = 'avatar-rig'

BONE_SIGMAS = {
    'hips': 0.16, 'spine': 0.16, 'chest': 0.18, 'neck': 0.10, 'head': 0.17,
    'shoulder': 0.10, 'upper_arm': 0.085, 'forearm': 0.085, 'hand': 0.085,
    'thumb': 0.05, 'finger01': 0.045, 'finger02': 0.045, 'finger03': 0.045, 'finger04': 0.045,
    'thigh': 0.10, 'shin': 0.095, 'foot': 0.075,
}

TORSO_ANCHORS = [
    (0.90, 0.152, 0.125),
    (0.99, 0.150, 0.120),
    (1.09, 0.130, 0.107),
    (1.19, 0.148, 0.117),
    (1.28, 0.166, 0.124),
    (1.38, 0.172, 0.118),
    (1.47, 0.150, 0.104),
    (1.53, 0.092, 0.074),
]


def seg_distance(point: Vec3, head: Vec3, tail: Vec3) -> float:
    d = tail - head
    length_sq = d.length_squared
    if length_sq < 1e-9:
        return (point - head).length
    t = clamp(((point - head).dot(d)) / length_sq, 0.0, 1.0)
    return (point - (head + d * t)).length


def ao_color(color, y_up: float = 0.55, drop: float = 0.14) -> tuple[float, float, float]:
    """Baked pseudo-AO: parts facing down read darker."""
    factor = clamp(1.0 - drop * clamp(0.5 - y_up * 0.5, 0.0, 1.0) * 2.0, 0.74, 1.0)
    return (color[0] * factor, color[1] * factor, color[2] * factor)


# ---------------------------------------------------------------- torso shape
def torso_shape(y: float, frame: dict) -> tuple[float, float]:
    for i in range(len(TORSO_ANCHORS) - 1):
        (y0, x0, z0), (y1, x1, z1) = TORSO_ANCHORS[i], TORSO_ANCHORS[i + 1]
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            rx, rz = lerp(x0, x1, t), lerp(z0, z1, t)
            break
    else:
        rx, rz = (TORSO_ANCHORS[-1][1], TORSO_ANCHORS[-1][2]) if y >= TORSO_ANCHORS[-1][0] else (TORSO_ANCHORS[0][1], TORSO_ANCHORS[0][2])
    rx *= lerp(1.0, frame['hip'], clamp((1.14 - y) / 0.24, 0.0, 1.0))
    rx *= lerp(1.0, frame['shoulder'], clamp((y - 1.24) / 0.20, 0.0, 1.0))
    rz *= 1.0 + frame['belly'] * math.sin(clamp((y - 0.90) / 0.62, 0.0, 1.0) * math.pi)
    return rx, rz


# ---------------------------------------------------------------- armature
def build_armature_object(name: str = RIG_ROOT) -> bpy.types.Object:
    arm = bpy.data.armatures.new(name + '-data')
    obj = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bones_map: dict[str, bpy.types.EditBone] = {}
    for bone_name, (head, tail) in RIG.items():
        b = arm.edit_bones.new(bone_name)
        b.head, b.tail = Vec3(head), Vec3(tail)
        b.roll = 0.0
        b.use_deform = True
        bones_map[bone_name] = b
    for side in SIDES:
        x_sign = -1.0 if side == 'left' else 1.0
        suffix = 'L' if side == 'left' else 'R'
        for base, (head, tail), parent_base in SIDE_BONES:
            bone_name = f'{base}.{suffix}'
            b = arm.edit_bones.new(bone_name)
            b.head = Vec3((head[0] * x_sign, head[1], head[2]))
            b.tail = Vec3((tail[0] * x_sign, tail[1], tail[2]))
            b.roll = 0.0
            b.use_deform = True
            bones_map[bone_name] = b
            if parent_base:
                parent_name = parent_base if parent_base in RIG else f'{parent_base}.{suffix}'
                b.parent = arm.edit_bones[parent_name]
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in obj.pose.bones:
        pb.rotation_mode = 'XYZ'
    return obj


def assign_weights(mesh_obj: bpy.types.Object, armature_obj: bpy.types.Object) -> None:
    """Distance-to-segment Gaussian skin weights for every deforming bone."""
    arm = armature_obj.data
    sigma_map = dict(BONE_SIGMAS)
    for base, _, _ in SIDE_BONES:
        for side in ('L', 'R'):
            sigma_map[f'{base}.{side}'] = BONE_SIGMAS[base]
    bones = [(b.name, Vec3(b.head_local), Vec3(b.tail_local)) for b in arm.bones if b.use_deform and b.name in sigma_map]
    missing = {b.name for b in arm.bones if b.use_deform} - {n for (n, _, _) in bones}
    if missing:
        raise KeyError(f'bones without skin weights: {sorted(missing)}')
    mesh_obj.vertex_groups.clear()
    groups = {name: mesh_obj.vertex_groups.new(name=name) for (name, _, _) in bones}
    mesh = mesh_obj.data
    done: set[int] = set()
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            vertex_idx = mesh.loops[loop_idx].vertex_index
            if vertex_idx in done:
                continue
            done.add(vertex_idx)
            v = Vec3(mesh.vertices[vertex_idx].co)
            weighted = []
            for (bone_name, head, tail) in bones:
                distance = seg_distance(v, head, tail)
                weight = math.exp(-0.5 * (distance / sigma_map[bone_name]) ** 2)
                if weight > 0.012:
                    weighted.append((weight, bone_name))
            weighted.sort(reverse=True)
            total = sum(weight for (weight, _) in weighted[:3])
            if total <= 0.0:
                groups['hips'].add([vertex_idx], 1.0, 'REPLACE')
                continue
            for (weight, bone_name) in weighted[:3]:
                groups[bone_name].add([vertex_idx], weight / total, 'REPLACE')
    modifier = mesh_obj.modifiers.new('Armature', 'ARMATURE')
    modifier.object = armature_obj
    modifier.use_vertex_groups = True


def finish_mesh(builder: MeshBuilder, name: str) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(builder.verts, [], builder.tris)
    mesh.validate()
    mesh.update()
    attr = mesh.color_attributes.new(name='Col', type='BYTE_COLOR', domain='CORNER')
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            vertex_idx = mesh.loops[loop_idx].vertex_index
            color = builder.colors[vertex_idx]
            attr.data[loop_idx].color = (color[0], color[1], color[2], 1.0)
    mesh.color_attributes.active_color = attr
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def make_material() -> bpy.types.Material:
    material = bpy.data.materials.get('amaya-vertex-color')
    if material:
        return material
    material = bpy.data.materials.new('amaya-vertex-color')
    material.use_nodes = True
    material.use_backface_culling = False
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.inputs['Roughness'].default_value = 0.92
    principled.inputs['Metallic'].default_value = 0.0
    for possible in ('Specular IOR Level', 'Specular'):
        if possible in principled.inputs:
            principled.inputs[possible].default_value = 0.06
            break
    vertex_color = nodes.new('ShaderNodeVertexColor')
    links.new(vertex_color.outputs['Color'], principled.inputs['Base Color'])
    links.new(principled.outputs['BSDF'], out.inputs['Surface'])
    return material


# ---------------------------------------------------------------- torso shell
def elliptical_shell(builder: MeshBuilder, bands: list[tuple[Vec3, float, float]], segments: int, color, round_caps: bool = True, cap_bands: int = 3) -> None:
    """Vertical-surface shell with per-band elliptical cross-section (torso, pelvis)."""
    bs = list(bands)
    axis = bs[-1][0] - bs[0][0]
    axis = axis.normalized() if axis.length > 1e-6 else Vec3((0, 0, 1))
    if round_caps and len(bs) >= 2:
        c0, rx0, rz0 = bs[0]
        c1 = bs[1][0]
        back = (c0 - c1)
        back = back.normalized() if back.length > 1e-6 else Vec3((0, 0, -1))
        pre = []
        for i in range(cap_bands, 0, -1):
            t = i / (cap_bands + 1)
            angle = t * math.pi / 2
            pre.append((c0 + back * (math.sin(angle) * ((rx0 + rz0) / 2.0)), rx0 * math.cos(angle), rz0 * math.cos(angle)))
        cn, rxn, rzn = bs[-1]
        cp = bs[-2][0]
        fwd = (cn - cp)
        fwd = fwd.normalized() if fwd.length > 1e-6 else Vec3((0, 0, 1))
        post = []
        for i in range(1, cap_bands + 1):
            t = i / (cap_bands + 1)
            angle = t * math.pi / 2
            post.append((cn + fwd * (math.sin(angle) * ((rxn + rzn) / 2.0)), rxn * math.cos(angle), rzn * math.cos(angle)))
        bs = pre + bs + post
    prev_ring = None
    for (center, rx, rz) in bs:
        ring = None
        if rx > 2e-4 and rz > 2e-4:
            ring = builder.ring(center, axis, rx, rz, segments, color)
        if ring is None:
            pole = builder.vertex(center, color)
            if prev_ring is not None:
                builder._fan(pole, prev_ring, flip=True)
            prev_ring = None
        else:
            builder._stitch(prev_ring, ring)
            prev_ring = ring


# ---------------------------------------------------------------- body parts
def build_torso(builder: MeshBuilder, frame_key: str, shirt) -> None:
    frame = BODY_FRAMES[frame_key]
    bands = []
    for i in range(15):
        t = i / 14
        y = lerp(0.90, 1.53, t)
        rx, rz = torso_shape(y, frame)
        bands.append((Vec3((0.0, 0.0, y)), rx * 0.98, rz * 0.98))
    elliptical_shell(builder, bands, 16, ao_color(shirt, 0.6))


def build_pelvis(builder: MeshBuilder, frame_key: str, trouser) -> None:
    frame = BODY_FRAMES[frame_key]
    bands = []
    for i in range(7):
        t = i / 6
        y = lerp(0.83, 0.97, t)
        rx, rz = torso_shape(y, frame)
        bands.append((Vec3((0.0, 0.0, y)), rx * 1.01, rz * 1.02))
    elliptical_shell(builder, bands, 16, ao_color(trouser, 0.5))


def build_neck(builder: MeshBuilder, skin) -> None:
    bands = [
        (Vec3((0.0, 0.012, 1.455)), 0.058, 0.058),
        (Vec3((0.0, 0.014, 1.50)), 0.057, 0.057),
        (Vec3((0.0, 0.016, 1.545)), 0.055, 0.055),
        (Vec3((0.0, 0.017, 1.575)), 0.053, 0.053),
    ]
    builder.lathe(bands, 14, ao_color(skin, 0.6), round_caps=False)


def build_arm(builder: MeshBuilder, side: str, frame: dict, skin, sleeve_color, sleeve_length: float) -> None:
    """sleeve_length: 0 none, extends from 1 (shoulder blob) down toward the wrist."""
    s = -1.0 if side == 'left' else 1.0
    shw, arm_r = frame['shoulder'], frame['arm_r']
    shoulder = Vec3((s * 0.158 * shw, 0.004, 1.40))
    elbow = Vec3((s * 0.190 * shw, 0.0, 1.06))
    wrist = Vec3((s * 0.190 * shw, 0.004, 0.685))
    if sleeve_length > 0.05:
        sleeve_target_z = lerp(shoulder.z, elbow.z, clamp(sleeve_length, 0.0, 1.0))
        sleeve = []
        for i in range(4):
            t = i / 3
            y = lerp(shoulder.z, sleeve_target_z, t)
            radius = lerp(0.080 * arm_r, 0.072 * arm_r, t)
            sleeve.append((Vec3((s * lerp(0.160 * shw, 0.192 * shw, t), 0.002, y)), radius, radius))
        builder.lathe(sleeve, 14, ao_color(sleeve_color, 0.5), round_caps=False)
    builder.limb(shoulder, elbow, 0.062 * arm_r, 0.056 * arm_r, ao_color(skin, 0.45), segments=14)
    builder.limb(elbow, wrist, 0.056 * arm_r, 0.049 * arm_r, ao_color(skin, 0.45), segments=14, bulge=0.05)
    hand = Vec3((s * 0.190 * shw, 0.012, 0.625))
    builder.blob(hand, 0.042 * arm_r, 0.052 * arm_r, 0.046 * arm_r, ao_color(skin, 0.5), segments=12, divisions=8)
    # static fingers
    for i, (base, _) in enumerate((('thumb', 0), ('finger01', 1), ('finger02', 2), ('finger03', 3), ('finger04', 4))):
        if base == 'thumb':
            p0 = Vec3((s * 0.206 * arm_r, 0.03, 0.63))
            p1 = Vec3((s * 0.209 * arm_r, 0.105, 0.57))
            radius = 0.0125 * arm_r
        else:
            x_pos = 0.176 + 0.0125 * (i - 1)
            p0 = Vec3((s * x_pos * arm_r, 0.02, 0.642))
            p1 = Vec3((s * (x_pos + 0.002) * arm_r, 0.115, 0.612))
            radius = 0.0105 * arm_r
        builder.limb(p0, p1, radius, radius * 0.88, ao_color(skin, 0.5), segments=8)


def build_leg(builder: MeshBuilder, side: str, frame: dict, trouser) -> None:
    s = -1.0 if side == 'left' else 1.0
    hipw = frame['hip']
    hip_x = s * 0.104 * hipw
    knee_x = s * 0.112
    builder.limb(Vec3((hip_x, 0.0, 0.92)), Vec3((knee_x, 0.0, 0.50)), 0.086, 0.070, ao_color(trouser, 0.4), segments=14)
    builder.limb(Vec3((knee_x, 0.0, 0.50)), Vec3((knee_x, 0.0, 0.115)), 0.062, 0.049, ao_color(trouser, 0.4), segments=14, bulge=0.06)
    foot_bands = [
        (Vec3((knee_x, 0.0, 0.048)), 0.049, 0.049),
        (Vec3((knee_x, 0.10, 0.05)), 0.053, 0.053),
        (Vec3((knee_x, 0.18, 0.05)), 0.058, 0.058),
        (Vec3((knee_x, 0.245, 0.048)), 0.05, 0.05),
    ]
    builder.lathe(foot_bands, 12, ao_color(PALETTE['shoe'], 0.5), round_caps=True, cap_bands=3)


def build_body_mesh(builder: MeshBuilder, frame_key: str) -> MeshBuilder:
    """Skin + trousers + shoes, arms bare: the base body under the outfit."""
    frame = BODY_FRAMES[frame_key]
    skin = ao_color(SKINS[frame_key], 0.5)
    shirt = PALETTE['terracotta']
    trouser = ao_color(PALETTE['trousers'], 0.4)
    build_pelvis(builder, frame_key, trouser)
    build_torso(builder, frame_key, shirt)
    build_neck(builder, skin)
    for side in SIDES:
        build_arm(builder, side, frame, skin, shirt, 0.0)
        build_leg(builder, side, frame, trouser)
    return builder


# ---------------------------------------------------------------- faces
def build_head_mesh(builder: MeshBuilder, face_key: str, skin_color=None) -> MeshBuilder:
    face = FACE_VARIANTS[face_key]
    head_r = 1.0
    skin = skin_color if skin_color is not None else SKINS['average']
    skin_c = ao_color(skin, 0.55)
    skull_c = Vec3((0.0, 0.012, 1.655))
    builder.blob(skull_c, 0.150 * head_r * face['w'], 0.145 * face['h'], 0.135 * head_r * face['w'], skin_c, segments=16, divisions=10)
    jaw = Vec3((0.0, 0.018, 1.596))
    builder.blob(jaw, 0.100 * head_r * face['w'] * face['jaw'], 0.078 * face['h'], 0.108 * head_r * face['jaw'], skin_c, segments=14, divisions=8)
    for side, s in (('left', -1.0), ('right', 1.0)):
        cheek = Vec3((s * 0.088 * face['w'], 0.062, 1.625))
        builder.blob(cheek, 0.030 * face['w'], 0.032, 0.028, skin_c, segments=10, divisions=7)
        ear = Vec3((s * 0.150 * head_r * face['w'], 0.0, 1.66))
        builder.blob(ear, 0.014, 0.036 * face['ear'], 0.028 * face['ear'], skin_c, segments=10, divisions=7)
        eye_center = Vec3((s * 0.063 * face['eye_x'], 0.148, 1.655 + face['eye_ry']))
        builder.blob(eye_center, 0.038 * face['eye_r'], 0.031, 0.024, ao_color(PALETTE['eye_white'], 0.9, 0.05), segments=12, divisions=8)
        iris_center = Vec3((s * 0.063 * face['eye_x'], 0.168, 1.655 + face['eye_ry']))
        builder.blob(iris_center, 0.0175 * face['eye_r'], 0.014, 0.009, ao_color(PALETTE['iris'], 0.9, 0.05), segments=12, divisions=8)
        pupil_center = Vec3((s * 0.063 * face['eye_x'], 0.175, 1.655 + face['eye_ry']))
        builder.blob(pupil_center, 0.0075 * face['eye_r'], 0.006, 0.0045, ao_color(PALETTE['pupil'], 0.9, 0.05), segments=8, divisions=6)
        brow_from = Vec3((s * 0.026, 0.150, 1.742 - 0.012 * face['brow_tilt']))
        brow_to = Vec3((s * 0.101, 0.148, 1.736 - 0.036 * face['brow_tilt']))
        builder.limb(brow_from, brow_to, 0.0055, 0.0038, ao_color(PALETTE['brow'], 0.6), segments=7)
    nose = Vec3((0.0, 0.168, 1.610))
    builder.blob(nose, 0.023 * face['nose'], 0.034, 0.020 * face['nose'], skin_c, segments=10, divisions=7)
    mouth_from = Vec3((-0.034 * face['mouth'], 0.140, 1.596))
    mouth_to = Vec3((0.034 * face['mouth'], 0.138, 1.594))
    builder.limb(mouth_from, mouth_to, 0.0062, 0.0062, ao_color(PALETTE['mouth'], 0.5), segments=8)
    return builder


# ---------------------------------------------------------------- hair
def build_hair_mesh(builder: MeshBuilder, hair_key: str) -> MeshBuilder:
    colors = {'hair_01': 'dark', 'hair_02': 'brown', 'hair_03': 'black', 'hair_04': 'auburn'}
    hairc = ao_color(HAIRS[colors.get(hair_key, 'dark')], 0.5)
    # blob radii order: (y-depth, z-vertical, x-width).
    # scalp shell: wraps the cranium, recedes behind the face so the
    # forehead/eyes stay clear. Emerges above the hairline only.
    builder.blob(Vec3((0.0, -0.015, 1.688)), 0.150, 0.128, 0.157, hairc, segments=16, divisions=9)
    # nape volume at the back of the head (protrudes past the cap so it
    # reads as hair mass rather than a flush patch)
    builder.blob(Vec3((0.0, -0.108, 1.636)), 0.082, 0.092, 0.112, hairc, segments=14, divisions=8)
    if hair_key == 'hair_01':
        # short crop: soft round tuft on top
        builder.blob(Vec3((0.0, 0.0, 1.774)), 0.108, 0.050, 0.125, hairc, segments=14, divisions=6)
    if hair_key == 'hair_02':
        # swept fringe across the upper forehead to one side
        builder.blob(Vec3((0.045, 0.062, 1.762)), 0.072, 0.056, 0.105, hairc, segments=14, divisions=7)
        builder.blob(Vec3((0.108, 0.086, 1.742)), 0.052, 0.048, 0.070, hairc, segments=12, divisions=7)
        # long lock hanging on the swept side
        builder.blob(Vec3((0.136, 0.020, 1.640)), 0.038, 0.062, 0.034, hairc, segments=10, divisions=7)
        builder.blob(Vec3((0.140, 0.012, 1.552)), 0.032, 0.056, 0.030, hairc, segments=10, divisions=7)
    if hair_key == 'hair_03':
        # long hair: thick fall down the back along -y
        builder.blob(Vec3((0.0, -0.118, 1.600)), 0.062, 0.098, 0.082, hairc, segments=14, divisions=8)
        builder.blob(Vec3((0.0, -0.120, 1.480)), 0.056, 0.096, 0.076, hairc, segments=12, divisions=8)
        builder.blob(Vec3((0.0, -0.104, 1.360)), 0.048, 0.082, 0.062, hairc, segments=10, divisions=7)
        builder.blob(Vec3((0.0, -0.088, 1.270)), 0.036, 0.052, 0.042, hairc, segments=8, divisions=6)
    if hair_key == 'hair_04':
        curl_spots = [
            (-0.112, -0.010, 1.786), (-0.038, -0.035, 1.820), (0.040, -0.035, 1.818),
            (0.114, -0.030, 1.774), (-0.140, -0.075, 1.716), (0.142, -0.078, 1.712),
            (-0.096, -0.008, 1.802), (0.092, -0.006, 1.800), (0.0, -0.130, 1.688),
        ]
        for (x, y, z) in curl_spots:
            builder.blob(Vec3((x, y, z)), 0.048, 0.044, 0.048, hairc, segments=10, divisions=7)
    return builder


# ---------------------------------------------------------------- accessories
def build_accessory_mesh(builder: MeshBuilder, key: str) -> MeshBuilder:
    """beard_short and glasses_round ride the head bone like the hair pieces."""
    if key == 'beard_short':
        hairc = ao_color(HAIRS['dark'], 0.45)
        # blob order here is (x half, z vertical half, y depth half)
        # one smooth shell over the lower face; the mouth stroke (front y ~0.146)
        # pokes through its y 0.141 front face so the lips stay visible
        builder.blob(Vec3((0.0, 0.070, 1.578)), 0.118, 0.056, 0.086, hairc, segments=14, divisions=9)
        # mustache under the nose (nose front y ~0.188 shades its center)
        builder.blob(Vec3((0.0, 0.130, 1.621)), 0.068, 0.015, 0.046, hairc, segments=12, divisions=7)
        # jaw chops bridging the shell up toward the ears
        for s in (-1.0, 1.0):
            builder.blob(Vec3((s * 0.105, 0.060, 1.592)), 0.048, 0.034, 0.058, hairc, segments=12, divisions=7)
            # faint sideburns in front of the ears
            builder.blob(Vec3((s * 0.128, 0.045, 1.665)), 0.022, 0.030, 0.030, hairc, segments=10, divisions=6)
    if key == 'glasses_round':
        # stylized round shades: one dark disc per eye plus temple arms and a
        # bridge. A pale lens layering proved view-dependent, so the disc is
        # deliberately opaque and reads correctly from every angle.
        rim_c = ao_color(PALETTE['rim'], 0.6)
        for s in (-1.0, 1.0):
            eye_x = s * 0.063
            builder.blob(Vec3((eye_x, 0.162, 1.662)), 0.046, 0.038, 0.026, rim_c, segments=12, divisions=7)
            # temple arms back to the ears
            builder.limb(Vec3((eye_x + s * 0.046, 0.162, 1.668)), Vec3((s * 0.148, 0.008, 1.680)), 0.0045, 0.0045, rim_c, segments=7)
        builder.limb(Vec3((-0.020, 0.164, 1.668)), Vec3((0.020, 0.164, 1.668)), 0.004, 0.004, rim_c, segments=7)
    return builder


# ---------------------------------------------------------------- outfits
def build_outfit_mesh(builder: MeshBuilder, outfit_key: str, frame_key: str = 'average') -> MeshBuilder:
    frame = BODY_FRAMES[frame_key]
    shirt = PALETTE.get(outfit_key.split('_')[1] if outfit_key.startswith('outfit_') else outfit_key, PALETTE['terracotta'])
    shirt_c = ao_color(shirt, 0.6)
    trouser = PALETTE.get(f'{outfit_key}_trouser', None) or ao_color(PALETTE['trousers'], 0.45)
    hem_y = 0.95
    sleeve_z = 1.22
    leg_style = 'short'
    trouser_color = ao_color(trouser, 0.45)
    if outfit_key == 'outfit_home':
        hem_y = 0.99
        sleeve_z = 1.28
        leg_style = 'knee'
    if outfit_key == 'outfit_sleep':
        hem_y = 0.92
        sleeve_z = 1.02
        leg_style = 'full'
    if outfit_key.startswith('outfit_') and outfit_key.split('_')[1] in ('barista', 'garden', 'delivery', 'market'):
        hem_y = 0.96
        sleeve_z = 1.22
        leg_style = 'full'
    bands = []
    for i in range(15):
        t = i / 14
        y = lerp(hem_y - 0.02, 1.51, t)
        rx, rz = torso_shape(max(0.90, y), frame)
        if y < 0.94:
            rx0, rz0 = torso_shape(0.94, frame)
            rx, rz = rx0 * lerp(0.95, 1.0, (y - hem_y + 0.06) * 6), rz0 * lerp(0.95, 1.0, (y - hem_y + 0.06) * 6)
        bands.append((Vec3((0.0, 0.0, y)), rx * 1.055, rz * 1.085))
    elliptical_shell(builder, bands, 16, shirt_c)
    # collar
    builder.blob(Vec3((0.0, 0.02, 1.502)), 0.099, 0.022, 0.062, shirt_c, segments=12, divisions=6)
    for side in SIDES:
        s = -1.0 if side == 'left' else 1.0
        if sleeve_z > 1.05:
            sleeve = []
            shw, arm_r = frame['shoulder'], frame['arm_r']
            start, target = 1.40, sleeve_z
            steps = 4
            for i in range(steps + 1):
                t = i / steps
                y = lerp(start, target, t)
                radius = lerp(0.082 * arm_r, 0.077 * arm_r, t)
                sleeve.append((Vec3((s * lerp(0.163 * shw, 0.193 * shw, t), 0.004, y)), radius, radius))
            builder.lathe(sleeve, 14, shirt_c, round_caps=False)
            builder.blob(Vec3((s * 0.193 * shw, 0.004, sleeve_z)), 0.077 * frame['arm_r'], 0.02, 0.077 * frame['arm_r'], shirt_c, segments=14, divisions=6)
        if leg_style in ('full', 'knee'):
            hipw = frame['hip']
            leg_end_z = 0.16 if leg_style == 'full' else 0.60
            for side in SIDES:
                s = -1.0 if side == 'left' else 1.0
                pants = []
                for i in range(6):
                    t = i / 5
                    y = lerp(0.92, leg_end_z, t)
                    radius = lerp(0.098, 0.084 if leg_style == 'full' else 0.092, t)
                    pants.append((Vec3((s * lerp(0.105 * hipw, 0.116, t), 0.004, y)), radius, radius))
                builder.lathe(pants, 14, trouser_color, round_caps=False)
                builder.blob(Vec3((s * 0.116, 0.004, leg_end_z)), 0.088, 0.02, 0.088, trouser_color, segments=14, divisions=6)
                if leg_style == 'full':
                    lower = []
                    for i in range(5):
                        t = i / 4
                        y = lerp(0.46, leg_end_z, t)
                        radius = lerp(0.072, 0.058, t)
                        lower.append((Vec3((s * 0.114, 0.004, y)), radius, radius))
                    builder.lathe(lower, 14, trouser_color, round_caps=False)
    kind = outfit_key.split('_')[1] if outfit_key.startswith('outfit_') else ''
    if kind == 'barista':
        # dark apron panel riding proud of the chest front with two shoulder straps
        apron_c = ao_color(PALETTE['apron'], 0.55)
        builder.blob(Vec3((0.0, 0.142, 1.16)), 0.028, 0.19, 0.150, apron_c, segments=14, divisions=8)
        builder.blob(Vec3((0.0, 0.132, 1.02)), 0.026, 0.09, 0.128, apron_c, segments=14, divisions=7)
        for s in (-1.0, 1.0):
            builder.limb(Vec3((s * 0.070, 0.118, 1.412)), Vec3((s * 0.098, 0.128, 1.336)), 0.011, 0.011, apron_c, segments=7)
    if kind == 'delivery':
        # pale hi-vis band across the chest
        builder.blob(Vec3((0.0, 0.128, 1.30)), 0.030, 0.030, 0.140, ao_color(PALETTE['stripe'], 0.8), segments=14, divisions=7)
    if kind == 'market':
        # suspenders from the waist to the shoulders
        suspender_c = ao_color(PALETTE['apron'], 0.6)
        for s in (-1.0, 1.0):
            builder.limb(Vec3((s * 0.062, 0.140, 1.30)), Vec3((s * 0.070, 0.108, 1.02)), 0.013, 0.013, suspender_c, segments=7)
    return builder


# ---------------------------------------------------------------- crowd
CROWD_SHIRTS = ['terracotta', 'blue', 'sage', 'mustard', 'sage']
CROWD_TROUSERS = [(0.28, 0.30, 0.33), (0.24, 0.27, 0.36), (0.32, 0.30, 0.28), (0.26, 0.29, 0.35), (0.30, 0.28, 0.26)]


def build_crowd_mesh(builder: MeshBuilder, index: int) -> MeshBuilder:
    shirt_c = ao_color(PALETTE[CROWD_SHIRTS[index % len(CROWD_SHIRTS)]], 0.6)
    trouser_c = ao_color(CROWD_TROUSERS[index % len(CROWD_TROUSERS)], 0.45)
    frame = BODY_FRAMES['average']
    skin_base = CROWD_SKINS[index % len(CROWD_SKINS)]
    skin = ao_color(skin_base, 0.5)
    build_pelvis(builder, 'average', trouser_c)
    build_torso(builder, 'average', shirt_c)
    build_neck(builder, skin)
    for side in SIDES:
        build_arm(builder, side, frame, skin, shirt_c, 0.62)
        build_leg(builder, side, frame, trouser_c)
    build_head_mesh(builder, 'face_01' if index != 3 else 'face_02', skin_color=skin_base)
    build_hair_mesh(builder, f'hair_0{(index % 4) + 1}')
    return builder


# ---------------------------------------------------------------- actions
def ensure_action(arm_obj: bpy.types.Object, name: str, frame_start: int = 1, frame_end: int = 24) -> bpy.types.Action:
    if arm_obj.animation_data is None:
        arm_obj.animation_data_create()
    action = bpy.data.actions.new(name)
    action.frame_start = frame_start
    action.frame_end = frame_end
    arm_obj.animation_data.action = action
    return action


def current_fcurves(arm_obj: bpy.types.Object) -> list:
    data = arm_obj.animation_data
    if not data or data.action is None:
        return []
    out = []
    for layer in data.action.layers:
        for strip in layer.strips:
            slot = data.action_slot
            if slot is None:
                continue
            bag = strip.channelbag(slot)
            if bag:
                out.extend(bag.fcurves)
    return out


def key_pose(arm_obj: bpy.types.Object, frame: int, rotations: dict[str, tuple[float, float, float]], hips_location: tuple[float, float, float] | None = None) -> None:
    for bone_name, (rx, ry, rz) in rotations.items():
        pb = arm_obj.pose.bones.get(bone_name)
        if pb is None:
            raise KeyError(f'pose bone missing: {bone_name}')
        pb.rotation_euler = (rx, ry, rz)
        pb.keyframe_insert(data_path='rotation_euler', frame=frame)
    if hips_location is not None:
        pb = arm_obj.pose.bones['hips']
        pb.location = hips_location
        pb.keyframe_insert(data_path='location', frame=frame)


def _finger_pose(value: float) -> dict[str, tuple[float, float, float]]:
    out: dict[str, tuple[float, float, float]] = {}
    for axis in ('thumb', 'finger01', 'finger02', 'finger03', 'finger04'):
        for side in ('L', 'R'):
            out[f'{axis}.{side}'] = (value, 0, 0)
    return out


def _mirror_legs(left: tuple, right: tuple, shin_l: tuple, shin_r: tuple) -> dict:
    return {'thigh.L': left, 'thigh.R': right, 'shin.L': shin_l, 'shin.R': shin_r}


def walk_frame_pose(thigh_l: float, thigh_r: float, shin_l: float, shin_r: float,
                    foot_l: float, foot_r: float, arm_l: float, arm_r: float,
                    fingers_l: float, fingers_r: float, chest: float, head: float, fore_l: float, fore_r: float, hips_y: float):
    pose = _mirror_legs((thigh_l, 0, 0), (thigh_r, 0, 0), (shin_l, 0, 0), (shin_r, 0, 0))
    pose.update({
        'foot.L': (foot_l, 0, 0), 'foot.R': (foot_r, 0, 0),
        'upper_arm.L': (arm_l, 0, 0.10), 'upper_arm.R': (arm_r, 0, -0.10),
        'forearm.L': (fore_l, 0, 0), 'forearm.R': (fore_r, 0, 0),
        'chest': (chest, 0, 0), 'head': (head, 0, 0),
    })
    pose.update({f'{axis}.{side}': ((-fingers_l if side == "R" else fingers_l, 0, 0)) for axis in ('finger01', 'finger02', 'finger03', 'finger04') for side in ('L', 'R')})
    pose.update({f'thumb.{side}': ((-fingers_l if side == "R" else fingers_l, 0, 0)) for side in ('L', 'R')})
    return pose, (0, hips_y, 0)


# (frame -> (pose, hips_location)) — build the cycle once, share it with previews.
def _walk_keyframes() -> dict[int, tuple[dict, tuple]]:
    return {
        1: walk_frame_pose(0.44, -0.42, 0.10, -0.95, -0.06, 0.42, -0.42, 0.36, 0.15, -0.5, 0.04, 0.02, -0.24, -0.16, -0.028),
        7: walk_frame_pose(-0.12, 0.08, -0.10, -0.30, 0.24, 0.14, -0.20, -0.08, -0.25, 0.05, 0.05, 0.02, -0.22, -0.16, 0.006),
        13: walk_frame_pose(-0.42, 0.44, -0.95, 0.10, 0.42, -0.06, 0.36, -0.42, -0.6, 0.1, 0.04, 0.02, -0.16, -0.24, -0.028),
        19: walk_frame_pose(0.08, -0.12, -0.30, -0.10, 0.14, 0.24, -0.08, -0.20, 0.05, -0.25, 0.05, 0.02, -0.16, -0.22, 0.006),
        25: walk_frame_pose(0.44, -0.42, 0.10, -0.95, -0.06, 0.42, -0.42, 0.36, 0.15, -0.5, 0.04, 0.02, -0.24, -0.16, -0.028),
    }


def _jog_keyframes() -> dict[int, tuple[dict, tuple]]:
    def jog_frame(thigh_l, thigh_r, shin_l, shin_r, foot_l, foot_r, arm_l, arm_r,
                  fore_l, fore_r, fingers_l, fingers_r, bounce_y):
        pose = _mirror_legs((thigh_l, 0, 0), (thigh_r, 0, 0), (shin_l, 0, 0), (shin_r, 0, 0))
        pose.update({
            'foot.L': (foot_l, 0, 0), 'foot.R': (foot_r, 0, 0),
            'upper_arm.L': (arm_l, 0, 0.18), 'upper_arm.R': (arm_r, 0, -0.18),
            'forearm.L': (fore_l, 0, 0), 'forearm.R': (fore_r, 0, 0),
            'chest': (0.165, 0, 0), 'head': (-0.055, 0, 0),
        })
        pose.update({f'{axis}.{side}': ((-fingers_l if side == 'R' else fingers_l, 0, 0)) for axis in ('finger01', 'finger02', 'finger03', 'finger04', 'thumb') for side in ('L', 'R')})
        return pose, (bounce_y, 0, 0)
    return {
        1: jog_frame(0.62, -0.48, 0.10, -1.30, -0.10, 0.52, -0.62, 0.52, -0.56, -0.44, 0.3, -0.6, 0.04),
        5: jog_frame(-0.16, 0.12, -0.26, -0.58, 0.36, 0.20, -0.22, -0.12, -0.54, -0.44, -0.35, 0.1, -0.03),
        9: jog_frame(-0.48, 0.62, -1.30, 0.10, 0.52, -0.10, 0.52, -0.62, -0.44, -0.56, -0.6, 0.3, 0.04),
        13: jog_frame(0.12, -0.16, -0.58, -0.26, 0.20, 0.36, -0.12, -0.22, -0.44, -0.54, 0.1, -0.35, -0.03),
        17: jog_frame(0.62, -0.48, 0.10, -1.30, -0.10, 0.52, -0.62, 0.52, -0.56, -0.44, 0.3, -0.6, 0.04),
    }


def _idle_keyframes() -> dict[int, dict]:
    fingers = _finger_pose(0.10)
    return {
        1: {**fingers, 'chest': (0.02, 0, 0), 'head': (0.0, 0.04, 0), 'upper_arm.L': (0.02, 0, 0.10), 'upper_arm.R': (0.0, 0, -0.10),
            'forearm.L': (-0.06, 0, 0), 'forearm.R': (-0.06, 0, 0), 'spine': (0.01, 0, 0)},
        16: {**_finger_pose(0.16), 'chest': (0.05, 0.02, 0), 'head': (0.01, -0.05, 0.03), 'upper_arm.L': (0.04, 0, 0.14), 'upper_arm.R': (0.02, 0, -0.14),
             'forearm.L': (-0.10, 0, 0), 'forearm.R': (-0.10, 0, 0), 'spine': (0.025, 0, 0)},
        31: {**fingers, 'chest': (0.02, 0, 0), 'head': (0.0, 0.04, -0.02), 'upper_arm.L': (0.02, 0, 0.10), 'upper_arm.R': (0.0, 0, -0.10),
             'forearm.L': (-0.06, 0, 0), 'forearm.R': (-0.06, 0, 0), 'spine': (0.01, 0, 0)},
        46: {**fingers, 'chest': (0.06, -0.02, 0), 'head': (-0.01, 0.02, 0.0), 'upper_arm.L': (0.03, 0, 0.13), 'upper_arm.R': (0.01, 0, -0.13),
             'forearm.L': (-0.08, 0, 0), 'forearm.R': (-0.08, 0, 0), 'spine': (0.02, 0, 0)},
        61: {**fingers, 'chest': (0.02, 0, 0), 'head': (0.0, 0.04, 0), 'upper_arm.L': (0.02, 0, 0.10), 'upper_arm.R': (0.0, 0, -0.10),
             'forearm.L': (-0.06, 0, 0), 'forearm.R': (-0.06, 0, 0), 'spine': (0.01, 0, 0)},
    }


def sit_pose() -> tuple[dict, tuple]:
    pose = _mirror_legs((1.25, 0, 0.02), (1.25, 0, -0.02), (-1.32, 0, 0), (-1.32, 0, 0))
    pose.update({
        'foot.L': (-0.15, 0, 0), 'foot.R': (-0.15, 0, 0),
        'upper_arm.L': (0.38, 0, 0.16), 'upper_arm.R': (0.38, 0, -0.16),
        'forearm.L': (-0.62, 0, -0.08), 'forearm.R': (-0.62, 0, 0.08),
        'hand.L': (0.1, 0, 0), 'hand.R': (0.1, 0, 0),
        'chest': (0.16, 0, 0), 'head': (-0.08, 0, 0),
    })
    pose.update(_finger_pose(0.24))
    return pose, (0, -0.40, 0.02)


def make_walk_action(arm_obj: bpy.types.Object) -> None:
    ensure_action(arm_obj, 'walk', 1, 25)
    for frame, (pose, hips_location) in _walk_keyframes().items():
        key_pose(arm_obj, frame, pose, hips_location=hips_location)


def make_jog_action(arm_obj: bpy.types.Object) -> None:
    ensure_action(arm_obj, 'jog', 1, 17)
    for frame, (pose, hips_location) in _jog_keyframes().items():
        key_pose(arm_obj, frame, pose, hips_location=hips_location)


def make_idle_action(arm_obj: bpy.types.Object) -> None:
    ensure_action(arm_obj, 'idle', 1, 61)
    for frame, pose in _idle_keyframes().items():
        key_pose(arm_obj, frame, pose)


def make_sit_action(arm_obj: bpy.types.Object) -> None:
    ensure_action(arm_obj, 'sit', 1, 2)
    pose, hips_location = sit_pose()
    key_pose(arm_obj, 1, pose, hips_location=hips_location)
    key_pose(arm_obj, 2, pose, hips_location=hips_location)


def apply_pose(pose: dict[str, tuple[float, float, float]], hips_location: tuple[float, float, float] | None) -> None:
    arm_obj = bpy.data.objects[RIG_ROOT]
    for pb in arm_obj.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    for name, values in pose.items():
        arm_obj.pose.bones[name].rotation_euler = values
    if hips_location:
        arm_obj.pose.bones['hips'].location = hips_location


def reset_pose(arm_obj: bpy.types.Object) -> None:
    for pb in arm_obj.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    if arm_obj.animation_data:
        arm_obj.animation_data.action = None


# ---------------------------------------------------------------- scene + export
def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block_list in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for block in list(block_list):
            if block.users == 0:
                block_list.remove(block)


def ensure_gltf_addon() -> None:
    if 'io_scene_gltf2' not in bpy.context.preferences.addons:
        bpy.ops.preferences.addon_enable(module='io_scene_gltf2')


def export_glb(objs: list[bpy.types.Object], path: str, with_clips: bool) -> None:
    ensure_gltf_addon()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kwargs = dict(
        filepath=path,
        export_format='GLB',
        export_yup=True,
        export_apply=False,
        export_skins=True,
        export_morph=False,
        export_tangents=False,
        export_materials='EXPORT',
        export_animations=with_clips,
        export_animation_mode='ACTIONS' if with_clips else 'SCENE',
        export_optimize_animation_size=False,
        export_def_bones=False,
        export_anim_single_armature=True,
        export_action_filter=False,
    )
    bpy.ops.export_scene.gltf(**kwargs)


def validate_glb(path: str) -> dict:
    try:
        with open(path, 'rb') as handle:
            header = handle.read(12)
            magic, version, length = struct.unpack('<III', header)
            if magic != 0x46546C67:
                return {'ok': False, 'error': 'not a GLB (bad magic)'}
            chunk_len = struct.unpack('<I', handle.read(4))[0]
            if struct.unpack('<I', handle.read(4))[0] != 0x4E4F534A:
                return {'ok': False, 'error': 'missing JSON chunk'}
            json_str = handle.read(chunk_len).decode('utf-8')
            data = json.loads(json_str)
            return {
                'ok': True,
                'size': os.path.getsize(path),
                'animations': [anim.get('name') for anim in data.get('animations', [])],
                'meshes': len(data.get('meshes', [])),
                'nodes': len(data.get('nodes', [])),
                'armature_count': sum(1 for node in data.get('nodes', []) if node.get('name') == RIG_ROOT),
            }
    except Exception as error:  # pragma: no cover
        return {'ok': False, 'error': str(error)}


def read_glb_triangles(path: str) -> int:
    with open(path, 'rb') as handle:
        handle.read(12)
        chunk_len = struct.unpack('<I', handle.read(4))[0]
        handle.read(4)
        data = json.loads(handle.read(chunk_len).decode('utf-8'))
    total = 0
    for accessor_index in [prim.get('indices') for mesh in data.get('meshes', []) for prim in mesh.get('primitives', [])]:
        if accessor_index is not None:
            accessors = data.get('accessors', [])
            if accessor_index < len(accessors):
                total += accessors[accessor_index].get('count', 0) // 3
    return total


def write_source(path: str, asset_id: str, clip_names: list[str]) -> None:
    body = f"""# {asset_id}.glb

- **Author:** generated by `tools/blender/build_character.py` (scripted bpy, no external assets)
- **Tools:** Blender 5.2 LTS, glTF 2.0 exporter
- **Licence:** project-owned (Together / Amaya Bay)
- **Rig:** shared humanoid skeleton (hips/spine/chest/neck/head, shoulder/upper_arm/forearm/hand +
  thumb + finger01..04, thigh/shin/foot per side, '.L'/'.R'), plus clip meshes for "body" pieces
- **Clips:** {', '.join(clip_names) if clip_names else 'none (static skinned mesh for the shared rig)'}
- **Materials:** single vertex-colour material (COLOR_0 'Col'); painted anime palette baked as vertex colours
- **Rebuild:** blender --background --factory-startup --python tools/blender/build_character.py -- --out client/public/assets/models/characters
"""
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(body)


# ---------------------------------------------------------------- preview render
def pick_render_engine(scene) -> None:
    engines = [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    for candidate in engines:
        if 'EEVEE' in candidate:
            scene.render.engine = candidate
            return
    scene.render.engine = engines[0]


def setup_preview_scene() -> None:
    import bmesh
    scene = bpy.context.scene
    pick_render_engine(scene)
    world = bpy.data.worlds.new('preview-world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.71, 0.66, 1.0)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(58), 0, math.radians(300))
    scene.collection.objects.link(sun)
    ground = bpy.data.meshes.new('ground')
    ground_bm = bmesh.new()
    bmesh.ops.create_grid(ground_bm, x_segments=1, y_segments=1, size=1.4)
    ground_bm.to_mesh(ground)
    ground_bm.free()
    plane = bpy.data.objects.new('ground', ground)
    scene.collection.objects.link(plane)
    plane.data.materials.append(make_material())
    camera = bpy.data.objects.new('preview-camera', bpy.data.cameras.new('preview-camera'))
    scene.collection.objects.link(camera)
    camera.location = (0.95, 2.05, 1.35)
    camera.data.lens = 50
    target = bpy.data.objects.new('preview-target', None)
    target.location = (0.0, 0.0, 1.0)
    scene.collection.objects.link(target)
    track = camera.constraints.new('TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'
    scene.camera = camera
    scene.render.resolution_x = 420
    scene.render.resolution_y = 760


PREVIEW_POSES = {
    'walk': _walk_keyframes()[1],
    'jog': _jog_keyframes()[1],
    'sit': sit_pose(),
}


def clear_bones(arm_obj: bpy.types.Object) -> None:
    for pb in arm_obj.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)


def render_preview(asset_id: str) -> None:
    """Front rest + walk/jog/sit stride views for rig sanity (never committed).

    Poses are applied directly from the shared keyframe tables rather than
    relying on fcurve evaluation, which is unreliable for rendering in
    background mode.
    """
    preview_dir = os.environ.get('AMAYA_PREVIEW_DIR', '.art-review/rig-preview')
    os.makedirs(preview_dir, exist_ok=True)
    arm_obj = bpy.data.objects.get(RIG_ROOT)
    if arm_obj is None or bpy.context.scene.camera is None:
        return
    scene = bpy.context.scene
    for label, pose_data in (('rest', None), *PREVIEW_POSES.items()):
        scene.render.filepath = os.path.join(preview_dir, f'{asset_id}_{label}.png')
        if pose_data is None:
            clear_bones(arm_obj)
        else:
            pose, hips_location = pose_data
            apply_pose(pose, hips_location)
        bpy.context.view_layer.update()
        bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------- main build
OUT_ID_ORDER = (
    'body_average', 'body_slim', 'body_broad',
    'face_01', 'face_02', 'face_03',
    'hair_01', 'hair_02', 'hair_03', 'hair_04',
    'beard_short', 'glasses_round',
    'outfit_terracotta', 'outfit_blue', 'outfit_sage', 'outfit_mustard',
    'outfit_home', 'outfit_sleep',
    'outfit_barista', 'outfit_garden', 'outfit_delivery', 'outfit_market',
    'crowd_01', 'crowd_02', 'crowd_03', 'crowd_04', 'crowd_05',
)
CLIP_NAMES = ('idle', 'walk', 'jog', 'sit')


def build_single_asset(asset_id: str, out_dir: str, with_clips: bool, do_preview: bool) -> None:
    clear_scene()
    arm_obj = build_armature_object()
    builder = MeshBuilder(asset_id)
    if asset_id.startswith('body_'):
        build_body_mesh(builder, asset_id.replace('body_', ''))
    elif asset_id.startswith('face_'):
        build_head_mesh(builder, asset_id)
    elif asset_id.startswith('hair_'):
        build_hair_mesh(builder, asset_id)
    elif asset_id in ('beard_short', 'glasses_round'):
        build_accessory_mesh(builder, asset_id)
    elif asset_id.startswith('outfit_'):
        build_outfit_mesh(builder, asset_id, frame_key='broad' if False else 'average')
    elif asset_id.startswith('crowd_'):
        build_crowd_mesh(builder, int(asset_id.replace('crowd_', '')) - 1)
    else:
        raise ValueError(f'unknown asset id {asset_id}')
    mesh_obj = finish_mesh(builder, asset_id + '-mesh')
    make_material()
    mesh_obj.data.materials.append(bpy.data.materials['amaya-vertex-color'])
    assign_weights(mesh_obj, arm_obj)
    if with_clips:
        make_idle_action(arm_obj)
        make_walk_action(arm_obj)
        make_jog_action(arm_obj)
        make_sit_action(arm_obj)
        reset_pose(arm_obj)
    export_glb([arm_obj, mesh_obj], os.path.join(out_dir, asset_id + '.glb'), with_clips)
    if with_clips:
        report = validate_glb(os.path.join(out_dir, asset_id + '.glb'))
        print(f'GLB_REPORT {asset_id}: {report}')
    write_source(os.path.join(out_dir, asset_id + '.source.md'), asset_id, CLIP_NAMES if with_clips else [])
    if do_preview:
        setup_preview_scene()
        render_preview(asset_id)
    clear_scene()


def main() -> None:
    parser = argparse.ArgumentParser(description='Together Amaya Bay character build')
    parser.add_argument('--out', default='client/public/assets/models/characters')
    parser.add_argument('--only', default=None, help='comma-separated subset of ids to rebuild')
    parser.add_argument('--no-preview', action='store_true')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = parser.parse_args(argv)
    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)
    ids = OUT_ID_ORDER if args.only is None else [i.strip() for i in args.only.split(',')]
    for asset_id in ids:
        with_clips = asset_id.startswith('body_') or asset_id.startswith('crowd_')
        preview = (not args.no_preview) and asset_id in ('body_average', 'crowd_01')
        build_single_asset(asset_id, out_dir, with_clips, preview)
    print('BUILD_OK', len(ids))


if __name__ == '__main__':
    main()
