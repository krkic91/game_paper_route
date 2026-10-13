// version v1.0
/* A road-relative cycling scene. Reuses all GPU objects while the road moves. */
(function () {
  'use strict';
  const A = window.Arcade3D, M = A.models;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  A.views.race = function (ui, scope) {
    const L = window.RaceLogic;
    const e = A.createScene(ui, scope, {
      id: 'race', driving: true, label: 'Đường đua xe đạp: cua, dốc và mặt đường',
      background: '#c6ddd9', shadowSize: 23,
    });
    const T = e.T, up = new T.Vector3(0, 1, 0);
    const roadHalf = L.trackAt(0).width / 2;
    const direction = new T.Vector3(), from = new T.Vector3(), to = new T.Vector3();
    const roadStep = 2, roadCount = 94, samples = Array(roadCount + 1);
    let base = null, distance = 0, seed = 0, lastState = null;
    let cameraReady = false, lastPreset = '', lastEventId = 0, particleClock = 0, lastMeta = {};
    const cameraPosition = new T.Vector3(), cameraTarget = new T.Vector3();
    const targetPosition = new T.Vector3(), targetLook = new T.Vector3();

    function segment(a, b, radius, material, parent) {
      return e.rod(a, b, radius, material, parent);
    }
    function setSegment(mesh, a, b, radius) {
      from.set(...a); to.set(...b); direction.subVectors(to, from);
      mesh.position.copy(from).add(to).multiplyScalar(.5);
      mesh.scale.set(radius, direction.length(), radius);
      mesh.quaternion.setFromUnitVectors(up, direction.normalize());
    }
    function sample(at) { return L.trackAt(at, seed); }
    function locate(mesh, at, offset = 0, lift = 0) {
      const road = sample(at), cosine = Math.cos(road.heading), sine = Math.sin(road.heading);
      mesh.position.set(road.center - base.center + cosine * offset, road.height - base.height + lift, -(at - distance) + sine * offset);
      mesh.rotation.order = 'YXZ'; mesh.rotation.set(Math.atan(road.grade * cosine), -road.heading, 0, 'YXZ');
      return road;
    }

    // Each strip is one draw call, including all patches of a given surface.
    function ribbon(left, right, y, material, accepts = () => true) {
      const geometry = e.trackGeometry(new T.BufferGeometry());
      const position = new T.Float32BufferAttribute(roadCount * 18, 3);
      const normal = new T.Float32BufferAttribute(roadCount * 18, 3);
      const positions = position.array, normals = normal.array;
      position.setUsage(e.renderer.getContext().DYNAMIC_DRAW);
      normal.setUsage(e.renderer.getContext().DYNAMIC_DRAW);
      geometry.setAttribute('position', position); geometry.setAttribute('normal', normal);
      const mesh = e.mesh(geometry, material); mesh.frustumCulled = false; mesh.castShadow = false;
      function update() {
        let n = 0;
        for (let i = 0; i < roadCount; i++) {
          const start = samples[i], end = samples[i + 1];
          if (!accepts(start.surface)) continue;
          // Forward is -Z, so these triangles face up; the reverse winding
          // would be culled even when their supplied normals point up.
          for (const [point, offset] of [[start, left], [start, right], [end, left], [start, right], [end, right], [end, left]]) {
            const cosine = Math.cos(point.heading), sine = Math.sin(point.heading);
            positions[n] = point.center - base.center + cosine * offset;
            positions[n + 1] = point.height - base.height + y;
            positions[n + 2] = -(point.at - distance) + sine * offset;
            const pitch = point.grade * cosine, inv = 1 / Math.sqrt(1 + pitch * pitch);
            normals[n] = -pitch * sine * inv; normals[n + 1] = inv; normals[n + 2] = pitch * cosine * inv;
            n += 3;
          }
        }
        geometry.setDrawRange(0, n / 3); position.needsUpdate = normal.needsUpdate = true;
      }
      return { mesh, update };
    }
    const roadMaterials = {
      asphalt: e.material('#657477', { roughness: .94 }),
      wet: e.material('#526f7b', { roughness: .23, metalness: .12 }),
      gravel: e.material('#b2a78a', { roughness: 1 }),
    };
    const ribbons = [
      ribbon(-85, -roadHalf, -.045, '#96b58a'), ribbon(roadHalf, 85, -.045, '#8cac81'),
      ribbon(-roadHalf - .7, -roadHalf, -.01, '#a8b78d'), ribbon(roadHalf, roadHalf + .7, -.01, '#a8b78d'),
      ...Object.entries(roadMaterials).map(([surface, material]) => ribbon(-roadHalf, roadHalf, 0, material, value => value === surface)),
      ribbon(-roadHalf + .06, -roadHalf + .18, .012, '#f3f0d9'), ribbon(roadHalf - .18, roadHalf - .06, .012, '#f3f0d9'),
    ];
    const dashGeometry = e.geometry('race-road-dash', () => new T.BoxGeometry(.09, .013, 2.6));
    const dashes = new T.InstancedMesh(dashGeometry, e.material('#e8e7d2'), 20);
    dashes.frustumCulled = false; dashes.receiveShadow = true; e.root.add(dashes);
    const instance = new T.Object3D();

    function rider(color, number) {
      const group = e.group(), bike = e.group(group), wheels = [];
      const metal = e.material('#c2d2d1', { roughness: .34, metalness: .6 });
      const rubber = e.material('#263b40', { roughness: .94 });
      const jersey = e.material(color, { roughness: .9 });
      for (const z of [-.57, .57]) {
        const wheel = e.group(bike); wheel.position.set(0, .36, z);
        const tire = e.mesh(e.geometry('race-tire', () => new T.TorusGeometry(.335, .027, 6, 28)), rubber, 0, 0, 0, wheel);
        tire.rotation.y = Math.PI / 2;
        const rim = e.mesh(e.geometry('race-rim', () => new T.TorusGeometry(.305, .012, 5, 28)), metal, 0, 0, 0, wheel);
        rim.rotation.y = Math.PI / 2;
        // A single line mesh for the spokes makes wheel rotation visible at low cost.
        const spokes = e.geometry('race-spokes', () => {
          const coordinates = [];
          for (let i = 0; i < 10; i++) {
            const angle = i * Math.PI / 5;
            coordinates.push(0, 0, 0, 0, Math.cos(angle) * .3, Math.sin(angle) * .3);
          }
          return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(coordinates, 3));
        });
        const wireMaterial = e.trackMaterial(new T.LineBasicMaterial({ color: '#afc0c0', transparent: true, opacity: .68 }));
        wheel.add(new T.Line(spokes, wireMaterial)); wheels.push(wheel);
      }
      for (const [a, b] of [
        [[0, .36, .57], [0, .93, .27]], [[0, .93, .27], [0, .4, .08]],
        [[0, .4, .08], [0, .36, .57]], [[0, .4, .08], [0, .92, -.39]],
        [[0, .93, .27], [0, .92, -.39]], [[0, .92, -.39], [0, .36, -.57]],
      ]) segment(a, b, .027, jersey, bike);
      segment([0, .92, .27], [0, 1.06, .28], .025, metal, bike);
      e.box(0, 1.075, .28, .19, .055, .28, rubber, bike);
      segment([0, .9, -.39], [0, 1.04, -.45], .025, metal, bike);
      segment([-.25, 1.04, -.47], [.25, 1.04, -.47], .025, rubber, bike);
      for (const side of [-1, 1]) segment([side * .25, 1.04, -.47], [side * .25, .94, -.52], .025, rubber, bike);
      const sprocket = e.cylinder(.09, .4, .08, .1, .1, .035, metal, bike, 16); sprocket.rotation.z = Math.PI / 2;
      segment([.11, .43, .08], [.11, .39, .57], .01, '#354b4c', bike);
      segment([.11, .3, .08], [.11, .33, .57], .01, '#354b4c', bike);
      const torso = segment([0, 1.14, .24], [0, 1.5, -.2], .17, jersey, bike);
      const pelvis = e.ball(0, 1.1, .25, .15, '#344d60', bike, 10); pelvis.scale.z = .13;
      const head = e.group(bike);
      e.ball(0, 0, 0, .125, '#d9ad86', head, 12);
      const helmet = e.ball(0, .076, .006, .153, jersey, head, 12); helmet.scale.set(.154, .112, .172);
      for (const x of [-.07, .07]) e.box(x, .17, -.018, .018, .008, .16, '#ebeddb', head);
      e.box(0, .024, -.119, .18, .035, .025, '#253c47', head);
      const bib = e.putLabel(String(number), 0, 1.44, .12, { width: .19, height: .19, font: 110, color: '#253c47', background: '#f3f0d9' }, bike);
      bib.rotation.x = -.9;
      const limbs = [-1, 1].map(side => ({
        side,
        thigh: segment([0, 0, 0], [0, 1, 0], .063, '#344d60', bike),
        calf: segment([0, 0, 0], [0, 1, 0], .043, '#d9ad86', bike),
        upperArm: segment([0, 0, 0], [0, 1, 0], .047, jersey, bike),
        lowerArm: segment([0, 0, 0], [0, 1, 0], .037, '#d9ad86', bike),
        crank: segment([0, 0, 0], [0, 1, 0], .018, metal, bike),
        shoe: e.box(0, 0, 0, .13, .064, .23, '#e8e8d8', bike),
        pedal: e.box(0, 0, 0, .17, .035, .09, '#263b40', bike),
      }));
      const shadow = e.cylinder(0, .018, 0, .42, .42, .012, e.material('#3f5550', { transparent: true, opacity: .18, depthWrite: false }), e.root, 16);
      shadow.scale.z = 1.7; shadow.castShadow = shadow.receiveShadow = false;

      function update(state, at) {
        const road = locate(group, at, (state.x - 1.5) * 2.5, .026);
        const lean = Number.isFinite(state.lean) ? state.lean : 0;
        const sprint = state.sprinting ? 1 : 0, phase = state.pedalPhase || 0;
        bike.rotation.z = lean;
        bike.rotation.y = clamp((state.vx || 0) / Math.max(5, state.speed || 0), -.25, .25) * -.35;
        wheels.forEach((wheel, index) => {
          wheel.rotation.set(-(state.wheelAngle || 0), index === 0 ? bike.rotation.y * .65 : 0, 0, 'YXZ');
        });
        const bob = state.cadence > 0 ? Math.sin(phase * 2) * (.008 + sprint * .012) : 0;
        const hip = [Math.sin(phase) * sprint * .025, 1.12 + sprint * .065 + bob, .25 - sprint * .085];
        const shoulder = [hip[0] * .4, 1.49 - sprint * .065 + bob, -.18 - sprint * .055];
        setSegment(torso, hip, shoulder, .153);
        pelvis.position.set(...hip); head.position.set(shoulder[0], shoulder[1] + .178, shoulder[2] - .078);
        bib.position.set(hip[0], hip[1] + .18, hip[2] + .055); bib.rotation.x = -.85 - sprint * .17;
        for (const limb of limbs) {
          const side = limb.side, angle = phase + (side < 0 ? Math.PI : 0);
          const ankle = [side * .15, .43 + Math.cos(angle) * .155, .08 + Math.sin(angle) * .155];
          const thighTop = [hip[0] + side * .115, hip[1], hip[2]];
          const dy = ankle[1] - thighTop[1], dz = ankle[2] - thighTop[2], length = Math.hypot(dy, dz);
          const bend = Math.sqrt(Math.max(.002, .46 * .46 - length * length * .25));
          const knee = [side * .145 + hip[0] * .5, thighTop[1] + dy * .5 - dz / length * bend, thighTop[2] + dz * .5 + dy / length * bend];
          setSegment(limb.thigh, thighTop, knee, .065); setSegment(limb.calf, knee, ankle, .042);
          setSegment(limb.crank, [side * .1, .4, .08], [side * .15, ankle[1] - .033, ankle[2]], .018);
          limb.shoe.position.set(ankle[0], ankle[1], ankle[2] - .035);
          limb.pedal.position.set(ankle[0], ankle[1] - .046, ankle[2]);
          const armTop = [shoulder[0] + side * .15, shoulder[1] - .025, shoulder[2]];
          const elbow = [side * .255, 1.25 - sprint * .08, -.36];
          setSegment(limb.upperArm, armTop, elbow, .047);
          setSegment(limb.lowerArm, elbow, [side * .25, 1.045, -.47], .037);
        }
        locate(shadow, at, (state.x - 1.5) * 2.5, .014); shadow.visible = group.visible;
        return road;
      }
      return { group, update, shadow };
    }
    const player = rider('#bee096', 1);
    const rivals = ['#e39b80', '#82b4d1', '#d7bd71'].map((color, i) => rider(color, i + 2));

    // Recycle fixed roadside slots as the camera advances.
    const trees = Array.from({ length: 22 }, (_, i) => ({ side: i % 2 ? 1 : -1, slot: Math.floor(i / 2), mesh: M.tree(e, 0, 0, .62 + i % 4 * .12, i % 2 ? '#729576' : '#779e75') }));
    const posts = Array.from({ length: 34 }, (_, i) => {
      const mesh = e.group();
      e.box(0, .43, 0, .13, .86, .13, '#f0e9d6', mesh);
      e.box(0, .65, .073, .14, .15, .014, i % 2 ? '#d9886c' : '#e9ce81', mesh);
      return { mesh, side: i % 2 ? 1 : -1, slot: Math.floor(i / 2) };
    });
    const mountains = e.group();
    for (let i = 0; i < 9; i++) {
      const mountain = e.mesh(e.geometry('race-mountain', () => new T.ConeGeometry(23, 40, 6)), i % 2 ? '#a2b9ad' : '#a7bca5', -110 + i * 28, 5, -157 - i % 3 * 9, mountains);
      mountain.scale.set(1.1, .6 + i % 3 * .19, 1); mountain.castShadow = false;
    }
    const sun = e.ball(47, 37, -150, 7, e.material('#f8efd1', { emissive: '#f2dda1', emissiveIntensity: .4, fog: false }), e.root, 16);
    sun.castShadow = false;
    const clouds = e.group();
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const cloud = e.ball(-75 + i * 30 + j * 4, 31 + i % 2 * 8, -125 - i % 3 * 8, 4, '#e9eddf', clouds, 8);
      cloud.scale.y = 1.5; cloud.castShadow = false;
    }
    const finish = e.group();
    for (const x of [-roadHalf - .5, roadHalf + .5]) e.cylinder(x, 2.65, 0, .1, .13, 5.3, '#e8e9d3', finish, 8);
    e.box(0, 4.95, 0, roadHalf * 2 + 1.2, .72, .17, '#e9edd5', finish);
    const title = e.putLabel('VỀ ĐÍCH', 0, 4.97, .1, { width: 4.8, height: .57, font: 82, color: '#385348' }, finish); title.rotation.x = 0;
    for (let i = 0; i < 20; i++) e.box(-roadHalf + (i % 10 + .5) * roadHalf / 5, .018, Math.floor(i / 10) * .45, roadHalf / 5, .018, .45, (i + Math.floor(i / 10)) % 2 ? '#e9ecdf' : '#34484b', finish).castShadow = false;

    const obstaclePools = { cone: [], water: [], puddle: [] };
    for (const type of Object.keys(obstaclePools)) {
      for (let i = 0; i < 16; i++) { const mesh = M.obstacle(e, type); mesh.visible = false; obstaclePools[type].push(mesh); }
    }
    const particles = Array.from({ length: 32 }, () => ({ age: 1, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, wet: false }));
    const particleMaterial = e.material('#cfb994', { transparent: true, opacity: .64, roughness: 1, depthWrite: false });
    const particleMesh = new T.InstancedMesh(e.geometry('race-particle', () => new T.SphereGeometry(1, 5, 4)), particleMaterial, particles.length);
    particleMesh.frustumCulled = false; particleMesh.count = 0; e.root.add(particleMesh);
    const particleColor = new T.Color(); let nextParticle = 0, particleSequence = 0;
    function emit(count, wet, state) {
      for (let i = 0; i < count; i++) {
        const p = particles[nextParticle++ % particles.length], phase = ++particleSequence * 2.399;
        p.age = 0; p.life = wet ? .65 : .8;
        p.x = (state.x - 1.5) * 2.5; p.z = state.distance - .6; p.y = base.height + .12;
        p.vx = Math.sin(phase) * (wet ? 1.6 : .8); p.vy = 1 + Math.cos(phase) * .6;
        p.vz = -.8 - state.speed * .15; p.wet = wet;
      }
    }
    function updateParticles(state, dt, reduced) {
      const event = state.event;
      if (event && event.id !== lastEventId) {
        if (!reduced && ['cone', 'puddle', 'rider', 'shoulder'].includes(event.type)) {
          emit(event.type === 'puddle' ? 16 : 8, event.type === 'puddle' || state.surface === 'wet', state);
        }
        lastEventId = event.id;
      }
      if (!reduced && state.speed > 4 && ['wet', 'gravel', 'shoulder'].includes(state.surface)) {
        particleClock += dt * state.speed;
        if (particleClock > 1.5) { particleClock %= 1.5; emit(2, state.surface === 'wet', state); }
      }
      let count = 0;
      for (const p of particles) {
        p.age += dt; if (reduced || p.age >= p.life) continue;
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= dt * 3;
        const point = sample(p.z);
        instance.position.set(point.center - base.center + Math.cos(point.heading) * p.x, p.y - base.height, -(p.z - distance) + Math.sin(point.heading) * p.x);
        instance.rotation.set(0, 0, 0); instance.scale.setScalar((p.wet ? .035 : .065) * (1 - p.age / p.life));
        instance.updateMatrix(); particleMesh.setMatrixAt(count, instance.matrix);
        particleColor.set(p.wet ? '#b5dcdf' : '#d5c09a'); particleMesh.setColorAt(count++, particleColor);
      }
      particleMesh.count = count; particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
    }

    function updateCamera(state, meta, dt) {
      // First let the shared camera apply toolbar zoom and the top-view preset.
      e.follow(0);
      const top = e.toolbar.querySelector('[data-camera="top"]').getAttribute('aria-pressed') === 'true';
      const reduced = typeof meta.reducedMotion === 'boolean' ? meta.reducedMotion : e.reduced;
      const heading = base.heading, ahead = sample(distance + (top ? 15 : 20 + state.speed * .4));
      const offset = (state.x - 1.5) * 2.5;
      const back = top ? 13 : 8.2;
      targetPosition.set(offset * .75 - Math.sin(heading) * back, top ? 22 : 4.9, Math.cos(heading) * back);
      targetLook.set(ahead.center - base.center + offset * .35, ahead.height - base.height + .7, -(top ? 15 : 20 + state.speed * .4));
      if (!top && !reduced) {
        const rough = state.surface === 'gravel' ? .018 : .004;
        targetPosition.y += Math.sin(state.distance * 9) * rough * clamp(state.speed / 10, 0, 1.5);
        const impact = state.impact;
        const strength = Number.isFinite(impact?.strength) && Number.isFinite(impact?.time)
          ? impact.strength * clamp(impact.time / .8, 0, 1) : 0;
        targetPosition.x += Math.sin(state.time * 37) * strength * .045;
        e.camera.fov += clamp(state.speed - 5, 0, 12) * .37;
      }
      if (!cameraReady || lastPreset !== String(top)) {
        cameraPosition.copy(targetPosition); cameraTarget.copy(targetLook); cameraReady = true;
      } else {
        const smooth = 1 - Math.exp(-Math.max(0, dt) * (reduced ? 8 : 5));
        cameraPosition.lerp(targetPosition, smooth); cameraTarget.lerp(targetLook, smooth);
      }
      lastPreset = String(top); e.camera.position.copy(cameraPosition); e.camera.lookAt(cameraTarget);
      e.camera.updateProjectionMatrix(); e.camera.updateMatrixWorld(true);
    }
    function draw(state, meta = {}, dt = 1 / 60) {
      dt = Number.isFinite(dt) ? clamp(dt, 0, .05) : 0;
      distance = state.distance; seed = state.trackSeed || 0; base = sample(distance); lastMeta = meta;
      if (lastState !== state) {
        cameraReady = false; lastEventId = 0; particleClock = 0;
        for (const particle of particles) particle.age = 1;
        lastState = state;
      }
      const roadStart = Math.floor((distance - 20) / roadStep) * roadStep;
      for (let i = 0; i <= roadCount; i++) { const at = roadStart + i * roadStep; samples[i] = { ...sample(at), at }; }
      ribbons.forEach(strip => strip.update());
      for (let i = 0; i < 20; i++) {
        locate(instance, Math.floor((distance - 12) / 9) * 9 + i * 9, 0, .016);
        instance.scale.set(1, 1, 1); instance.updateMatrix(); dashes.setMatrixAt(i, instance.matrix);
      }
      dashes.instanceMatrix.needsUpdate = true;
      player.group.visible = true; player.update(state, distance);
      rivals.forEach((model, i) => {
        const rival = state.rivals[i]; model.group.visible = Boolean(rival && rival.distance - distance > -18 && rival.distance - distance < 145);
        model.shadow.visible = model.group.visible;
        if (model.group.visible) model.update(rival, rival.distance);
      });
      for (const item of trees) {
        const at = Math.floor((distance - 12) / 17) * 17 + item.slot * 17;
        const slot = Math.round(at / 17); locate(item.mesh, at, item.side * (10 + Math.abs(slot % 4) * 2.2)); item.mesh.rotation.set(0, slot * .83, 0);
      }
      for (const item of posts) locate(item.mesh, Math.floor((distance - 10) / 11) * 11 + item.slot * 11, item.side * (roadHalf + 1.2));
      const used = { cone: 0, water: 0, puddle: 0 };
      for (const obstacle of state.obstacles || []) {
        if (obstacle.passed || obstacle.z - distance < -4 || obstacle.z - distance > 150) continue;
        const pool = obstaclePools[obstacle.type]; if (!pool || used[obstacle.type] >= pool.length) continue;
        const mesh = pool[used[obstacle.type]++]; mesh.visible = true;
        locate(mesh, obstacle.z, (obstacle.x - 1.5) * 2.5, .023);
      }
      for (const type of Object.keys(obstaclePools)) for (let i = used[type]; i < obstaclePools[type].length; i++) obstaclePools[type][i].visible = false;
      finish.visible = state.length - distance < 150;
      if (finish.visible) locate(finish, state.length);
      mountains.position.x = -base.center * .14; mountains.position.y = -base.height * .17;
      clouds.position.x = -base.center * .055;
      updateParticles(state, dt, typeof meta.reducedMotion === 'boolean' ? meta.reducedMotion : e.reduced);
      updateCamera(state, meta, dt); e.render(dt, true);
      e.canvas.dataset.raceSurface = state.surface || base.surface;
    }
    // Shared camera controls calculate zoom/FOV first. Reapply this road-aware
    // pose after them, including a resize when the simulation is paused.
    function refreshCamera() {
      if (!lastState || e.disposed) return;
      updateCamera(lastState, lastMeta, 0); e.render(0, true);
    }
    scope.on(e.toolbar, 'click', refreshCamera);
    scope.on(e.canvas, 'wheel', refreshCamera, false, { passive: true });
    const cameraResize = new ResizeObserver(refreshCamera); cameraResize.observe(e.viewport);
    scope.cleanup(() => cameraResize.disconnect());
    return {
      draw, engine: e, canvas: e.canvas, point: event => e.point(event),
      reset() { lastState = null; cameraReady = false; },
    };
  };
})();
