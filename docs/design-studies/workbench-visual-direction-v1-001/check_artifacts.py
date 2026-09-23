"""Read-only source checks; no browser or pixel verification claimed."""
from pathlib import Path
from xml.etree import ElementTree as ET
from html.parser import HTMLParser
import base64, hashlib, json, re

root=Path(__file__).resolve().parent
ns={'s':'http://www.w3.org/2000/svg'}
report=[]
for name,wh in [('desktop.svg',(1600,1000)),('mobile.svg',(1250,932)),('gallery.svg',(1008,1000))]:
 p=root/name; tree=ET.parse(p); svg=tree.getroot()
 assert (int(svg.attrib['width']),int(svg.attrib['height']))==wh
 assert svg.find('s:title',ns) is not None and svg.find('s:desc',ns) is not None
 ids=[e.attrib['id'] for e in svg.iter() if 'id' in e.attrib]
 assert len(ids)==len(set(ids))
 for e in svg.iter():
  assert e.tag.split('}')[-1] not in ('script','foreignObject','image','a')
  assert not any(k.startswith('on') or 'href' in k for k in e.attrib)
  if e.tag.endswith('rect'):
   assert float(e.attrib['width'])>=0 and float(e.attrib['height'])>=0
  for val in e.attrib.values():
   if val.startswith('url(#'):assert val[5:-1] in ids
 texts=[e.text for e in svg.findall('s:text',ns)]
 if name=='gallery.svg':
  for title in ['A productive week','Account profile','Team access','Workspace settings','Notifications','How can we help?','Recent activity','Room to think']:
   assert texts.count(title)==1, title
 report.append({'file':name,'size':wh,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'xml_and_structure':'pass'})
class Links(HTMLParser):
 def __init__(self):
  super().__init__()
  self.embedded=[]
 def handle_starttag(self,tag,attrs):
  assert tag not in ('script','iframe','object','embed','source','link'),tag
  attributes=dict(attrs)
  assert 'srcset' not in attributes, 'External image alternatives are not allowed'
  if tag=='img':
   name=attributes.get('data-study')
   assert name in ('desktop.svg','mobile.svg','gallery.svg'),name
   src=attributes.get('src','')
   prefix='data:image/svg+xml;base64,'
   assert src.startswith(prefix), 'Required external image dependency: '+src
   decoded=base64.b64decode(src[len(prefix):],validate=True)
   assert decoded==(root/name).read_bytes(), 'Embedded study differs: '+name
   ET.fromstring(decoded)
   self.embedded.append(name)
   return
  for key,value in attrs:
   if key in ('src','href'):
    assert tag=='a' and key=='href', 'Required external resource: '+str(value)
    assert '://' not in value and not value.startswith('//'),value
    if not value.startswith('#'):assert (root/value).is_file(),value
review=(root/'review.html').read_text()
assert not re.search(r'url\s*\(|@import', review, re.I), 'CSS resource dependency is not allowed'
links=Links()
links.feed(review)
assert sorted(links.embedded)==['desktop.svg','gallery.svg','mobile.svg'],links.embedded
print(json.dumps({'checks':report,'local_review_links':'pass','embedded_studies':links.embedded,'embedded_svg_bytes_match_sources':'pass','required_external_image_dependencies':0,'review_sha256':hashlib.sha256(review.encode()).hexdigest(),'gallery_card_count':8,'runtime_or_pixel_verification':'not performed; prohibited browser/Computer Use'},indent=2))
