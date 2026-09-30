// version v1.0
/* Shared board coordinates. Logic stays on a plane; 2D and 3D use the same layout. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeLayouts = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const LUDO_PATH = [
    [6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6],
    [1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],
    [8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],
    [13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],
  ];
  const LUDO_COLORS = ['#85bc8b', '#e98d7c', '#80add6', '#e8c675'];
  const LUDO_NAMES = ['Xanh lá', 'Đỏ', 'Xanh dương', 'Vàng'];
  const LUDO_YARDS = [[1.6,10.6],[1.6,1.6],[10.6,1.6],[10.6,10.6]];
  function homePosition(player, progress) {
    const p = progress - 52;
    return [[7,13-p],[1+p,7],[7,1+p],[13-p,7]][player];
  }
  function ludoCoordinates(player, token, progress) {
    if (progress < 0) {
      const [x,z] = LUDO_YARDS[player];
      return [x + token % 2 * 1.8 - 7, z + Math.floor(token / 2) * 1.8 - 7];
    }
    const point = progress < 52 ? LUDO_PATH[(player * 13 + progress) % 52] : homePosition(player, progress);
    return [point[0] - 7, point[1] - 7];
  }
  function gridCoordinates(index, size, spacing = 1) {
    return [(index % size - (size - 1) / 2) * spacing, (Math.floor(index / size) - (size - 1) / 2) * spacing];
  }
  function gridIndex(x, z, size, spacing = 1) {
    const col = Math.floor(x / spacing + size / 2), row = Math.floor(z / spacing + size / 2);
    return col < 0 || col >= size || row < 0 || row >= size ? -1 : row * size + col;
  }
  function quanCoordinates(index) {
    if (index === 0) return [-6.9,0];
    if (index === 6) return [6.9,0];
    return index < 6 ? [(index - 3) * 2.2,-1.45] : [(9 - index) * 2.2,1.45];
  }
  function tableToWorld(x, y, width, height, scale) {
    return [(x - width / 2) / scale, (y - height / 2) / scale];
  }
  function worldToTable(x, z, width, height, scale) {
    return { x:x * scale + width / 2, y:z * scale + height / 2 };
  }
  return { LUDO_PATH, LUDO_COLORS, LUDO_NAMES, LUDO_YARDS, homePosition, ludoCoordinates, gridCoordinates, gridIndex, quanCoordinates, tableToWorld, worldToTable };
});
