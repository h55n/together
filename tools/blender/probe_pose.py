import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_character as bc

arm = bc.build_armature_object()
bc.build_body_mesh(bc.MeshBuilder('probe'), 'average')
mesh = bc.finish_mesh([], 'm') if False else None
bc.make_walk_action(arm)
print('ACTION', arm.animation_data.action.name if arm.animation_data.action else None, 'SLOT', arm.animation_data.action_slot.identifier if arm.animation_data.action_slot else None)
fcurves = bc.current_fcurves(arm)
print('FCOUNT', len(fcurves))
scene = bpy.context.scene
scene.frame_set(7)
bpy.context.view_layer.update()
for name in ('thigh.L', 'thigh.R', 'upper_arm.L', 'shin.R'):
    pb = arm.pose.bones[name]
    print(name, 'euler', tuple(round(v, 3) for v in pb.rotation_euler), 'offset', tuple(round(v, 3) for v in pb.location))
