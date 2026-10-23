"""Package the local design and browser build once, with a verified manifest."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZIP_DEFLATED
import json

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'output'/'design'
DIST=ROOT/'dist'
TARGET=ROOT/'output'/'第二张平面图-设计成果包.zip'
PPT='第二张平面图-桌边共读汇报.pptx'
files={f'成果/{name}':DIST/name for name in ['index.html','second-floor-plan.html','app.js','style.css']}
for source in sorted(OUT.iterdir()):
 if source.is_file() and (source.suffix!='.pptx' or source.name==PPT):files[f'成果/assets/{source.name}']=source
for source in sorted((OUT/'renders').glob('blender-*.png')):files[f'成果/assets/renders/{source.name}']=source
for source in files.values():
 if not source.is_file() or not source.resolve().is_relative_to(ROOT):raise ValueError('Invalid project asset '+str(source))
required=['成果/assets/'+PPT,'成果/assets/第二张平面图-社区阅读空间设计图册.pdf','成果/assets/community-reading-room.blend','成果/assets/contact-checks.svg','成果/assets/renders/blender-wash.png']
if any(name not in files for name in required):raise ValueError('Incomplete design outputs')
server=(ROOT/'scripts'/'serve.mjs').read_text(encoding='utf-8')
old="new URL('../dist/', import.meta.url)"
if server.count(old)!=1:raise ValueError('Server root declaration changed')
server=server.replace(old,"new URL('./成果/', import.meta.url)")
readme=f"""第二张平面图｜社区共享阅读空间包容性改造

本包为本地概念设计成果，未报名、签署或上传。

先看图册：成果/assets/第二张平面图-社区阅读空间设计图册.pdf
设计汇报：成果/assets/{PPT}
可编辑工程：成果/assets/community-reading-room.blend
同目录另有GLB、SVG、设计JSON、Three.js许可证与renders模型场景。

交互原型需要Node.js 24或更新版本及支持WebGL的浏览器。
在解压后的根目录运行：node 启动服务.mjs
浏览器访问：http://127.0.0.1:5177/
若本机端口已被占用，在PowerShell执行：$env:PORT='5187'
再运行上述命令，并访问对应端口。
服务仅绑定本机，不上传文件；停止时在终端按Ctrl+C。
保留完整目录及相对路径。内联HTML仍需要相邻的assets图片和下载文件。

场地、使用者和活动为设计假设，没有实测建筑或受访者。
几何路径与台下目标体积均不能代替真实设备动作及完整专业审查。
团队当前贡献为需求提出、方案选择与审阅；AI参与概念推敲、程序、图纸、建模脚本及文案。
Blender场景为同源模型渲染，不是现场照片。具体依据和边界见图册及汇报备注。

校验清单：文件清单.json列出逐项SHA-256。正式主体材料与投递不在本包中。
"""
payloads={name:source.read_bytes() for name,source in files.items()}
payloads['启动服务.mjs']=server.encode('utf-8')
payloads['阅读说明.txt']=readme.encode('utf-8')
manifest={name:sha256(content).hexdigest() for name,content in payloads.items()}
payloads['文件清单.json']=json.dumps(manifest,ensure_ascii=False,indent=2).encode('utf-8')
with ZipFile(TARGET,'w',compression=ZIP_DEFLATED,compresslevel=6) as archive:
 for name,content in payloads.items():archive.writestr(name,content)
with ZipFile(TARGET) as archive:
 if archive.testzip() is not None:raise ValueError('ZIP CRC verification failed')
 for name,digest in manifest.items():
  if sha256(archive.read(name)).hexdigest()!=digest:raise ValueError('ZIP content mismatch '+name)
print(json.dumps({'file':str(TARGET),'entries':len(payloads),'bytes':TARGET.stat().st_size,'crc':True,'sha256':True},ensure_ascii=False))
