"""Dependency-free inert SVG studies; writes only beside this script."""
from pathlib import Path
import json, math, re, html
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
theme=json.loads((ROOT/'packages/core/src/theme/fixtures/valid.json').read_text())
def rgb(v):
 L,C,h=[float(x) for x in re.findall(r'[\d.]+',v)][:3];a=C*math.cos(math.radians(h));b=C*math.sin(math.radians(h))
 l=(L+.3963377774*a+.2158037573*b)**3;m=(L-.1055613458*a-.0638541728*b)**3;s=(L-.0894841775*a-1.291485548*b)**3
 vals=[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s]
 def gamma(x):return 12.92*x if x<=.0031308 else 1.055*x**(1/2.4)-.055
 return '#'+''.join(f'{round(max(0,min(1,gamma(v)))*255):02x}' for v in vals)
P={k:rgb(v['$value']) for k,v in theme['modes']['light']['color'].items()}
class SVG:
 def __init__(self,w,h,title):
  self.parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{html.escape(title)}</title><desc id="desc">Static study. Controls are inert depictions of accepted primitives, not functioning product controls.</desc><defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity=".05"/></filter></defs>']
 def rect(self,x,y,w,h,fill='card',r=0,stroke=None,extra=''):
  self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{P.get(fill,fill)}"'+(f' stroke="{P.get(stroke,stroke)}"' if stroke else '')+f' {extra}/>')
 def text(self,x,y,t,size=14,color='foreground',weight=400,mono=False):
  font='JetBrains Mono, ui-monospace, monospace' if mono else 'Inter, system-ui, -apple-system, sans-serif'
  self.parts.append(f'<text x="{x}" y="{y}" fill="{P.get(color,color)}" font-family="{font}" font-size="{size}" font-weight="{weight}">{html.escape(str(t))}</text>')
 def line(self,x,y,x2,y2,color='border'):self.parts.append(f'<path d="M{x} {y}L{x2} {y2}" stroke="{P.get(color,color)}"/>')
 def circle(self,x,y,r,fill):self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{P.get(fill,fill)}"/>')
 def button(self,x,y,w,label,kind='outline',h=36):
  self.rect(x,y,w,h,'primary' if kind=='primary' else 'background' if kind=='outline' else 'secondary',12,'border' if kind=='outline' else None)
  self.text(x+w/2,y+h/2+5,label,14,'primary-foreground' if kind=='primary' else 'foreground',500);self.parts[-1]=self.parts[-1].replace('<text ','<text text-anchor="middle" ')
 def input(self,x,y,w,label,value,select=False,mobile=False):
  self.text(x,y,label,14,weight=500);self.rect(x,y+12,w,36,'card',12,'input');self.text(x+12,y+36,value,16 if mobile else 14)
  if select:self.text(x+w-24,y+35,'⌄',16,'muted-foreground')
 def tabs(self,x,y,labels,active,widths):
  if labels in (['Light','Dark'],['390','1024']):
   self.choice(x,y,labels,active,widths)
   return
  self.rect(x,y,sum(widths)+6,36,'muted',8);xx=x+3
  for label,w in zip(labels,widths):
   if label==active:self.rect(xx,y+3,w,30,'background',8,extra='filter="url(#shadow)"')
   self.text(xx+w/2,y+23,label,14,'foreground' if label==active else 'muted-foreground',500);self.parts[-1]=self.parts[-1].replace('<text ','<text text-anchor="middle" ');xx+=w
 def choice(self,x,y,labels,active,widths):
  xx=x
  for label,w in zip(labels,widths):
   self.rect(xx,y,w,36,'accent' if label==active else 'background',8,'input')
   self.text(xx+w/2,y+23,label,14,'accent-foreground' if label==active else 'foreground',500);self.parts[-1]=self.parts[-1].replace('<text ','<text text-anchor="middle" ');xx+=w
 def toggle(self,x,y,on):self.rect(x,y,32,19,'primary' if on else 'input',10);self.circle(x+23 if on else x+9,y+9.5,7.5,'background')
 def card(self,x,y,w,h,title,desc):
  self.rect(x,y,w,h,'card',12,'border',extra='filter="url(#shadow)"');self.text(x+24,y+36,title,18,weight=600);self.text(x+24,y+60,desc,14,'muted-foreground')
 def group(self,x,y):self.parts.append(f'<g transform="translate({x} {y})">')
 def end(self):self.parts.append('</g>')
 def save(self,name):(OUT/name).write_text(''.join(self.parts)+'</svg>')
def card_content(s,n,x,y,w=320):
 heights={1:240,2:368,3:244,4:340,5:280,6:320,7:280,8:356};h=heights[n]
 titles={1:('A productive week','Your workspace, at a glance.'),2:('Account profile','A familiar face for your workspace.'),3:('Team access','The right people, the right access.'),4:('Workspace settings','A space for focused work.'),5:('Notifications','Choose what reaches you.'),6:('How can we help?','Send a note to the support team.'),7:('Recent activity','Small steps, steady progress.'),8:('Room to think','FIELD NOTES  /  004')}
 s.card(x,y,w,h,*titles[n]);a=x+24;q=w-48
 if n==1:
  s.text(a,y+108,'32',36,weight=600);s.text(a+62,y+104,'tasks completed',14,'muted-foreground');s.text(a,y+135,'8 more than last week',12,'muted-foreground')
  for i,v in enumerate([22,36,29,49,42,63,53]):s.rect(a+i*(q/7),y+209-v,q/7-10,v,'chart-3' if i<6 else 'chart-2',4)
  for i,t in enumerate(['M','T','W','T','F','S','S']):s.text(a+i*(q/7)+7,y+228,t,10,'muted-foreground')
 elif n==2:
  s.circle(a+20,y+104,20,'secondary');s.text(a+8,y+109,'AL',13,weight=600);s.text(a+54,y+102,'Ada Lovelace',14,weight=500);s.text(a+54,y+122,'Personal workspace',12,'muted-foreground')
  s.input(a,y+165,q,'Display name','Ada Lovelace',mobile=w>320);s.input(a,y+239,q,'Email','ada@example.com',mobile=w>320);s.button(a,y+308,q,'Save profile','primary')
 elif n==3:
  for i,(initial,name,role) in enumerate([('AL','Ada Lovelace','Owner'),('GH','Grace Hopper','Editor')]):
   yy=y+99+i*48;s.circle(a+16,yy,16,'secondary');s.text(a+6,yy+5,initial,10,weight=600);s.text(a+44,yy+4,name,14);s.text(x+w-64,yy+4,role,12,'muted-foreground')
  s.button(a,y+184,q,'Manage access')
 elif n==4:
  s.input(a,y+101,q,'Workspace name','Studio North');s.input(a,y+177,q,'Default view','Board',True);s.text(a,y+255,'A shared place for your next idea.',12,'muted-foreground');s.button(a,y+280,q,'Save workspace','primary')
 elif n==5:
  for i,(label,desc,on) in enumerate([('Weekly digest','A thoughtful summary.',True),('Product updates','News from the team.',False)]):
   yy=y+108+i*68;s.text(a,yy,label,14,weight=500);s.text(a,yy+21,desc,12,'muted-foreground');s.toggle(x+w-56,yy-12,on)
  s.button(a,y+220,q,'Save preferences','primary')
 elif n==6:
  s.input(a,y+101,q,'Topic','Using the workspace',True);s.text(a,y+178,'Message',14,weight=500);s.rect(a,y+190,q,54,'card',8,'input');s.text(a+12,y+214,'I would like to…',14,'muted-foreground');s.button(a,y+260,q,'Send message','primary')
 elif n==7:
  for i,(t,sub) in enumerate([('Profile updated','Today · 10:42'),('Workspace created','Yesterday · 14:18'),('Welcome to your space','Monday · 09:00')]):
   yy=y+103+i*62
   if i<2:s.line(a+5,yy,a+5,yy+62)
   s.circle(a+5,yy-3,4,'primary');s.text(a+24,yy,t,14,weight=500);s.text(a+24,yy+22,sub,12,'muted-foreground')
 else:
  s.text(a,y+106,'Make space for',25,weight=600);s.text(a,y+138,'the work that matters.',25,weight=600)
  for i,t in enumerate(['A quieter interface gives the work','a little more room. Clear choices,','familiar patterns, and details that','stay out of your way.']):s.text(a,y+180+i*23,t,14,'muted-foreground')
  s.rect(a,y+280,q,48,'muted',8);s.text(a+16,y+309,'Good design leaves room.',14,weight=500)
 return h
def gallery(s,x,y):
 for col,ns in enumerate([[1,2,3],[4,5,6],[7,8]]):
  yy=y
  for n in ns:yy+=card_content(s,n,x+col*344,yy)+16
def editor(s,x,y,w,mobile=False,active='Colors'):
 s.tabs(x,y,['Colors','Typography','Other','Command'],active,[65,99,60,88])
 if active=='Colors':
  s.text(x,y+79,'Color palette',18,weight=600);s.text(x,y+103,'Edit one token in the light palette.',14,'muted-foreground')
  for i,c in enumerate(['background','foreground','primary','secondary','accent','muted']):s.rect(x+i*49,y+126,40,32,c,8,'border')
  s.input(x,y+201,w,'Token','primary',True,mobile);s.input(x,y+285,w,'Value (oklch)','oklch(0.35 0.05 260)',mobile=mobile);s.text(x,y+361,'Changes apply after validation.',14,'muted-foreground');s.button(x,y+384,w,'Apply edit','primary')
 else:
  s.text(x,y+79,'Shape & rhythm',18,weight=600);s.text(x,y+103,'One setting at a time. Clear feedback.',14,'muted-foreground');s.input(x,y+155,w,'Setting','Radius (md)',True,mobile);s.input(x,y+239,w,'Setting value','0.75rem',mobile=mobile);s.text(x,y+310,'Use a non-negative length, e.g. 0.5rem.',14,'muted-foreground');s.button(x,y+338,w,'Apply setting','primary');s.text(x,y+410,'Also in Other',14,weight=500);s.text(x,y+435,'Spacing density · Shadow blur',14,'muted-foreground');s.text(x,y+458,'Base motion duration',14,'muted-foreground')
s=SVG(1600,1000,'Desktop — Quiet workspace, 1600 × 1000');s.rect(0,0,1600,1000,'background');s.rect(0,0,1600,56,'card');s.text(24,35,'personal-ui-system',18,weight=600);s.text(1517,34,'GitHub ↗',14);s.line(0,56,1600,56);s.rect(0,57,352,943,'card');s.line(352,56,352,1000);s.rect(349,489,6,32,'input',3)
s.text(24,88,'Active theme',12,'muted-foreground');s.rect(24,100,304,36,'background',8,'input');s.text(36,123,'Quiet Studio',14,weight=500);s.text(302,123,'⌄',16,'muted-foreground');s.text(24,160,'Revision 3 · Unsaved',12,'muted-foreground');s.line(0,180,352,180);editor(s,20,200,312)
s.line(24,656,328,656);s.text(24,690,'Compared with baseline',14,weight=600);s.text(24,716,'Quiet Editorial · 1 changed token',12,'muted-foreground');s.text(24,753,'radius.md',12,mono=True);s.text(24,781,'0.5rem → 0.75rem',14,mono=True);s.button(24,809,304,'View baseline diff');s.button(24,922,304,'Fork theme')
s.rect(353,57,1247,64,'card');s.tabs(376,71,['Light','Dark'],'Light',[62,62]);s.text(538,94,'Preview width',12,'muted-foreground');s.tabs(637,71,['390','1024'],'1024',[53,53]);s.button(1128,71,130,'Proposal JSON');s.button(1270,71,126,'Export JSON');s.button(1408,71,168,'Save theme','primary');s.line(353,121,1600,121);s.tabs(376,141,['Cards','States'],'Cards',[65,65]);s.text(1420,164,'Quiet Studio · light',12,'muted-foreground')
s.parts.append('<clipPath id="galleryclip"><rect x="376" y="197" width="1200" height="779"/></clipPath><g clip-path="url(#galleryclip)">');gallery(s,464,197);s.end();s.rect(1588,208,4,476,'border',2);s.save('desktop.svg')
g=SVG(1008,1000,'Eight compositions — complete gallery');g.rect(0,0,1008,1000,'background');gallery(g,0,0);g.save('gallery.svg')
m=SVG(1250,932,'Mobile — Controls, Preview, staged proposal at 390 × 844');m.rect(0,0,1250,932,'muted')
for col,(title,sub) in enumerate([('01 / Controls','Other tab · active theme'),('02 / Preview','Cards · 390px preview frame'),('03 / Candidate review','Proposal staged · active theme unchanged')]):
 x=16+col*414;m.text(x,28,title,16,weight=600);m.text(x,51,sub,12,'muted-foreground');m.group(x,72);m.parts.append(f'<clipPath id="phone{col}"><rect width="390" height="844"/></clipPath><g clip-path="url(#phone{col})">');m.rect(0,0,390,844,'background');m.rect(0,0,390,56,'card');m.text(16,34,'personal-ui-system',16,weight=600);m.text(307,34,'GitHub ↗',14);m.line(0,56,390,56);m.tabs(16,68,['Controls','Preview'],'Controls' if col==0 else 'Preview',[176,176])
 if col==0:
  m.text(16,133,'Active theme',12,'muted-foreground');m.rect(16,145,358,36,'card',8,'input');m.text(28,169,'Quiet Studio',16);m.text(350,169,'⌄',16);m.text(16,207,'Revision 3 · Unsaved',12,'muted-foreground');m.line(0,225,390,225);editor(m,16,241,358,True,'Other');m.line(16,735,374,735);m.button(16,753,171,'Fork theme');m.button(203,753,171,'Baseline diff')
 elif col==1:
  m.tabs(16,120,['Light','Dark'],'Light',[62,62]);m.button(238,120,136,'Save theme','primary');m.button(16,168,172,'Proposal JSON');m.button(200,168,174,'Export JSON');m.text(16,238,'Preview width',12,'muted-foreground');m.tabs(240,217,['390','1024'],'390',[62,62]);m.line(0,269,390,269);m.tabs(16,285,['Cards','States'],'Cards',[65,65]);card_content(m,1,16,341,358);card_content(m,2,16,597,358)
 else:
  m.rect(16,120,358,120,'secondary',8);m.text(32,148,'Previewing a proposal',18,weight=600);m.text(32,174,'2 changes · not applied or saved',14);m.text(32,199,'Theme edits and saving are paused.',14,'muted-foreground');m.text(32,221,'Apply or discard to continue.',14,'muted-foreground');m.card(16,256,358,339,'Review changes','design-command-1 · Quiet Studio r3');m.text(40,350,'Radius (md)',14,weight=500);m.text(40,377,'0.75rem → 1rem',16,mono=True);m.line(40,401,350,401);m.text(40,432,'Spacing density',14,weight=500);m.text(40,459,'1 → 1.1',16,mono=True);m.text(40,493,'Candidate revision 4',12,'muted-foreground');m.button(40,519,151,'Apply proposal','primary');m.button(203,519,147,'Discard proposal');m.text(16,627,'Candidate preview',14,weight=600);card_content(m,1,16,650,358)
 m.end();m.end()
m.save('mobile.svg')
print('Wrote desktop.svg, mobile.svg, gallery.svg')
