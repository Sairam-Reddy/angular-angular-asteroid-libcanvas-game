/* Stones */

/** @class Ast.Stones.Set */

declare var atom: any;
declare('Ast.Stones.Set', {
  initialize: function (registry, color) {
    this.color = color;
    this.image = registry.image;
    this.map = registry.map[color];
  },

  /** @private */
  getLimits: function (size) {
    if (size < 0 || size >= this.map.length) {
      throw new RangeError('No such size: ' + size);
    }

    return this.map[size].random;
  },

  getImage: function (size) {
    return this.image.sprite(this.getLimits(size));
  },
});
