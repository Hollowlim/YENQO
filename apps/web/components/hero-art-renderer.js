// Preserve the approved scene while compositing rigid, independently drifting rocks.
(() => {
  const textureUrls = ['__HERO_ART_DATA__','__HERO_CLEAN_DATA__','__HERO_ROCK_DATA__'];
  const rocks = JSON.parse('__HERO_ROCK_LAYOUT__');
  const root = document.querySelector('[data-v4-home]');
  const host = root?.querySelector('.v4-hero-art');
  if (!(root instanceof HTMLElement) || !(host instanceof HTMLElement)) return;
  const home = root, art = host;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let dispose = () => {};
  const initialize = () => {
    dispose();
    const canvas = document.createElement('canvas');
    canvas.className = 'v4-art-motion-canvas'; canvas.setAttribute('aria-hidden','true');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { home.dataset.artRenderer = 'fallback'; return; }
    let stopped = false, loaded = false, frame = 0, previous = 0, lastDraw = 0, phase = 0;
    const shaders = /** @type {WebGLShader[]} */([]);
    let program = /** @type {WebGLProgram|null} */(null), buffer = /** @type {WebGLBuffer|null} */(null);
    const textures = /** @type {WebGLTexture[]} */([]);
    let timeLocation = /** @type {WebGLUniformLocation|null} */(null), cropLocation = /** @type {WebGLUniformLocation|null} */(null);
    const images = textureUrls.map(()=>new window.Image());
    const stop = () => { if(frame)window.cancelAnimationFrame(frame);frame=0;previous=0;lastDraw=0;canvas.dataset.motion='paused'; };
    const running = () => home.dataset.heroMotion==='running'&&!preference.matches&&!document.hidden;
    const render = () => {
      if(stopped||!loaded||!program||gl.isContextLost())return;
      gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.uniform1f(timeLocation,preference.matches?0:phase);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if(gl.getError()!==gl.NO_ERROR){fallback();return;}
      canvas.dataset.phase=phase.toFixed(4);home.dataset.artRenderer='ready';
    };
    const resize = () => {
      if(stopped)return;
      const box=art.getBoundingClientRect(), ratio=Math.min(window.devicePixelRatio||1,2);
      const scale=Math.min(ratio,2560/Math.max(1,box.width));
      canvas.width=Math.max(1,Math.round(box.width*scale));canvas.height=Math.max(1,Math.round(box.height*scale));
      // Match the source image's centered object-fit: cover, including tablet crops.
      const target=box.width/Math.max(1,box.height), source=1672/941;
      gl.useProgram(program);gl.uniform2f(cropLocation,target<source?target/source:1,target>source?source/target:1);
      render();
    };
    const tick = now => {
      frame=0;if(stopped||!running()){stop();return;}
      if(previous)phase+=Math.min((now-previous)/1000,.1);previous=now;
      if(now-lastDraw>=1000/24){render();lastDraw=now;}
      if(!stopped)frame=window.requestAnimationFrame(tick);
    };
    const sync = () => {
      if(stopped||!loaded)return;
      if(running()){canvas.dataset.motion='running';if(!frame)frame=window.requestAnimationFrame(tick);}
      else{stop();render();}
    };
    const observer=new window.MutationObserver(sync), sizeObserver=new window.ResizeObserver(resize);
    const cleanup = () => {
      if(stopped)return;stopped=true;stop();observer.disconnect();sizeObserver.disconnect();preference.removeEventListener('change',sync);
      images.forEach(image=>{image.onload=null;image.onerror=null;});canvas.remove();
      if(!gl.isContextLost()){textures.forEach(texture=>gl.deleteTexture(texture));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));}
    };
    function fallback(){home.dataset.artRenderer='fallback';cleanup();}
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
    const compile = (type,source) => {
      const shader=gl.createShader(type);if(!shader)throw new Error('Shader unavailable');shaders.push(shader);
      gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Shader failed');return shader;
    };
    dispose=cleanup;
    try {
      const vertex=compile(gl.VERTEX_SHADER,`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=(aPosition+1.)*.5;gl_Position=vec4(aPosition,0.,1.);}`);
      const fragment=compile(gl.FRAGMENT_SHADER,`
        precision highp float;
        varying vec2 vUV;uniform sampler2D uImage;uniform sampler2D uClean;uniform sampler2D uRocks;uniform float uTime;uniform vec2 uCrop;
        uniform vec4 uSource[${rocks.length}];uniform vec4 uPlacement[${rocks.length}];uniform vec4 uHole[${rocks.length}];
        const vec2 pixels=vec2(1672.,941.);
        float patch(vec2 p,vec2 c,vec2 r){return 1.-smoothstep(.68,1.,length((p-c)/r));}
        vec2 texturePoint(vec2 p){return vec2(p.x,1.-p.y);}
        void main(){
          vec2 p=(vec2(vUV.x,1.-vUV.y)-.5)*uCrop+.5;
          vec2 uv=p;
          float logo=patch(p,vec2(.66,.445),vec2(.205,.265));
          // Gentle levitation of the original emblem pixels, with feathered edges.
          uv.y-=sin(uTime*.8)*.007*logo;
          float earth=patch(p,vec2(.655,.30),vec2(.21,.235))*(1.-logo);
          uv.x+=sin(uTime*.16+p.y*7.)*.004*earth;
          vec3 color=texture2D(uImage,texturePoint(clamp(uv,0.,1.))).rgb;
          // Inpainted pixels only replace the old rock footprints. The logo,
          // platform, trails and all other scene pixels stay from the original.
          float cleared=0.;
          for(int i=0;i<${rocks.length};i++){
            vec2 edge=abs(uv*pixels-uHole[i].xy)-uHole[i].zw;
            cleared=max(cleared,1.-smoothstep(-4.,5.,max(edge.x,edge.y)));
          }
          if(cleared>0.)color=mix(color,texture2D(uClean,texturePoint(uv)).rgb,cleared);
          // Pixel-space rigid transforms preserve each rock's silhouette and
          // aspect ratio. Long, unequal paths give a slow inertial drift.
          for(int i=0;i<${rocks.length};i++){
            float seed=float(i)*1.73,depth=uPlacement[i].w;
            float rate=.025+depth*.014+float(i)*.0008;
            vec2 shift=vec2(sin(uTime*rate+seed)-sin(seed),cos(uTime*rate*.73+seed)-cos(seed))*(12.+8.*depth)*vec2(1.,.7);
            float angle=uTime*(.0012+mod(float(i),3.)*.0003)*(mod(float(i),2.)<1.?1.:-1.);
            mat2 inverseTurn=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
            vec2 sourcePixel=inverseTurn*(p*pixels-uPlacement[i].xy-shift)/uPlacement[i].z+uSource[i].xy;
            vec2 edge=abs(sourcePixel-uSource[i].xy)-uSource[i].zw;
            if(max(edge.x,edge.y)<0.){
              vec4 fragment=texture2D(uRocks,texturePoint(sourcePixel/pixels));
              color=mix(color,fragment.rgb,fragment.a);
            }
          }
          // Light travels along the existing orbit, without replacing its gold trails.
          float a=uTime*.48;
          vec2 light=vec2(.65+cos(a)*.304,.505+sin(a)*.16+cos(a)*-.12);
          float glow=exp(-dot((p-light)/vec2(.006,.010),(p-light)/vec2(.006,.010)));
          float gold=smoothstep(.05,.22,color.r-color.b);
          color+=vec3(1.,.66,.23)*glow*.32*gold;
          gl_FragColor=vec4(color,1.);
        }
      `);
      program=gl.createProgram();if(!program)throw new Error('Program unavailable');
      gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program failed');gl.useProgram(program);
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      timeLocation=gl.getUniformLocation(program,'uTime');cropLocation=gl.getUniformLocation(program,'uCrop');
      const activeProgram = program;
      ['uImage','uClean','uRocks'].forEach((name,index)=>gl.uniform1i(gl.getUniformLocation(activeProgram,name),index));
      for(const [name,key] of [['uSource','source'],['uPlacement','placement'],['uHole','hole']])gl.uniform4fv(gl.getUniformLocation(program,name+'[0]'),new Float32Array(rocks.flatMap(rock=>rock[key])));
      let complete=0;
      images.forEach((image,index)=>{image.onload=()=>{
        if(stopped)return;
        try{
          const texture=gl.createTexture();if(!texture)throw new Error('Texture unavailable');textures.push(texture);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
          complete++;if(complete===images.length){loaded=true;art.append(canvas);resize();sync();}
        }catch{fallback();}
      };
      image.onerror=fallback;image.src=textureUrls[index];});
      observer.observe(home,{attributes:true,attributeFilter:['data-hero-motion']});sizeObserver.observe(art);preference.addEventListener('change',sync);
    }catch{fallback();}
  };
  window.addEventListener('pagehide',()=>dispose());window.addEventListener('pageshow',event=>{if(event.persisted)initialize();});
  initialize();
})();
