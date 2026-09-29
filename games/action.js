(function () {
  'use strict';
  const L = window.ArcadeLogic,
    S = window.ArcadeShared,
    { icon } = window.ArcadeArt;
  const Games = window.ArcadeGames;
  const TAU = Math.PI * 2;

  Games.race = function (host, options) {
    const scope = S.createScope();
    const ui = S.canvasUI(host, 900, 550, {
      className: 'race-workspace',
      label: 'Đua xe đạp 1 km. Lái bằng phím trái, phải; giữ Space để nước rút.',
      toolbar:
        S.stat('VỊ TRÍ', 'place', '4 / 4') +
        S.stat('QUÃNG ĐƯỜNG', 'distance', '0', '/ 1.000 m') +
        S.stat('TỐC ĐỘ', 'speed', 0, 'km/h') +
        S.stat('THỂ LỰC', 'hearts', '♥ ♥ ♥'),
      controls: `<button class="control-button steering-button" data-hold="left" aria-label="Giữ để lái trái">${icon('arrow-left')}</button><button class="control-button sprint-button" data-hold="sprint">${icon('bolt')}<span>Giữ để nước rút<span class="sprint-meter"><i></i></span></span></button><button class="control-button steering-button" data-hold="right" aria-label="Giữ để lái phải">${icon('arrow-right')}</button>`,
    });
    const { ctx } = ui;
    const input = S.heldInput(scope, ui, {
      left: ['a', 'arrowleft'],
      right: ['d', 'arrowright'],
      sprint: [' ', 'arrowup', 'w', 'shift'],
    });
    const meter = ui.controls.querySelector('.sprint-meter i');
    let state,
      started = false,
      finished = false;
    function project(lane, relative) {
      const t = 1 - L.clamp(relative / 210, 0, 1),
        depth = t * t;
      const half = 55 + depth * 310;
      return {
        x: 450 + ((lane - 1.5) / 2) * half * 1.05,
        y: 160 + depth * 350,
        scale: 0.16 + depth * 1.25,
        half,
      };
    }
    function rider(x, y, scale, color, lean = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.rotate(lean);
      ctx.fillStyle = '#163c332f';
      ctx.beginPath();
      ctx.ellipse(0, 10, 22, 9, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#263f3d';
      S.roundRect(ctx, -4, -38, 8, 25, 4, '#253e3e');
      S.roundRect(ctx, -5, -3, 10, 30, 5, '#223b3b');
      ctx.strokeStyle = '#d9c082';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, -32);
      ctx.moveTo(-16, -31);
      ctx.lineTo(16, -31);
      ctx.stroke();
      const pedal = Math.sin(state.time * 16 + x) * 7;
      ctx.strokeStyle = '#2c4850';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -13);
      ctx.lineTo(-12, 3 + pedal);
      ctx.lineTo(-5, 10 + pedal);
      ctx.moveTo(6, -13);
      ctx.lineTo(12, 3 - pedal);
      ctx.lineTo(5, 10 - pedal);
      ctx.stroke();
      ctx.strokeStyle = '#edc89c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-8, -30);
      ctx.lineTo(-16, -22);
      ctx.lineTo(-14, -34);
      ctx.moveTo(8, -30);
      ctx.lineTo(16, -22);
      ctx.lineTo(14, -34);
      ctx.stroke();
      S.roundRect(ctx, -10, -39, 20, 26, 7, color);
      ctx.fillStyle = '#ffffff55';
      ctx.fillRect(-2, -34, 4, 16);
      ctx.fillStyle = '#edd1a4';
      ctx.beginPath();
      ctx.arc(0, -43, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -47, 9, 10, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff77';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.lineTo(0, -44);
      ctx.stroke();
      ctx.restore();
    }
    function tree(x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      S.roundRect(ctx, -3, -22, 6, 28, 2, '#947b50');
      ctx.fillStyle = '#769664';
      ctx.beginPath();
      ctx.ellipse(0, -40, 19, 28, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#91ab74';
      ctx.beginPath();
      ctx.ellipse(-5, -46, 10, 20, 0.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    function draw() {
      const sky = ctx.createLinearGradient(0, 0, 0, 230);
      sky.addColorStop(0, '#b7d6d0');
      sky.addColorStop(1, '#e2e7bc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 900, 230);
      ctx.fillStyle = '#f6e8b5';
      ctx.beginPath();
      ctx.arc(725, 65, 34, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#9eb598';
      ctx.beginPath();
      ctx.moveTo(0, 155);
      ctx.lineTo(126, 52);
      ctx.lineTo(249, 149);
      ctx.lineTo(415, 86);
      ctx.lineTo(575, 151);
      ctx.lineTo(761, 90);
      ctx.lineTo(900, 159);
      ctx.lineTo(900, 250);
      ctx.lineTo(0, 250);
      ctx.fill();
      ctx.fillStyle = '#adc59d';
      ctx.beginPath();
      ctx.moveTo(0, 160);
      ctx.quadraticCurveTo(190, 104, 388, 167);
      ctx.quadraticCurveTo(600, 103, 900, 173);
      ctx.lineTo(900, 250);
      ctx.lineTo(0, 250);
      ctx.fill();
      ctx.fillStyle = '#94ad77';
      ctx.fillRect(0, 169, 900, 381);
      for (let i = 0; i < 22; i++) {
        const z0 = i * 10,
          z1 = (i + 1) * 10;
        const a = project(-0.5, z0),
          b = project(3.5, z0),
          c = project(3.5, z1),
          d = project(-0.5, z1);
        ctx.fillStyle = Math.floor((state.distance + z0) / 18) % 2 ? '#687a6b' : '#6c7e6e';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.fill();
      }
      ctx.strokeStyle = '#d8ddbb';
      ctx.lineWidth = 4;
      for (const lane of [-0.5, 3.5]) {
        const a = project(lane, 0),
          b = project(lane, 210);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const stripeStart = Math.floor(state.distance / 20) * 20;
      for (let z = stripeStart; z < state.distance + 210; z += 20)
        for (const lane of [0.5, 1.5, 2.5]) {
          const relative = z - state.distance;
          if (relative < 0) continue;
          const a = project(lane, relative),
            b = project(lane, relative + 8);
          ctx.strokeStyle = '#e2e3c197';
          ctx.lineWidth = Math.max(1, a.scale * 2);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      for (let z = Math.ceil((state.distance + 15) / 37) * 37 + 185; z > state.distance; z -= 37) {
        const left = project(-1.35, z - state.distance),
          right = project(4.3, z - state.distance);
        tree(left.x, left.y, left.scale * 1.55);
        tree(right.x, right.y, right.scale * 1.25);
      }
      const finish = state.length - state.distance;
      if (finish < 210 && finish > 0) {
        const left = project(-0.45, finish),
          right = project(3.45, finish);
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = i % 2 ? '#f4f0d9' : '#33453a';
          ctx.fillRect(
            left.x + ((right.x - left.x) * i) / 14,
            left.y,
            (right.x - left.x) / 14 + 1,
            Math.max(3, left.scale * 12),
          );
        }
        S.text(ctx, 'VỀ ĐÍCH', 450, left.y - 10, Math.max(12, left.scale * 19), '#314b35');
      }
      const objects = state.obstacles
        .filter((o) => !o.passed && o.z - state.distance >= -3 && o.z - state.distance < 210)
        .map((o) => ({
          z: o.z - state.distance,
          draw: () => {
            const p = project(o.x, o.z - state.distance);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(p.scale, p.scale);
            if (o.type === 'puddle') {
              ctx.fillStyle = '#385f617d';
              ctx.beginPath();
              ctx.ellipse(0, 0, 24, 9, 0, 0, TAU);
              ctx.fill();
              ctx.strokeStyle = '#aac8b7';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(0, -1, 15, 3, 0, 0, Math.PI);
              ctx.stroke();
            } else if (o.type === 'water') {
              S.roundRect(ctx, -8, -25, 16, 26, 5, '#add9d1', '#e1f1d1');
              S.roundRect(ctx, -5, -29, 10, 6, 2, '#e6e8cc');
              ctx.fillStyle = '#5d9caf';
              ctx.fillRect(-6, -11, 12, 10);
            } else {
              ctx.fillStyle = '#d8835c';
              ctx.beginPath();
              ctx.moveTo(0, -31);
              ctx.lineTo(-14, 0);
              ctx.lineTo(14, 0);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#f1dfb6';
              ctx.fillRect(-8, -15, 16, 5);
              S.roundRect(ctx, -18, 0, 36, 5, 2, '#b3694e');
            }
            ctx.restore();
          },
        }));
      state.rivals.forEach((r, i) => {
        const relative = r.distance - state.distance;
        if (relative > -4 && relative < 210)
          objects.push({
            z: relative,
            draw: () => {
              const p = project(r.x, relative);
              rider(p.x, p.y, p.scale, ['#bc826c', '#859cc0', '#d4b66c'][i]);
            },
          });
      });
      objects.sort((a, b) => b.z - a.z).forEach((o) => o.draw());
      const p = project(state.x, 0);
      if (!state.invulnerable || Math.floor(state.time * 12) % 2 === 0)
        rider(
          p.x,
          p.y - 3,
          1.48,
          '#c5e68b',
          ((input.active('right') ? 1 : 0) - (input.active('left') ? 1 : 0)) * 0.06,
        );
      S.roundRect(ctx, 31, 522, 838, 6, 3, '#335b4250');
      S.roundRect(ctx, 31, 522, Math.max(7, (838 * state.distance) / 1000), 6, 3, '#e3f2af');
      S.text(ctx, 'ĐƯỜNG ĐUA XANH', 30, 34, 12, '#4d7465', 'left', 700);
      S.text(ctx, '1 KM · 4 TAY ĐUA', 870, 34, 11, '#4d7465', 'right', 600);
    }
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      input.clear();
      state = L.createRace();
      started = false;
      finished = false;
      ui.message(
        'A / D hoặc ← / → để lái. Giữ Space, ↑ hoặc nút nước rút; nhặt nước để hồi năng lượng.',
      );
      S.intro(ui, scope, {
        title: 'Đường đua xanh',
        detail:
          '1 km, 4 tay đua và một vị trí dẫn đầu. Né cọc tiêu, tránh vũng nước, nước rút đúng lúc.',
        symbol: 'bike',
        onStart: () => {
          started = true;
        },
      });
      draw();
      updateStats();
    }
    function updateStats() {
      ui.setStat('place', `${state.place} / 4`);
      ui.setStat('distance', Math.floor(state.distance));
      ui.setStat('speed', Math.round(state.speed * 3.6));
      ui.setStat('hearts', '♥ '.repeat(Math.max(0, state.hearts)).trim() || '—');
      meter.style.width = `${state.energy}%`;
    }
    scope.loop((dt) => {
      if (started && !finished) {
        const hearts = state.hearts;
        L.stepRace(state, dt, {
          steer: (input.active('right') ? 1 : 0) - (input.active('left') ? 1 : 0),
          sprint: input.active('sprint'),
        });
        if (state.hearts < hearts)
          ui.message(
            'Va chạm! Bạn mất một mạng và bị giảm tốc. Giữ bình tĩnh, cuộc đua chưa kết thúc.',
          );
        if (state.status !== 'playing') {
          finished = true;
          input.clear();
          const won = state.status === 'won';
          const score = won
            ? Math.max(
                100,
                Math.round(5000 - state.time * 25 - (state.place - 1) * 500 + state.hearts * 100),
              )
            : Math.floor(state.distance);
          S.result(ui, scope, {
            title: won ? `Về đích hạng ${state.place}!` : 'Hẹn ở vòng đua tiếp theo!',
            detail: won
              ? `Bạn hoàn thành 1 km trong ${state.time.toFixed(1)} giây.`
              : `Bạn đã đi được ${Math.floor(state.distance)} m. Thử tránh chướng ngại trước khi nước rút nhé.`,
            score,
            win: won,
            onAgain: restart,
            onScore: options.onScore,
          });
        }
      }
      draw();
      updateStats();
    });
    restart();
    return S.handle(scope, restart);
  };

  Games.snake = function (host, options) {
    const scope = S.createScope();
    const ui = S.canvasUI(host, 480, 480, {
      className: 'snake-workspace',
      label: 'Rắn săn mồi. Dùng các phím mũi tên, vuốt hoặc nút điều hướng.',
      toolbar:
        S.stat('ĐIỂM', 'score', 0) +
        S.stat('CHIỀU DÀI', 'length', 3) +
        S.stat('KỶ LỤC', 'best', options.best || 0),
      controls: S.directionPad(),
    });
    const { ctx } = ui;
    let state,
      started = false,
      accumulator = 0,
      ended = false,
      best = options.best || 0;
    const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    S.bindDirections(
      scope,
      ui,
      (dir) => {
        if (started && !ended) L.turnSnake(state, ...directions[dir]);
      },
      ui.canvas,
    );
    function draw(time = 0) {
      ctx.fillStyle = '#203a31';
      ctx.fillRect(0, 0, 480, 480);
      for (let y = 0; y < 20; y++)
        for (let x = 0; x < 20; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#ffffff03' : '#0e2b230d';
          ctx.fillRect(x * 24, y * 24, 24, 24);
        }
      if (state.food) {
        const x = state.food.x * 24 + 12,
          y = state.food.y * 24 + 12,
          pulse = 1 + Math.sin(time * 4) * 0.06;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#e79d7c';
        ctx.beginPath();
        ctx.arc(0, 2, 8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d0db92';
        ctx.beginPath();
        ctx.ellipse(4, -7, 5, 2, -0.6, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#7e9b68';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(1, -9);
        ctx.stroke();
        ctx.restore();
      }
      state.snake
        .slice()
        .reverse()
        .forEach((p, reverseIndex) => {
          const index = state.snake.length - 1 - reverseIndex;
          S.roundRect(
            ctx,
            p.x * 24 + 1.5,
            p.y * 24 + 1.5,
            21,
            21,
            index === 0 ? 7 : 6,
            index === 0 ? '#d8ecad' : index % 2 ? '#a7d28d' : '#a0ca88',
          );
          if (index === 0) {
            const dx = state.dir.x,
              dy = state.dir.y;
            ctx.fillStyle = '#254536';
            for (const sign of [-1, 1]) {
              ctx.beginPath();
              ctx.arc(
                p.x * 24 + 12 + dx * 4 + dy * 4 * sign,
                p.y * 24 + 12 + dy * 4 + dx * 4 * sign,
                2.2,
                0,
                TAU,
              );
              ctx.fill();
            }
          }
        });
    }
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createSnake();
      started = false;
      ended = false;
      accumulator = 0;
      ui.setStat('score', 0);
      ui.setStat('length', 3);
      ui.setStat('best', best);
      ui.message('Ăn trái cây để dài hơn. Đừng chạm tường hoặc cắn vào thân mình!');
      S.intro(ui, scope, {
        title: 'Một chú rắn rất đói',
        detail: 'Mỗi trái cây là 10 điểm. Rắn sẽ nhanh dần — bạn có thể dài đến đâu?',
        symbol: 'bolt',
        onStart: () => {
          started = true;
        },
      });
      draw();
    }
    scope.loop((dt, time) => {
      if (started && !ended) {
        accumulator += dt;
        const delay = Math.max(0.065, 0.145 - state.score * 0.00045);
        while (accumulator >= delay && state.status === 'playing') {
          accumulator -= delay;
          L.stepSnake(state);
        }
        if (state.score > best) {
          best = state.score;
          options.onScore(best);
        }
        ui.setStat('score', state.score);
        ui.setStat('length', state.snake.length);
        ui.setStat('best', best);
        if (state.status !== 'playing') {
          ended = true;
          S.result(ui, scope, {
            title: state.status === 'won' ? 'Bạn đã lấp đầy khu vườn!' : 'Úi, chạm rồi!',
            detail: `Chú rắn đã dài ${state.snake.length} ô. Thử thêm một lần để phá kỷ lục nhé.`,
            score: state.score,
            win: state.status === 'won',
            onAgain: restart,
            onScore: options.onScore,
          });
        }
      }
      draw(time);
    });
    restart();
    return S.handle(scope, restart);
  };

  Games.pool = function (host, options) {
    const scope = S.createScope();
    const ui = S.canvasUI(host, 900, 500, {
      className: 'pool-workspace',
      label: 'Bàn bida 6 lỗ. Chạm để chọn hướng, chỉnh lực, rồi nhấn Đánh bi.',
      toolbar:
        S.stat('BI ĐÃ VÀO LỖ', 'potted', '0 / 15') +
        S.stat('CÚ ĐÁNH', 'shots', 0) +
        S.stat('LỖI BI TRẮNG', 'scratch', 0),
      controls: `<label class="power-control"><span>Lực đánh</span><input type="range" min="10" max="100" value="65" step="1" aria-label="Lực đánh bi" /><output>65%</output></label><button class="button button-primary" data-shoot>${icon('arrow-up-right')}Đánh bi</button>`,
    });
    const { ctx } = ui,
      power = ui.controls.querySelector('input'),
      output = ui.controls.querySelector('output'),
      shootButton = ui.controls.querySelector('[data-shoot]');
    let state,
      angle = 0,
      finished = false;
    const colors = [
      '#f4f1dc',
      '#e6bb52',
      '#6d90b8',
      '#c57362',
      '#a385b0',
      '#dca36b',
      '#75a183',
      '#aa6e77',
      '#253c36',
      '#e6bb52',
      '#6d90b8',
      '#c57362',
      '#a385b0',
      '#dca36b',
      '#75a183',
      '#aa6e77',
    ];
    function draw() {
      ctx.fillStyle = '#21372b';
      ctx.fillRect(0, 0, 900, 500);
      S.roundRect(ctx, 14, 14, 872, 472, 36, '#7e6950', '#bda77b');
      S.roundRect(ctx, 24, 24, 852, 452, 30, '#a18a63', '#c2ad7c');
      S.roundRect(ctx, 40, 40, 820, 420, 20, '#355f43', '#496c45');
      S.roundRect(ctx, 55, 55, 790, 390, 10, '#346e55');
      const felt = ctx.createRadialGradient(450, 250, 10, 450, 250, 460);
      felt.addColorStop(0, '#87ae681e');
      felt.addColorStop(1, '#122e281c');
      ctx.fillStyle = felt;
      ctx.fillRect(60, 60, 780, 380);
      ctx.strokeStyle = '#e6efd408';
      ctx.lineWidth = 1;
      for (let x = 75; x < 840; x += 17) {
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x, 440);
        ctx.stroke();
      }
      for (const [x, y] of L.POCKETS) {
        ctx.fillStyle = '#c4aa77';
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#142c24';
        ctx.beginPath();
        ctx.arc(x, y, 23, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#0b201b';
        ctx.beginPath();
        ctx.arc(x, y + 3, 18, 0, TAU);
        ctx.fill();
      }
      for (const x of [160, 285, 610, 735])
        for (const y of [33, 467]) {
          ctx.fillStyle = '#e5cfa0';
          ctx.beginPath();
          ctx.moveTo(x, y - 3);
          ctx.lineTo(x + 3, y);
          ctx.lineTo(x, y + 3);
          ctx.lineTo(x - 3, y);
          ctx.fill();
        }
      for (const y of [140, 250, 360])
        for (const x of [33, 867]) {
          ctx.fillStyle = '#e5cfa0';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, TAU);
          ctx.fill();
        }
      ctx.strokeStyle = '#c4dbb21a';
      ctx.beginPath();
      ctx.moveTo(265, 60);
      ctx.lineTo(265, 440);
      ctx.stroke();
      S.text(ctx, 'TRẠM CHƠI · BILLIARDS', 450, 269, 13, '#d3e5ae18', 'center', 700);
      const cue = state.balls[0];
      if (state.status === 'ready' && !finished) {
        const dx = Math.cos(angle),
          dy = Math.sin(angle);
        let distance = 370;
        for (const ball of state.balls.slice(1)) {
          if (!ball.active) continue;
          const bx = ball.x - cue.x,
            by = ball.y - cue.y,
            dot = bx * dx + by * dy,
            cross = Math.abs(bx * dy - by * dx);
          if (dot > 0 && cross < 22)
            distance = Math.min(distance, Math.max(0, dot - Math.sqrt(484 - cross * cross)));
        }
        for (const [axis, component, min, max] of [
          [cue.x, dx, 67, 833],
          [cue.y, dy, 67, 433],
        ])
          if (component)
            distance = Math.min(distance, (component > 0 ? max - axis : min - axis) / component);
        distance = Math.max(0, distance);
        ctx.strokeStyle = '#e2ecc1a8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.moveTo(cue.x + dx * 14, cue.y + dy * 14);
        ctx.lineTo(cue.x + dx * distance, cue.y + dy * distance);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#e2ecc155';
        ctx.beginPath();
        ctx.arc(cue.x + dx * distance, cue.y + dy * distance, 11, 0, TAU);
        ctx.stroke();
        const pull = 23 + Number(power.value) * 0.18;
        ctx.strokeStyle = '#372f22';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cue.x - dx * pull, cue.y - dy * pull);
        ctx.lineTo(cue.x - dx * (pull + 135), cue.y - dy * (pull + 135));
        ctx.stroke();
        ctx.strokeStyle = '#d6b98a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cue.x - dx * pull, cue.y - dy * pull);
        ctx.lineTo(cue.x - dx * (pull + 110), cue.y - dy * (pull + 110));
        ctx.stroke();
        ctx.strokeStyle = '#a6c2b3';
        ctx.beginPath();
        ctx.moveTo(cue.x - dx * pull, cue.y - dy * pull);
        ctx.lineTo(cue.x - dx * (pull + 4), cue.y - dy * (pull + 4));
        ctx.stroke();
      }
      for (const ball of state.balls) {
        if (!ball.active) continue;
        const { x, y, id } = ball;
        ctx.fillStyle = '#08282055';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 4, 11, 9, 0, 0, TAU);
        ctx.fill();
        const gradient = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, 12);
        gradient.addColorStop(0, id === 0 ? '#fffef1' : id > 8 ? '#fff7df' : colors[id]);
        gradient.addColorStop(1, id === 0 ? '#c9cbb2' : id > 8 ? '#cbd2b7' : colors[id]);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, TAU);
        ctx.fill();
        if (id > 8) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, TAU);
          ctx.clip();
          ctx.fillStyle = colors[id];
          ctx.fillRect(x - 12, y - 6, 24, 12);
          ctx.restore();
        }
        if (id) {
          ctx.fillStyle = '#f4f0d7';
          ctx.beginPath();
          ctx.arc(x, y, 5.3, 0, TAU);
          ctx.fill();
          S.text(ctx, id, x, y + 2.7, id > 9 ? 6.5 : 7.5, '#2e3f35', 'center', 700);
        }
        ctx.fillStyle = '#ffffff75';
        ctx.beginPath();
        ctx.arc(x - 4, y - 5, 2.4, 0, TAU);
        ctx.fill();
      }
    }
    function updateStats() {
      ui.setStat('potted', `${state.potted} / 15`);
      ui.setStat('shots', state.shots);
      ui.setStat('scratch', state.scratches);
      shootButton.disabled = state.status !== 'ready' || finished;
      power.disabled = state.status !== 'ready' || finished;
    }
    function shoot() {
      if (L.shootPool(state, angle, Number(power.value) / 100)) {
        ui.message('Bi đang lăn… Chờ tất cả bi dừng lại để đánh tiếp.');
        updateStats();
      }
    }
    function aim(event) {
      if (state.status !== 'ready' || finished) return;
      const p = ui.point(event),
        cue = state.balls[0];
      if (Math.hypot(p.x - cue.x, p.y - cue.y) > 8) angle = Math.atan2(p.y - cue.y, p.x - cue.x);
    }
    scope.on(ui.canvas, 'pointermove', aim);
    scope.on(ui.canvas, 'pointerdown', (event) => {
      event.preventDefault();
      ui.canvas.setPointerCapture(event.pointerId);
      aim(event);
      ui.workspace.focus({ preventScroll: true });
    });
    scope.on(power, 'input', () => {
      output.value = `${power.value}%`;
    });
    scope.on(shootButton, 'click', () => {
      shoot();
      ui.workspace.focus({ preventScroll: true });
    });
    scope.on(window, 'keydown', (event) => {
      const key = S.gameKey(event);
      if (
        !['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key) ||
        state.status !== 'ready'
      )
        return;
      event.preventDefault();
      if (key === 'arrowleft') angle -= 0.04;
      if (key === 'arrowright') angle += 0.04;
      if (key === 'arrowup') power.value = Math.min(100, Number(power.value) + 5);
      if (key === 'arrowdown') power.value = Math.max(10, Number(power.value) - 5);
      output.value = `${power.value}%`;
      if (key === ' ') shoot();
    });
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createPool();
      angle = 0;
      finished = false;
      power.value = 65;
      output.value = '65%';
      ui.message(
        'Di chuyển chuột hoặc chạm bàn để ngắm. Chỉnh lực, rồi bấm Đánh bi. Hãy đưa đủ 15 bi màu vào lỗ!',
      );
      updateStats();
      draw();
    }
    scope.loop((dt) => {
      const before = state.status,
        potted = state.potted,
        scratches = state.scratches;
      L.stepPool(state, dt);
      if (state.potted > potted)
        options.onScore(Math.max(0, state.potted * 100 - state.shots * 5 - state.scratches * 50));
      if (state.scratches > scratches)
        ui.message('Bi trắng vào lỗ! Trừ 50 điểm; bi sẽ được đặt lại khi bàn dừng.');
      else if (before === 'moving' && state.status === 'ready')
        ui.message(`Sẵn sàng cho cú tiếp theo. Còn ${15 - state.potted} bi màu trên bàn.`);
      if (state.status === 'won' && !finished) {
        finished = true;
        S.result(ui, scope, {
          title: 'Dọn bàn hoàn hảo!',
          detail: `15 bi đã vào lỗ sau ${state.shots} cú đánh. Lỗi bi trắng: ${state.scratches}.`,
          score: Math.max(0, 2000 - state.shots * 5 - state.scratches * 50),
          onAgain: restart,
          onScore: options.onScore,
        });
      }
      updateStats();
      draw();
    });
    restart();
    return S.handle(scope, restart);
  };

  Games.breakout = function (host, options) {
    const scope = S.createScope();
    const ui = S.canvasUI(host, 800, 500, {
      className: 'breakout-workspace',
      label: 'Phá gạch. Di chuyển chuột, chạm kéo hoặc dùng mũi tên để đỡ bóng.',
      toolbar:
        S.stat('ĐIỂM', 'score', 0) +
        S.stat('GẠCH CÒN LẠI', 'bricks', 50) +
        S.stat('MẠNG', 'lives', '♥ ♥ ♥'),
      controls: `<button class="control-button steering-button" data-hold="left" aria-label="Di chuyển thanh đỡ sang trái">${icon('arrow-left')}</button><button class="control-button launch-button" data-launch>${icon('play')}Phóng bóng</button><button class="control-button steering-button" data-hold="right" aria-label="Di chuyển thanh đỡ sang phải">${icon('arrow-right')}</button>`,
    });
    const { ctx } = ui,
      input = S.heldInput(scope, ui, { left: ['a', 'arrowleft'], right: ['d', 'arrowright'] });
    const launch = ui.controls.querySelector('[data-launch]');
    let state,
      started,
      ended,
      trail = [];
    function fire() {
      if (started && !ended) {
        L.launchBreakout(state);
        ui.workspace.focus({ preventScroll: true });
      }
    }
    scope.on(launch, 'click', fire);
    scope.on(window, 'keydown', (event) => {
      if (S.gameKey(event) === ' ') {
        event.preventDefault();
        fire();
      }
    });
    const move = (event) => {
      if (started && !ended) state.paddle.x = ui.point(event).x;
    };
    scope.on(ui.canvas, 'pointermove', move);
    scope.on(ui.canvas, 'pointerdown', (event) => {
      event.preventDefault();
      ui.canvas.setPointerCapture(event.pointerId);
      move(event);
      fire();
    });
    function draw() {
      const bg = ctx.createLinearGradient(0, 0, 0, 500);
      bg.addColorStop(0, '#263749');
      bg.addColorStop(1, '#233e3c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 800, 500);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(195,220,207,${0.07 + (i % 3) * 0.03})`;
        ctx.beginPath();
        ctx.arc((i * 97 + 31) % 800, (i * 67 + 18) % 500, i % 3 === 0 ? 1.4 : 0.8, 0, TAU);
        ctx.fill();
      }
      const colors = ['#b29bbe', '#97b0c4', '#85b6a8', '#c3c997', '#d8b491'];
      for (const brick of state.bricks)
        if (brick.alive) {
          S.roundRect(ctx, brick.x, brick.y + 3, brick.w, brick.h, 4, '#0c263037');
          S.roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 4, colors[brick.row]);
          S.roundRect(ctx, brick.x + 4, brick.y + 3, brick.w - 8, 3, 1, '#ffffff22');
        }
      for (let i = 0; i < trail.length; i++) {
        ctx.fillStyle = `rgba(220,235,180,${(i / trail.length) * 0.22})`;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, 3 + (i / trail.length) * 4, 0, TAU);
        ctx.fill();
      }
      ctx.shadowColor = '#d3e6a8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#e8efc6';
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, 8, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      S.roundRect(
        ctx,
        state.paddle.x - state.paddle.width / 2,
        state.paddle.y,
        state.paddle.width,
        13,
        6,
        '#c1dda2',
      );
      S.roundRect(
        ctx,
        state.paddle.x - state.paddle.width / 2 + 5,
        state.paddle.y + 2,
        state.paddle.width - 10,
        3,
        2,
        '#eef5cf',
      );
      if (started && state.status === 'ready')
        S.text(ctx, 'SPACE / CHẠM BÀN ĐỂ PHÓNG BÓNG', 400, 320, 15, '#bad0b0');
    }
    function stats() {
      ui.setStat('score', state.score);
      ui.setStat('bricks', state.bricks.filter((b) => b.alive).length);
      ui.setStat('lives', '♥ '.repeat(state.lives).trim() || '—');
      launch.disabled = !started || state.status !== 'ready';
    }
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      input.clear();
      state = L.createBreakout();
      started = false;
      ended = false;
      trail = [];
      ui.message('Di chuyển chuột, kéo trên bàn hoặc dùng ← / → để đỡ bóng. Bạn có 3 mạng.');
      S.intro(ui, scope, {
        title: 'Phá gạch, phá kỷ lục',
        detail:
          '50 viên gạch. 3 cơ hội. Đỡ bóng bằng mép thanh để đổi góc bật và dọn sạch bầu trời.',
        symbol: 'bolt',
        onStart: () => {
          started = true;
          L.launchBreakout(state);
        },
      });
      draw();
      stats();
    }
    scope.loop((dt) => {
      if (started && !ended) {
        state.paddle.x +=
          ((input.active('right') ? 1 : 0) - (input.active('left') ? 1 : 0)) * dt * 540;
        const before = state.score,
          lives = state.lives;
        L.stepBreakout(state, dt);
        if (state.status === 'playing') {
          trail.push({ x: state.ball.x, y: state.ball.y });
          if (trail.length > 12) trail.shift();
        } else trail = [];
        if (state.score > before) options.onScore(state.score);
        if (state.lives < lives)
          ui.message(`Còn ${state.lives} mạng. Nhấn Space, Phóng bóng hoặc chạm bàn để tiếp tục.`);
        if (['won', 'lost'].includes(state.status)) {
          ended = true;
          input.clear();
          S.result(ui, scope, {
            title: state.status === 'won' ? 'Bầu trời đã sạch bóng!' : 'Thêm một lần nữa nhé?',
            detail:
              state.status === 'won'
                ? 'Bạn đã phá hết 50 viên gạch. Một ván thật xuất sắc!'
                : `Bạn đã phá ${50 - state.bricks.filter((b) => b.alive).length} / 50 viên gạch.`,
            score: state.score,
            win: state.status === 'won',
            onAgain: restart,
            onScore: options.onScore,
          });
        }
      }
      stats();
      draw();
    });
    restart();
    return S.handle(scope, restart);
  };
})();
