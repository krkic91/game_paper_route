// version v1.0
/* Local SVG illustrations: no remote fonts, images, libraries, or trackers. */
(function () {
  'use strict';
  const paths = {
    cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10m-4.5-17.5 9 5"/>',
    gamepad:
      '<path d="M6 7h12a4 4 0 0 1 3.9 4.9l-1.2 5a2.5 2.5 0 0 1-4.2 1.2L14 16h-4l-2.5 2.1a2.5 2.5 0 0 1-4.2-1.2l-1.2-5A4 4 0 0 1 6 7Z"/><path d="M7 10v5m-2.5-2.5h5M16 11h.01M19 14h.01M9 7V5h6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    heart:
      '<path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>',
    history: '<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7M12 7v5l3 2"/>',
    shuffle:
      '<path d="m17 3 4 4-4 4m0 2 4 4-4 4M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.5-1.6 5-4m2-3c1.4-1.9 2.9-3 5-3h3"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
    'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
    'arrow-up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    'arrow-down': '<path d="M12 4v16m-6-6 6 6 6-6"/>',
    play: '<path d="m8 4 13 8-13 8V4Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
    restart: '<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7"/>',
    maximize: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    home: '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
    spark: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
    flag: '<path d="M5 22V3m0 0c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" stroke-width="3"/>',
    puzzle:
      '<path d="M8 3H3v5a3 3 0 1 1 0 6v7h7a3 3 0 1 1 6 0h5v-7a3 3 0 1 1 0-6V3h-7a3 3 0 1 1-6 0Z"/>',
    sort: '<path d="M4 6h16M4 12h11M4 18h6"/>',
    trophy:
      '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H3v2a5 5 0 0 0 5 5m8-7h5v2a5 5 0 0 1-5 5m-4 1v5m-5 3h10m-8-3h6v3"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    bike: '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9H5l4-6h8l2 6M8 5h4m4 1h3l-2 5"/>',
  };
  function icon(name, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  }
  let sequence = 0;
  function scene(body, bg, decor = '') {
    const id = `art${++sequence}`;
    return `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><filter id="${id}"><feDropShadow dx="0" dy="9" stdDeviation="6" flood-color="#142d2b" flood-opacity=".18"/></filter></defs><path fill="${bg}" d="M0 0h400v250H0z"/>${decor}<g filter="url(#${id})">${body}</g></svg>`;
  }
  const cloud = (x, y, scale = 1) =>
    `<path transform="translate(${x} ${y}) scale(${scale})" d="M0 18C-2 6 13 3 18 8 18-9 45-9 48 7c18-2 25 9 20 13H0Z" fill="#f5f4dd" opacity=".7"/>`;
  function bike(x, y, scale = 1, color = '#ffba58') {
    return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="40" rx="62" ry="10" fill="#203c371c"/><g fill="#273f43" stroke="#e6e9d1" stroke-width="3"><circle cx="-36" cy="21" r="24"/><circle cx="40" cy="21" r="24"/></g><g stroke="#839b93" stroke-width="1.5"><path d="m-60 21 48 0m-24-24v48m52-24h48M40-3v48m-91-40 33 33m-33 0 33-33m43 0 31 32m-32 0 32-32"/></g><g fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="m-36 21 22-42 27 42h-49l39-1 30-39 7 40M-14-21h47m-52-6h15m35 8-3-15h14"/></g><path d="m-5-39-9 25L8 1 0 21" fill="none" stroke="#243d4a" stroke-width="10" stroke-linecap="round"/><path d="m-5-40 17-27 18 28" fill="none" stroke="#df694a" stroke-width="20" stroke-linecap="round"/><path d="m19-59 18 12 8 13" fill="none" stroke="#deb47f" stroke-width="8" stroke-linecap="round"/><circle cx="21" cy="-84" r="14" fill="#e9c08e"/><path d="M6-85c-1-20 31-22 30 0H6Z" fill="${color}"/><path d="M32-84h9" stroke="#304f46" stroke-width="3" stroke-linecap="round"/><path d="M17-80h7" stroke="#493b31" stroke-width="3"/><path d="M-29-28h-22v-24h27l8 24" fill="#e8e4c0" stroke="#ba9872" stroke-width="2"/><path d="m-44-46 21 0m-21 7h21m-21 7h21" stroke="#b7b99a" stroke-width="2"/></g>`;
  }
  const tree = (x, y, s = 1, color = '#527a54') =>
    `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="15" rx="24" ry="7" fill="#36513826"/><path d="M0 15v-49" stroke="#9f7b51" stroke-width="7"/><path d="m0-9-15-16m15 9 14-20" stroke="#9f7b51" stroke-width="4"/><path d="M-30-43c-4-23 7-39 26-40 21-15 42 14 34 28 20 30-3 46-24 39-27 13-45-11-36-27" fill="${color}"/><path d="M-12-70c-11 10-12 21-6 32" stroke="#c5d88d" stroke-width="5" opacity=".25" fill="none" stroke-linecap="round"/></g>`;
  const envelope = (x, y, r = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><rect width="39" height="25" rx="3" fill="#fff9dd" stroke="#658166" stroke-width="1.5"/><path d="m0 2 20 13L39 2M0 25l14-13m25 13L25 12" stroke="#b2bba2" stroke-width="1.5" fill="none"/></g>`;

  function hero() {
    return `<svg viewBox="0 0 620 440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="hero-sky" x2="0" y2="1"><stop stop-color="#d6e6ce"/><stop offset="1" stop-color="#b5cda9"/></linearGradient></defs><circle cx="430" cy="160" r="185" fill="url(#hero-sky)"/><circle cx="490" cy="80" r="32" fill="#f1e9b3"/>${cloud(280, 67, 0.75)}${cloud(507, 102, 0.6)}<path d="m210 440 300-459 91 0L344 440" fill="#7f9c71"/><path d="m210 440 293-440h124L335 440" fill="#e0dec0"/><path d="m225 440 291-440h92L321 440" fill="#587469"/><path d="M272 440 563 0" stroke="#dfe7b0" stroke-width="3" stroke-dasharray="21 20"/><path d="m318 440 288-440" stroke="#a4bc99" stroke-width="2"/>${tree(545, 62, 0.5, '#7d9761')}${tree(445, 120, 0.62, '#77915c')}${tree(591, 183, 1, '#7a9461')}<g transform="translate(281 129)"><path d="m-50 11 63-26 56 27v66L12 108l-62-31Z" fill="#d8b979"/><path d="m12 46 57-34v66l-57 30Z" fill="#b49765"/><path d="m-63 13 76-53 70 41-71 40Z" fill="#bd7757"/><path d="m13-40 70 41-71 40 0-48Z" fill="#a36249"/><path d="m-36 30 21 9v28l-21-9Z" fill="#819684"/><path d="m-2 47 11 5v42l-11-5Z" fill="#9a7752"/><path d="m29 47 21-10v22L29 69Z" fill="#566d61"/><path d="m39 42 0 21m-10-5 21-10" stroke="#d9ddbd" stroke-width="2"/><path d="m-26 33 0 29m-10-18 21 9" stroke="#e1dbc1" stroke-width="2"/></g>${tree(244, 274, 0.75, '#809557')}${tree(153, 377, 1.03, '#7a985c')}<g transform="translate(531 291)"><path d="m-30 0 43-18 34 18v67L4 86l-34-20Z" fill="#ced6b2"/><path d="m4 22 43-22v67L4 86Z" fill="#a4b893"/><path d="m-39 1 36-47 60 40L4 23Z" fill="#8b9f6e"/><path d="m15 34 19-10v24L15 58Z" fill="#567567"/></g><path d="m409 370 112 54-28 24-109-55Z" fill="#a4b68b" opacity=".8"/>${bike(374, 333, 1.12, '#e6b84f')}<path d="M365 231q-43-62-108-34" stroke="#fff9d2" stroke-width="3" stroke-dasharray="6 8" fill="none"/>${envelope(272, 184, -20)}<g transform="translate(257 273)"><path d="M0 0v48" stroke="#857654" stroke-width="6"/><path d="M-19 2v-27q17-22 38 0V2Z" fill="#e9e8c5"/><path d="M7-30v-16h14v10H7" fill="#cd7654"/><path d="M-20-1h40" stroke="#b96a4e" stroke-width="6"/><path d="M-14-19h23" stroke="#9ca48c" stroke-width="3"/></g><g stroke="#eff4d7" stroke-width="3" opacity=".65"><path d="m391 194 9-9m3 21h12m-31-26 0-10"/></g><g fill="#71864e"><ellipse cx="461" cy="377" rx="7" ry="3"/><ellipse cx="218" cy="310" rx="6" ry="3"/><ellipse cx="565" cy="365" rx="6" ry="3"/></g></svg>`;
  }
  function ludoBoard() {
    const colors = ['#e37963', '#e9bd67', '#7caad0', '#8bb79a'];
    let html =
      '<rect x="-4" y="5" width="190" height="190" rx="12" fill="#253d3440"/><rect width="184" height="184" rx="10" fill="#f2ead5"/>';
    [
      [9, 9],
      [108, 9],
      [108, 108],
      [9, 108],
    ].forEach(([x, y], i) => {
      html += `<rect x="${x}" y="${y}" width="67" height="67" rx="6" fill="${colors[i]}"/><rect x="${x + 10}" y="${y + 10}" width="47" height="47" rx="4" fill="#f2ead5"/>`;
      for (const [dx, dy] of [
        [21, 21],
        [46, 21],
        [21, 46],
        [46, 46],
      ])
        html += `<circle cx="${x + dx}" cy="${y + dy}" r="8" fill="${colors[i]}"/><circle cx="${x + dx - 2}" cy="${y + dy - 2}" r="3" fill="#fff" opacity=".35"/>`;
    });
    for (let n = 0; n < 6; n++) {
      html += `<path d="M${n * 13} 79v26M${106 + n * 13} 79v26M79 ${n * 13}h26M79 ${106 + n * 13}h26" stroke="#c8c7b4" stroke-width="1"/>`;
    }
    html +=
      '<path d="M79 79h26v26H79Z" fill="#b0bd84"/><path d="m79 79 26 26m0-26-26 26" stroke="#f2ead5" stroke-width="2"/>';
    return html;
  }
  function cover(id) {
    if (id === 'delivery')
      return scene(
        `<path d="m-80 250 203-250h128L74 250" fill="#a4b59b"/><path d="m-40 250 203-250h112L111 250" fill="#62897c"/><path d="m15 250 203-250" stroke="#e0e3b1" stroke-width="3" stroke-dasharray="16 14"/>${tree(317, 182, 1.05, '#829c66')}${bike(198, 156, 0.92, '#e5c463')}${envelope(302, 72, -19)}`,
        '#cbd6b6',
        `${cloud(27, 26, 0.65)}${cloud(244, 30, 0.85)}`,
      );
    if (id === 'race')
      return scene(
        `<path d="m92 250 98-148h44l84 148" fill="#e0cda1"/><path d="m118 250 76-148h35l69 148" fill="#777f6b"/><path d="m206 244 7-138" stroke="#f5e9c8" stroke-width="3" stroke-dasharray="15 12"/>${bike(265, 168, 0.73, '#e79250')}${bike(127, 140, 0.47, '#76a69e')}<path d="m332 164-8 29h22Z" fill="#dc7d4f"/><path d="m326 181 16 0" stroke="#f3e2b3" stroke-width="4"/><g stroke="#b99964" stroke-width="2"><path d="M77 82H34m33 12H46m246-24h40"/></g>`,
        '#e4c18c',
        `<circle cx="287" cy="55" r="33" fill="#f3df9e"/><path d="M0 127 91 51l73 70L277 73l123 72v105H0Z" fill="#b3ad7e"/><path d="M0 150 84 93l106 71 137-55 73 44v97H0Z" fill="#c4bb8c"/>`,
      );
    if (id === 'caro') {
      let grid = '';
      for (let i = 0; i < 7; i++)
        grid += `<path d="M${25 + i * 27} 17v182M17 ${25 + i * 27}h182"/>`;
      const crosses = [
        [52, 52],
        [79, 79],
        [106, 106],
        [133, 133],
        [160, 160],
      ]
        .map(
          ([x, y]) =>
            `<path d="m${x - 8} ${y - 8} 16 16m-16 0 16-16" stroke="#507d70" stroke-width="6" stroke-linecap="round"/>`,
        )
        .join('');
      const circles = [
        [79, 25],
        [133, 79],
        [79, 133],
        [160, 106],
      ]
        .map(
          ([x, y]) =>
            `<circle cx="${x}" cy="${y}" r="10" stroke="#d89070" stroke-width="5" fill="none"/>`,
        )
        .join('');
      return scene(
        `<g transform="translate(97 17) rotate(9 108 108)"><rect x="0" y="6" width="216" height="216" rx="14" fill="#73998b"/><rect width="216" height="216" rx="14" fill="#edf0d9"/><g stroke="#b4cbbb" stroke-width="1">${grid}</g>${crosses}${circles}<path d="m46 46 121 121" stroke="#65927a" stroke-width="2" opacity=".4"/></g>`,
        '#a5c7b6',
        '<circle cx="29" cy="38" r="75" fill="#bcd7bf"/><circle cx="394" cy="241" r="100" fill="#91b4a4"/>',
      );
    }
    if (id === 'ludo')
      return scene(
        `<g transform="translate(99 27) rotate(-12 92 92)">${ludoBoard()}</g><g transform="translate(284 172) rotate(16)"><rect width="44" height="44" rx="10" fill="#faf0d2"/><g fill="#7b6b58"><circle cx="12" cy="12" r="3.5"/><circle cx="32" cy="12" r="3.5"/><circle cx="22" cy="22" r="3.5"/><circle cx="12" cy="32" r="3.5"/><circle cx="32" cy="32" r="3.5"/></g></g>`,
        '#d0b494',
        '<circle cx="60" cy="200" r="100" fill="#ddc3a0"/><path d="m325-20 85 91" stroke="#e4c9a5" stroke-width="58"/>',
      );
    if (id === 'quan') {
      let cells = '';
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 5; col++) {
          const x = 63 + col * 42,
            y = 14 + row * 65;
          cells += `<rect x="${x}" y="${y}" width="36" height="58" rx="15" fill="#b39168" stroke="#d4b68a" stroke-width="2"/>`;
          for (let n = 0; n < 5; n++)
            cells += `<ellipse cx="${x + 12 + (n % 2) * 12}" cy="${y + 15 + Math.floor(n / 2) * 12}" rx="5" ry="4" transform="rotate(${n * 35} ${x + 12 + (n % 2) * 12} ${y + 15 + Math.floor(n / 2) * 12})" fill="${['#f2deaf', '#ded0a7', '#efe5c1'][n % 3]}"/>`;
        }
      return scene(
        `<g transform="translate(24 61) rotate(-8 175 75)"><rect y="8" width="352" height="154" rx="65" fill="#826143"/><rect width="352" height="154" rx="65" fill="#c4a579"/><path d="M56 14v126C-3 140-3 14 56 14Zm222 0v126c75 0 75-126 0-126" fill="#a5845d" stroke="#e0c18f" stroke-width="2"/>${cells}<ellipse cx="30" cy="74" rx="13" ry="20" fill="#eee0b3" transform="rotate(15 30 74)"/><ellipse cx="311" cy="74" rx="13" ry="20" fill="#e8dbb7" transform="rotate(-14 311 74)"/></g>`,
        '#bdc2a1',
        '<path d="M-40 105Q104-49 313-20M101 297Q254 140 451 184" stroke="#d9d7b3" fill="none" stroke-width="44" opacity=".5"/>',
      );
    }
    if (id === 'pool') {
      const balls = [
        [245, 101, '#e2b24e', '1'],
        [269, 141, '#527ba2', '2'],
        [219, 144, '#b95e4f', '3'],
        [295, 98, '#dfd4af', '9'],
        [245, 181, '#344c42', '8'],
      ]
        .map(
          ([x, y, color, n]) =>
            `<circle cx="${x + 2}" cy="${y + 4}" r="16" fill="#153d34" opacity=".4"/><circle cx="${x}" cy="${y}" r="15" fill="${color}"/><circle cx="${x}" cy="${y}" r="7" fill="#f4ecd4"/><text x="${x}" y="${y + 3}" fill="#3c4c39" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="700">${n}</text><circle cx="${x - 5}" cy="${y - 6}" r="3" fill="#fff" opacity=".3"/>`,
        )
        .join('');
      return scene(
        `<path d="M19 16h362v218H19Z" fill="#b7976d"/><path d="M31 28h338v194H31Z" fill="#54795d"/><path d="M41 38h318v174H41Z" fill="#3c7461"/>${[
          [42, 39],
          [200, 35],
          [358, 39],
          [42, 211],
          [200, 215],
          [358, 211],
        ]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="#1f463b"/>`)
          .join(
            '',
          )}<path d="m80 220 90-79" stroke="#493d2e" stroke-width="7"/><path d="m80 217 90-79" stroke="#d4b286" stroke-width="5"/><path d="m184 127 44-32" stroke="#daeac29c" stroke-width="1.5" stroke-dasharray="4 5"/><circle cx="181" cy="130" r="15" fill="#f0edd7"/><circle cx="176" cy="125" r="4" fill="#fff" opacity=".8"/>${balls}`,
        '#668a72',
      );
    }
    if (id === 'snake') {
      let grid = '';
      for (let x = 10; x < 400; x += 24)
        for (let y = 5; y < 250; y += 24)
          grid += `<circle cx="${x}" cy="${y}" r="1" fill="#83b997" opacity=".2"/>`;
      return scene(
        `<path d="M92 165h72V93h96v72h48" fill="none" stroke="#364d3c" stroke-width="33" stroke-linecap="round" stroke-linejoin="round"/><path d="M92 157h72V85h96v72h48" fill="none" stroke="#a8d389" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/><path d="M92 150h65V86h93" fill="none" stroke="#d0e8a8" stroke-width="5" opacity=".5" stroke-linecap="round"/><rect x="290" y="139" width="42" height="36" rx="13" fill="#c7e89c"/><g fill="#2f5143"><circle cx="317" cy="149" r="3"/><circle cx="317" cy="165" r="3"/></g><path d="m331 157 9 0 5-4m-5 4 5 4" fill="none" stroke="#dfaa87" stroke-width="2"/><path d="M99 71c-17-7-26 17-16 31 5 7 8 9 14 7 12 5 27-23 12-35Z" fill="#d97f66"/><path d="m99 73 4-12" stroke="#9ba96b" stroke-width="4"/><path d="M103 64q3-11 17-9-3 12-17 9" fill="#91b887"/>`,
        '#2c534b',
        grid,
      );
    }
    if (id === '2048') {
      let tiles = '';
      const values = [2, 4, 8, 0, 16, 64, 32, 4, 2, 128, 256, 8, 4, 16, 8, 2];
      const palette = {
        0: '#b8a7be',
        2: '#e4d7d8',
        4: '#e8dbbd',
        8: '#d9ab99',
        16: '#cb969d',
        32: '#b27e96',
        64: '#927093',
        128: '#947fac',
        256: '#c3bc8a',
      };
      values.forEach((value, i) => {
        const x = 12 + (i % 4) * 46,
          y = 12 + Math.floor(i / 4) * 46;
        tiles += `<rect x="${x}" y="${y}" width="40" height="40" rx="6" fill="${palette[value]}"/>${value ? `<text x="${x + 20}" y="${y + 26}" text-anchor="middle" font-size="${value > 99 ? 16 : 20}" font-family="sans-serif" font-weight="700" fill="${value < 8 ? '#87717a' : '#fff4de'}">${value}</text>` : ''}`;
      });
      return scene(
        `<g transform="translate(99 19) rotate(8 100 100)"><rect y="7" width="202" height="202" rx="15" fill="#8f7c94"/><rect width="202" height="202" rx="15" fill="#c5b5c9"/>${tiles}</g>`,
        '#aa97b4',
        '<circle cx="363" cy="36" r="90" fill="#b9a5c0"/><circle cx="44" cy="243" r="83" fill="#9588a4"/>',
      );
    }
    if (id === 'sudoku') {
      const givens = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
      let grid = '', numbers = '';
      for (let n = 1; n < 9; n++)
        grid += `<path d="M${n * 20} 0v180M0 ${n * 20}h180" stroke="${n % 3 ? '#b9c4a6' : '#658369'}" stroke-width="${n % 3 ? 0.8 : 2}"/>`;
      [...givens].forEach((value, index) => {
        if (value !== '0') numbers += `<text x="${(index % 9) * 20 + 10}" y="${Math.floor(index / 9) * 20 + 14}" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="13" font-weight="600" fill="#385444">${value}</text>`;
      });
      return scene(
        `<g transform="translate(101 27) rotate(-7 90 90)"><rect x="-9" y="-9" width="198" height="198" rx="11" fill="#d3dcbc"/><rect width="180" height="180" rx="2" fill="#f3f1dc"/><rect x="60" y="60" width="60" height="60" fill="#d5e6bb"/>${grid}${numbers}<text x="50" y="14" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="13" fill="#4f8171">4</text></g><g transform="translate(314 62) rotate(19)"><rect width="12" height="135" rx="3" fill="#e6b461"/><path d="M3 5v125" stroke="#f4d492" stroke-width="3"/><path d="m0 133 6 18 6-18" fill="#f2e5c5"/><path d="m4 145 2 6 2-6" fill="#455e4b"/><rect width="12" height="15" rx="3" fill="#c18772"/></g>`,
        '#b4c7ba',
        '<circle cx="27" cy="219" r="103" fill="#9db4a2"/><circle cx="356" cy="17" r="81" fill="#d1ddc8"/>',
      );
    }
    if (id === 'memory') {
      let cards = '';
      [
        [89, 27, -12, 0],
        [191, 24, 10, 1],
        [103, 130, -4, 1],
        [211, 130, 15, 0],
      ].forEach(([x, y, r, front]) => {
        cards += `<g transform="translate(${x} ${y}) rotate(${r} 44 46)"><rect y="5" width="80" height="96" rx="10" fill="#bc7f74"/><rect width="80" height="96" rx="10" fill="${front ? '#f0dfb7' : '#ca8b7c'}"/><rect x="7" y="7" width="66" height="82" rx="7" fill="none" stroke="${front ? '#dcc6a2' : '#e8b8a1'}" stroke-width="1.5"/>${front ? '<path d="m40 24 7 16 18 3-13 13 3 18-15-9-16 9 3-18-13-13 18-3Z" fill="#9baa79"/><path d="m40 24 7 16-7 12-8-12Z" fill="#b8c08c"/>' : '<path d="m40 28 6 15 15 6-15 6-6 15-6-15-15-6 15-6Z" fill="#e9bca5"/>'}</g>`;
      });
      return scene(
        cards,
        '#d4a396',
        '<circle cx="40" cy="24" r="92" fill="#dfb7a2"/><circle cx="386" cy="249" r="83" fill="#be9089"/>',
      );
    }
    if (id === 'breakout') {
      let bricks = '';
      const colors = ['#b19bc2', '#8dacc0', '#86b6a6', '#c2ca93'];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 7; c++) {
          if ((r === 3 && [2, 3, 4].includes(c)) || (r === 2 && c === 3)) continue;
          bricks += `<rect x="${42 + c * 46}" y="${39 + r * 24}" width="39" height="17" rx="3" fill="${colors[r]}"/><path d="M${46 + c * 46} ${43 + r * 24}h30" stroke="#fff" opacity=".17" stroke-linecap="round"/>`;
        }
      return scene(
        `${bricks}<path d="m187 117 75 80-49 40" stroke="#9fb8cb" opacity=".3" stroke-width="3" stroke-dasharray="4 6" fill="none"/><circle cx="220" cy="153" r="8" fill="#eef0cf"/><circle cx="220" cy="153" r="15" fill="#eef0cf" opacity=".1"/><rect x="144" y="212" width="102" height="13" rx="6" fill="#c8d99c"/><rect x="149" y="214" width="91" height="3" rx="1.5" fill="#f1f1c6"/>`,
        '#3b4d62',
        '<g fill="#a1b8bb" opacity=".28"><circle cx="21" cy="152" r="1"/><circle cx="376" cy="175" r="2"/><circle cx="75" cy="203" r="1"/><circle cx="291" cy="164" r="1.5"/></g>',
      );
    }
    return scene('', '#7a9475');
  }
  window.ArcadeArt = { icon, cover, hero, ludoBoard };
})();
