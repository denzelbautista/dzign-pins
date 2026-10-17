import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const studioFeedback = document.querySelector('#studio-feedback');
// Five supplied artworks, configured independently from the 3D composition.
function graphicTexture(type = 'idea') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const dark = ['self','brand'].includes(type);
  // Colour pairs for the "Para quién" scenes; the hero keeps its neutral pins.
  const [bg,fg] = {gift:['#fff3e3','#cf2f2a'],community:['#f4dd8a','#22412f'],here:['#22412f','#f4dd8a'],yourbrand:['#24345e','#fafbf3']}[type] || (dark ? ['#24251f','#f5f5ed'] : ['#e9eadf','#252620']);
  ctx.fillStyle = bg; ctx.fillRect(0,0,1024,1024);
  ctx.fillStyle = fg;
  ctx.textAlign='center';ctx.textBaseline='middle';
  const family='"Arial Rounded MT Bold", "Arial Rounded MT", Arial, sans-serif';
  const words={self:['sé','tú.'],move:['ideas','en camino.'],brand:['dzing','pins'],hello:['hola,','mundo.'],idea:['tu','idea.'],gift:['para','ti.'],community:['somos','parte.'],here:['aquí.',''],yourbrand:['tu','marca.']}[type] || ['tu','idea.'];
  ctx.font=`bold ${type === 'move' ? 115 : 185}px ${family}`;
  if(words[1]){ctx.fillText(words[0],512,410,640);ctx.fillText(words[1],512,604,640);}else ctx.fillText(words[0],512,512,640);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4; return {canvas,texture};
}
const visibleRatio=3.2/4.4; // Provisional print-to-visible-area relationship, confirmed before production.
function curvedFace(){
  const positions=[],uvs=[],indices=[];const rings=32,segments=128;
  const crossSection=[];
  for(let ring=0;ring<=rings;ring++){
    const radius=ring/rings*.979;
    crossSection.push({radius,z:.036+.145*Math.pow(1-radius*radius,.7),paperRadius:radius});
  }
  // The printed paper continues over the shoulder and folds behind the back.
  // Its UV radius follows distance along the paper, rather than stretching the
  // front's last pixel into a band or restarting the image at the outer edge.
  const shoulder=crossSection.at(-1);
  const fold=new THREE.CatmullRomCurve3([
    [shoulder.radius,shoulder.z],[.993,.035],[1.003,.005],[1.004,-.035],
    [.994,-.085],[.975,-.122],[.952,-.140],[.935,-.144],[.912,-.142]
  ].map(([r,z])=>new THREE.Vector3(r,z,0)),false,'centripetal').getPoints(56);
  let paperRadius=shoulder.paperRadius;
  for(let step=1;step<fold.length;step++){
    paperRadius+=fold[step].distanceTo(fold[step-1]);
    crossSection.push({radius:fold[step].x,z:fold[step].y,paperRadius});
  }
  for(const {radius,z,paperRadius} of crossSection){
    for(let seg=0;seg<=segments;seg++){
      const a=seg/segments*Math.PI*2,x=Math.cos(a)*radius,y=Math.sin(a)*radius;
      // Pressed flat against the back, the folded paper crinkles radially.
      const crinkle=z<-.1?Math.min(1,(-.1-z)/.03)*.0035*Math.sin(a*96+Math.sin(a*17)*2):0;
      positions.push(x,y,z-crinkle);uvs.push(.5+Math.cos(a)*paperRadius/2*visibleRatio,.5+Math.sin(a)*paperRadius/2*visibleRatio);
    }
  }
  for(let r=0;r<crossSection.length-1;r++)for(let s=0;s<segments;s++){
    const a=r*(segments+1)+s,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
const faceGeometry=curvedFace();
function makePin(texture){
  const group=new THREE.Group();
  const front=new THREE.Mesh(faceGeometry,new THREE.MeshPhysicalMaterial({map:texture,roughness:.42,metalness:0,clearcoat:.55,clearcoatRoughness:.22,side:THREE.DoubleSide}));group.add(front);group.userData.front=front;
  const white=new THREE.MeshPhysicalMaterial({color:0xf1f0e9,roughness:.31,metalness:0,clearcoat:.4});
  const steel=new THREE.MeshStandardMaterial({color:0xd5d7d2,metalness:1,roughness:.22});
  group.add(...pinBackParts(white,steel));
  return group;
}
// Rear of the real 32 mm pin (video frames t37/t46/t52): a white plastic back
// seen in profile (t43) as two bands: past the folded paper comes a flat lip,
// then a raised ring about as deep as the front band, then a drop to a flat
// recessed floor (~80% of the diameter) pierced by
// two round holes on one axis. Outside, only three wire features show: a
// spring coil sunk in one hole, a straight needle and a teardrop catch whose
// legs drop into the other hole. The zigzag arm joining them runs on the
// inner face (t29/t31/t55), hidden against the shell, so it is not modelled.
// Lathe y becomes pin z after rotation; more negative z faces the back viewer.
const BACK_FLOOR_Z=-.204,BACK_FLOOR_R=.80,BACK_HOLE_X=.6,BACK_HOLE_R=.125,BACK_HOLE_DEPTH=.044;
const backRimGeometry=new THREE.LatheGeometry([
  // floor edge -> raised ring (about as deep as the front band) -> flat lip flush
  // with the folded paper, which overlaps it; nothing stands outside the fold.
  [.800,-.204],[.801,-.222],[.806,-.238],[.815,-.250],[.828,-.257],[.842,-.259],[.856,-.256],[.868,-.247],
  [.877,-.232],[.882,-.212],[.885,-.185],[.887,-.160],[.890,-.146],[.897,-.140],[.910,-.138],[.940,-.136],[.960,-.120]
].map(([r,z])=>new THREE.Vector2(r,z)),128);
const backFloorGeometry=(()=>{
  const shape=new THREE.Shape();shape.absarc(0,0,BACK_FLOOR_R,0,Math.PI*2,false);
  [-BACK_HOLE_X,BACK_HOLE_X].forEach(x=>{const hole=new THREE.Path();hole.absarc(x,0,BACK_HOLE_R,0,Math.PI*2,true);shape.holes.push(hole)});
  return new THREE.ShapeGeometry(shape,64);
})();
const backHoleWallGeometry=new THREE.CylinderGeometry(BACK_HOLE_R,BACK_HOLE_R,BACK_HOLE_DEPTH,48,1,true);
const backHoleBottomGeometry=new THREE.CircleGeometry(BACK_HOLE_R+.004,48);
// Moulded "DC-32", tone on tone: a near-white map with a faint emboss.
const backFloorMap=(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);
  ctx.font='bold 98px "Arial Rounded MT Bold", Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const y=256+.30/(BACK_FLOOR_R*2)*512; // below the needle axis, as on the real part
  ctx.fillStyle='#dcdbd2';ctx.fillText('DC-32',259,y+3);
  ctx.fillStyle='#ffffff';ctx.fillText('DC-32',255,y-1);
  ctx.fillStyle='#f6f6f2';ctx.fillText('DC-32',256,y);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  // ShapeGeometry UVs are raw shape coordinates; remap [-R,R] to [0,1].
  texture.repeat.set(1/(BACK_FLOOR_R*2),1/(BACK_FLOOR_R*2));texture.offset.set(.5,.5);
  return texture;
})();
const backWireGeometries=(()=>{
  const h=value=>BACK_FLOOR_Z-value; // height above the floor -> pin z
  const radius=.018,geos=[];
  // Polyline with short rounded bends, like bent wire.
  function bent(points,bend=.022){
    const v=points.map(([x,y,height])=>new THREE.Vector3(x,y,h(height)));
    const path=new THREE.CurvePath();let cursor=v[0].clone();
    for(let i=1;i<v.length-1;i++){
      const inDir=v[i].clone().sub(v[i-1]),outDir=v[i+1].clone().sub(v[i]);
      const d=Math.min(bend,inDir.length()/2,outDir.length()/2);
      const a=v[i].clone().addScaledVector(inDir.normalize(),-d),b=v[i].clone().addScaledVector(outDir.normalize(),d);
      if(cursor.distanceTo(a)>1e-4)path.add(new THREE.LineCurve3(cursor,a));
      path.add(new THREE.QuadraticBezierCurve3(a,v[i].clone(),b));cursor=b;
    }
    path.add(new THREE.LineCurve3(cursor,v.at(-1)));
    geos.push(new THREE.TubeGeometry(path,points.length*24,radius,10,false));
  }
  const coilX=-BACK_HOLE_X,coilH=.04,coilR=.062,coilY0=.09,coilY1=-.02,hollow=-.042;
  // Spring: 2.5 turns, axis across the needle (along y), its lower half sunk
  // in the hole; a short leg drops through the hole towards the inner arm.
  bent([[coilX,coilY0,hollow],[coilX,coilY0,coilH-coilR]]);
  const coil=[];
  for(let step=0;step<=150;step++){
    const t=step/150,angle=-Math.PI/2-t*Math.PI*5;
    coil.push(new THREE.Vector3(coilX+Math.cos(angle)*coilR,coilY0+(coilY1-coilY0)*t,h(coilH+Math.sin(angle)*coilR)));
  }
  geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil),200,radius,10,false));
  // Catch (reference photos): a slightly leaning teardrop loop rising from the
  // other hole; the needle passes through it and its tip pokes out beyond.
  const loop=[[.035,hollow],[.05,.05],[.07,.12],[.045,.18],[0,.2],[-.045,.18],[-.07,.12],[-.05,.05],[-.035,hollow]]
    .map(([y,height])=>new THREE.Vector3(BACK_HOLE_X+.006,y-.15*Math.max(0,height),h(height)));
  geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop,false,'centripetal'),96,radius,10,false));
  // Needle: from the top of the coil, straight, pointed tip resting in the catch.
  const start=new THREE.Vector3(coilX,coilY1,h(coilH+coilR)),tipBase=new THREE.Vector3(BACK_HOLE_X+.03,0,h(.111)),tip=new THREE.Vector3(BACK_HOLE_X+.1,0,h(.112));
  [[start,tipBase,radius,radius],[tipBase,tip,radius,.002]].forEach(([from,to,r0,r1])=>{
    const dir=to.clone().sub(from),geo=new THREE.CylinderGeometry(r1,r0,dir.length(),12);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize()));
    const mid=from.clone().add(to).multiplyScalar(.5);geo.translate(mid.x,mid.y,mid.z);geos.push(geo);
  });
  return geos;
})();
function pinBackParts(white,steel){
  const parts=[];
  const rim=new THREE.Mesh(backRimGeometry,white);rim.rotation.x=Math.PI/2;parts.push(rim);
  const floorMaterial=white.clone();floorMaterial.map=backFloorMap;
  const floor=new THREE.Mesh(backFloorGeometry,floorMaterial);floor.rotation.y=Math.PI;floor.position.z=BACK_FLOOR_Z;parts.push(floor);
  const holeWall=white.clone();holeWall.side=THREE.DoubleSide;holeWall.color.multiplyScalar(.82);
  const holeBottom=new THREE.MeshStandardMaterial({color:0x5d5f59,metalness:.85,roughness:.45});
  [-BACK_HOLE_X,BACK_HOLE_X].forEach(x=>{
    const wall=new THREE.Mesh(backHoleWallGeometry,holeWall);wall.rotation.x=Math.PI/2;wall.position.set(x,0,BACK_FLOOR_Z+BACK_HOLE_DEPTH/2);parts.push(wall);
    const bottom=new THREE.Mesh(backHoleBottomGeometry,holeBottom);bottom.rotation.y=Math.PI;bottom.position.set(x,0,BACK_FLOOR_Z+BACK_HOLE_DEPTH);parts.push(bottom);
  });
  backWireGeometries.forEach(geo=>parts.push(new THREE.Mesh(geo,steel)));
  return parts;
}
/* Píxeles por unidad de la cámara del simulador: constante por breakpoint para que el pin mida lo mismo aunque cambie el alto del lienzo (antes 510/4.1 en escritorio y 320/4.1 en móvil). */
// Pixels per scene unit in the simulator, so the pin keeps its on-screen size when the stage shrinks.
// Desktop reference: before the clean-up the controls column (~770px) set the stage height.
function studioPxPerUnit(){return matchMedia('(max-width:760px)').matches?78.05:matchMedia('(max-width:1100px)').matches?140:170}
function createScene(element,kind){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:kind==='studio',powerPreference:'low-power'});}catch(e){element?.classList.add('webgl-failed');return null;}
  if(!renderer){element?.classList.add('webgl-failed');return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,100);camera.position.set(0,0,10);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;pmrem.dispose();
  const ambient=new THREE.AmbientLight(0xffffff,1.2);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-3,5,7);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(4,-2,4);scene.add(fill);
  const api={renderer,scene,camera,element,visible:false,rendered:false,render(){renderer.render(scene,camera);if(!api.rendered){api.rendered=true;requestAnimationFrame(()=>element.classList.add('webgl-ready'))}},resize(){const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;const vertical=kind==='hero'?Math.max(6.7,5.1/aspect):kind==='audience'?Math.max(4.6,4.2/aspect):kind==='studio'?h/studioPxPerUnit():4.1;camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();api.render();if(api.afterResize)api.afterResize()}};
  const resizeObserver=new ResizeObserver(()=>api.resize());resizeObserver.observe(element);
  const visibilityObserver=new IntersectionObserver(entries=>{api.visible=entries[0].isIntersecting;if(api.visible)api.render()},{rootMargin:'80px'});visibilityObserver.observe(element);
  // Moves the same renderer to another container (one WebGL context shared by several panels).
  api.attach=next=>{resizeObserver.unobserve(element);visibilityObserver.unobserve(element);element=api.element=next;next.prepend(renderer.domElement);resizeObserver.observe(next);visibilityObserver.observe(next);api.resize();};
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();element.classList.remove('webgl-ready');element.classList.add('webgl-failed');renderer.domElement.style.display='none';if(kind==='hero'){element.innerHTML='<div class="fallback-pin hero-fallback"><img src="/designs/ejemplo3.jpg" alt="Diseño de ejemplo"></div>'}else if(kind==='studio'){element.innerHTML='<div class="fallback-pin">tu<br>idea.</div>';studioFeedback.textContent='La vista 3D no está disponible. Puedes seguir preparando tu consulta.'}});
  api.resize();return api;
}
const hero=createScene(document.querySelector('#hero-scene'),'hero');
if(!hero){const el=document.querySelector('#hero-scene');if(el){el.classList.add('webgl-failed');el.innerHTML='<div class="fallback-pin hero-fallback"><img src="/designs/ejemplo3.jpg" alt="Diseño de ejemplo"></div>'}}
let heroPins=[];
if(hero){
  const layout=[
    {type:'move',x:-1.42,y:1.72,z:-.3,size:.70,rx:.18,ry:-.23,rz:-.24},
    {type:'brand',x:.53,y:1.92,z:-.1,size:.77,rx:.13,ry:.24,rz:.13},
    {type:'self',x:-.80,y:-.27,z:.65,size:1.07,rx:.09,ry:-.15,rz:-.18},
    {type:'hello',x:1.12,y:.03,z:.12,size:.80,rx:.22,ry:.35,rz:.22},
    {type:'idea',x:.44,y:-1.67,z:.3,size:.70,rx:.16,ry:-.22,rz:-.12},
  ];
  heroPins=layout.map(data=>{const pin=makePin(graphicTexture(data.type).texture);pin.position.set(data.x,data.y,data.z);pin.rotation.set(data.rx,data.ry,data.rz);pin.scale.setScalar(data.size);return pin;});
  const back=makePin(graphicTexture().texture);back.position.set(-1.77,-1.84,-.45);back.rotation.set(.18,Math.PI+.32,-.33);back.scale.setScalar(.47);heroPins.push(back);
  heroPins.forEach(pin=>{hero.scene.add(pin);pin.userData.base={x:pin.rotation.x,y:pin.rotation.y,z:pin.rotation.z,posY:pin.position.y}});
  hero.render();
  fetch('/pin-designs.json').then(response=>response.json()).then(data=>{
    data.designs.slice(0,5).forEach(async(design,index)=>{
      if(!design.src)return;
      const img=new Image();img.src=design.src;
      try{await img.decode();
        const artwork=document.createElement('canvas');artwork.width=artwork.height=1024;const ctx=artwork.getContext('2d');
        ctx.drawImage(img,0,0,1,1);const corner=ctx.getImageData(0,0,1,1).data;ctx.fillStyle=`rgb(${corner[0]},${corner[1]},${corner[2]})`;ctx.fillRect(0,0,1024,1024);
        const scale=design.fit==='cover'?Math.max(1024/img.width,1024/img.height):Math.min(700/img.width,700/img.height);
        const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(1024-w)/2,(1024-h)/2,w,h);
        const texture=new THREE.CanvasTexture(artwork);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
        heroPins[index].userData.front.material.map=texture;heroPins[index].userData.front.material.needsUpdate=true;hero.render();
      }catch(error){console.warn('No se pudo cargar un diseño del hero.',design.id);}
    });
    if(data.designs.length===5 && data.designs.every(design=>design.src))document.querySelector('#hero-examples').hidden=true;
  }).catch(()=>{});
}
const defaultGraphic=graphicTexture();
const studio=createScene(document.querySelector('#studio-scene'),'studio');
if(!studio){const el=document.querySelector('#studio-scene');if(el){el.classList.add('webgl-failed');el.innerHTML='<div class="fallback-pin">tu<br>idea.</div>'}}
let activePin=studio?makePin(defaultGraphic.texture):null;
// Idle sway lives on a parent group, so the visitor's own rotation of the pin is untouched.
const studioIdle=new THREE.Group();
if(studio){studioIdle.add(activePin);studio.scene.add(studioIdle);activePin.scale.setScalar(1.15);activePin.rotation.set(.12,-.22,-.08);studio.render();}
const uploadInput=document.querySelector('#design-upload');const scaleInput=document.querySelector('#image-scale');const rotateButton=document.querySelector('#mode-rotate');const cropButton=document.querySelector('#mode-crop');const guides=document.querySelector('#editor-guides');const lightButton=document.querySelector('#toggle-light');
let mode='rotate',uploaded=null,imageScale=1,imageX=0,imageY=0,pointer=null,uploadToken=0,objectURL=null,lightsActive=true;
const userCanvas=document.createElement('canvas');userCanvas.width=userCanvas.height=1024;const userContext=userCanvas.getContext('2d');const userTexture=new THREE.CanvasTexture(userCanvas);userTexture.colorSpace=THREE.SRGBColorSpace;userTexture.anisotropy=4;
function updateResolution(){
 const note=document.querySelector("#resolution-note");if(!uploaded){note.hidden=true;return;}
 const pixels=Math.round(Math.min(uploaded.width,uploaded.height)/imageScale);note.hidden=false;note.classList.toggle("low",pixels<378);note.textContent=pixels<378?`Resolución útil aprox.: ${pixels} px. Podría perder detalle al imprimir; usa una imagen mayor o reduce la escala.`:`Resolución útil aprox.: ${pixels} px. El resultado final se confirma antes de producir.`;
}
function drawImage(){
 updateResolution();
 if(!uploaded)return;
 const visibleTarget=1024*visibleRatio;
 const base=Math.min(visibleTarget/uploaded.width,visibleTarget/uploaded.height);
 const w=uploaded.width*base*imageScale,h=uploaded.height*base*imageScale;
 const maxDragX=Math.max(512,w/2);
 const maxDragY=Math.max(512,h/2);
 imageX=Math.max(-maxDragX,Math.min(maxDragX,imageX));
 imageY=Math.max(-maxDragY,Math.min(maxDragY,imageY));
 userContext.clearRect(0,0,1024,1024);
 userContext.fillStyle='#fafaf7';
 userContext.fillRect(0,0,1024,1024);
 userContext.drawImage(uploaded,(1024-w)/2+imageX,(1024-h)/2+imageY,w,h);
 userTexture.needsUpdate=true;
 if(activePin){
   activePin.userData.front.material.map=userTexture;
   if(!lightsActive){
     activePin.userData.front.material.clearcoat=0;
     activePin.userData.front.material.clearcoatRoughness=0;
     activePin.userData.front.material.roughness=0.92;
   }else{
     activePin.userData.front.material.clearcoat=0.55;
     activePin.userData.front.material.clearcoatRoughness=0.22;
     activePin.userData.front.material.roughness=0.42;
   }
   activePin.userData.front.material.needsUpdate=true;
   studio.render();
 }else{
   const fallback=document.querySelector('#studio-scene .fallback-pin');
   if(fallback){fallback.innerHTML='';fallback.style.backgroundImage=`url(${userCanvas.toDataURL()})`;fallback.style.backgroundSize=`${100/visibleRatio}%`;fallback.style.backgroundPosition='center';}
 }
}
function syncGuides(){if(!studio)return;const diameter=studioPxPerUnit()*2*1.15;guides.style.width=guides.style.height=`${diameter}px`;}
if(studio){studio.afterResize=syncGuides;syncGuides();}
function setMode(next){mode=next;rotateButton.classList.toggle('active',next==='rotate');cropButton.classList.toggle('active',next==='crop');rotateButton.setAttribute('aria-pressed',next==='rotate');cropButton.setAttribute('aria-pressed',next==='crop');guides.classList.toggle('visible',next==='crop');document.querySelector('#gesture-hint').textContent=next==='crop'?'Arrastra la imagen para ajustar el encuadre':'Arrastra para girar · mira el reverso';document.querySelector('#stage-label').textContent=next==='crop'?'AJUSTE DE ENCUADRE':'VISTA PREVIA 3D';if(activePin&&next==='crop'){activePin.rotation.set(0,0,0);studio.render()}if(next==='crop'&&!uploaded){studioFeedback.textContent='Sube tu imagen para ajustar el encuadre.'}else studioFeedback.textContent='';}
rotateButton.addEventListener('click',()=>setMode('rotate'));cropButton.addEventListener('click',()=>setMode('crop'));
function setLighting(active){
  if(!studio)return;
  lightsActive=active;
  const frontMat=activePin?.userData?.front?.material;
  if(frontMat){
    if(!active){
      frontMat.clearcoat=0;
      frontMat.clearcoatRoughness=0;
      frontMat.roughness=0.92;
    }else{
      frontMat.clearcoat=0.55;
      frontMat.clearcoatRoughness=0.22;
      frontMat.roughness=0.42;
    }
    frontMat.needsUpdate=true;
  }
  studio.render();
  if(lightButton){
    lightButton.classList.toggle('active',!active);
    lightButton.setAttribute('aria-pressed',String(!active));
    lightButton.title=active?'Quitar reflejos del diseño (acabado mate)':'Activar acabado brillante 3D';
  }
  studioFeedback.textContent=active?'Acabado brillante 3D activado.':'Reflejos del diseño desactivados. La imagen se muestra sin brillos.';
}
if(lightButton)lightButton.addEventListener('click',()=>setLighting(!lightsActive));
uploadInput.addEventListener('change',async()=>{
 const file=uploadInput.files?.[0];if(!file)return;const token=++uploadToken;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){studioFeedback.textContent='Elige una imagen JPG, PNG o WebP.';uploadInput.value='';return;}
 if(file.size>15*1024*1024){studioFeedback.textContent='Esta imagen supera los 15 MB. Prueba una versión más ligera.';uploadInput.value='';return;}
 const url=URL.createObjectURL(file),img=new Image();img.src=url;
 try{await img.decode();if(token!==uploadToken){URL.revokeObjectURL(url);return;}if(objectURL)URL.revokeObjectURL(objectURL);objectURL=url;uploaded=img;imageScale=1;imageX=imageY=0;scaleInput.value=100;document.querySelector('#scale-value').textContent='100%';document.querySelector('#file-label').textContent=file.name;document.querySelector('#remove-image').hidden=false;drawImage();setMode('crop');studioFeedback.textContent='Imagen lista. Arrastra y ajusta la escala para encuadrar.';if(matchMedia('(max-width: 760px)').matches)document.querySelector('.studio-stage').scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});}catch(e){URL.revokeObjectURL(url);studioFeedback.textContent='No pudimos abrir esa imagen. Prueba otra imagen JPG, PNG o WebP.'}uploadInput.value='';
});
scaleInput.addEventListener('input',()=>{imageScale=Number(scaleInput.value)/100;document.querySelector('#scale-value').textContent=`${scaleInput.value}%`;drawImage();if(!uploaded)studioFeedback.textContent='Primero sube una imagen para cambiar su escala.'});
{
 const el=document.querySelector('#studio-scene');
 el.addEventListener('pointerdown',event=>{pointer={id:event.pointerId,x:event.clientX,y:event.clientY};el.setPointerCapture(event.pointerId)});
 el.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer.x=event.clientX;pointer.y=event.clientY;if(mode==='rotate'&&activePin){activePin.rotation.y+=dx*.012;activePin.rotation.x+=dy*.012;studio.render()}else if(uploaded){const projected=studio?el.clientHeight/4.1*2*1.15:el.querySelector('.fallback-pin').clientWidth;imageX+=dx/projected*1024*visibleRatio;imageY+=dy/projected*1024*visibleRatio;drawImage()}});
 ['pointerup','pointercancel','lostpointercapture'].forEach(name=>el.addEventListener(name,()=>{pointer=null}));
}
document.querySelector('#turn-back').addEventListener('click',()=>{if(!studio){studioFeedback.textContent='Tu navegador no tiene disponible la vista 3D.';return;}setMode('rotate');activePin.rotation.set(.12,activePin.rotation.y+Math.PI,0);studio.render()});
function reset(){imageScale=1;imageX=imageY=0;scaleInput.value=100;document.querySelector('#scale-value').textContent='100%';if(activePin){activePin.rotation.set(.12,-.22,-.08);drawImage();studio.render()}setMode('rotate');setLighting(true);studioFeedback.textContent='Vista y encuadre restablecidos.';}
document.querySelector('#reset-preview').addEventListener('click',reset);
document.querySelector('#remove-image').addEventListener('click',()=>{++uploadToken;uploaded=null;updateResolution();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;document.querySelector('#file-label').textContent='JPG, PNG o WebP · 15 MB · no se guarda';document.querySelector('#remove-image').hidden=true;if(activePin){activePin.userData.front.material.map=defaultGraphic.texture;if(!lightsActive){activePin.userData.front.material.clearcoat=0;activePin.userData.front.material.roughness=1;}activePin.userData.front.material.needsUpdate=true;}else{const fallback=document.querySelector('#studio-scene .fallback-pin');fallback.innerHTML='tu<br>idea.';fallback.style.backgroundImage='';}reset();studioFeedback.textContent='Imagen eliminada de la vista previa.'});
document.querySelector('#download-preview').addEventListener('click',()=>{
 if(!studio){if(!uploaded){studioFeedback.textContent='Sube una imagen para descargar la vista plana.';return;}const flat=document.createElement('canvas');flat.width=flat.height=1024;const ctx=flat.getContext('2d');ctx.save();ctx.beginPath();ctx.arc(512,512,500,0,Math.PI*2);ctx.clip();const source=1024*visibleRatio,inset=(1024-source)/2;ctx.drawImage(userCanvas,inset,inset,source,source,0,0,1024,1024);ctx.restore();const link=document.createElement('a');link.download='dzing-pin-vista-plana.png';link.href=flat.toDataURL();link.click();studioFeedback.textContent='Vista plana descargada. Es una referencia, no un archivo de impresión.';return;}
 studio.render();const link=document.createElement('a');link.download='dzing-pin-vista-previa.png';link.href=studio.renderer.domElement.toDataURL('image/png');link.click();studioFeedback.textContent='Vista descargada. Es una referencia visual, no un archivo de impresión.';
});
document.querySelector('#studio-scene').addEventListener('keydown',event=>{
 if(event.key==='Home'){event.preventDefault();reset();return;}
 const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!moves[event.key])return;event.preventDefault();const [x,y]=moves[event.key];if(mode==='rotate'&&activePin){activePin.rotation.y+=x*.15;activePin.rotation.x+=y*.15;studio.render()}else if(mode==='crop'&&uploaded){imageX+=x*25;imageY+=y*25;drawImage()}});
const tickerTrack=document.querySelector('.ticker-track');
let tickerScroll=window.scrollY,tickerFrame=0,tickerWidth=1;
function measureTicker(){tickerWidth=tickerTrack.querySelector('.ticker-copy').getBoundingClientRect().width || 1;updateTicker();}
function updateTicker(){tickerFrame=0;const offset=reducedMotion.matches?0:(tickerScroll*.5)%tickerWidth;tickerTrack.style.transform=`translate3d(${-offset}px,0,0)`;}
window.addEventListener('scroll',()=>{tickerScroll=window.scrollY;if(!tickerFrame)tickerFrame=requestAnimationFrame(updateTicker)},{passive:true});
new ResizeObserver(measureTicker).observe(tickerTrack.querySelector('.ticker-copy'));
reducedMotion.addEventListener('change',updateTicker);measureTicker();
const audienceTabs=[...document.querySelectorAll('[data-audience-tab]')];
function selectAudience(tab){audienceTabs.forEach(button=>{const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;document.getElementById(button.getAttribute('aria-controls')).hidden=!selected;});showAudienceScene(audienceTabs.indexOf(tab));}
audienceTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectAudience(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%audienceTabs.length;else if(event.key==='ArrowLeft')next=(index+audienceTabs.length-1)%audienceTabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=audienceTabs.length-1;else return;event.preventDefault();selectAudience(audienceTabs[next]);audienceTabs[next].focus();});});
const quantityInput=document.querySelector('#order-quantity');
function updateOrderEstimate(){const quantity=Math.max(10,Math.round(Number(quantityInput.value)||10));const wholesale=quantity>=100;document.querySelector('#estimate-total').textContent=wholesale?'Cotizamos contigo':`S/ ${(quantity*2.5).toFixed(2)}`;document.querySelector('#estimate-deposit').textContent=wholesale?'Por confirmar':`S/ ${(quantity*.5).toFixed(2)}`;document.querySelector('#estimate-balance').textContent=wholesale?'Por confirmar':`S/ ${(quantity*2).toFixed(2)}`;document.querySelector('#estimate-note').textContent=wholesale?'Desde 100 pines, precio al por mayor.':'Envío aparte.';}
quantityInput.addEventListener('input',updateOrderEstimate);quantityInput.addEventListener('change',()=>{quantityInput.value=Math.max(10,Math.round(Number(quantityInput.value)||10));updateOrderEstimate();});updateOrderEstimate();
let startTime=performance.now();
function animate(now){requestAnimationFrame(animate);if(hero?.visible&&!document.hidden&&!reducedMotion.matches){const t=(now-startTime)*.001;heroPins.forEach((pin,index)=>{const base=pin.userData.base;pin.position.y=base.posY+Math.sin(t*.7+index*1.7)*.05;pin.rotation.x=base.x+Math.sin(t*.45+index)*.025;pin.rotation.y=base.y+Math.sin(t*.35+index)*.035});hero.render()}audienceTick((now-startTime)*.001);studioTick((now-startTime)*.001)}
requestAnimationFrame(animate);
if(!studio){studioFeedback.textContent='La vista 3D no está disponible en este navegador. Puedes preparar tu pedido en “Hablemos”.';}
const dialog=document.querySelector('#contact-dialog');
document.querySelectorAll('[data-contact]').forEach(button=>button.addEventListener('click',()=>{dialog.showModal();document.querySelector('#contact-status').textContent='';document.querySelector('#inquiry-quantity').value=quantityInput.value;updateInquiryLink()}));
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close()}});
function makeInquiry(){
 const raw=Number(document.querySelector('#inquiry-quantity').value),quantity=Math.max(10,Math.round(raw||10));const details=document.querySelector('#inquiry-details').value.trim();
 return `Hola, Dzing Pins. Quisiera cotizar ${quantity} pines de 3.2 cm.\n${details||'Tengo una idea y me gustaría coordinar el diseño.'}\n¿Podemos confirmar el encuadre, el precio y el envío?`;
}
function updateInquiryLink(){document.querySelector('#send-inquiry').href=`https://wa.me/51906093061?text=${encodeURIComponent(makeInquiry())}`;}
['#inquiry-quantity','#inquiry-details'].forEach(selector=>document.querySelector(selector).addEventListener('input',updateInquiryLink));
document.querySelector('#send-inquiry').addEventListener('click',()=>{const field=document.querySelector('#inquiry-quantity');field.value=Math.max(10,Math.round(Number(field.value)||10));updateInquiryLink();});updateInquiryLink();
document.querySelector('#copy-inquiry').addEventListener('click',async()=>{
 const inquiry=makeInquiry();
 try{await navigator.clipboard.writeText(inquiry);document.querySelector('#contact-status').textContent='Consulta copiada. Puedes compartirla por WhatsApp.'}catch(e){document.querySelector('#contact-status').textContent=inquiry;}
});

// Fotos de pedidos reales: se leen de public/pedidos.json. Sin fotos, la sección no se publica;
// en desarrollo se muestran espacios de muestra para ver cómo queda.
const gallery=document.querySelector('#pedidos'),galleryGrid=document.querySelector('#gallery-grid');
fetch('/pedidos.json').then(response=>response.json()).then(({fotos=[]})=>{
 const items=fotos.length?fotos:import.meta.env.DEV?Array.from({length:4},()=>null):[];
 if(!items.length)return;
 items.forEach(foto=>{
  const figure=document.createElement('figure');
  if(foto){const img=new Image();img.src=foto.src;img.alt=foto.alt||'';img.loading='lazy';img.decoding='async';figure.append(img);if(foto.texto){const caption=document.createElement('figcaption');caption.textContent=foto.texto;figure.append(caption);}}
  else{figure.className='gallery-placeholder';figure.innerHTML='<span>tu foto<br>aquí.</span>';}
  galleryGrid.append(figure);
 });
 gallery.hidden=false;
}).catch(()=>{});

// Menú inferior en móvil: marca la sección que se está viendo.
const mobileLinks=[...document.querySelectorAll('.mobile-nav a')];
const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;mobileLinks.forEach(link=>link.toggleAttribute('aria-current',link.hash===`#${entry.target.id}`));}),{rootMargin:'-45% 0px -50% 0px'});
mobileLinks.forEach(link=>{const target=document.querySelector(link.hash);if(target)sectionObserver.observe(target);});

// Enlaces internos: dejan el título de la sección cerca del borde superior, no al fondo del relleno.
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
 const target=link.hash.length>1&&document.querySelector(link.hash);if(!target)return;
 event.preventDefault();
 // Móvil: el título arriba. Escritorio: las columnas van lado a lado y alguna (como la
 // ilustración de "El pin, de cerca") empieza más arriba que el título, así que se usa la más alta.
 const desktop=matchMedia('(min-width: 761px)').matches;
 const tops=desktop?[...target.children,...target.querySelectorAll('.material-visual > *')].filter(el=>el.offsetHeight).map(el=>el.getBoundingClientRect().top):[(target.querySelector('.eyebrow')||target).getBoundingClientRect().top];
 scrollTo({top:Math.min(...tops)+scrollY-(desktop?48:24),behavior:reducedMotion.matches?'auto':'smooth'});
 history.replaceState(null,'',link.hash);
}));

// "¿Para quién es tu próximo pin?": las tres escenas planas pasan a 3D con el mismo pin del hero.
// Un solo renderer se mueve al panel visible; si WebGL falla, se quedan las ilustraciones planas.
function textTexture(width,height,draw){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
 draw(ctx,width,height);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
const roundedFont='"Arial Rounded MT Bold", "Arial Rounded MT", Arial, sans-serif';
function placePin(type,{x,y,z,size,rx=0,ry=0,rz=0}){
 const pin=makePin(graphicTexture(type).texture);pin.position.set(x,y,z);pin.rotation.set(rx,ry,rz);pin.scale.setScalar(size);
 pin.userData.float={y,rz,phase:x*2.3+y};return pin;
}
const AUDIENCE_PIN_SIZE=.48; // Same size everywhere: every pin is 3.2 cm.
function giftScene(){
 const group=new THREE.Group();
 const paper=new THREE.MeshPhysicalMaterial({color:0xf0a531,roughness:.55,clearcoat:.25});
 const lidPaper=new THREE.MeshPhysicalMaterial({color:0xf6b43e,roughness:.5,clearcoat:.3});
 const ribbon=new THREE.MeshPhysicalMaterial({color:0xd3262b,roughness:.35,sheen:1,sheenColor:new THREE.Color(0xff8a80),clearcoat:.2});
 const box=new THREE.Group();box.position.set(-.3,-.95,-.4);box.rotation.set(.32,.62,0);group.add(box);
 box.add(new THREE.Mesh(new RoundedBoxGeometry(1.8,1.25,1.8,4,.05),paper));
 const lid=new THREE.Mesh(new RoundedBoxGeometry(1.92,.3,1.92,4,.05),lidPaper);lid.position.y=.7;box.add(lid);
 [[.26,1.6,1.96],[1.96,1.6,.26]].forEach(([w,h,d])=>{const band=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),ribbon);band.position.y=.08;box.add(band)});
 const loop=new THREE.TorusGeometry(.27,.07,14,44);
 [-1,1].forEach(side=>{const bow=new THREE.Mesh(loop,ribbon);bow.position.set(side*.26,1.0,0);bow.rotation.set(0,side*.5,side*.55);bow.scale.set(1,.75,1);box.add(bow)});
 const tail=new THREE.BoxGeometry(.12,.5,.03);
 [-1,1].forEach(side=>{const t=new THREE.Mesh(tail,ribbon);t.position.set(side*.14,.72,.12);t.rotation.set(-.9,0,side*.5);box.add(t)});
 const knot=new THREE.Mesh(new THREE.SphereGeometry(.11,16,12),ribbon);knot.position.y=.9;box.add(knot);
 const cream=new THREE.MeshStandardMaterial({color:0xfffef6,roughness:.85});
 const cardFace=textTexture(640,440,(ctx,w,h)=>{ctx.fillStyle='#fffef6';ctx.fillRect(0,0,w,h);ctx.fillStyle='#d3262b';ctx.fillRect(0,0,w,18);ctx.fillStyle='#252721';ctx.font=`bold 74px ${roundedFont}`;ctx.fillText('esto me',58,180);ctx.fillText('recordó a ti.',58,272);});
 const card=new THREE.Mesh(new THREE.BoxGeometry(1.3,.9,.02),[cream,cream,cream,cream,new THREE.MeshStandardMaterial({map:cardFace,roughness:.85}),cream]);
 card.position.set(-.85,.95,.35);card.rotation.set(-.12,.28,.24);card.userData.float={y:.95,rz:.24,phase:1.3};group.add(card);
 group.add(placePin('gift',{x:.95,y:.05,z:.9,size:AUDIENCE_PIN_SIZE,rx:.12,ry:-.38,rz:.12}));
 return group;
}
function communityScene(){
 const group=new THREE.Group();group.rotation.set(.06,-.32,0);
 const weave=textTexture(256,256,(ctx,w,h)=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);for(let i=0;i<w;i+=3){ctx.fillStyle='#0000000d';ctx.fillRect(i,0,1,h);ctx.fillRect(0,i,w,1);}});
 weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(3,3);
 const cloth=new THREE.MeshPhysicalMaterial({color:0x5f9c86,roughness:.95,sheen:.6,sheenColor:new THREE.Color(0xbfe3d4),map:weave});
 const strapCloth=new THREE.MeshPhysicalMaterial({color:0x4c8370,roughness:.95,map:weave});
 const bag=new THREE.Mesh(new RoundedBoxGeometry(2.15,2.3,.2,4,.08),cloth);bag.position.y=-.55;group.add(bag);
 const handle=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-.55,.6,0],[-.6,1.25,0],[-.3,1.75,0],[.3,1.75,0],[.6,1.25,0],[.55,.6,0]].map(p=>new THREE.Vector3(...p))),48,.06,10,false);
 [.06,-.06].forEach(z=>{const h=new THREE.Mesh(handle,strapCloth);h.position.z=z;group.add(h)});
 const seam=new THREE.Mesh(new THREE.BoxGeometry(2.05,.05,.21),strapCloth);seam.position.y=.45;group.add(seam);
 group.add(placePin('community',{x:-.38,y:-.25,z:.28,size:AUDIENCE_PIN_SIZE,rz:-.26}));
 group.add(placePin('here',{x:.48,y:-.95,z:.28,size:AUDIENCE_PIN_SIZE,rz:.22}));
 return group;
}
function eventScene(){
 const group=new THREE.Group();group.rotation.set(.05,.28,0);
 const strap=new THREE.MeshPhysicalMaterial({color:0xe2553a,roughness:.45,sheen:.8,sheenColor:new THREE.Color(0xffb29d)});
 const metal=new THREE.MeshStandardMaterial({color:0xd5d7d2,metalness:1,roughness:.25});
 [-1,1].forEach(side=>group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*.75,3,-.3],[side*.45,1.8,-.1],[side*.1,.98,0]].map(p=>new THREE.Vector3(...p))),32,.06,8,false),strap)));
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.03,10,30),metal);ring.position.set(0,.88,0);group.add(ring);
 const clip=new THREE.Mesh(new RoundedBoxGeometry(.3,.22,.08,2,.03),metal);clip.position.set(0,.66,0);group.add(clip);
 const passFace=textTexture(600,780,(ctx,w,h)=>{ctx.fillStyle='#fafbf3';ctx.fillRect(0,0,w,h);ctx.fillStyle='#24345e';ctx.fillRect(0,0,w,150);ctx.fillStyle='#e2553a';ctx.fillRect(0,150,w,16);ctx.fillStyle='#fafbf3';ctx.fillRect(w/2-60,40,120,22);ctx.fillStyle='#24345e';ctx.font=`bold 92px ${roundedFont}`;ctx.fillText('ESTÁS',54,300);ctx.fillText('INVITADO.',54,400);ctx.fillStyle='#e2553a';ctx.font='600 26px Arial, sans-serif';ctx.fillText('UN ENCUENTRO PARA RECORDAR',56,470);ctx.fillStyle='#d9dccf';[560,606,652].forEach((y,i)=>ctx.fillRect(56,y,[400,320,360][i],14));});
 const white=new THREE.MeshStandardMaterial({color:0xfafbf3,roughness:.6});
 const pass=new THREE.Mesh(new RoundedBoxGeometry(1.6,2.08,.05,3,.06),white);pass.position.set(0,-.5,0);group.add(pass);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.95),new THREE.MeshStandardMaterial({map:passFace,roughness:.7}));face.position.set(0,-.5,.027);group.add(face);
 group.add(placePin('yourbrand',{x:.78,y:-1.2,z:.32,size:AUDIENCE_PIN_SIZE,rx:.05,ry:-.2,rz:.26}));
 return group;
}
const audienceScenes=[...document.querySelectorAll('.audience-scene')];
const audience=audienceScenes.length?createScene(audienceScenes[0],'audience'):null;
const audienceGroups=audience?[giftScene(),communityScene(),eventScene()]:[];
let audiencePointer={x:0,y:0};
if(audience){
 audienceGroups.forEach((group,index)=>{group.visible=index===0;group.userData.base={x:group.rotation.x,y:group.rotation.y};audience.scene.add(group)});
 audienceScenes.forEach(scene=>{scene.classList.add('webgl-ready');scene.addEventListener('pointermove',event=>{const r=scene.getBoundingClientRect();audiencePointer={x:(event.clientX-r.left)/r.width-.5,y:(event.clientY-r.top)/r.height-.5}});scene.addEventListener('pointerleave',()=>{audiencePointer={x:0,y:0}})});
 audience.renderer.domElement.addEventListener('webglcontextlost',()=>audienceScenes.forEach(scene=>scene.classList.remove('webgl-ready')));
 audience.render();
}
function showAudienceScene(index){
 if(!audience)return;
 audienceGroups.forEach((group,i)=>group.visible=i===index);
 if(audience.element!==audienceScenes[index])audience.attach(audienceScenes[index]);else audience.render();
}
function audienceTick(t){
 if(!audience?.visible||document.hidden)return;
 audienceGroups.forEach(group=>{if(!group.visible)return;const base=group.userData.base;
  const sway=reducedMotion.matches?0:Math.sin(t*.5)*.06;
  group.rotation.y+=((base.y+sway+audiencePointer.x*.35)-group.rotation.y)*.08;
  group.rotation.x+=((base.x+audiencePointer.y*.2)-group.rotation.x)*.08;
  if(!reducedMotion.matches)group.traverse(object=>{const f=object.userData.float;if(!f)return;object.position.y=f.y+Math.sin(t*1.1+f.phase)*.045;object.rotation.z=f.rz+Math.sin(t*.8+f.phase)*.05;});
 });
 audience.render();
}

// Constant, gentle motion for the simulator pin (on phones there is no hover to bring it to life).
// It eases back to rest while the visitor drags or frames the image, so the crop guides stay true.
function studioTick(t){
 if(!studio?.visible||document.hidden)return;
 const idle=!reducedMotion.matches&&!pointer&&mode==='rotate';
 const targetY=idle?Math.sin(t*.6)*.07:0,targetX=idle?Math.sin(t*.45)*.035:0;
 if(Math.abs(studioIdle.rotation.y-targetY)+Math.abs(studioIdle.rotation.x-targetX)<1e-4)return;
 studioIdle.rotation.y+=(targetY-studioIdle.rotation.y)*.08;studioIdle.rotation.x+=(targetX-studioIdle.rotation.x)*.08;
 studio.render();
}
