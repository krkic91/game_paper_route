// version v1.0
/* Canvas projection uses the same road, rider positions and animation as 3D. */
(function () {
  'use strict';
  const S = window.ArcadeShared, R = window.RaceLogic, TAU = Math.PI * 2;
  window.createRace2D = function (ui) {
    const ctx = ui.ctx;
    let state, base, cameraX = 0, ready = false, reduced = false;
    function project(offset, relative) {
      const road = R.trackAt(state.distance + relative, state.trackSeed);
      const z = relative + 10;
      const scale = (reduced ? 530 : 530 - Math.min(state.speed, 22) * 1.5) / z;
      const center = road.center - base.center - Math.tan(base.heading) * relative;
      return {
        x: 450 + (center + offset - cameraX) * scale,
        y: 153 + (6.6 - (road.height - base.height - base.grade * relative)) * scale,
        scale, road,
      };
    }
    function polygon(points, fill) {
      ctx.fillStyle = fill; ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath(); ctx.fill();
    }
    function line(points, color, width) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
    function rider(subject, color, relative) {
      const p = project((subject.x - 1.5) * 2.5, relative);
      const scale = p.scale / 40;
      if (p.y < 135 || p.y > 650) return;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale);
      ctx.fillStyle = '#19332940'; ctx.beginPath(); ctx.ellipse(0, 9, 18, 8, 0, 0, TAU); ctx.fill();
      // World lean uses Y up; Canvas uses Y down, so its rotation is reversed.
      ctx.rotate(-(subject.lean || 0));
      const sprint = subject.sprinting ? 1 : 0, phase = subject.pedalPhase || 0;
      const sway = reduced ? 0 : Math.sin(phase) * sprint * 1.5;
      // Two tires stay on the road; rotating highlights follow travelled distance.
      for (const y of [-38, 12]) {
        ctx.fillStyle = '#20332d'; ctx.beginPath(); ctx.ellipse(0, y, 4, 17, 0, 0, TAU); ctx.fill();
        line([[0, y - 14], [0, y + 14]], '#92a49a', 1.3);
        const mark = Math.sin(subject.wheelAngle || 0) * 12;
        line([[-2, y + mark], [2, y + mark]], '#d1dbcc', 1.6);
      }
      line([[0, 13], [0, -35]], color, 4);
      line([[-16, -37], [16, -37]], '#d5d6bb', 3.5);
      S.roundRect(ctx, -6, -12, 12, 7, 3, '#26382f');
      for (const side of [-1, 1]) {
        const a = phase + (side < 0 ? Math.PI : 0);
        const foot = [side * 9, 6 + Math.cos(a) * 7];
        const hip = [side * 5 + sway, -15 - sprint * 5];
        const knee = [side * (13 + Math.sin(a) * 2), -4 + Math.cos(a) * 2];
        line([[0, 5], foot], '#b5bcb0', 2);
        line([hip, knee], '#2e4952', 6); line([knee, foot], '#ddb88e', 4.5);
        S.roundRect(ctx, foot[0] - 3.5, foot[1] - 2, 7, 5, 2, '#e6e6cf');
      }
      line([[-7 + sway, -32], [-14, -26], [-16, -37]], '#dfbd91', 5);
      line([[7 + sway, -32], [14, -26], [16, -37]], '#dfbd91', 5);
      S.roundRect(ctx, -10 + sway, -42 - sprint * 3, 20, 29 - sprint * 2, 7, color);
      S.roundRect(ctx, -1.5 + sway, -38 - sprint * 3, 3, 18, 1, '#f1f2d099');
      ctx.fillStyle = '#e1bd94'; ctx.beginPath(); ctx.arc(sway, -43 - sprint * 4, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(sway, -48 - sprint * 4, 9, 10, 0, 0, TAU); ctx.fill();
      line([[sway - 3, -55 - sprint * 4], [sway - 3, -44 - sprint * 4]], '#f6f1d4aa', 2);
      line([[sway + 3, -55 - sprint * 4], [sway + 3, -44 - sprint * 4]], '#34504770', 2);
      ctx.restore();
    }
    function tree(offset, relative, index) {
      const p = project(offset, relative), scale = p.scale / 45;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale);
      S.roundRect(ctx, -4, -37, 8, 42, 2, '#827859');
      ctx.fillStyle = index % 2 ? '#739275' : '#809d73';
      ctx.beginPath(); ctx.ellipse(0, -62, 22, 36, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#a2b98b70'; ctx.beginPath(); ctx.ellipse(-7, -69, 12, 25, -.2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function obstacle(item) {
      const p = project((item.x - 1.5) * 2.5, item.z - state.distance);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.scale / 38, p.scale / 38);
      if (item.type === 'puddle') {
        ctx.fillStyle = '#9fc0c4a0'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, -.12, 0, TAU); ctx.fill();
        line([[-14, -2], [-4, -4], [8, -3]], '#d4e3dcaa', 2);
      } else if (item.type === 'water') {
        S.roundRect(ctx, -7, -23, 14, 24, 4, '#a1d5d4', '#eff8e7');
        S.roundRect(ctx, -4, -27, 8, 5, 1, '#f4f0d9');
        S.roundRect(ctx, -6, -13, 12, 8, 0, '#5c9d9c');
      } else {
        polygon([{ x: 0, y: -26 }, { x: -12, y: 0 }, { x: 12, y: 0 }], '#d08c63');
        line([[-4, -15], [4, -15]], '#efe7c8', 4);
        S.roundRect(ctx, -15, 0, 30, 4, 2, '#ab704e');
      }
      ctx.restore();
    }
    function draw(nextState, meta = {}, dt = 0) {
      state = nextState; reduced = Boolean(meta.reducedMotion); base = R.trackAt(state.distance, state.trackSeed);
      const targetX = (state.x - 1.5) * 2.5 * .32;
      if (!ready) { cameraX = targetX; ready = true; }
      else cameraX += (targetX - cameraX) * (1 - Math.exp(-dt * 5));
      const sky = ctx.createLinearGradient(0, 0, 0, 270);
      sky.addColorStop(0, '#bbd9d6'); sky.addColorStop(1, '#e8e9c9');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 900, 550);
      ctx.fillStyle = '#f8edc4'; ctx.beginPath(); ctx.arc(738 - base.center * .4, 65, 30, 0, TAU); ctx.fill();
      for (let n = 0; n < 2; n++) {
        const points = [{ x: -100, y: 235 }];
        for (let i = 0; i < 10; i++) points.push({ x: i * 135 - 100 - base.center * (n + 1) * .4, y: 125 + n * 31 - Math.sin(i * 2.3 + n) * 38 });
        points.push({ x: 1000, y: 300 }, { x: -100, y: 300 }); polygon(points, n ? '#a7be9c' : '#9eb8aa');
      }
      ctx.fillStyle = '#9caf80'; ctx.fillRect(0, 235, 900, 315);
      // Draw each strip back to front. Elevation and bends come from trackAt.
      const half = base.width / 2;
      // Continuous underlays prevent anti-aliased strip edges exposing grass
      // as horizontal seams across the tarmac.
      for (const [width, color] of [[half + .7, '#a8b78d'], [half, '#697a76']]) {
        const left = [], right = [];
        for (let z = -2; z <= 190; z += 2) { left.push(project(-width, z)); right.push(project(width, z)); }
        polygon([...left, ...right.reverse()], color);
      }
      for (let relative = 188; relative >= -2; relative -= 2) {
        const at = state.distance + relative, road = R.trackAt(at, state.trackSeed);
        const nearLeft = project(-half, relative - .03), nearRight = project(half, relative - .03);
        const farLeft = project(-half, relative + 2.03), farRight = project(half, relative + 2.03);
        const surfaceColor = road.surface === 'wet' ? '#789092' : road.surface === 'gravel' ? '#a39b82' : Math.floor(at / 8) % 2 ? '#667773' : '#697a76';
        polygon([nearLeft, nearRight, farRight, farLeft], surfaceColor);
        for (const side of [-1, 1]) polygon([project(side * (half - .22), relative - .03), project(side * (half - .06), relative - .03), project(side * (half - .06), relative + 2.03), project(side * (half - .22), relative + 2.03)], '#e9e5c9');
        if (Math.floor(at / 4) % 2 === 0) polygon([project(-.045, relative), project(.045, relative), project(.045, relative + 2), project(-.045, relative + 2)], '#e2ddbd');
        if (road.surface === 'wet' && Math.floor(at) % 6 < 2) {
          const a = project(-2.8, relative + 1), b = project(-1.2, relative + 1);
          line([[a.x, a.y], [b.x, b.y]], '#bdd4cf65', Math.max(1, a.scale * .018));
        }
        if (road.surface === 'gravel' && relative < 100) {
          const pebble = project(Math.sin(at * 2.7) * (half - .4), relative + .5);
          ctx.fillStyle = '#d1c4a3'; ctx.fillRect(pebble.x, pebble.y, Math.max(1, pebble.scale * .04), Math.max(1, pebble.scale * .02));
        }
      }
      const finish = state.length - state.distance;
      if (finish > 0 && finish < 190) {
        for (let row = 0; row < 2; row++) for (let column = 0; column < 12; column++) {
          const left = -half + column * base.width / 12, right = left + base.width / 12, z = finish + row * .45;
          polygon([project(left, z), project(right, z), project(right, z + .45), project(left, z + .45)], (row + column) % 2 ? '#f0edda' : '#344b43');
        }
        const label = project(0, finish); S.text(ctx, 'VỀ ĐÍCH', label.x, label.y - 12, Math.max(11, label.scale * .65), '#354f43');
      }
      const objects = [];
      for (let at = Math.floor((state.distance + 4) / 21) * 21; at < state.distance + 190; at += 21) {
        const z = at - state.distance; if (z < 1) continue;
        for (const side of [-1, 1]) objects.push({ z, draw: () => tree(side * (9 + Math.abs(Math.round(at / 21) % 3)), z, at) });
      }
      for (const item of state.obstacles) if (!item.passed && item.z - state.distance > 0 && item.z - state.distance < 188) objects.push({ z: item.z - state.distance, draw: () => obstacle(item) });
      state.rivals.forEach((r, i) => { const z = r.distance - state.distance; if (z > -1 && z < 180) objects.push({ z, draw: () => rider(r, ['#d49b80', '#8fb8d0', '#d7bd7e'][i], z) }); });
      objects.sort((a, b) => b.z - a.z).forEach(object => object.draw());
      if (state.drafting) {
        const p = project((state.x - 1.5) * 2.5, 0);
        ctx.strokeStyle = '#e6f5b17f'; ctx.lineWidth = 2;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, 30 + side * 4, 60, side * .15, side < 0 ? Math.PI * .75 : -.25, side < 0 ? Math.PI * 1.25 : .25); ctx.stroke(); }
      }
      rider(state, '#c2df97', 0);
      if (!reduced && state.impact && state.impact.time > 0) {
        const p = project((state.x - 1.5) * 2.5, 0), wet = state.impact.type === 'puddle';
        for (let i = 0; i < 10; i++) {
          const a = i * 2.4, spread = (1 - Math.min(.8, state.impact.time)) * 35;
          ctx.fillStyle = wet ? '#d6f1efa0' : '#d0b78d99'; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * spread, p.y + Math.sin(a) * spread * .3, wet ? 2 : 3, 0, TAU); ctx.fill();
        }
      }
      S.roundRect(ctx, 28, 522, 844, 5, 2, '#2e4d4260');
      S.roundRect(ctx, 28, 522, Math.max(5, 844 * state.distance / state.length), 5, 2, '#e4ecc5');
      S.text(ctx, 'ĐƯỜNG ĐUA XANH', 28, 32, 12, '#42655a', 'left', 700);
      S.text(ctx, '1 KM · 4 TAY ĐUA', 872, 32, 11, '#42655a', 'right', 600);
    }
    return { draw, reset() { ready = false; } };
  };
})();
