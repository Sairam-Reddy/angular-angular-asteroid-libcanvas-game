export class AsteroidStonesRegistry {
  public image;
  public map;
  public currentSize;

  public initialize(image) {
    this.image = image;
    this.map = {};
  }

  /** @returns {Ast.Stones.Set} */
  public getRandomSet() {
    return new Ast.Stones.Set(this, Object.keys(this.map).random);
  }

  /** @returns {Ast.Stones.Registry} */
  public defaultMarkup() {
    return this.color('yellow')
      .size(0)
      .add([2, 4, 70, 64])
      .add([83, 6, 53, 60])
      .size(1)
      .add([2, 85, 32, 37])
      .add([40, 83, 44, 41])
      .add([91, 82, 45, 42])
      .size(2)
      .add([2, 138, 23, 23])
      .add([31, 137, 26, 28])
      .add([62, 138, 30, 24])
      .add([97, 140, 23, 20])
      .add([126, 142, 18, 18])
      .color('cyan')
      .size(0)
      .add([147, 3, 69, 69])
      .add([241, 8, 55, 55])
      .size(1)
      .add([144, 82, 47, 44])
      .add([196, 86, 41, 39])
      .add([243, 72, 52, 52])
      .size(2)
      .add([156, 141, 26, 19])
      .add([194, 140, 20, 21])
      .add([224, 142, 18, 19])
      .add([251, 140, 17, 20])
      .add([280, 141, 18, 19]);
  }

  /** @returns {Ast.Stones.Registry} */
  public color(color) {
    this.currentColor = color;
    return this.ensureArray(this.map, color);
  }

  /** @returns {Ast.Stones.Registry} */
  public size(size) {
    this.currentSize = size;
    return this.ensureArray(this.map[this.currentColor], size);
  }

  /** @returns {Ast.Stones.Registry} */
  public add(size) {
    this.map[this.currentColor][this.currentSize].push(new Rectangle(size));
    return this;
  }

  /** @private */
  public ensureArray(map, key) {
    if (!map[key]) map[key] = [];
    return this;
  }
}
