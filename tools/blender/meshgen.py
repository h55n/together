# Procedural mesh primitives for build_character.py (Blender 5.x bpy).
# 1 Blender unit = 1 metre; +Z up (the glTF exporter converts to Y-up).
from __future__ import annotations

import math

from mathutils import Vector

Vec3 = Vector


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


class MeshBuilder:
    """Accumulates triangles with per-vertex colours into one mesh."""

    def __init__(self, name: str):
        self.name = name
        self.verts: list[tuple[float, float, float]] = []
        self.colors: list[tuple[float, float, float, float]] = []
        self.tris: list[tuple[int, int, int]] = []

    def vertex(self, p: Vec3, color) -> int:
        self.verts.append((p.x, p.y, p.z))
        self.colors.append((color[0], color[1], color[2], 1.0))
        return len(self.verts) - 1

    def triangle(self, a: int, b: int, c: int) -> None:
        self.tris.append((a, b, c))

    @staticmethod
    def _basis(axis: Vec3) -> tuple[Vec3, Vec3]:
        axis = axis.normalized()
        helper = Vec3((0, 0, 1)) if abs(axis.y) >= 0.9 else Vec3((1, 0, 0))
        u = axis.cross(helper).normalized()
        v = axis.cross(u).normalized()
        return u, v

    def ring(self, center: Vec3, axis: Vec3, rx: float, ry: float, segments: int, color) -> list[int]:
        u, v = self._basis(axis)
        out = []
        for i in range(segments):
            angle = (i / segments) * math.tau
            offset = u * (math.cos(angle) * rx) + v * (math.sin(angle) * ry)
            out.append(self.vertex(center + offset, color))
        return out

    def _stitch(self, ring_a, ring_b) -> None:
        if ring_a is None or ring_b is None:
            return
        for i in range(len(ring_a)):
            j = (i + 1) % len(ring_a)
            a0, a1 = ring_a[i], ring_a[j]
            b0, b1 = ring_b[i], ring_b[j]
            self.triangle(a0, b0, b1)
            self.triangle(a0, b1, a1)

    def _fan(self, pole: int, ring: list[int], flip: bool) -> None:
        for i in range(len(ring)):
            j = (i + 1) % len(ring)
            if flip:
                self.triangle(pole, ring[j], ring[i])
            else:
                self.triangle(pole, ring[i], ring[j])

    @staticmethod
    def _axis_of(profile: list[tuple[Vec3, float]]) -> Vec3:
        axis = profile[-1][0] - profile[0][0]
        return axis if axis.length > 1e-6 else Vec3((0, 0, 1))

    def lathe(
        self,
        profile: list[tuple[Vec3, float]],
        segments: int,
        color,
        flat_x: float = 1.0,
        flat_y: float = 1.0,
        round_caps: bool = True,
        cap_bands: int = 2,
    ) -> None:
        """Lathe (center, radius) bands with elliptical cross-section and optional rounded caps."""
        if not profile:
            return
        color = tuple(color)
        bands = list(profile)
        if round_caps and len(bands) >= 2:
            c0, r0 = bands[0][0], bands[0][1]
            c1 = bands[1][0]
            back = c0 - c1
            back = back.normalized() if back.length > 1e-6 else Vec3((0, 0, -1))
            pre = []
            for i in range(1, cap_bands + 1):
                t = i / (cap_bands + 1)
                angle = t * math.pi / 2
                pre.append((c0 + back * (math.sin(angle) * r0), math.cos(angle) * r0))
            cn, rn = bands[-1][0], bands[-1][1]
            cp = bands[-2][0]
            fwd = cn - cp
            fwd = fwd.normalized() if fwd.length > 1e-6 else Vec3((0, 0, 1))
            post = []
            for i in range(cap_bands, 0, -1):
                t = i / (cap_bands + 1)
                angle = t * math.pi / 2
                post.append((cn + fwd * (math.sin(angle) * rn), math.cos(angle) * rn))
            bands = pre + bands + post
        axis = self._axis_of(bands)
        prev_ring = None
        for entry in bands:
            center, radius = entry[0], entry[1]
            if radius <= 2e-4:
                pole = self.vertex(center, color)
                if prev_ring is not None:
                    self._fan(pole, prev_ring, flip=True)
                prev_ring = None
            else:
                current = self.ring(center, axis, radius * flat_x, radius * flat_y, segments, color)
                self._stitch(prev_ring, current)
                prev_ring = current

    def limb(self, p0: Vec3, p1: Vec3, r0: float, r1: float, color, segments: int = 12, flat_x: float = 1.0, flat_y: float = 1.0, bulge: float = 0.0) -> None:
        """Rounded limb tube from p0 to p1 with optional mid-section bulge."""
        if (p1 - p0).length <= 1e-5:
            return
        steps = 4
        bands = []
        for i in range(steps + 1):
            t = i / steps
            radius = lerp(r0, r1, t) * (1.0 + bulge * math.sin(t * math.pi))
            bands.append((p0 + (p1 - p0) * t, max(2e-4, radius)))
        self.lathe(bands, segments, color, flat_x=flat_x, flat_y=flat_y, round_caps=True)

    def blob(self, center: Vec3, rx: float, ry: float, rz: float, color, segments: int = 14, divisions: int = 10) -> None:
        """Ellipsoid with horizontal rings from -ry to +ry."""
        axis = Vec3((0, 0, 1))
        prev_ring = None
        for i in range(divisions + 1):
            t = i / divisions
            angle = math.pi * t
            s = max(math.sin(angle), 2.1e-4)
            z = center.z - math.cos(angle) * ry
            current = self.ring(Vec3((center.x, center.y, z)), axis, rx * s, rz * s, segments, color)
            self._stitch(prev_ring, current)
            prev_ring = current
        if prev_ring is not None:
            self._fan(self.vertex(Vec3((center.x, center.y, center.z + ry)), color), prev_ring, flip=False)
