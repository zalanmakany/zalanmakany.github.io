/* ============================================
   ASTROPHAGE — THE PETROVA LINE (ADRIAN ATMOSPHERE)
   Three.js + GSAP ScrollTrigger Scene
   ============================================ */

// ─── CONFIGURATION ─────────────────────────
const CONFIG = {
    models: {
        astronaut: './models/astronaut_floating_in_space.glb',   
        hull:      './models/hull.glb',        
        lift:      './models/lift.glb',        
    },

    particles: {
        count: 12000,
        size: 0.4,
        spread: 18,
        speed: 0.3,
    },

    // Changed to Adrian's atmosphere colors
    colorAdrian: new THREE.Color('#b3ff00'), // Greenish-yellow
    colorRed:    new THREE.Color('#FF0033'),

    camera: {
        fov: 55,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 4, z: 14 },
        lookAt:   { x: 0, y: 1, z: 0 },
    },

    lights: {
        ambientIntensity: 0.2,
        pointIntensity: 3.0,
        pointDistance: 25,
    },
};

// ─── GLOBALS ─────────────────────────────────
let scene, camera, renderer, clock;
let particleSystem, particleGeometry, particleMaterial;
let pointLight1, pointLight2, ambientLight, dirLight;
let astronautModel, hullModel, liftModel, planet; 
let scrollProgress = 0;

const uiDensity  = document.getElementById('density-val');
const uiSpectrum = document.getElementById('spectrum-val');
const uiHull     = document.getElementById('hull-val');

// ─── INIT ────────────────────────────────────
function init() {
    scene = new THREE.Scene();
    // Base scene starts dark green/yellow
    scene.background = new THREE.Color(0x050a02);
    scene.fog = new THREE.FogExp2(0x050a02, 0.025);

    camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far);
    camera.position.set(CONFIG.camera.position.x, CONFIG.camera.position.y, CONFIG.camera.position.z);
    camera.lookAt(CONFIG.camera.lookAt.x, CONFIG.camera.lookAt.y, CONFIG.camera.lookAt.z);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLighting();
    createStarfield();
    createPlanet(); 
    createAstrophageCloud();
    loadModels();
    setupScrollTrigger();

    window.addEventListener('resize', onWindowResize);
    animate();
}

// ─── LIGHTING ────────────────────────────────
function setupLighting() {
    // Greenish-yellow ambient base
    ambientLight = new THREE.AmbientLight(0x2a3311, CONFIG.lights.ambientIntensity); 
    scene.add(ambientLight);

    // Directional light mimicking the planet Adrian illuminating the ship
    dirLight = new THREE.DirectionalLight(CONFIG.colorAdrian.clone(), 0.5);
    dirLight.position.set(-5, 10, -10);
    scene.add(dirLight);

    // Red Astrophage lights (These start at INTENSITY 0 and fade up on scroll)
    pointLight1 = new THREE.PointLight(CONFIG.colorRed.clone(), 0, CONFIG.lights.pointDistance);
    pointLight1.position.set(2, 5, 4);
    scene.add(pointLight1);

    pointLight2 = new THREE.PointLight(CONFIG.colorRed.clone(), 0, CONFIG.lights.pointDistance);
    pointLight2.position.set(-3, 2, -2);
    scene.add(pointLight2);
}

// ─── STARS ───────────────────────────────────
function createStarfield() {
    const starCount = 6000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const r = 80 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        starPos[i3]     = r * Math.sin(phi) * Math.cos(theta);
        starPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i3 + 2] = r * Math.cos(phi);
        starSizes[i] = Math.random() * 1.5 + 0.3;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));
}

function createPlanet() {
    const geometry = new THREE.SphereGeometry(120, 64, 64);
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime:    { value: 0 },
            uOpacity: { value: 1.0 }
        },
        // 1. THIS WAS THE ISSUE: The vertex shader needs to be reverted to this simple version
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        // 2. The fragment shader safely contains all of our chaotic math and colors
        fragmentShader: `
            uniform float uTime;
            uniform float uOpacity;
            varying vec2 vUv;
            varying vec3 vPosition;

            // 3D Value Noise
            float hash(float n) { return fract(sin(n) * 1e4); }
            float noise(vec3 x) {
                const vec3 step = vec3(110, 241, 171);
                vec3 i = floor(x);
                vec3 f = fract(x);
                float n = dot(i, step);
                vec3 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(mix( hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                               mix( hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
                           mix(mix( hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                               mix( hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
            }

            // Fractal Brownian Motion
            float fbm(vec3 x) {
                float v = 0.0;
                float a = 0.5;
                vec3 shift = vec3(100.0);
                for (int i = 0; i < 7; ++i) { 
                    v += a * noise(x);
                    x = x * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                // Scale coordinates for the base pattern
                vec3 q = vPosition * 0.025;
                
                // Time offsets for continuous fluid movement
                vec3 offset1 = vec3(uTime * 0.03, -uTime * 0.01, uTime * 0.02);
                vec3 offset2 = vec3(-uTime * 0.02, uTime * 0.03, -uTime * 0.01);
                
                // --- CHAOTIC DOMAIN WARPING ---
                float n1 = fbm(q + offset1);
                float n2 = fbm(q + 3.0 * n1 + offset2);
                float n3 = fbm(q + 4.5 * n2);
                
                // Adrian's high-contrast palette (Now with Toxic Yellow!)
                vec3 colVoid = vec3(0.0, 0.02, 0.0);
                vec3 colDeepGreen = vec3(0.02, 0.18, 0.02);
                vec3 colNeonGreen = vec3(0.3, 0.8, 0.0);
                vec3 colToxicYellow = vec3(0.85, 0.95, 0.1); 
                vec3 colBurningOrange = vec3(0.9, 0.5, 0.0);
                
                // Blending the colors up the "elevation" of the noise
                vec3 color = mix(colVoid, colDeepGreen, smoothstep(0.0, 0.3, n3));
                color = mix(color, colNeonGreen, smoothstep(0.25, 0.6, n3));
                color = mix(color, colToxicYellow, smoothstep(0.55, 0.8, n3));
                color = mix(color, colBurningOrange, smoothstep(0.75, 0.95, n3));
                
                // Dramatic rim lighting / spherical shadow
                float edgeShadow = dot(normalize(vPosition), vec3(0.0, 0.0, 1.0));
                color *= smoothstep(-0.1, 0.7, edgeShadow);
                
                gl_FragColor = vec4(color, uOpacity);
            }
        `,
        transparent: true,
        depthWrite: false
    });

    planet = new THREE.Mesh(geometry, material);
    planet.position.set(-100, 30, -450); 
    scene.add(planet);
}


// ─── ASTROPHAGE PARTICLE CLOUD ───────────────
function createAstrophageCloud() {
    const count = CONFIG.particles.count;
    particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const speeds    = new Float32Array(count);   
    const offsets   = new Float32Array(count);   

    const spread = CONFIG.particles.spread;
    const c = CONFIG.colorRed; // Particles are strictly red now

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const r = Math.pow(Math.random(), 1/3) * spread;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 1.5; 
        positions[i3 + 2] = r * Math.cos(phi);

        colors[i3]     = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        sizes[i]   = Math.random() * CONFIG.particles.size + 0.05;
        speeds[i]  = Math.random() * 0.5 + 0.2;
        offsets[i] = Math.random() * Math.PI * 2;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    particleGeometry.userData = { speeds, offsets, originalPositions: positions.slice() };

    particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime:      { value: 0 },
            uColor:     { value: CONFIG.colorRed.clone() },
            uPixelRatio:{ value: renderer.getPixelRatio() },
            uOpacity:   { value: 0.0 } // <- STARTS AT 0 (INVISIBLE)
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            uniform float uPixelRatio;

            void main() {
                vColor = color;
                vec3 pos = position;
                pos.y += sin(uTime * 0.5 + position.x * 0.3) * 0.15;
                pos.x += cos(uTime * 0.3 + position.z * 0.2) * 0.1;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                vAlpha = smoothstep(50.0, 10.0, -mvPosition.z);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uOpacity; // We added the opacity uniform here
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 1.2);
                vec3 finalColor = vColor * uColor * 4.0;
                // Multiply the alpha by our uOpacity uniform so it fades in
                gl_FragColor = vec4(finalColor, strength * vAlpha * uOpacity);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
}

// ─── MODEL LOADING ───────────────────────────
function loadModels() {
    const loader = new THREE.GLTFLoader();

    function onLoad(gltf, name) {
        const model = gltf.scene;
        model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim; 
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        if (name === 'astronaut') { astronautModel = model; astronautModel.position.set(0, 1.8, 0); } 
        else if (name === 'hull') { hullModel = model; hullModel.position.set(0, 0, 0); } 
        else if (name === 'lift') { liftModel = model; liftModel.position.set(0, 0.5, 0); }
        scene.add(model);
    }

    function onError(err, name) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true, transparent: true, opacity: 0.3 });
        const placeholder = new THREE.Mesh(geo, mat);
        if (name === 'astronaut') { placeholder.position.set(0, 1.8, 0); astronautModel = placeholder; } 
        else if (name === 'hull') { placeholder.position.set(0, 0, 0); placeholder.scale.set(3, 0.8, 6); hullModel = placeholder; } 
        else if (name === 'lift') { placeholder.position.set(0, 0.5, 0); liftModel = placeholder; }
        scene.add(placeholder);
    }

    loader.load(CONFIG.models.astronaut, (gltf) => onLoad(gltf, 'astronaut'), undefined, (err) => onError(err, 'astronaut'));
    loader.load(CONFIG.models.hull, (gltf) => onLoad(gltf, 'hull'), undefined, (err) => onError(err, 'hull'));
    loader.load(CONFIG.models.lift, (gltf) => onLoad(gltf, 'lift'), undefined, (err) => onError(err, 'lift'));
}

// ─── GSAP SCROLL TRIGGER ─────────────────────
function setupScrollTrigger() {
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '#scroll-container',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,           
            onUpdate: (self) => {
                scrollProgress = self.progress;
                updateUI(scrollProgress);
            },
        },
    });

    // 1. Fade the particles IN (0 to 1)
    tl.to(particleMaterial.uniforms.uOpacity, { value: 1.0, duration: 3, ease: 'power2.inOut' }, 0);
    
    // 2. Bring up the violent Red lights
    tl.to(pointLight1, { intensity: CONFIG.lights.pointIntensity * 2.2, distance: CONFIG.lights.pointDistance * 0.6, duration: 3, ease: 'power2.inOut' }, 0);
    tl.to(pointLight2, { intensity: CONFIG.lights.pointIntensity * 1.4, duration: 3, ease: 'power2.inOut' }, 0.1);

    tl.to(planet.material.uniforms.uOpacity, { value: 0, duration: 3, ease: 'power2.inOut' }, 0);   
    
   // 3. Push camera in
    tl.to(camera.position, { z: 9, y: 3.2, duration: 3, ease: 'power1.inOut' }, 0);
    
    // 4. Scene fog shifts from dark green/yellow to deep crimson red
    tl.to(scene.fog.color, { r: 0.08, g: 0.01, b: 0.02, duration: 3, ease: 'power2.inOut' }, 0);
    tl.to(scene.background, {
        r: 0.06, g: 0.01, b: 0.02, duration: 3, ease: 'power2.inOut',
        onUpdate: function() { renderer.setClearColor(scene.background); }
    }, 0);
}

// ─── UI UPDATES ──────────────────────────────
function updateUI(progress) {
    const pct = Math.round(progress * 100);
    uiDensity.textContent = pct + '%';

    if (progress < 0.2) {
        uiSpectrum.textContent = 'CLEAR';
        uiSpectrum.style.color = '#b3ff00';
    } else if (progress < 0.8) {
        uiSpectrum.textContent = 'ASTROPHAGE DETECTED';
        uiSpectrum.style.color = '#FFAA00';
    } else {
        uiSpectrum.textContent = 'DEEP RED';
        uiSpectrum.style.color = '#FF0033';
    }

    const integrity = Math.max(0, 100 - Math.round(progress * 65));
    uiHull.textContent = integrity + '%';
    if (integrity < 50) uiHull.style.color = '#FF0033';
    else if (integrity < 80) uiHull.style.color = '#FFAA00';
    else uiHull.style.color = '#b3ff00';
}

// ─── ANIMATION LOOP ──────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if (particleMaterial) particleMaterial.uniforms.uTime.value = time;
    if (particleSystem) particleSystem.rotation.y = time * 0.02;

    if (astronautModel) {
        astronautModel.position.y = 1.8 + Math.sin(time * 0.8) * 0.05;
        astronautModel.rotation.y = Math.sin(time * 0.3) * 0.05;
    }
    if (hullModel) hullModel.rotation.y = Math.sin(time * 0.1) * 0.02;
    if (liftModel) liftModel.position.y = 0.5 + Math.sin(time * 0.6 + 1) * 0.03;
    
if (planet && planet.material.uniforms) planet.material.uniforms.uTime.value = time;
    camera.position.x += (Math.sin(time * 0.2) * 0.3 - camera.position.x) * 0.01;

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (particleMaterial) particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
}

init();
