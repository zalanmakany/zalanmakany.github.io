/* ============================================
   ASTROPHAGE — THE PETROVA LINE (ADRIAN ATMOSPHERE)
   Three.js + GSAP ScrollTrigger Scene (Optimized & Cinematic)
   ============================================ */

// ─── CONFIGURATION ─────────────────────────
const CONFIG = {
    models: {
        astronaut: './models/astronaut.glb',   
    },
    particles: {
        count: 12000,
        size: 0.15,
        spread: 18,
        speed: 0.3,
    },
    colorAdrian: new THREE.Color('#b3ff00'), 
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
let pointLight1, pointLight2; 
let astronautModel, planet, planetMaterial; 

// ─── INIT ────────────────────────────────────
function init() {
    scene = new THREE.Scene();
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
    // Scoped locally to prevent global pollution
    const ambientLight = new THREE.AmbientLight(0x2a3311, CONFIG.lights.ambientIntensity); 
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(CONFIG.colorAdrian.clone(), 0.5);
    dirLight.position.set(-5, 10, -10);
    scene.add(dirLight);

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

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const r = 80 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        starPos[i3]     = r * Math.sin(phi) * Math.cos(theta);
        starPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i3 + 2] = r * Math.cos(phi);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(starGeo, starMat));
}

// ─── BACKGROUND PLANET (ADRIAN) ──────────────
function createPlanet() {
    const geometry = new THREE.SphereGeometry(120, 64, 64);
    
    // Assuming you have your custom fbm() shader logic integrated here. 
    planetMaterial = new THREE.MeshStandardMaterial({
        color: 0x111a05,      
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 1.0,
        fog: false            
    });

    planet = new THREE.Mesh(geometry, planetMaterial);
    planet.position.set(-100, 30, -450); 
    scene.add(planet);

    const planetLight = new THREE.DirectionalLight(0xb3ff00, 2.5); 
    planetLight.position.set(-300, 100, -600); 
    planetLight.target = planet;
    scene.add(planetLight);
}

// ─── ASTROPHAGE PARTICLE CLOUD ───────────────
function createAstrophageCloud() {
    const count = CONFIG.particles.count;
    particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    const spread = CONFIG.particles.spread;
    const c = CONFIG.colorRed; 

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
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime:      { value: 0 },
            uColor:     { value: CONFIG.colorRed.clone() },
            uPixelRatio:{ value: renderer.getPixelRatio() },
            uOpacity:   { value: 0.0 } 
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
            uniform float uOpacity; 
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 1.8);
                vec3 finalColor = vColor * uColor * 2.5;
                gl_FragColor = vec4(finalColor, strength * vAlpha * uOpacity * 0.9);
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

    loader.load(CONFIG.models.astronaut, (gltf) => {
        astronautModel = gltf.scene;
        astronautModel.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
        
        const box = new THREE.Box3().setFromObject(astronautModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const scale = 2.5 / maxDim; 
        astronautModel.scale.setScalar(scale);
        astronautModel.position.sub(center.multiplyScalar(scale));
        astronautModel.position.set(0, 1.8, 0); 
        
        scene.add(astronautModel);
    }, undefined, (err) => {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true, transparent: true, opacity: 0.3 });
        astronautModel = new THREE.Mesh(geo, mat);
        astronautModel.position.set(0, 1.8, 0);
        scene.add(astronautModel);
    });
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
        },
    });

    // Fade particles IN
    tl.to(particleMaterial.uniforms.uOpacity, { value: 1.0, duration: 3, ease: 'power2.inOut' }, 0);
    
    // Fade planet OUT visually, but leave the mesh active and the shader rendering
    if (planetMaterial.uniforms) {
        tl.to(planetMaterial.uniforms.uOpacity, { value: 0.0, duration: 3, ease: 'power2.inOut' }, 0);
    } else {
        tl.to(planetMaterial, { opacity: 0.0, duration: 3, ease: 'power2.inOut' }, 0);
    }

    tl.to(pointLight1, { intensity: CONFIG.lights.pointIntensity * 2.2, distance: CONFIG.lights.pointDistance * 0.6, duration: 3, ease: 'power2.inOut' }, 0);
    tl.to(pointLight2, { intensity: CONFIG.lights.pointIntensity * 1.4, duration: 3, ease: 'power2.inOut' }, 0.1);
    tl.to(camera.position, { z: 9, y: 3.2, duration: 3, ease: 'power1.inOut' }, 0);
    tl.to(scene.fog.color, { r: 0.08, g: 0.01, b: 0.02, duration: 3, ease: 'power2.inOut' }, 0);
    tl.to(scene.background, { r: 0.06, g: 0.01, b: 0.02, duration: 3, ease: 'power2.inOut' }, 0);
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
    
    if (planet) planet.rotation.y += 0.0002;

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
