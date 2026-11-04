#!/usr/bin/env python3
"""Isolate bride/groom, replace illustrated faces with real HD photos, upscale 6x."""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageFilter

BASE=Path(__file__).resolve().parents[1]
DEST=BASE/"burgundy"/"figures-hd.png"
SCALE=6

def silhouette(src):
    im=cv2.cvtColor(np.asarray(src.convert("RGB")),cv2.COLOR_RGB2BGR)
    h,w=im.shape[:2]
    m=np.zeros((h,w),np.uint8)
    left=np.array([(0,489),(14,473),(32,464),(43,415),(181,441),(174,467),(170,502),(164,549),(170,563),(168,608),(164,645),(145,707),(137,750),(114,758),(103,800),(90,810),(0,810)],np.int32)
    right=np.array([(337,572),(374,552),(483,532),(500,600),(524,627),(525,810),(344,810),(333,768),(333,720),(344,666)],np.int32)
    cv2.fillPoly(m,[left,right],cv2.GC_PR_FGD)
    interiors=[
      [(32,555),(75,575),(102,715),(60,795),(20,760)],
      [(57,429),(145,448),(127,481),(45,463)],
      [(5,512),(23,498),(27,570),(4,584)],
      [(367,686),(452,671),(492,771),(420,807),(374,793)],
      [(380,565),(467,550),(477,588),(394,601)],
      [(502,630),(518,665),(521,791),(493,763)]
    ]
    for poly in interiors: cv2.fillPoly(m,[np.array(poly,np.int32)],cv2.GC_FGD)
    bg=np.zeros((1,65),np.float64);fg=np.zeros((1,65),np.float64)
    cv2.grabCut(im,m,None,bg,fg,10,cv2.GC_INIT_WITH_MASK)
    mask=np.where((m==2)|(m==0),0,255).astype(np.uint8)
    n, comps, stats, _=cv2.connectedComponentsWithStats(mask,8)
    clean=np.zeros_like(mask)
    for i in range(1,n):
        if stats[i,cv2.CC_STAT_AREA]>900: clean[comps==i]=255
    return Image.fromarray(clean,"L")

def crop_photo(path,region):
    im=Image.open(path).convert("RGB")
    w,h=im.size
    a,b,c,d=region
    return np.asarray(im.crop((int(a*w),int(b*h),int(c*w),int(d*h))))

def main():
    original=Image.open(BASE/"main.png").convert("RGBA")
    if original.size!=(525,810): raise ValueError("main.png should be 525x810")
    w,h=original.size
    mask=silhouette(original).filter(ImageFilter.GaussianBlur(.38))
    original.putalpha(mask)
    art=original.resize((w*SCALE,h*SCALE),Image.Resampling.LANCZOS)
    art=art.filter(ImageFilter.UnsharpMask(radius=1.0,percent=110,threshold=2))
    canvas=np.zeros((h*SCALE,w*SCALE,4),np.uint8)
    erase=np.zeros((h*SCALE,w*SCALE),np.uint8)
    portraits=[
       ("matti hd.png",(0.14,0.16,0.87,0.77),[(52,440),(166,458),(146,564),(34,536)]),
       ("ker hd.png",(0.10,0.16,0.91,0.85),[(366,565),(472,540),(495,663),(386,688)])
    ]
    for filename,region,quad in portraits:
        picture=crop_photo(BASE/filename,region)
        ph,pw=picture.shape[:2]
        start=np.float32([[0,0],[pw-1,0],[pw-1,ph-1],[0,ph-1]])
        end=np.float32(quad)*SCALE
        H=cv2.getPerspectiveTransform(start,end)
        warped=cv2.warpPerspective(picture,H,(w*SCALE,h*SCALE),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
        cover=np.zeros((h*SCALE,w*SCALE),np.uint8)
        cv2.fillConvexPoly(cover,np.round(end).astype(np.int32),255)
        cover=cv2.GaussianBlur(cover,(0,0),.7)
        canvas[cover>0,:3]=warped[cover>0]
        canvas[:,:,3]=np.maximum(canvas[:,:,3],cover)
        erase=np.maximum(erase,cover)
    arr=np.asarray(art).copy()
    arr[:,:,3]=np.where(erase>0,0,arr[:,:,3])
    result=Image.alpha_composite(Image.fromarray(arr,"RGBA"),Image.fromarray(canvas,"RGBA"))
    DEST.parent.mkdir(parents=True,exist_ok=True)
    result.save(DEST,optimize=True,compress_level=7)
    print("Rendered",DEST.name,result.size,DEST.stat().st_size,"bytes")
    # Invariant: never overwrite original HD photos, nor the source illustration.
    assert result.size==(3150,4860)

if __name__=="__main__":main()
