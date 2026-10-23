"""Render the exported design geometry in Blender, with editable scene setup.

Run with Blender --background --factory-startup --python scripts/render-design.py
-- --draft --view overview. No changes to an already open Blender document.
"""
from pathlib import Path
import sys,math,json,argparse
import bpy
from mathutils import Vector,Matrix

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'output'/'design'
DATA=json.loads((OUT/'design-data.json').read_text(encoding='utf-8'))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser();parser.add_argument('--draft',action='store_true');parser.add_argument('--view',default='overview');parser.add_argument('--save',action='store_true');parser.add_argument('--no-render',action='store_true')
ARGS=parser.parse_args(args)
RENDERS=(ROOT/'.cache'/'blender-preview') if ARGS.draft else OUT/'renders'
RENDERS.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE=bpy.context.scene
SCENE.unit_settings.system='METRIC';SCENE.unit_settings.scale_length=1.0
SCENE.render.engine='CYCLES';SCENE.cycles.device='CPU';SCENE.cycles.samples=16 if ARGS.draft else 48
SCENE.cycles.use_adaptive_sampling=True;SCENE.cycles.adaptive_threshold=.025
SCENE.cycles.use_denoising=True;SCENE.cycles.max_bounces=8;SCENE.cycles.transmission_bounces=8
SCENE.render.threads_mode='FIXED';SCENE.render.threads=4
SCENE.render.resolution_x=900 if ARGS.draft else 1600;SCENE.render.resolution_y=600 if ARGS.draft else 1067;SCENE.render.resolution_percentage=100
SCENE.render.image_settings.file_format='PNG';SCENE.render.film_transparent=False
SCENE.view_settings.view_transform='AgX';SCENE.view_settings.look='AgX - Medium High Contrast';SCENE.view_settings.exposure=.35
bpy.context.preferences.filepaths.save_version=0

def imported_collection(name,filename):
    collection=bpy.data.collections.new(name);SCENE.collection.children.link(collection)
    prior=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT/filename))
    for obj in set(bpy.data.objects)-prior:
        for old in list(obj.users_collection):old.objects.unlink(obj)
        collection.objects.link(obj)
    return collection

FULL=imported_collection('01_Full_space','community-reading-room.glb')
CUT=imported_collection('02_Section_model','community-reading-room-cutaway.glb')
GATHER=imported_collection('03_Gathering_model','community-reading-room-gathering.glb')

# Imported materials retain the names assigned by the authoritative model factory.
for material in bpy.data.materials:
    if not material.use_nodes:continue
    nodes=material.node_tree.nodes;links=material.node_tree.links
    shader=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if shader is None:continue
    if material.name.startswith('Glazing'):
        shader.inputs['Base Color'].default_value=(.91,.96,.93,1)
        shader.inputs['Alpha'].default_value=1
        shader.inputs['Transmission Weight'].default_value=1
        shader.inputs['Roughness'].default_value=.055
        shader.inputs['IOR'].default_value=1.45
    elif material.name.startswith('Mirror'):
        shader.inputs['Metallic'].default_value=1;shader.inputs['Roughness'].default_value=.07
    elif material.name.startswith('Finish_oak'):
        shader.inputs['Roughness'].default_value=.46
        tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=5;tex.inputs['Detail'].default_value=2.5
        mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(2,35,3)
        coord=nodes.new('ShaderNodeTexCoord');links.new(coord.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs['Vector'])
        base=tuple(shader.inputs['Base Color'].default_value)
        ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=tuple(v*.78 for v in base[:3])+(1,);ramp.color_ramp.elements[1].color=tuple(min(v*1.14,1) for v in base[:3])+(1,)
        links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],shader.inputs['Base Color'])
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.001;links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    elif material.name.startswith(('Finish_linen','Finish_sage','Finish_plaster','Finish_stone','Finish_concrete','Finish_sheer')):
        tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=140
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.0015
        links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])

# Bevels soften manufactured edges while keeping all faces inside nominal envelopes.
for obj in list(bpy.data.objects):
    if obj.type!='MESH':continue
    obj.data=obj.data.copy()
    obj.data.transform(Matrix.Diagonal((*obj.scale,1)))
    obj.scale=(1,1,1)
    if any(slot.material.name.startswith(('Glazing','Finish_sheer')) for slot in obj.material_slots if slot.material):continue
    bevel=obj.modifiers.new('Small edge radius','BEVEL');bevel.width=.0035;bevel.segments=3
    bevel.affect='EDGES'
    normal=obj.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');normal.keep_sharp=True

ENV=bpy.data.collections.new('04_Lighting_and_display');SCENE.collection.children.link(ENV)
def in_environment(obj):
    for collection in list(obj.users_collection):collection.objects.unlink(obj)
    ENV.objects.link(obj);return obj

def area(name,location,target,power,width,height,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=width;data.size_y=height;data.color=color
    obj=bpy.data.objects.new(name,data);ENV.objects.link(obj);obj.location=location;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler();return obj

WORLD=bpy.data.worlds.new('Illustrative daylight');WORLD.use_nodes=True;SCENE.world=WORLD
WORLD.node_tree.nodes['Background'].inputs['Color'].default_value=(.78,.84,.91,1);WORLD.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
sun_data=bpy.data.lights.new('Illustrative sun - no site simulation','SUN');sun_data.energy=2.2;sun_data.angle=.12
SUN=bpy.data.objects.new('Illustrative sun - no site simulation',sun_data);ENV.objects.link(SUN);SUN.rotation_euler=(Vector((6,-7,0))-Vector((-5,8,14))).to_track_quat('-Z','Y').to_euler()
SKY_LIGHTS=[area('North sky fill',(7,2,3),(7,-5,1),500,13,4,(.84,.90,1)),area('West sky fill',(-2,-6,3),(6,-6,1),350,10,4,(.89,.94,1))]
for c in DATA['schemes']['proposed']['components']:
    if c['kind']!='light':continue
    diffuser=next(p for p in DATA['fixtureParts'][c['id']] if p['role']=='diffuser')
    x=(diffuser['x']+diffuser['w']/2)/1000;y=(diffuser['y']+diffuser['h']/2)/1000
    area(c['id']+' warm fixture',(x,-y,(diffuser['base']-2)/1000),(x,-y,0),180 if c['id']=='light-window' else 80,diffuser['w']/1000,diffuser['h']/1000,(1,.82,.61))

bpy.ops.mesh.primitive_plane_add(size=200,location=(7.5,-6,-.165));ground=in_environment(bpy.context.object);ground.name='Presentation ground - outside design scope'
mat=bpy.data.materials.new('Presentation background');mat.diffuse_color=(.76,.74,.67,1);ground.data.materials.append(mat)

VIEWS={
 'overview':{'collection':CUT,'pos':(22,-25,22),'look':(7.5,-6,.55),'ortho':22},
 'entry':{'collection':FULL,'pos':(5.85,-11.25,1.60),'look':(8.4,-3.2,1.40),'lens':24},
 'gathering':{'collection':GATHER,'pos':(22,-25,22),'look':(7.5,-6,.55),'ortho':22},
 'evening':{'collection':FULL,'pos':(5.85,-11.25,1.6),'look':(8.4,-3.2,1.4),'lens':24},
 'wash':{'collection':FULL,'pos':(12.6,-8.95,1.35),'look':(14.65,-8.65,.9),'lens':28},
}
# Four living views share the browser's camera positions and vertical fields.
def blender_point(point):return (point[0],-point[2],point[1])
for living in DATA['living']['scenes']:
    camera=living['camera'];height=camera.get('renderHeight',1067);aspect=1600/height
    v={'collection':FULL,'pos':blender_point(camera['position']),'look':blender_point(camera['target']),'resolution_y':height}
    if camera['kind']=='orthographic':v['ortho']=max(camera['verticalSpan']*aspect,camera['minHorizontalSpan'])
    else:v['lens']=(36/aspect)/(2*math.tan(math.radians(camera['fov'])/2))
    VIEWS[living['id']]=v
VIEW_NAMES=[] if ARGS.no_render else list(VIEWS) if ARGS.view=='all' else ARGS.view.split(',')
if any(name not in VIEWS for name in VIEW_NAMES):raise ValueError('Unknown view '+ARGS.view)
cameras={}
for name,v in VIEWS.items():
    data=bpy.data.cameras.new(name);camera=bpy.data.objects.new('Camera_'+name,data);ENV.objects.link(camera);camera.location=v['pos'];camera.rotation_euler=(Vector(v['look'])-camera.location).to_track_quat('-Z','Y').to_euler()
    if 'ortho' in v:data.type='ORTHO';data.ortho_scale=v['ortho']
    else:data.lens=v['lens'];data.clip_start=.05
    camera['intended_render_resolution']=[1600,v.get('resolution_y',1067)]
    cameras[name]=camera

SCENE['design_source']='src/space.ts -> export-design.mjs -> GLB'
SCENE['site_status']='Fictional concept site. Lighting and materials are illustrative.'
SCENE['rendering']='Blender Cycles CPU, four threads'
for name in VIEW_NAMES:
    v=VIEWS[name]
    SCENE.render.resolution_y=round(v.get('resolution_y',1067)*(900/1600 if ARGS.draft else 1))
    for collection in [FULL,CUT,GATHER]:collection.hide_render=collection!=v['collection'];collection.hide_viewport=collection!=v['collection']
    SCENE.camera=cameras[name]
    SUN.data.energy=.03 if name=='evening' else 2.2
    WORLD.node_tree.nodes['Background'].inputs['Strength'].default_value=.025 if name=='evening' else .45
    for light,day_power in zip(SKY_LIGHTS,[500,350]):light.data.energy=day_power*.02 if name=='evening' else day_power
    SCENE.render.filepath=str(RENDERS/('blender-'+name+'.png'))
    bpy.ops.render.render(write_still=True)
    print('DESIGN_RENDER '+json.dumps({'view':name,'file':SCENE.render.filepath,'draft':ARGS.draft}),flush=True)
if ARGS.save:
    SCENE.render.filepath=str(OUT/'renders'/'blender-entry.png')
    SCENE.render.resolution_y=600 if ARGS.draft else 1067
    for collection in [FULL,CUT,GATHER]:collection.hide_render=collection!=FULL;collection.hide_viewport=collection!=FULL
    SCENE.camera=cameras['entry'];SUN.data.energy=2.2;WORLD.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
    for light,day_power in zip(SKY_LIGHTS,[500,350]):light.data.energy=day_power
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'community-reading-room.blend'))
    print('DESIGN_SCENE '+str(OUT/'community-reading-room.blend'),flush=True)
