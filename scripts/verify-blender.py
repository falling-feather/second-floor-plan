import bpy,json,math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
file=root/'output/design/community-reading-room.blend'
data=json.loads((root/'output/design/design-data.json').read_text(encoding='utf-8'))
bpy.ops.wm.open_mainfile(filepath=str(file))
for name,power in [('North sky fill',500),('West sky fill',350)]:
    if abs(bpy.data.lights[name].energy-power)>1e-6:raise ValueError('Unexpected saved daylight '+name)
if bpy.context.scene.unit_settings.system!='METRIC' or abs(bpy.context.scene.unit_settings.scale_length-1)>1e-8:raise ValueError('Scene units must be metres')
bpy.context.view_layer.update()
groups={o['component']:o for o in bpy.data.collections['01_Full_space'].objects if 'component' in o}
if set(groups)!=set(c['id'] for c in data['schemes']['proposed']['components']):raise ValueError('Component set differs from exported data')
checked=0
for c in data['schemes']['proposed']['components']:
    obj=groups[c['id']]
    verts=[mesh.matrix_world@Vector(p) for mesh in obj.children_recursive if mesh.type=='MESH' for p in mesh.bound_box]
    if not verts:raise ValueError('Empty component '+c['id'])
    low=[min(v[i] for v in verts) for i in range(3)];high=[max(v[i] for v in verts) for i in range(3)]
    expected_low=[c['x']/1000,-(c['y']+c['h'])/1000,c['base']/1000]
    expected_high=[(c['x']+c['w'])/1000,-c['y']/1000,(c['base']+c['height'])/1000]
    if any(a<b-1e-5 for a,b in zip(low,expected_low)) or any(a>b+1e-5 for a,b in zip(high,expected_high)):
        raise ValueError('Geometry outside envelope '+c['id']+' '+str((low,high,expected_low,expected_high)))
    checked+=1
camera_checks=0
for living in data['living']['scenes']:
    source=living['camera'];camera=bpy.data.objects['Camera_'+living['id']]
    def point(value):return Vector((value[0],-value[2],value[1]))
    if (camera.location-point(source['position'])).length>1e-6:raise ValueError('Camera position differs '+living['id'])
    expected=(point(source['target'])-camera.location).normalized()
    actual=camera.rotation_euler.to_quaternion()@Vector((0,0,-1))
    if (actual-expected).length>1e-5:raise ValueError('Camera direction differs '+living['id'])
    aspect=1600/source.get('renderHeight',1067)
    if source['kind']=='orthographic':
        if camera.data.type!='ORTHO' or abs(camera.data.ortho_scale-max(source['verticalSpan']*aspect,source['minHorizontalSpan']))>1e-5:raise ValueError('Camera span differs '+living['id'])
    elif abs(camera.data.lens-(36/aspect)/(2*math.tan(math.radians(source['fov'])/2)))>1e-5:raise ValueError('Camera lens differs '+living['id'])
    camera_checks+=1
fixture_checks=0
for key,parts in data['fixtureParts'].items():
    part=next(p for p in parts if p['role']=='diffuser');light=bpy.data.objects[key+' warm fixture']
    expected=Vector(((part['x']+part['w']/2)/1000,-(part['y']+part['h']/2)/1000,(part['base']-2)/1000))
    if (light.location-expected).length>1e-6:raise ValueError('Light emission plane differs '+key)
    fixture_checks+=1
print('SCENE_CHECK '+json.dumps({'blender':bpy.app.version_string,'components_checked':checked,'collections':len(bpy.data.collections),'cameras':sum(o.type=='CAMERA' for o in bpy.data.objects),'living_cameras_checked':camera_checks,'fixture_centres_checked':fixture_checks,'saved_daylight_checked':True,'metric_units_checked':True}),flush=True)
