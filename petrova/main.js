/* ============================================
   ASTROPHAGE — THE PETROVA LINE
   Three.js + GSAP ScrollTrigger Scene
   ============================================ */

// ─── CONFIGURATION ─────────────────────────
const CONFIG = {
    // ═══════════════════════════════════════
    // INSERT YOUR .glb FILE PATHS HERE:
    // ═══════════════════════════════════════
    models: {
        astronaut: './models/astronaut.glb',   // <-- REPLACE with your path
        hull:      './models/hull.glb',        // <-- REPLACE with your path
        lift:      './models/lift.glb',        // <-- REPLACE with your path
    },

    // Particle (Astrophage) settings
    particles: {
        count: 12000,
        size: 0.15,
        spread: 18,
        speed: 0.3,
    },

    // Colors
    colorGreen: new THREE.Color('#00FF66'),
    colorRed:   new THREE.Color('#FF0033'),

    // Camera
    camera: {
        fov: 55,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 4, z: 14 },
        lookAt:   { x: 0, y: 1, z: 0 },
    },

    // Lights
    lights: {
        ambientIntensity: 0.15,
        pointIntensity: 2.5,
        pointDistance: 25,
    },
};

// ─── GLOBALS ─────────────────────────────────
let scene, camera, renderer, clock;
let particleSystem, particleGeometry, particleMaterial;
let pointLight1, pointLight2, ambientLight;
let astronautModel, hullModel, liftModel, planetModel;
let scrollProgress = 0;

// UI elements
const uiDensity  = document.getElementById('density-val');
const uiSpectrum = document.getElementById('spectrum-val');
const uiHull     = document.getElementById('hull-val');

// ─── INIT ────────────────────────────────────
function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020204);
    scene.fog = new THREE.FogExp2(0x020204, 0.025);

    // 2. Camera (3rd-person, looking down the ship)
    camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
    );
    camera.position.set(
        CONFIG.camera.position.x,
        CONFIG.camera.position.y,
        CONFIG.camera.position.z
    );
    camera.lookAt(
        CONFIG.camera.lookAt.x,
        CONFIG.camera.lookAt.y,
        CONFIG.camera.lookAt.z
    );

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Clock
    clock = new THREE.Clock();

    // 5. Lighting
    setupLighting();

    // 6. Starfield background
    createStarfield();

    createPlanet();

    // 7. Astrophage particle cloud
    createAstrophageCloud();

    // 8. Load GLB models
    loadModels();

    // 9. GSAP ScrollTrigger setup
    setupScrollTrigger();

    // 10. Event listeners
    window.addEventListener('resize', onWindowResize);

    // 11. Start loop
    animate();
}

// ─── LIGHTING ────────────────────────────────
function setupLighting() {
    // Ambient — dim base
    ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.lights.ambientIntensity);
    scene.add(ambientLight);

    // Point Light 1 — main glow (will animate color)
    pointLight1 = new THREE.PointLight(
        CONFIG.colorGreen.clone(),
        CONFIG.lights.pointIntensity,
        CONFIG.lights.pointDistance
    );
    pointLight1.position.set(2, 5, 4);
    scene.add(pointLight1);

    // Point Light 2 — fill/rim (will animate color)
    pointLight2 = new THREE.PointLight(
        CONFIG.colorGreen.clone(),
        CONFIG.lights.pointIntensity * 0.6,
        CONFIG.lights.pointDistance
    );
    pointLight2.position.set(-3, 2, -2);
    scene.add(pointLight2);

    // Subtle directional for model definition
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
}

// ─── STARS ───────────────────────────────────
function createStarfield() {
    const starCount = 6000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        // Distribute stars in a large sphere around the scene
        const r = 80 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        starPos[i3]     = r * Math.sin(phi) * Math.cos(theta);
        starPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i3 + 2] = r * Math.cos(phi);

        starSizes[i] = Math.random() * 1.5 + 0.3;
    }

   // ─── BACKGROUND PLANET ───────────────────────
   function createPlanet() {
       // 1. The Planet Geometry
       const geometry = new THREE.SphereGeometry(150, 64, 64);
       
       // 2. The Material
       const material = new THREE.MeshStandardMaterial({
           color: 0x333340,      // Slightly lighter so it isn't pitch black
           roughness: 0.9,
           metalness: 0.1,
           fog: false            // <-- THE FIX: Stops the scene fog from hiding it!
       });
   
       planet = new THREE.Mesh(geometry, material);
       
       // Push it far back into the distance and slightly up/left
       planet.position.set(-80, 40, -400); 
       scene.add(planet);
   
       // 3. Planet Lighting (Creates a cinematic crescent shadow)
       // This light only really affects the planet because it's so far back
       const planetLight = new THREE.DirectionalLight(0xfff0dd, 0.6);
       planetLight.position.set(-300, 150, -300); // Light hitting from the top-left
       planetLight.target = planet;
       scene.add(planetLight);
   }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
}

// ─── ASTROPHAGE PARTICLE CLOUD ───────────────
function createAstrophageCloud() {
    const count = CONFIG.particles.count;
    particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const speeds    = new Float32Array(count);   // per-particle drift speed
    const offsets   = new Float32Array(count);   // phase offset for animation

    const spread = CONFIG.particles.spread;
    const c = CONFIG.colorGreen;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Random position in a spherical volume around the ship
        const r = Math.pow(Math.random(), 1/3) * spread;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 1.5; // slightly above origin
        positions[i3 + 2] = r * Math.cos(phi);

        // Initial color = neon green
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

    // Store custom data for animation
    particleGeometry.userData = { speeds, offsets, originalPositions: positions.slice() };

    // Custom shader material for glowing particles
    particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime:      { value: 0 },
            uColor:     { value: CONFIG.colorGreen.clone() },
            uPixelRatio:{ value: renderer.getPixelRatio() },
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
                // Gentle drift
                pos.y += sin(uTime * 0.5 + position.x * 0.3) * 0.15;
                pos.x += cos(uTime * 0.3 + position.z * 0.2) * 0.1;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                // Fade particles near camera edge for depth
                vAlpha = smoothstep(50.0, 10.0, -mvPosition.z);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                // Circular soft particle
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 1.8);
                vec3 finalColor = vColor * uColor * 2.5;
                gl_FragColor = vec4(finalColor, strength * vAlpha * 0.9);
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

    // Helper to place loaded models
    function onLoad(gltf, name) {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Center and scale (adjust these per your actual model dimensions)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim; // normalize to ~2.5 units
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        // Assign to global refs
        if (name === 'astronaut') {
            astronautModel = model;
            astronautModel.position.set(0, 1.8, 0);
        } else if (name === 'hull') {
            hullModel = model;
            hullModel.position.set(0, 0, 0);
        } else if (name === 'lift') {
            liftModel = model;
            liftModel.position.set(0, 0.5, 0);
        }

        scene.add(model);
        console.log(`Loaded: ${name}`);
    }

    function onError(err, name) {
        console.warn(`Failed to load ${name}:`, err);
        // Create a placeholder wireframe box so the scene still works
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x444444,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
        });
        const placeholder = new THREE.Mesh(geo, mat);
        if (name === 'astronaut') {
            placeholder.position.set(0, 1.8, 0);
            astronautModel = placeholder;
        } else if (name === 'hull') {
            placeholder.position.set(0, 0, 0);
            placeholder.scale.set(3, 0.8, 6);
            hullModel = placeholder;
        } else if (name === 'lift') {
            placeholder.position.set(0, 0.5, 0);
            liftModel = placeholder;
        }
        scene.add(placeholder);
    }

    // ═══════════════════════════════════════════
    // LOAD YOUR .glb FILES HERE
    // ═══════════════════════════════════════════
    loader.load(
        CONFIG.models.astronaut,
        (gltf) => onLoad(gltf, 'astronaut'),
        undefined,
        (err) => onError(err, 'astronaut')
    );
    loader.load(
        CONFIG.models.hull,
        (gltf) => onLoad(gltf, 'hull'),
        undefined,
        (err) => onError(err, 'hull')
    );
    loader.load(
        CONFIG.models.lift,
        (gltf) => onLoad(gltf, 'lift'),
        undefined,
        (err) => onError(err, 'lift')
    );
}

// ─── GSAP SCROLL TRIGGER ─────────────────────
function setupScrollTrigger() {
    gsap.registerPlugin(ScrollTrigger);

    // Master timeline scrubbed by scroll
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '#scroll-container',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,           // 1.5s smoothing for buttery feel
            onUpdate: (self) => {
                scrollProgress = self.progress;
                updateUI(scrollProgress);
            },
        },
    });

    // ═══════════════════════════════════════════
    // THE PETROVA LINE: Green → Red transition
    // ═══════════════════════════════════════════

    // 1. Particle emissive color shift
    tl.to(particleMaterial.uniforms.uColor.value, {
        r: CONFIG.colorRed.r,
        g: CONFIG.colorRed.g,
        b: CONFIG.colorRed.b,
        duration: 3,
        ease: 'power2.inOut',
    }, 0);

    // 2. Point Light 1 color shift
    tl.to(pointLight1.color, {
        r: CONFIG.colorRed.r,
        g: CONFIG.colorRed.g,
        b: CONFIG.colorRed.b,
        duration: 3,
        ease: 'power2.inOut',
    }, 0);

    // 3. Point Light 2 color shift
    tl.to(pointLight2.color, {
        r: CONFIG.colorRed.r,
        g: CONFIG.colorRed.g,
        b: CONFIG.colorRed.b,
        duration: 3,
        ease: 'power2.inOut',
    }, 0.1); // slight stagger for realism

    // 4. Intensity ramp-up (Astrophage getting denser / hotter)
    tl.to(pointLight1, {
        intensity: CONFIG.lights.pointIntensity * 2.2,
        distance: CONFIG.lights.pointDistance * 0.6,
        duration: 3,
        ease: 'power2.inOut',
    }, 0);

    tl.to(pointLight2, {
        intensity: CONFIG.lights.pointIntensity * 1.4,
        duration: 3,
        ease: 'power2.inOut',
    }, 0.1);

    // 5. Camera subtle push-in as danger rises
    tl.to(camera.position, {
        z: 9,
        y: 3.2,
        duration: 3,
        ease: 'power1.inOut',
    }, 0);

    // 6. Particle size swell (density increase)
    tl.to(particleMaterial.uniforms.uPixelRatio, {
        value: renderer.getPixelRatio() * 1.6,
        duration: 3,
        ease: 'power2.inOut',
    }, 0);

    // 7. Scene fog darkens / reddens
    tl.to(scene.fog.color, {
        r: 0.08,
        g: 0.01,
        b: 0.02,
        duration: 3,
        ease: 'power2.inOut',
    }, 0);

    tl.to(scene.background, {
        r: 0.06,
        g: 0.01,
        b: 0.02,
        duration: 3,
        ease: 'power2.inOut',
        onUpdate: function() {
            renderer.setClearColor(scene.background);
        }
    }, 0);
}

// ─── UI UPDATES ──────────────────────────────
function updateUI(progress) {
    const pct = Math.round(progress * 100);
    uiDensity.textContent = pct + '%';

    // Spectrum label
    if (progress < 0.33) {
        uiSpectrum.textContent = 'NEON GREEN';
        uiSpectrum.style.color = '#00FF66';
    } else if (progress < 0.66) {
        uiSpectrum.textContent = 'SHIFTING…';
        uiSpectrum.style.color = '#FFAA00';
    } else {
        uiSpectrum.textContent = 'DEEP RED';
        uiSpectrum.style.color = '#FF0033';
    }

    // Hull integrity drops as Astrophage rises
    const integrity = Math.max(0, 100 - Math.round(progress * 65));
    uiHull.textContent = integrity + '%';
    if (integrity < 50) uiHull.style.color = '#FF0033';
    else if (integrity < 80) uiHull.style.color = '#FFAA00';
    else uiHull.style.color = '#00FF66';
}

// ─── ANIMATION LOOP ──────────────────────────
function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Update particle shader time
    if (particleMaterial) {
        particleMaterial.uniforms.uTime.value = time;
    }

    // Gentle rotation of the entire particle cloud
    if (particleSystem) {
        particleSystem.rotation.y = time * 0.02;
    }

    // Subtle model idle animations
    if (astronautModel) {
        astronautModel.position.y = 1.8 + Math.sin(time * 0.8) * 0.05;
        astronautModel.rotation.y = Math.sin(time * 0.3) * 0.05;
    }
    if (hullModel) {
        hullModel.rotation.y = Math.sin(time * 0.1) * 0.02;
    }
    if (liftModel) {
        liftModel.position.y = 0.5 + Math.sin(time * 0.6 + 1) * 0.03;
    }

   if (planet) {
        planet.rotation.y += 0.0003;
    }
   
    // Camera micro-drift for cinematic feel
    camera.position.x += (Math.sin(time * 0.2) * 0.3 - camera.position.x) * 0.01;

    renderer.render(scene, camera);
}

// ─── RESIZE ──────────────────────────────────
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (particleMaterial) {
        particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }
}

// ─── BOOT ────────────────────────────────────
init();
