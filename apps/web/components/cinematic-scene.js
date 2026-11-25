// Public-homepage enhancement only. No account data, network fetches or trading APIs.
import * as THREE from 'three';

const backgroundFragment = `
precision highp float;
uniform float uTime;
uniform float uScroll;
uniform vec2 uResolution;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
  float t=uTime*.085;
  vec2 p=uv;
  p.x+=sin(uv.y*2.8+t+uScroll*2.)*.32;
  p.y+=cos(uv.x*2.-t*.6)*.25;
  float f=sin(dot(p,vec2(.8,.5))*3.+t)*.46+cos(dot(p,vec2(-.6,.8))*3.5-t)*.35+sin(p.y*5.+t)*.19;
  float ribbon=pow(max(0.,1.-abs(f-.15)),9.);
  float halo=exp(-length(uv-vec2(.2,.05))*1.8);
  vec3 ink=vec3(.018,.021,.029);
  vec3 gold=vec3(.30,.205,.085);
  vec3 color=ink+gold*(ribbon*.24+halo*.15);
  color*=clamp(1.-dot(uv,uv)*.15,.4,1.);
  gl_FragColor=vec4(color,1.);
}`;

/** Build a reusable, beveled champagne-gold emblem with true 3D depth. */
function createEmblem() {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  [[-1.05,1.24],[-.56,1.24],[0,.33],[.56,1.24],[1.05,1.24],[.24,-.13],[.24,-1.17],[-.24,-1.17],[-.24,-.13]].forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape,{depth:.24,steps:1,bevelEnabled:true,bevelSize:.065,bevelThickness:.065,bevelSegments:3});
  geometry.center();
  const gold = new THREE.MeshPhysicalMaterial({color:0xf0d6a2,metalness:1,roughness:.18,clearcoat:.85,clearcoatRoughness:.14,envMapIntensity:1.7});
  const metalTime = {value:0};
  gold.onBeforeCompile = shader => {
    shader.uniforms.uMetalTime=metalTime;
    shader.fragmentShader='uniform float uMetalTime;\n'+shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(sin(vViewPosition.y*2.0+uMetalTime*.3)*.035,cos(vViewPosition.x*2.0-uMetalTime*.25)*.035,0.0));');
  };
  gold.customProgramCacheKey=()=>'yenghub-liquid-gold-v1';
  const bright = new THREE.MeshStandardMaterial({color:0xf2ddb0,metalness:1,roughness:.2});
  group.add(new THREE.Mesh(geometry,gold));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65,.024,8,112),bright);
  group.add(ring);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.92,.009,6,112),gold);
  orbit.rotation.set(.65,.2,-.2);group.add(orbit);
  for (let i=0;i<8;i++) {
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(.028),bright);
    node.position.set(Math.cos(i*Math.PI/4)*1.65,Math.sin(i*Math.PI/4)*1.65,.025);group.add(node);
  }
  return {group,ring,orbit,metalTime};
}

function environmentTexture() {
  const source = document.createElement('canvas');source.width=256;source.height=128;
  const context = source.getContext('2d');
  if (!context) return null;
  const light = context.createLinearGradient(0,0,256,0);
  for (const [stop,color] of /** @type {[number,string][]} */ ([[0,'#10131a'],[.12,'#ddc49a'],[.2,'#fff2d0'],[.3,'#22232a'],[.52,'#615b4e'],[.6,'#fff5dd'],[.65,'#1c1d26'],[.88,'#c8a15d'],[1,'#10131a']])) light.addColorStop(stop,color);
  context.fillStyle=light;context.fillRect(0,0,256,128);
  const texture = new THREE.CanvasTexture(source);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

/** @param {HTMLElement} home @param {HTMLCanvasElement} canvas @param {WebGL2RenderingContext} context */
function mountScene(home,canvas,context) {
  const stage = /** @type {HTMLElement} */ (home.querySelector('.cinema-stage'));
  const anchor = /** @type {HTMLElement} */ (home.querySelector('.cinema-logo-stage'));
  const renderer = new THREE.WebGLRenderer({canvas,context,alpha:false,antialias:window.innerWidth>1000,powerPreference:'low-power'});
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38,1,.1,40);
  camera.position.set(0,.12,7.2);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
  const texture = environmentTexture();scene.environment=texture;
  const uniforms = {uTime:{value:0},uScroll:{value:0},uResolution:{value:new THREE.Vector2(1,1)}};
  const background = new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,vertexShader:'void main(){gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:backgroundFragment,depthTest:false,depthWrite:false}));
  background.frustumCulled=false;background.renderOrder=-10;scene.add(background);
  scene.add(new THREE.AmbientLight(0xffe4b8,.8));
  const key = new THREE.DirectionalLight(0xffe4b8,4.5);key.position.set(3,4,5);scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8b9d1,2.6);rim.position.set(-4,1,-2);scene.add(rim);
  const {group,ring,orbit,metalTime} = createEmblem();scene.add(group);
  // Deterministic decorative particles; no fabricated market or account data.
  const count=window.innerWidth<=1000?70:160,positions=new Float32Array(count*3);
  for (let i=0;i<count;i++) {positions[i*3]=((i*73%197)/197-.5)*12;positions[i*3+1]=((i*37%193)/193-.5)*8;positions[i*3+2]=-2-(i*17%79)/79*4;}
  const particlesGeometry = new THREE.BufferGeometry();particlesGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const particles = new THREE.Points(particlesGeometry,new THREE.PointsMaterial({color:0xe9cc94,size:.018,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(particles);

  let width=1,height=1,visible=true,disposed=false,frameId=0,last=0,time=0,progress=0,smoothed=0;
  let targetTurn=Number(home.dataset.chapter??0)*Math.PI*2,turn=targetTurn;
  const resize = () => {
    width=stage.clientWidth;height=stage.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,width<=1000?1.25:1.5));renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
  };
  resize();
  const observer = new window.ResizeObserver(resize);observer.observe(stage);
  const onProgress = event => {
    const detail = /** @type {CustomEvent<{index:number,progress:number}>} */ (event).detail;
    targetTurn=detail.index*Math.PI*2;progress=detail.progress;
  };
  home.addEventListener('cinema:progress',onProgress);
  const frame = now => {
    frameId=0;if(disposed||!visible||document.hidden) return;
    const elapsed=now-last;
    if(elapsed<1000/30){frameId=window.requestAnimationFrame(frame);return;}
    const dt=Math.min(elapsed/1000,.06);last=now;time+=dt;
    smoothed+=(progress-smoothed)*Math.min(1,dt*4);
    turn+=(targetTurn-turn)*Math.min(1,dt*2.8);
    const bounds=anchor.getBoundingClientRect(),viewport=stage.getBoundingClientRect();
    const worldHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
    const size=width<=1000?bounds.width:Math.min(height*.72,width*.44,660);
    const scale=size/height*worldHeight/3.9;group.scale.setScalar(scale);
    group.position.set(((bounds.left+bounds.width/2-viewport.left)/width-.5)*worldHeight*camera.aspect,(.5-(bounds.top+bounds.height/2-viewport.top)/height)*worldHeight,0);
    group.rotation.set(Math.sin(time*.32)*.045,turn-.18,Math.sin(smoothed*Math.PI*2)*.04);
    ring.rotation.z=time*.035;orbit.rotation.y=.2+time*.045;
    camera.position.x=Math.sin(smoothed*Math.PI*2)*.12;camera.position.y=.12+Math.sin(smoothed*Math.PI)*.12;camera.lookAt(0,0,0);
    uniforms.uTime.value=time;uniforms.uScroll.value=smoothed;metalTime.value=time;
    particles.rotation.y=time*.012;
    try{renderer.render(scene,camera);}catch{cleanup();return;}
    home.classList.add('cinema-webgl-ready');home.dataset.sceneState='running';
    frameId=window.requestAnimationFrame(frame);
  };
  const wake = () => {
    window.cancelAnimationFrame(frameId);frameId=0;last=window.performance.now();
    if(visible&&!document.hidden&&!disposed)frameId=window.requestAnimationFrame(frame);
    if(!disposed)home.dataset.sceneState=visible&&!document.hidden?'running':'paused';
  };
  const headerHeight=home.querySelector('.cinema-header')?.clientHeight??0;
  const visibility = new window.IntersectionObserver(entries => {visible=entries[0].isIntersecting;wake();},{rootMargin:`-${headerHeight}px 0px 0px 0px`});visibility.observe(stage);
  document.addEventListener('visibilitychange',wake);
  const cleanup = () => {
    if(disposed)return;disposed=true;window.cancelAnimationFrame(frameId);
    observer.disconnect();visibility.disconnect();home.removeEventListener('cinema:progress',onProgress);document.removeEventListener('visibilitychange',wake);
    canvas.removeEventListener('webglcontextlost',lost);
    home.classList.remove('cinema-webgl-ready');home.dataset.sceneState='fallback';
    const resources = new Set();
    scene.traverse(object => {if(object instanceof THREE.Mesh||object instanceof THREE.Points){resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])resources.add(material);}});
    for(const resource of resources)resource.dispose();texture?.dispose();renderer.dispose();
  };
  const lost = event => {event.preventDefault();cleanup();};
  canvas.addEventListener('webglcontextlost',lost);
  wake();return cleanup;
}

const home = document.querySelector('[data-cinematic-home]');
const canvas = home?.querySelector('[data-cinema-canvas]');
if(home instanceof HTMLElement&&canvas instanceof HTMLCanvasElement){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup= /** @type {null|(()=>void)} */ (null);
  const configure=()=>{
    if(reduced.matches||!home.classList.contains('cinema-scroll-enabled')){cleanup?.();cleanup=null;home.dataset.sceneState='fallback';return;}
    if(cleanup)return;
    try{
      const context=canvas.getContext('webgl2',{alpha:false,antialias:window.innerWidth>1000,powerPreference:'low-power'});
      if(!context){home.dataset.sceneState='fallback';return;}
      cleanup=mountScene(home,canvas,context);
    }catch{home.dataset.sceneState='fallback';home.classList.remove('cinema-webgl-ready');}
  };
  reduced.addEventListener('change',configure);window.addEventListener('resize',configure,{passive:true});
  window.addEventListener('pagehide',()=>{cleanup?.();cleanup=null;});
  window.addEventListener('pageshow',configure);configure();
}

// V4 uses the supplied official artwork on a subtly layered 3D plane, never a replacement Y.
const v4=document.querySelector('[data-v4-home]');
if(v4 instanceof HTMLElement){
  const art=/** @type {HTMLElement} */(v4.querySelector('.v4-hero-art'));
  const image=/** @type {HTMLImageElement} */(art.querySelector('img'));
  const canvas=/** @type {HTMLCanvasElement} */(art.querySelector('canvas'));
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let dispose=/** @type {null|(()=>void)} */(null);
  const mount=()=>{
    if(reduced.matches){dispose?.();dispose=null;return;}
    if(dispose||window.location.protocol==='file:')return;
    let renderer;
    try{
      const context=canvas.getContext('webgl2',{alpha:true,powerPreference:'low-power'});if(!context)return;
      renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,20);camera.position.z=5;
      const texture=new THREE.TextureLoader().load(image.currentSrc||image.src,()=>{if(!dead)v4.classList.add('v4-scene-ready');});texture.colorSpace=THREE.SRGBColorSpace;
      const geometry=new THREE.PlaneGeometry(1,1);const material=new THREE.MeshBasicMaterial({map:texture});const plane=new THREE.Mesh(geometry,material);scene.add(plane);
      let id=0,last=0,time=0,dead=false,visible=true;
      const resize=()=>{const w=art.clientWidth,h=art.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const worldH=2*Math.tan(THREE.MathUtils.degToRad(19))*5;const imageAspect=906/546;const planeH=Math.max(worldH,worldH*camera.aspect/imageAspect);plane.scale.set(planeH*imageAspect*1.04,planeH*1.04,1);};resize();
      const frame=now=>{id=0;if(dead||!visible||document.hidden)return;if(now-last<33){id=window.requestAnimationFrame(frame);return;}time+=Math.min((now-last)/1000,.05);last=now;plane.rotation.y=Math.sin(time*.2)*.022;plane.rotation.x=Math.cos(time*.17)*.012;camera.position.x=Math.min(.12,window.scrollY*.00012);renderer.render(scene,camera);id=window.requestAnimationFrame(frame);};
      const wake=()=>{window.cancelAnimationFrame(id);last=window.performance.now();if(!dead&&visible&&!document.hidden)id=window.requestAnimationFrame(frame);};
      const observer=new window.IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();});observer.observe(art);
      const sizing=new window.ResizeObserver(resize);sizing.observe(art);document.addEventListener('visibilitychange',wake);
      dispose=()=>{dead=true;window.cancelAnimationFrame(id);observer.disconnect();sizing.disconnect();document.removeEventListener('visibilitychange',wake);canvas.removeEventListener('webglcontextlost',lost);geometry.dispose();material.dispose();texture.dispose();renderer.dispose();v4.classList.remove('v4-scene-ready');};
      const lost=event=>{event.preventDefault();dispose?.();dispose=null;};canvas.addEventListener('webglcontextlost',lost);wake();
    }catch{renderer?.dispose();v4.classList.remove('v4-scene-ready');}
  };
  reduced.addEventListener('change',mount);window.addEventListener('pagehide',()=>{dispose?.();dispose=null;});window.addEventListener('pageshow',mount);mount();
}
