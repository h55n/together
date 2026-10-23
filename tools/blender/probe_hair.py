import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_character as bc

bc.clear_scene()
arm = bc.build_armature_object()
bc.setup_preview_scene()
scene = bpy.context.scene
camera = bpy.data.objects['preview-camera']
target = bpy.data.objects['preview-target']
preview_dir = bc.os.environ.get('AMAYA_PREVIEW_DIR', '.art-review/rig-preview')
for idx in (1, 2, 3, 4):
    bc.clear_scene()
    arm = bc.build_armature_object()
    builder = bc.MeshBuilder('probe')
    bc.build_head_mesh(builder, 'face_01', skin_color=bc.CROWD_SKINS[0])
    bc.build_hair_mesh(builder, f'hair_0{idx}')
    mesh = bc.finish_mesh(builder, 'probe')
    bc.make_material()
    mesh.data.materials.append(bpy.data.materials['amaya-vertex-color'])
    bc.assign_weights(mesh, arm)
    bc.setup_preview_scene()
    camera = bpy.data.objects['preview-camera']
    target = bpy.data.objects['preview-target']
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    for name, cam_loc in (('front', (0.05, 1.7, 1.62)), ('back', (-0.05, -1.7, 1.62))):
        camera.location = cam_loc
        camera.data.lens = 60
        target.location = (0, 0, 1.62)
        dg = bpy.context.evaluated_depsgraph_get()
        dg.update()
        scene.render.filepath = f'{preview_dir}\\contrast_h0{idx}_{name}.png'
        bpy.ops.render.render(write_still=True)
print('HEAD_PROBE_DONE')
