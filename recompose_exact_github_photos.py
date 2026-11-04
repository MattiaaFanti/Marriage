#!/usr/bin/env python3
"""Replace images in existing wedding cover with the exact HD PNG files in this repository."""
from pathlib import Path
from PIL import Image
import numpy as np
import cv2
ROOT=Path(__file__).resolve().parent
cover=ROOT/'cover-kirsten-mattia.webp'
im=np.asarray(Image.open(cover).convert('RGB')).copy()
h,w=im.shape[:2]
assert (w,h)==(2048,3072),f'Unexpected cover dimensions {(w,h)}'
for filename,region,corners in [
    ('matti hd.png',(.16,.23,.86,.85),[[186,687],[395,735],[363,944],[141,900]]),
    ('ker hd.png',(.14,.27,.88,.87),[[623,761],[825,717],[881,969],[667,1007]]),
]:
    photo=Image.open(ROOT/filename).convert('RGB')
    sw,sh=photo.size
    a,b,c,d=region
    crop=np.asarray(photo.crop((int(sw*a),int(sh*b),int(sw*c),int(sh*d))))
    ph,pw=crop.shape[:2]
    dst=np.float32(corners)*2
    src=np.float32([[0,0],[pw-1,0],[pw-1,ph-1],[0,ph-1]])
    matrix=cv2.getPerspectiveTransform(src,dst)
    warped=cv2.warpPerspective(crop,matrix,(w,h),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
    alpha=np.zeros((h,w),dtype=np.uint8)
    cv2.fillConvexPoly(alpha,np.round(dst).astype('int32'),255)
    alpha=cv2.GaussianBlur(alpha,(3,3),.5)
    blend=alpha[:,:,None]/255.
    im=np.clip(im*(1-blend)+warped*blend,0,255).astype('uint8')
    print('Mapped original',filename,photo.size)
Image.fromarray(im).save(cover,format='WEBP',quality=96,method=6)
print('Cover updated:',cover.stat().st_size,'bytes')