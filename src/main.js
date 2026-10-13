import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const studioFeedback = document.querySelector('#studio-feedback');
// Five supplied artworks, configured independently from the 3D composition.
function graphicTexture(type = 'idea') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const dark = type === 'self' || type === 'brand';
  ctx.fillStyle = dark ? '#24251f' : '#e9eadf'; ctx.fillRect(0,0,1024,1024);
  ctx.fillStyle = dark ? '#f5f5ed' : '#252620';
  ctx.textAlign='center';ctx.textBaseline='middle';
  const family='"Arial Rounded MT Bold", "Arial Rounded MT", Arial, sans-serif';
  const words={self:['sé','tú.'],move:['ideas','en camino.'],brand:['dzing','pins'],hello:['hola,','mundo.'],idea:['tu','idea.']}[type] || ['tu','idea.'];
  ctx.font=`bold ${type === 'move' ? 115 : 185}px ${family}`;
  ctx.fillText(words[0],512,410,640);ctx.fillText(words[1],512,604,640);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4; return {canvas,texture};
}
const visibleRatio=3.2/4.4; // Provisional print-to-visible-area relationship, confirmed before production.
function curvedFace(){
  const positions=[],uvs=[],indices=[];const rings=32,segments=128;
  for(let ring=0;ring<=rings;ring++){
    const radius=ring/rings*.979;
    for(let seg=0;seg<=segments;seg++){
      const a=seg/segments*Math.PI*2,x=Math.cos(a)*radius,y=Math.sin(a)*radius;
      const z=.036+.145*Math.pow(1-radius*radius,.7);
      positions.push(x,y,z);uvs.push(.5+x/2*visibleRatio,.5+y/2*visibleRatio);
    }
  }
  for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){
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
  // One continuous plastic profile: a flat recessed back rising into a single smooth lip.
  // Lathe y becomes pin z after rotation; the more negative crest faces the back viewer.
  const profile = new THREE.CatmullRomCurve3([
    [0,-.118],[.58,-.118],[.70,-.12],[.77,-.15],[.825,-.205],
    [.867,-.24],[.9,-.225],[.93,-.18],[.95,-.125],[.949,-.08]
  ].map(([r,z])=>new THREE.Vector3(r,z,0)),false,'centripetal');
  const plastic=new THREE.Mesh(new THREE.LatheGeometry(profile.getPoints(80).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),128),white);
  plastic.rotation.x=Math.PI/2;group.add(plastic);
  // The circular metal shell folds inward around the plastic base to clamp film and paper.
  const metalProfile = new THREE.CatmullRomCurve3([
    [.976,.036],[.996,.014],[1,-.035],[.99,-.087],[.973,-.129],[.951,-.15],[.935,-.139]
  ].map(([r,z])=>new THREE.Vector3(r,z,0)),false,'centripetal');
  const shell=new THREE.Mesh(new THREE.LatheGeometry(metalProfile.getPoints(40).reverse().map(p=>new THREE.Vector2(p.x,p.y)),128),steel);
  shell.rotation.x=Math.PI/2;group.add(shell);
  // The clasp sits proud of a recessed plastic back, with curved metal wire and mounting feet.
  const mountGeo=new THREE.CylinderGeometry(.12,.14,.035,40);
  [-.57,.57].forEach(x=>{const mount=new THREE.Mesh(mountGeo,steel);mount.rotation.x=Math.PI/2;mount.position.set(x,-.02,-.139);group.add(mount)});
  const wirePoints=[[-.57,-.03,-.16],[-.60,-.06,-.20],[-.65,-.18,-.25],[-.55,-.24,-.26],[-.45,-.19,-.28],[-.46,-.01,-.31],[.48,.035,-.31],[.64,.05,-.27],[.66,-.08,-.24],[.55,-.12,-.24],[.50,-.04,-.16]];
  const curve=new THREE.CatmullRomCurve3(wirePoints.map(p=>new THREE.Vector3(...p)));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,90,.018,10,false),steel));
  const needle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.019,1.14,12),steel);needle.rotation.z=Math.PI/2;needle.position.set(0,.009,-.255);group.add(needle);
  
  return group;
}
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
  const api={renderer,scene,camera,element,visible:false,rendered:false,render(){renderer.render(scene,camera);if(!api.rendered){api.rendered=true;requestAnimationFrame(()=>element.classList.add('webgl-ready'))}},resize(){const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;const vertical=kind==='hero'?Math.max(6.7,5.1/aspect):4.1;camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();api.render();if(api.afterResize)api.afterResize()}};
  new ResizeObserver(()=>api.resize()).observe(element);
  new IntersectionObserver(entries=>{api.visible=entries[0].isIntersecting;if(api.visible)api.render()},{rootMargin:'80px'}).observe(element);
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
if(studio){studio.scene.add(activePin);activePin.scale.setScalar(1.15);activePin.rotation.set(.12,-.22,-.08);studio.render();}
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
function syncGuides(){if(!studio)return;const diameter=studio.element.clientHeight/4.1*2*1.15;guides.style.width=guides.style.height=`${diameter}px`;}
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
 try{await img.decode();if(token!==uploadToken){URL.revokeObjectURL(url);return;}if(objectURL)URL.revokeObjectURL(objectURL);objectURL=url;uploaded=img;imageScale=1;imageX=imageY=0;scaleInput.value=100;document.querySelector('#scale-value').textContent='100%';document.querySelector('#file-label').textContent=file.name;document.querySelector('#remove-image').hidden=false;drawImage();setMode('crop');studioFeedback.textContent='Imagen lista. Arrastra y ajusta la escala para encuadrar.';}catch(e){URL.revokeObjectURL(url);studioFeedback.textContent='No pudimos abrir esa imagen. Prueba otra imagen JPG, PNG o WebP.'}uploadInput.value='';
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
document.querySelector('#remove-image').addEventListener('click',()=>{++uploadToken;uploaded=null;updateResolution();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;document.querySelector('#file-label').textContent='JPG, PNG o WebP · hasta 15 MB';document.querySelector('#remove-image').hidden=true;if(activePin){activePin.userData.front.material.map=defaultGraphic.texture;if(!lightsActive){activePin.userData.front.material.clearcoat=0;activePin.userData.front.material.roughness=1;}activePin.userData.front.material.needsUpdate=true;}else{const fallback=document.querySelector('#studio-scene .fallback-pin');fallback.innerHTML='tu<br>idea.';fallback.style.backgroundImage='';}reset();studioFeedback.textContent='Imagen eliminada de la vista previa.'});
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
function selectAudience(tab){audienceTabs.forEach(button=>{const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;document.getElementById(button.getAttribute('aria-controls')).hidden=!selected;});}
audienceTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectAudience(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%audienceTabs.length;else if(event.key==='ArrowLeft')next=(index+audienceTabs.length-1)%audienceTabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=audienceTabs.length-1;else return;event.preventDefault();selectAudience(audienceTabs[next]);audienceTabs[next].focus();});});
const quantityInput=document.querySelector('#order-quantity');
function updateOrderEstimate(){const quantity=Math.max(10,Math.round(Number(quantityInput.value)||10));const wholesale=quantity>=100;document.querySelector('#estimate-total').textContent=wholesale?'Cotizamos contigo':`S/ ${(quantity*2.5).toFixed(2)}`;document.querySelector('#estimate-deposit').textContent=wholesale?'Por confirmar':`S/ ${(quantity*.5).toFixed(2)}`;document.querySelector('#estimate-balance').textContent=wholesale?'Por confirmar':`S/ ${(quantity*2).toFixed(2)}`;document.querySelector('#estimate-note').textContent=wholesale?'A partir de 100 pines, pide tu precio al por mayor.':'Un mismo diseño · envío se coordina aparte.';}
quantityInput.addEventListener('input',updateOrderEstimate);quantityInput.addEventListener('change',()=>{quantityInput.value=Math.max(10,Math.round(Number(quantityInput.value)||10));updateOrderEstimate();});updateOrderEstimate();
let startTime=performance.now();
function animate(now){requestAnimationFrame(animate);if(hero?.visible&&!document.hidden&&!reducedMotion.matches){const t=(now-startTime)*.001;heroPins.forEach((pin,index)=>{const base=pin.userData.base;pin.position.y=base.posY+Math.sin(t*.7+index*1.7)*.05;pin.rotation.x=base.x+Math.sin(t*.45+index)*.025;pin.rotation.y=base.y+Math.sin(t*.35+index)*.035});hero.render()}}
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
