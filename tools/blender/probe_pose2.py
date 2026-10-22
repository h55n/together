import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_character as bc


def leg_world_y(arm_obj: bpy.types.Object, mesh_obj: bpy.types.Object, tag: str) -> None:
    dg = bpy.context.evaluated_depsgraph_get()
    ev = mesh_obj.evaluated_get(dg)
    m = ev.to_mesh()
    mw = ev.matrix_world
    best = None
    for i, v in enumerate(m.vertices):
        w = mw @ v.co
        if w.length < 0.2 and w.z < 0.45:
            if best is None or w.y > best[2]:
                best = (i, w.x, w.y, w.z)
    print(tag, 'front-most low vertex:', best)
    ev.to_mesh_clear()


bc.clear_scene()
arm = bc.build_armature_object()
builder = bc.MeshBuilder('probe')
bc.build_body_mesh(builder, 'average')
mesh = bc.finish_mesh(builder, 'probe')
mesh.data.materials.append(bc.make_material())
bc.assign_weights(mesh, arm)

sit, hips_loc = bc.sit_pose()
bc.apply_pose(sit, hips_loc)
dg = bpy.context.evaluated_depsgraph_get()
dg.update()
leg_world_y(arm, mesh, 'POSED')

bc.clear_bones(arm)
dg = bpy.context.evaluated_depsgraph_get()
dg.update()
leg_world_y(arm, mesh, 'REST')

pb = arm.pose.bones['thigh.L']
print('thigh.L rest euler', tuple(pb.rotation_euler))

bc.setup_preview_scene()
scene = bpy.context.scene
camera = bpy.data.objects['preview-camera']
sit, hips_loc = bc.sit_pose()
walk = bc._walk_keyframes()[1]
bc.apply_pose(sit, hips_loc)
dg = bpy.context.evaluated_depsgraph_get()
dg.update()
leg_world_y(arm, mesh, 'POSED2')
camera.location = (2.6, 0.35, 0.95)
target = bpy.data.objects['preview-target']
target.location = (0.0, 0.0, 0.9)
camera.data.lens = 40
scene.render.resolution_x = 640
scene.render.resolution_y = 900
dg = bpy.context.evaluated_depsgraph_get()
dg.update()
scene.render.filepath = os.path.join(os.environ.get('AMAYA_PREVIEW_DIR', '.art-review/rig-preview'), 'probe_sit_side.png')
bpy.ops.render.render(write_still=True)

bc.apply_pose(walk[0], walk[1])
dg = bpy.context.evaluated_depsgraph_get()
dg.update()
scene.render.filepath = os.path.join(os.environ.get('AMAYA_PREVIEW_DIR', '.art-review/rig-preview'), 'probe_walk_side.png')
bpy.ops.render.render(write_still=True)

