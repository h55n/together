import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_character as bc

bc.clear_scene()
bc.setup_preview_scene()
scene = bpy.context.scene
preview_dir = bc.os.environ.get('AMAYA_PREVIEW_DIR', '.art-review/rig-preview')
for hair in (True, False):
    for beard in (True, False):
        for glasses in (True, False):
            if not hair and not beard and not glasses:
                continue
            bc.clear_scene()
            arm = bc.build_armature_object()
            builder = bc.MeshBuilder('probe')
            bc.build_head_mesh(builder, 'face_01', skin_color=bc.CROWD_SKINS[0])
            if hair:
                bc.build_hair_mesh(builder, 'hair_01')
            if beard:
                bc.build_accessory_mesh(builder, 'beard_short')
            if glasses:
                bc.build_accessory_mesh(builder, 'glasses_round')
            mesh = bc.finish_mesh(builder, 'probe')
            bc.make_material()
            mesh.data.materials.append(bpy.data.materials['amaya-vertex-color'])
            bc.assign_weights(mesh, arm)
            bc.setup_preview_scene()
            camera = bpy.data.objects['preview-camera']
            target = bpy.data.objects['preview-target']
            dg = bpy.context.evaluated_depsgraph_get()
            dg.update()
            name = ''.join(part or '-' for part in ('face', 'hair' if hair else '', 'beard' if beard else '', 'glasses' if glasses else ''))
            name = f'probe_{name.replace("--", "-").replace("--", "-")}'
            for view, cam_loc in (('front', (0.05, 1.7, 1.62)), ('quarter', (0.85, 1.05, 1.62))):
                camera.location = cam_loc
                camera.data.lens = 60
                target.location = (0, 0, 1.62)
                dg = bpy.context.evaluated_depsgraph_get()
                dg.update()
                scene.render.filepath = f'{preview_dir}\\{name}_{view}.png'
                bpy.ops.render.render(write_still=True)
print('ACCESSORY_PROBE_DONE')
