export class AsteroidExplosionDebris {
  zIndex: 7;
  angle: 0;

  public configure() {
    this.angle = Number.random(1, 360).degree();

    new atom.Animatable(this).animate({
      time: 1500,
      props: {
        'shape.center.x': this.shape.center.x + Number.random(-200, 200),
        'shape.center.y': this.shape.center.y + Number.random(-200, 200),
        opacity: 0,
      },
      fn: 'circ-out',
      onTick: this.redraw,
      onComplete: this.destroy,
    });
  }

  public renderTo(ctx, resources) {
    ctx.drawImage({
      image: resources.get('images').get('debris'),
      center: this.shape.center,
      angle: this.angle,
    });
  }
}
