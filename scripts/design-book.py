"""Build the A3 design booklet from exported, authoritative space data."""
from pathlib import Path
import json
import shutil
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'output'/'design'
DATA=json.loads((OUT/'design-data.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('CN','C:/Windows/Fonts/simhei.ttf'))
pdfmetrics.registerFont(TTFont('Song','C:/Windows/Fonts/simsun.ttc'))
W,H=landscape(A3)
TARGET=OUT/'第二张平面图-社区阅读空间设计图册.pdf'
C=canvas.Canvas(str(TARGET),pagesize=(W,H))
C.setTitle(DATA['title']);C.setAuthor('设计方案');C.setSubject('概念场地 / 占用后的空间设计与检验')
TOTAL=14
INK='#343c31';MUTED='#7d8972';RUST='#9c6545';LINE='#d3d8c8';PAPER='#f7f5ed'
def color(value):return HexColor(value)
def text(x,y,s,size=9,fill=INK,font='CN',anchor='start'):
 C.setFillColor(color(fill));C.setFont(font,size)
 if anchor=='middle':C.drawCentredString(x,y,s)
 elif anchor=='end':C.drawRightString(x,y,s)
 else:C.drawString(x,y,s)
def para(x,y,s,width,size=9,leading=15,fill=MUTED):
 row=''
 for char in s:
  if char=='\n':
   text(x,y,row,size,fill);y-=leading;row=''
  elif pdfmetrics.stringWidth(row+char,'CN',size)>width:
   if char in '，。、；：！？）》】”’' and row:
    cut=len(row)-1
    while cut>0 and row[cut] in '，。、；：！？）》】”’':cut-=1
    text(x,y,row[:cut],size,fill);y-=leading;row=row[cut:]+char
   else:
    text(x,y,row,size,fill);y-=leading;row=char
  else:row+=char
 if row:text(x,y,row,size,fill);y-=leading
 return y
def rule(x,y,xx,yy,fill=LINE,weight=.5):
 C.setStrokeColor(color(fill));C.setLineWidth(weight);C.line(x,y,xx,yy)
def rect(x,y,w,h,fill=None,stroke=LINE,weight=.5,radius=0):
 C.setStrokeColor(color(stroke));C.setLineWidth(weight)
 if fill:C.setFillColor(color(fill))
 if radius:C.roundRect(x,y,w,h,radius,stroke=1,fill=bool(fill))
 else:C.rect(x,y,w,h,stroke=1,fill=bool(fill))
def header(number,title):
 C.setFillColor(color(PAPER));C.rect(0,0,W,H,fill=1,stroke=0)
 text(18*mm,282*mm,'第二张平面图',12,font='Song');text(402*mm,282*mm,f'{number:02d} / {title}',9,MUTED,anchor='end');rule(18*mm,275*mm,402*mm,275*mm)
 text(18*mm,9*mm,'第二张平面图 · 社区共享阅读空间 · 概念场地 · 2026.10',7,MUTED)
 text(402*mm,9*mm,f'{number:02d} / {TOTAL:02d}',7,MUTED,anchor='end')
def image(name,x,y,w,h):
 source=OUT/'renders'/f'{name}.png'
 if not source.is_file():raise FileNotFoundError(source)
 C.drawImage(ImageReader(str(source)),x,y,width=w,height=h,preserveAspectRatio=True,anchor='c',mask='auto')
def contact_profile(check,x,y,denominator=15,side=False):
 k=mm/denominator
 across=check['inward'] in ['east','west']
 width=check['volume']['h' if across else 'w']
 depth=check['volume']['w' if across else 'h']
 left=0 if side else -650
 span=700 if side else 1300
 X=lambda u:x+(u-left)*k
 C.saveState();cl=C.beginPath();cl.rect(x,y,span*k,1050*k);C.clipPath(cl,stroke=0,fill=0)
 for part in check['parts']:
  b=part['projection']
  if side and (b['cross']>=width/2 or b['cross']+b['width']<=-width/2):continue
  xx=b['depth'] if side else b['cross'];ww=b['depthSize'] if side else b['width']
  rect(X(xx),y+b['base']*k,ww*k,b['height']*k,'#e2ddcd','#7a8372',.35)
 C.setDash(2,1);rect(X(0 if side else -width/2),y,(depth if side else width)*k,check['volume']['height']*k,None,'#587151',.65);C.setDash()
 C.restoreState()
 rule(x,y,x+span*k,y,INK,.5)
 text(x,y+1050*k+3*mm,('台下纵向切片' if side else '台下正面投影')+f' / 1:{denominator}',8,RUST)
 text(x,y-4*mm,f"{'进深' if side else '宽度'}目标 {depth if side else width} · 高度目标 {check['volume']['height']}",7.5,'#587151')

def world_plan(layout,x,y,denominator,route=None,dimensions=True,labels=True,program=False,occupied=()):
 k=mm/denominator
 X=lambda xx:x+xx*k
 Y=lambda yy:y+(12000-yy)*k
 def box(b,fill,stroke='#858e79',weight=.4):rect(X(b['x']),Y(b['y']+b['h']),b['w']*k,b['h']*k,fill,stroke,weight,b.get('cornerRadius',0)*k if b.get('kind') in ['table','counter','book'] else 0)
 box(dict(x=0,y=0,w=15000,h=12000),'#f3f0e6')
 if program:
  for z in DATA['zones']:box(z,z['color'],z['color'])
 if layout['platform']:box(layout['platform'],'#ddcfb5')
 for b in layout['components']:
  kind=b['kind']
  if kind=='beam' or b['base']>=2000:continue
  if kind=='rail':
   diameter=DATA['details']['grabDiameter'];xx=b['x']+(b['w']/2 if b.get('railForm')=='fold-up' else diameter/2)
   rule(X(xx),Y(b['y']+diameter/2),X(xx),Y(b['y']+b['h']-diameter/2),INK,diameter*k)
   if b.get('railForm')=='lshape':
    for yy in [b['y']+diameter/2,b['y']+b['h']-45]:rule(X(xx),Y(yy),X(b['x']+b['w']-diameter/2),Y(yy),INK,diameter*k)
   continue
  fill=INK if kind=='column' else '#666f5d' if kind=='wall' and b['height']>1200 else '#c4cbb9' if kind=='wall' else '#d3dfd5' if kind=='partition' else '#c5ceb9' if kind=='rug' else '#c7b598' if kind=='shelf' else '#fdfbf3'
  box(b,fill,weight=.55 if kind in ['wall','column'] else .35)
  if kind=='shelf':
   for i in range(1,int(b['w']/450)):rule(X(b['x']+i*450),Y(b['y']),X(b['x']+i*450),Y(b['y']+b['h']),'#a19172',.25)
  if kind in ['table','counter']:rect(X(b['x']+40),Y(b['y']+b['h']-40),(b['w']-80)*k,(b['h']-80)*k,None,'#b4af9b',.25,max(0,b.get('cornerRadius',0)-40)*k)
  if kind=='bench':rule(X(b['x']),Y(b['y']+b['h']-110),X(b['x']+b['w']),Y(b['y']+b['h']-110),'#9ea38b',1)
 for r in occupied:box(r,'#d8c1a6',RUST,.45)
 for p in layout['reserved']:
  r=p['rect'];C.setDash(3,2);rect(X(r['x']),Y(r['y']+r['h']),r['w']*k,r['h']*k,None,RUST,.55);C.setDash()
  dx=1 if p['facing']=='east' else -1 if p['facing']=='west' else 0;dy=-1 if p['facing']=='north' else 0
  rule(X(p['x']-dx*120),Y(p['y']-dy*120),X(p['x']+dx*320),Y(p['y']+dy*320),RUST,.55)
  for side in [-1,1]:rule(X(p['x']+dx*320),Y(p['y']+dy*320),X(p['x']+dx*190-dy*side*85),Y(p['y']+dy*190+dx*side*85),RUST,.55)
 if layout['scheme']=='proposed':
  C.setStrokeColor(color('#96a280'));C.setLineWidth(.55);C.setDash(3,2);C.circle(X(12500),Y(9200),750*k,fill=0,stroke=1);C.setDash()
 door=layout['doorWidth'];hinge=9200+door/2
 C.setStrokeColor(color('#879377'));C.setLineWidth(.4);C.arc(X(11500-door),Y(hinge+door),X(11500+door),Y(hinge-door),startAng=90,extent=90)
 if route and route['path']:
  C.setStrokeColor(color('#526e55' if route['reached'] else RUST));C.setLineWidth(1.6);p=C.beginPath()
  for i,a in enumerate(route['path']):
   (p.moveTo if i==0 else p.lineTo)(X(a['x']),Y(a['y']))
  C.drawPath(p)
  end=route['path'][-1];C.circle(X(end['x']),Y(end['y']),1.3*mm,stroke=1,fill=0)
 if labels:
  for xx,yy,label in [(7000,2600,'临窗阅读'),(2700,8650,'亲子共读'),(7700,8200,'共读 / 交流'),(13100,7700,'活动收纳'),(4500,11200,'入口 / 借阅 / 休息'),(13100,10100,'卫生间'),(13100,11600,'储藏')]:text(X(xx),Y(yy),label,7.5 if denominator==50 else 6.5,MUTED,anchor='middle')
 if dimensions:
  top=Y(-300);rule(X(0),top,X(15000),top,'#9aa48a',.4)
  for xx in [0,15000]:rule(X(xx),top-1.5*mm,X(xx),top+1.5*mm,'#9aa48a',.4)
  text(X(7500),top+1.4*mm,'15 000',7,MUTED,anchor='middle')
  left=X(-600);rule(left,Y(0),left,Y(12000),'#9aa48a',.4)
  C.saveState();C.translate(left-2*mm,Y(6000));C.rotate(90);text(0,0,'12 000',7,MUTED,anchor='middle');C.restoreState()
  C.setDash(4,3);rule(X(DATA['room']['sectionX']),Y(-250),X(DATA['room']['sectionX']),Y(12300),RUST,.35);C.setDash()
  C.setDash(4,3);rule(X(-150),Y(DATA['room']['sectionY']),X(15150),Y(DATA['room']['sectionY']),RUST,.35);C.setDash()
  text(X(-220),Y(DATA['room']['sectionY']-130),'B',8,RUST,anchor='end');text(X(15220),Y(DATA['room']['sectionY']-130),'B',8,RUST)
  text(X(DATA['room']['sectionX']+150),Y(-300),'A',8,RUST);text(X(DATA['room']['sectionX']+150),Y(12600),'A',8,RUST)
  text(X(6000),Y(12450),'主入口1800',7,MUTED,anchor='middle');text(X(10400),Y(12450),'次出口1200',6.5,MUTED,anchor='middle')
  rule(X(14000),Y(700),X(14000),Y(180),INK,.6);rule(X(14000),Y(180),X(13920),Y(340),INK,.6);rule(X(14000),Y(180),X(14080),Y(340),INK,.6);text(X(14000),Y(60),'N',7,INK,anchor='middle')
  rule(X(3300),Y(11600),X(5300),Y(11600),MUTED,.8)
  for xx,label in [(3300,'0'),(4300,'1'),(5300,'2m')]:rule(X(xx),Y(11540),X(xx),Y(11660),MUTED,.5);text(X(xx),Y(11850),label,6.5,MUTED,anchor='middle')
 return X,Y
def section(layout,x,y,denominator=50,axis='aa'):
 k=mm/denominator
 X=lambda v:x+v*k
 Y=lambda z:y+z*k
 aa=axis=='aa';length=DATA['room']['depth' if aa else 'width'];cut=DATA['room']['sectionX' if aa else 'sectionY']
 rect(x,y,length*k,3200*k,None,'#9aa58c',.6)
 rect(x,y-150*k,length*k,150*k,'#b7bdab')
 if layout['platform'] and aa:rect(x,y,3600*k,180*k,'#bfa681')
 for b in layout['components']:
  if not b['x' if aa else 'y']<=cut<=b['x' if aa else 'y']+b['w' if aa else 'h']:continue
  lift=180 if layout['platform'] and b['y']<3600 else 0
  xx=X(b['y' if aa else 'x']);width=b['h' if aa else 'w'];zz=b['base']+lift
  if b['kind']=='light':
   for p in DATA['fixtureParts'][b['id']]:
    if p['x' if aa else 'y']<=cut<=p['x' if aa else 'y']+p['w' if aa else 'h']:rect(X(p['y' if aa else 'x']),Y(p['base']),p['h' if aa else 'w']*k,p['height']*k,'#d1ad66' if p['role']=='diffuser' else '#738068',INK,.25)
  elif b['kind']=='table':rect(xx,Y(zz+b['height']-30),width*k,30*k,'#b89a6e',INK,.4);rect(xx+110*k,Y(zz),45*k,(b['height']-30)*k,'#738068')
  elif b['kind']=='counter' and b.get('openBelow'):rect(xx,Y(zz+b['height']-30),width*k,30*k,'#b89a6e',INK,.4)
  elif b['kind']=='rug':continue
  else:rect(xx,Y(zz),width*k,b['height']*k,'#d4ded7' if b['kind']=='partition' else DATA['materials'][b['material']]['color'],INK,.4)
 text(x+3*mm,Y(3300),'+3.200',8,MUTED);text(x+3*mm,Y(40),'±0.000',7,RUST)
 rule(x-6*mm,y,x-6*mm,Y(3200),'#a7b297',.4);text(x-8*mm,Y(1600),'3200',7,MUTED,anchor='end')
 if aa:text(X(800),y-8*mm,'临窗阅读桌',8,MUTED);text(X(4700),y-8*mm,'共享桌',8,MUTED);text(X(9800),y-8*mm,'低位服务段',8,MUTED)

before=DATA['schemes']['existing'];after=DATA['schemes']['proposed'];gather=DATA['schemes']['gathering']
studies={s['id']:s for s in DATA['studies']}
def comp(key,layout=after):return next(c for c in layout['components'] if c['id']==key)
def caption(x,y,title,body,width):
 text(x,y,title,11,RUST)
 return para(x,y-7*mm,body,width,9,14)
def finish():C.showPage()
def link(x,y,title,url,size=8):
 text(x,y,title,size,MUTED);C.linkURL(url,(x,y-2*mm,x+pdfmetrics.stringWidth(title,'CN',size),y+3*mm),relative=0)

# 01
header(1,'方案总览')
text(20*mm,253*mm,'第二张平面图',29,font='Song')
text(20*mm,237*mm,'占用后的共读空间',22,RUST,font='Song')
image('blender-overview',15*mm,38*mm,281*mm,187*mm)
text(308*mm,249*mm,'180 m²',29,RUST,font='Helvetica')
text(308*mm,235*mm,'社区共享阅读空间包容性改造',11)
y=216*mm
for title,body in [
 ('使用后的平面','空置时留出的通道，可能在停靠、共读和陪伴发生后被占用。设计同时检查设施位置与使用中的占地。'),
 ('共同使用与独立通行','共享桌向东调整，在端部停靠与保留柱之间留出1300mm通行带。静读与公共厅以可闭合界面相邻。'),
 ('当前成果性质','15×12m概念场地。图纸、模型与分析共用几何数据，Blender场景用于空间表达。没有现场访谈或建成验证。')]:
 text(308*mm,y,title,11);y=para(308*mm,y-7*mm,body,90*mm,9,15)-8*mm
text(20*mm,26*mm,'模型剖切展示；保留柱与梁完整表达。比例人物与光照均为设计示意。',8,MUTED)
finish()
# 02
header(2,'任务、依据与现状设定')
text(20*mm,260*mm,'共读、陪伴与安静停留共享同一处场所',22,font='Song')
world_plan(before,24*mm,67*mm,75)
text(24*mm,48*mm,'现状设定平面 / 1:75（A3原尺寸）',9,MUTED)
y=240*mm
for title,body in [
 ('场地与使用任务','保留单层180㎡边界、两根内部框架柱、框架梁和东南湿区。服务独自阅读、携童共读、邻里交流与不同辅助器具使用需求。'),
 ('原布置的冲突','北侧非承重木地台设为+180mm，中部高架割裂联系，卫生间门口设为800mm。它们是用于推敲的设计条件，未伪装成实测建筑。'),
 ('新增的使用问题','预留位坐了人后，原开放方案的主通行线需要绕开桌端占用。门口能到达，也不等于洗手台前有可用位置。'),
 ('公开依据','IFLA的无障碍图书馆发布说明强调通用设计、物理和信息可达性。儿童空间改造经验提示照看、可及书架与安静区距离。具体来源见末页。')]:
 text(250*mm,y,title,11,RUST);y=para(250*mm,y-7*mm,body,147*mm,9,14)-7*mm
text(20*mm,26*mm,'场地、人口和活动均为概念任务设定；没有编造受访者、满意度、实测采光或既有建筑结论。',8,MUTED)
finish()
# 03
header(3,'方案比较')
text(20*mm,260*mm,'座位数量、共同活动与独立通行的取舍',22,font='Song')
for i,key in enumerate(['seats','open','balanced']):
 s=studies[key];x=(20+i*131)*mm
 text(x,242*mm,s['name'],12,RUST)
 world_plan(s['layout'],x,135*mm,125,dimensions=False,labels=False)
 para(x,126*mm,s['reason'],119*mm,8.5,13)
xs=[20,144,228,312]
rows=[
 ['比较内容','A 排式阅读','B 开放共读','C 分区共享'],
 ['实体座位']+[str(studies[k]['facts']['seats']) for k in ['seats','open','balanced']],
 ['亲子共读设施']+['保留' if studies[k]['family'] else '撤出' for k in ['seats','open','balanced']],
 ['可闭合静读界面']+['设置' if studies[k]['quietBoundary'] else '未设置' for k in ['seats','open','balanced']],
 ['柱侧独立通行带']+[str(studies[k]['aisleWidthMm'])+'mm' if studies[k]['aisleWidthMm'] else '与停靠重叠' for k in ['seats','open','balanced']],
 ['新增玻璃界面']+[str(round(studies[k]['glazedArea']))+'㎡' for k in ['seats','open','balanced']],
]
for i,row in enumerate(rows):
 yy=(83-i*9)*mm
 for j,v in enumerate(row):text(xs[j]*mm,yy,v,9,RUST if i==0 else INK)
 rule(20*mm,yy-3*mm,400*mm,yy-3*mm)
text(20*mm,23*mm,'采用C：保留共同活动与静读选择，并让桌端停靠退出主通行线。新增界面需要制作与维护，当前没有报价。',8.5,MUTED)
finish()
# 04
header(4,'改造方案平面 / 1:50')
world_plan(after,23*mm,26*mm,50)
text(341*mm,255*mm,'空间组织',13,RUST)
y=242*mm
for z in DATA['zones']:
 rect(341*mm,y-2*mm,3*mm,3*mm,z['color'],z['color']);text(348*mm,y,z['name'],9)
 y=para(348*mm,y-5*mm,z['purpose'],52*mm,7.5,11)-5*mm
text(341*mm,y,'尺寸与使用',10);y=para(341*mm,y-6*mm,'尺寸单位mm。日常24个实体座位、3处相邻停靠。北侧静读门开启净开口1500，端部停靠与柱侧通行带1300。',60*mm,8,12)
para(341*mm,y-5*mm,'虚线矩形表达停靠预留及朝向。A-A与B-B剖切线对应下一页。1:50仅在A3原尺寸输出时成立。',60*mm,8,12)
finish()
# 05
header(5,'剖面关系 / 1:50')
text(20*mm,260*mm,'统一地坪，顶面顺着保留框架组织',22,font='Song')
section(after,25*mm,160*mm,50,'aa')
text(291*mm,222*mm,'A-A / X=8100mm',12,RUST)
para(291*mm,210*mm,'临窗长桌、静读界面、共享桌与服务台在同一地坪。玻璃分区保留可见联系。公共厅软质顶面与线性灯具按使用位置布置。',105*mm,9,14)
section(after,25*mm,52*mm,50,'bb')
text(336*mm,112*mm,'B-B / Y=6000mm',11,RUST)
para(336*mm,100*mm,'柱至梁底2900mm，梁顶与顶面3200mm。顶面避开柱体，按梁柱分段。',61*mm,8.5,13)
text(25*mm,26*mm,'剖面表达名义构件与家具包围尺寸，不作为结构、机电或施工节点审查。',8,MUTED)
finish()
# 06
header(6,'共用桌与独立通行')
text(20*mm,260*mm,'停靠位置参与同桌使用，主通行线保持独立',21,font='Song')
k=mm/25;X=lambda v:25*mm+(v-4700)*k;Y=lambda v:230*mm-(v-3500)*k
for b in after['components']:
 if b['id']=='shared-table' or b['id'].startswith('shared-chair') or b['kind']=='column':
  rect(X(b['x']),Y(b['y']+b['h']),b['w']*k,b['h']*k,INK if b['kind']=='column' else '#c6b08e' if b['kind']=='table' else '#f4f0e5',INK,.45,b.get('cornerRadius',0)*k)
for p in after['reserved']:
 if not p['id'].startswith('table-'):continue
 r=p['rect'];C.setDash(3,2);rect(X(r['x']),Y(r['y']+r['h']),r['w']*k,r['h']*k,None,RUST,.6);C.setDash()
text(X(7100),Y(5200),'停靠',9,RUST,anchor='middle');text(X(10700),Y(5200),'停靠',9,RUST,anchor='middle')
left=comp('column-1')['x']+comp('column-1')['w'];right=next(p for p in after['reserved'] if p['id']=='table-west')['rect']['x']
rule(X(left),Y(7000),X(right),Y(7000),RUST,.7);text(X((left+right)/2),Y(7300),f'通行带 {right-left}',9,RUST,anchor='middle')
text(25*mm,62*mm,'桌组局部平面 / 1:25。阴实块为保留柱，虚线为有方向的预留位置。',9,MUTED)
radius=comp('shared-table')['cornerRadius']
para(25*mm,50*mm,f"R{radius}端角保留{comp('shared-table')['h']-2*radius}mm端部直边，内退钢框与桌脚另核台下体积。共享桌向东调整，其他预留位按占用检查时，临窗路线仍可通过。圆角家具通行继续按包围矩形保守检查。",270*mm,9,14)
table_contact=next(c for c in DATA['contacts']['proposed'] if c['id']=='table-west')
caption(306*mm,237*mm,'台下也要有实际空间',f"可触台面{table_contact['surfaceHeight']:.0f}mm。虚线为750宽、450深、680高的整块目标体积；检查实际桌脚、横梁及邻近构件，没有侵入。",94*mm)
contact_profile(table_contact,306*mm,130*mm,15)
contact_profile(table_contact,321*mm,40*mm,15,True)
finish()
# 07
header(7,'卫生服务节点 / 1:20')
text(20*mm,260*mm,'到达门口以后，继续核对设施前的位置',21,font='Song')
C.saveState();clip=C.beginPath();clip.rect(24*mm,96*mm,260*mm,151*mm);C.clipPath(clip,stroke=0,fill=0)
world_plan(after,(30-10350/20)*mm,(100-1400/20)*mm,20,dimensions=False,labels=False)
C.restoreState()
k=mm/20;X=lambda v:30*mm+(v-10350)*k;Y=lambda v:100*mm+(10600-v)*k
wash=next(r for r in DATA['routes'] if r['id']=='wash')['afterPoint']
C.setStrokeColor(color('#587151'));C.circle(X(wash['x']),Y(wash['y']),2.2*mm,stroke=1,fill=0)
text(X(wash['x'])-3*mm,Y(wash['y'])-6*mm,'洗手台前',8,'#587151',anchor='end')
text(X(12500),Y(9200),'回转目标1500',8,RUST,anchor='middle')
text(305*mm,237*mm,'同源模型中的洗手台',11,RUST)
image('blender-wash',305*mm,166*mm,92*mm,61*mm)
caption(305*mm,150*mm,'台面与台下分开核对','台板与盆沿均不高于800mm，台下750宽、450深、650高目标体积内无模型构件。实际产品、管线和安装仍需核对。',92*mm)
caption(305*mm,105*mm,'到达与使用各有检查','门口1100mm、向外开启。两侧抓杆为安装意向。路径与台下检查不代表人体动作、五金荷载或完整规范审查。',92*mm)
wash_contact=next(c for c in DATA['contacts']['proposed'] if c['id']=='wash')
contact_profile(wash_contact,30*mm,25*mm,20)
contact_profile(wash_contact,119*mm,25*mm,20,True)
para(182*mm,79*mm,'台下图来自实际构件边界。容膝容脚尺寸参考GB 55019-2021第3.1.10条，采用整块450mm进深目标检验，未完成全部适用性审查。',98*mm,8,12)
finish()
# 08
header(8,'顶面、照明与晚间场景')
text(20*mm,260*mm,'照明跟随使用位置，软质顶面避让框架柱',21,font='Song')
k=mm/75;X=lambda v:25*mm+v*k;Y=lambda v:80*mm+(12000-v)*k
rect(X(0),Y(12000),15000*k,12000*k,'#f3f0e6')
for b in after['components']:
 if b['kind'] not in ['column','beam','baffle','light','partition']:continue
 fill='#cfc7b6' if b['kind']=='baffle' else '#d1ad66' if b['kind']=='light' else '#a9ada1' if b['kind']=='beam' else INK if b['kind']=='column' else '#dce4dc'
 rect(X(b['x']),Y(b['y']+b['h']),b['w']*k,b['h']*k,fill,'#87917c',.4)
text(25*mm,66*mm,'顶面意向 / 1:75。灰为保留梁柱，米色为软质顶面，金色为灯具。',8.5,MUTED)
image('blender-evening',245*mm,130*mm,156*mm,104*mm)
text(245*mm,119*mm,'晚间图示光照',11,RUST)
soft=sum(b['w']*b['h']/1e6 for b in after['components'] if b['kind']=='baffle')
caption(245*mm,103*mm,'材料与光的分工',f"软质顶面投影约{soft:.2f}㎡。条光外壳与内退{DATA['details']['lightRecess']}mm扩散面分开建模，吊杆连至顶面或板底。亲子角西侧织物用于侧光调节意向；透射、耐火、照度与眩光均待验证。",155*mm)
text(25*mm,29*mm,'没有实测地点、朝向气候和产品数据，不将图示日光、晚间效果或软质材料等同于照度、眩光和声学计算。',8,MUTED)
finish()
# 09
header(9,'静读空间')
text(20*mm,260*mm,'可闭合的边界保留安静选择与可见联系',21,font='Song')
image('blender-quiet',18*mm,66*mm,270*mm,180*mm)
caption(307*mm,235*mm,'临窗长桌','普通座椅与预留位置处在同一桌面旁。高位藏书靠边，低架为较长停留提供可及的书籍界面。',91*mm)
caption(307*mm,167*mm,'静读与共读相邻','玻璃界面让两处空间可见。门口留1500mm开口，门开启时检查通行，闭合使用时的隔声需另行验证。',91*mm)
caption(307*mm,94*mm,'共同的标高','主要地坪统一，材料平接。比例人物只表达尺度，不构成真实器具或使用者试验。',91*mm)
text(20*mm,29*mm,'同源模型人视场景 / Blender Cycles / 图示光照与材质',8,MUTED)
finish()
# 10
header(10,'亲子陪伴与共同阅读')
text(20*mm,260*mm,'照看、交谈与共同使用在家具尺度上衔接',21,font='Song')
image('blender-family',18*mm,113*mm,184*mm,123*mm)
image('blender-shared',218*mm,113*mm,184*mm,123*mm)
ledge=comp('family-ledge');family=DATA['living']['companion']
caption(18*mm,101*mm,'陪孩子，也能放下自己的书',f"{DATA['details']['childTableHeight']}mm儿童桌旁接出{ledge['height']}mm手边托台。托台{ledge['w']}×{ledge['h']}mm，增加{family['addedEnvelopeArea']:.2f}㎡包围范围；有／无托台的900mm占用通路均到达亲子角，席位不增加。",184*mm)
caption(218*mm,101*mm,'共享共读桌',f"R{radius}木质端角与内退钢框共同组织接触边。六张普通椅与两个桌端位置同桌使用，台下体积检查读取实际构件；固定桌高不等于适配全部器具。",184*mm)
rule(18*mm,52*mm,402*mm,52*mm)
text(18*mm,39*mm,'设计选择：维持亲子与共享活动，未采用31席排式阅读。',10,RUST)
text(18*mm,27*mm,'视线联系和使用意图尚未经过访谈或照看行为试验；不据此宣称真实使用效果已经改善。',8.5,MUTED)
finish()
# 11
header(11,'活动转换与家具占地')
image('blender-gathering',18*mm,124*mm,222*mm,145*mm)
caption(265*mm,244*mm,'同一批桌椅的转换','桌组折叠并与六张椅收纳在东侧。日常24个实体席位，收拢后18个。保留三个相邻位置，当前不推算活动容量。',133*mm)
mode=DATA['modeStudy']
caption(265*mm,179*mm,'明确计量范围',f"中部图示范围内的家具与柱占地由{mode['readingOccupied']:.2f}㎡变为{mode['gatheringOccupied']:.2f}㎡，移出家具占地{mode['freedFootprint']:.2f}㎡。采用矩形包围范围并集，避免重叠重复计量。",133*mm)
world_plan(after,34*mm,19*mm,125,dimensions=False,labels=False)
world_plan(gather,227*mm,19*mm,125,dimensions=False,labels=False)
text(34*mm,119*mm,'日常共读',10,RUST);text(227*mm,119*mm,'活动收拢',10,RUST)
text(18*mm,20*mm,'',8,MUTED)
finish()
# 12
header(12,'占用后的第二张平面图')
text(20*mm,260*mm,'预留位使用以后，通行仍需成立',22,font='Song')
b=DATA['tableStudy'][0];c=DATA['tableStudy'][-1];br=b;cr=c
text(24*mm,244*mm,f"桌位X={b['x']} / 其他预留位占用",11,RUST)
text(230*mm,244*mm,f"桌位X={c['x']} / 其他预留位占用",11,'#587151')
world_plan(b['layout'],24*mm,104*mm,100,br['occupied'],dimensions=False,labels=False,occupied=br['occupiedRects'])
world_plan(c['layout'],230*mm,104*mm,100,cr['occupied'],dimensions=False,labels=False,occupied=cr['occupiedRects'])
text(24*mm,94*mm,f"临窗路径 {br['occupied']['length']/1000:.2f}m",10,RUST)
text(230*mm,94*mm,f"临窗路径 {cr['occupied']['length']/1000:.2f}m",10,'#587151')
rule(20*mm,84*mm,400*mm,84*mm)
text(20*mm,77*mm,'同一使用目标',9);text(183*mm,77*mm,'现状设定',9);text(277*mm,77*mm,'C方案 / 其他预留位占用',9)
for i,r in enumerate(DATA['routes']):
 y=(67-i*7)*mm;occ=next(o for o in DATA['occupancy'] if o['id']==r['id'])
 text(20*mm,y,r['name'],8.5);text(183*mm,y,'到达' if r['before']['reached'] else '未到达',8.5,MUTED)
 text(277*mm,y,('到达 / '+format(occ['occupied']['length']/1000,'.2f')+'m') if occ['occupied']['reached'] else '未到达',8.5,'#587151')
 rule(20*mm,y-2*mm,400*mm,y-2*mm,LINE,.3)
text(20*mm,25*mm,'两图保持建筑界面、灯具和其他家具不变，只移动桌组及对应位置。网页可在限定范围内实际调整。',7.5,MUTED)
text(20*mm,19*mm,'900mm圆形包络；占用采用900×1200mm矩形假设。目标位置留空，不是设备运动或疲劳模拟。',7.5,MUTED)
finish()
# 13
header(13,'公共厅与亲子角的可见联系')
text(20*mm,260*mm,'同一条观察线，记录中部高架的取舍',22,font='Song')
visibility=DATA['living']['sightline']
for i,(layout,result) in enumerate([(before,visibility['before']),(after,visibility['after'])]):
 x=(24+i*206)*mm
 text(x,242*mm,'现状设定：中部高架遮挡' if i==0 else '改造：高架退边，低架分段',11,RUST)
 X,Y=world_plan(layout,x,95*mm,100,dimensions=False,labels=False)
 start=result['from'];end=result['to'];hit=result['hits'][0] if result['hits'] else None
 if hit:
  C.setDash(3,2);rule(X(hit['point']['x']),Y(hit['point']['y']),X(end['x']),Y(end['y']),MUTED,1);C.setDash()
 point=hit['point'] if hit else end
 rule(X(start['x']),Y(start['y']),X(point['x']),Y(point['y']),RUST if hit else '#587151',1.1)
 for p in [start,end]:
  C.setStrokeColor(color(RUST));C.setFillColor(color(PAPER));C.circle(X(p['x']),Y(p['y']),1.8*mm,stroke=1,fill=1)
 text(x,85*mm,'首次遮挡：'+hit['name'] if hit else '该观察线内无不透明构件',9,RUST if hit else '#587151')
rule(20*mm,72*mm,400*mm,72*mm)
caption(20*mm,60*mm,'明确的假设高度',f"公共厅服务边{visibility['before']['from']['height']}mm → 亲子角{visibility['before']['to']['height']}mm。两图使用同一空间线段，检查不透明构件包围体。",178*mm)
caption(220*mm,60*mm,'可见联系与近处照护',visibility['note']+' 这项比较不代表所有视点无遮挡，也没有验证真实看护行为或心理效果。',178*mm)
finish()
# 14
header(14,'对标、过程与实施边界')
text(20*mm,260*mm,'空间判断、制作与验证各自留有依据',22,font='Song')
caption(20*mm,238*mm,'官方获奖对标 / 闽岚五境·和愈共生','官网标注2025国赛一等奖。已读官方简介，并查看封面和第二张公开展板。借鉴活动、构架与材料围绕同一空间主题组织：本作落实为不同使用高度的木质桌边及局部光环境。未复制乡村形式、图片或疗愈效果结论。',178*mm)
caption(220*mm,238*mm,'建成包容性空间 / Oodi中央图书馆','已读ALA设计方与Oodi运营方官网文字，未到访或完整检查图库。参考不同活动氛围的选择和具体家庭配套：本作保留静读界面，补陪伴托台并复核占用通行。180㎡概念方案不直接套用大型多层图书馆。',178*mm)
rule(20*mm,177*mm,400*mm,177*mm)
caption(20*mm,164*mm,'制作与计量','参数化构件生成图纸、GLB和分析；Steam Blender导入同源几何。新增灯具拆为外壳、内退扩散面与吊杆。以下为名义外包计量，不含损耗或报价。',178*mm)
quantities=[('统一室内地面',DATA['room']['area'],'㎡'),('拆除非承重地台投影',DATA['room']['width']*DATA['room']['platformDepth']/1e6,'㎡'),('新增玻璃系统外包面积',studies['balanced']['glazedArea'],'㎡'),('软质顶面投影',soft,'㎡')]
for i,(name,value,unit) in enumerate(quantities):
 y=(120-i*9)*mm;text(20*mm,y,name,9);text(174*mm,y,f'{value:.2f}{unit}',9,anchor='end');rule(20*mm,y-3*mm,198*mm,y-3*mm)
caption(220*mm,164*mm,'团队与AI','团队承担需求提出、方案选择与审阅；AI参与概念推敲、程序、图纸、建模脚本与文案。未将工具生成过程描述为学生独立制作。',178*mm)
para(220*mm,118*mm,'尚待实际器具、连接、门和洁具适配；结构、机电、材料耐火、声学与照度审查；真实使用者反馈。通行和视线计算不替代这些工作。',178*mm,9,14)
text(20*mm,72*mm,'公开来源 / 链接可点击，案例图未复制进成果',10,RUST)
link(20*mm,60*mm,'CMIT：闽岚五境·和愈共生 / 2025国赛一等奖','https://www.cmit.cn/wap/renjuhuanjing/show-160-4226-1.html')
link(20*mm,49*mm,'ALA：Oodi设计方的建成项目说明','https://ala.fi/work/helsinki-central-library/')
link(20*mm,38*mm,'Oodi运营方：儿童与家庭服务','https://oodihelsinki.fi/en/services/children-and-families/')
link(220*mm,60*mm,'IFLA无障碍指南发布说明 / 未通读指南PDF','https://www.ifla.org/news/just-published-ifla-guidelines-for-making-libraries-accessible-for-people-with-disabilities/')
link(220*mm,49*mm,'IFLA儿童图书馆改造经验文章','https://www.ifla.org/g/libraries-for-children-and-ya/redesigning-the-public-library-to-create-an-active-and-vibrant-library-space-for-children/')
link(220*mm,38*mm,'GB 55019-2021 / 已选读条款，未作完整审查','https://www.mohurd.gov.cn/gongkai/zc/wjk/art/2021/art_17339_762461.html')
text(20*mm,24*mm,'本册为概念场地的设计深化成果，无实地访谈、专业签审、建成评价或正式参赛提交记录。',8,MUTED)
finish()
C.save()
shutil.copyfile(TARGET,ROOT/'dist'/'assets'/TARGET.name)
print(json.dumps({'pdf':str(TARGET),'pages':TOTAL,'format':'A3 landscape','bytes':TARGET.stat().st_size},ensure_ascii=False))
