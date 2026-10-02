from PIL import Image, ImageCms, PngImagePlugin
from pathlib import Path
import zlib, struct, json
r=Path(__file__).parent
profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
manifest={}
def record(name,accept,metadata=False):manifest[name]={'should_accept_after_sanitize':accept,'has_metadata':metadata}
im=Image.new('RGB',(256,256),(70,120,180));alpha=Image.new('RGBA',(256,256),(70,120,180,127))
for ext in ['png','webp']:
 im.save(r/f'clean.{ext}');record(f'clean.{ext}',True)
 im.save(r/f'icc.{ext}',icc_profile=profile);record(f'icc.{ext}',True,True)
 im.resize((513,256)).save(r/f'oversize-dimensions.{ext}');record(f'oversize-dimensions.{ext}',False)
 alpha.save(r/f'alpha-icc.{ext}',icc_profile=profile);record(f'alpha-icc.{ext}',True,True)
 im.save(r/f'animated.{ext}',save_all=True,append_images=[Image.new('RGB',(256,256),'white')],duration=100,loop=0);record(f'animated.{ext}',False)
 b=(r/f'clean.{ext}').read_bytes()
 r.joinpath(f'truncated.{ext}').write_bytes(b[:-1]);record(f'truncated.{ext}',False)
 trailing=b+b'PRIVATE-DO-NOT-STORE'
 if ext=='webp':trailing=trailing[:4]+struct.pack('<I',len(trailing)-8)+trailing[8:]
 r.joinpath(f'trailing.{ext}').write_bytes(trailing);record(f'trailing.{ext}',False)
alpha.save(r/'alpha-lossless-icc.webp',lossless=True,icc_profile=profile);record('alpha-lossless-icc.webp',True,True)
meta=PngImagePlugin.PngInfo();meta.add_text('Comment','PRIVATE-DO-NOT-STORE');meta.add_text('Location','PRIVATE-DO-NOT-STORE',zip=True);meta.add_itxt('Author','PRIVATE-DO-NOT-STORE')
im.save(r/'private-metadata.png',pnginfo=meta,icc_profile=profile,exif=b'Exif\x00\x00PRIVATE-DO-NOT-STORE');record('private-metadata.png',True,True)
im.save(r/'private-metadata.webp',icc_profile=profile,exif=b'Exif\x00\x00PRIVATE-DO-NOT-STORE',xmp=b'PRIVATE-DO-NOT-STORE');record('private-metadata.webp',True,True)
def chunk(name,data):
 tag=name.encode();return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
b=(r/'clean.png').read_bytes()
r.joinpath('unknown-critical.png').write_bytes(b[:33]+chunk('TEST',b'x')+b[33:]);record('unknown-critical.png',False)
r.joinpath('missing-image.png').write_bytes(b[:33]+b[-12:]);record('missing-image.png',False)
r.joinpath('oversize-bytes.png').write_bytes(b[:33]+chunk('tEXt',b'Comment\x00'+b'a'*181000)+b[33:]);record('oversize-bytes.png',False)
r.joinpath('fixtures.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(manifest)} fixtures created')
