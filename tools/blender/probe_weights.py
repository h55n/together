import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_character as bc

bc.clear_scene()
arm = bc.build_armature_object()
builder = bc.MeshBuilder('probe')
bc.build_body_mesh(builder, 'average')
mesh = bc.finish_mesh(builder, 'probe')
bc.assign_weights(mesh, arm)

groups = {}
for vg in mesh.vertex_groups:
    groups[vg.index] = vg.name
tally = {name: 0 for name in groups.values()}
none_count = 0
for v in mesh.data.vertices:
    best, best_w = None, 0.0
    total = 0.0
    for g in v.groups:
        w = g.weight
        total += w
        if w > best_w:
            best_w, best = w, groups[g.group]
    if best is None or total < 0.15:
        none_count += 1
    else:
        tally[best] += 1

print('VGROUP_NAMES', sorted(groups.values()))
print('DOMINANT', {k: v for k, v in sorted(tally.items(), key=lambda kv: -kv[1]) if v})
print('UNWEIGHTED_OR_SPREAD_OUS', none_count)

arm_obj = arm
for name in ('hips', 'thigh.L', 'shin.L', 'upper_arm.L', 'hand.L', 'root'):
    pb = arm_obj.pose.bones.get(name)
    if pb is None:
        print('BONE_MISSING', name)
        continue
    bb = pb.bone
    print('BONE', name, 'head', tuple(round(x, 3) for x in bb.head_local), 'tail', tuple(round(x, 3) for x in bb.tail_local))
