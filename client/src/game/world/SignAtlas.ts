import * as THREE from 'three';

export function makeSignAtlas(labels: readonly string[]): THREE.CanvasTexture | null {
  if(typeof document==='undefined'||typeof CanvasRenderingContext2D==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.ceil(labels.length/2)*96;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.fillStyle='#304d43';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<labels.length;i+=1){
    const x=(i%2)*512,y=Math.floor(i/2)*96;
    ctx.strokeStyle='#bcab80';ctx.lineWidth=2;ctx.strokeRect(x+9,y+9,494,78);
    ctx.fillStyle='#f3e8cb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 28px Georgia';
    ctx.fillText(labels[i]!,x+256,y+48,460);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}
