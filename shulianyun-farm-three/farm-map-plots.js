(() => {
  'use strict';

  // Match the model axes and dimensions used to build the plots in farmScene.
  const farmWidth = 75;
  const farmDepth = 136;
  const rows = 12;
  const columnStarts = [-37.5, 0.95];
  const plotWidth = 36.55;
  const rowPitch = farmDepth / rows;
  const plotDepth = rowPitch - 0.78;
  const plots = [];

  for (const [column, x] of columnStarts.entries()) {
    for (let row = 0; row < rows; row++) {
      const id = column * rows + row + 1;
      const zoneNumber = String(Math.ceil(id / 2)).padStart(2, '0');
      const left = (x + farmWidth / 2) / farmWidth;
      const right = left + plotWidth / farmWidth;
      const top = row * rowPitch / farmDepth;
      const bottom = top + plotDepth / farmDepth;
      plots.push({
        id,
        name: '地块' + String(id).padStart(2, '0'),
        state: id === 19 || id === 20 ? 'unplanted' : 'planted',
        crop: '',
        zoneId: 'irrigation-' + zoneNumber,
        zoneName: '灌区 ' + zoneNumber,
        polygon: [[left, top], [right, top], [right, bottom], [left, bottom]],
        center: [(left + right) / 2, (top + bottom) / 2]
      });
    }
  }

  // Four demonstration devices from the map prototype. The 3D scene does
  // not supply surveyed positions or plot IDs for these devices.
  const placements = [
    {type: 'jiangrun', plotId: 3, offset: 0.20},
    {type: 'venturi', plotId: 15, offset: 0.80},
    {type: 'injection', plotId: 9, offset: 0.20},
    {type: 'valve', plotId: 22, offset: 0.80}
  ];
  const devices = placements.map(({type, plotId, offset}) => {
    const plot = plots[plotId - 1];
    const [[left], [right]] = plot.polygon;
    return {type, plotId, point: [left + (right - left) * offset, plot.center[1]]};
  });

  // Use the same layout with any satellite viewport. Corners run clockwise
  // from the top left in the destination coordinate system.
  function project([u, v], [tl, tr, br, bl]) {
    return tl.map((coordinate, axis) =>
      (coordinate * (1 - u) + tr[axis] * u) * (1 - v)
      + (bl[axis] * (1 - u) + br[axis] * u) * v
    );
  }

  window.FarmMapPlots = {plots, devices, project};
})();
