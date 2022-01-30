export class AsteroidStonesSet {
  public color;
  public image;
  public map;

  public initialize(registry, color) {
    this.color = color;
    this.image = registry.image;
    this.map = registry.map[color];
  }

  /** @private */
  public getLimits(size) {
    if (size < 0 || size >= this.map.length) {
      throw new RangeError('No such size: ' + size);
    }

    return this.map[size].random;
  }

  public getImage(size) {
    return this.image.sprite(this.getLimits(size));
  }
}
