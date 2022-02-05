/* Explosion */

/** @class Ast.Explosion */
declare var atom: any;

atom.declare('Ast.Explosion', App.Element, {
  zIndex: 5,
  angle: 0,

  configure: function () {
    this.settings.get('controller').sounds.play('explosion');

    this.angle = Number.random(0, 360).degree();
    this.animation = new Animation({
      sheet: this.settings.get('sheet'),
      onUpdate: this.redraw,
      onStop: this.destroy,
    });

    for (var i = Number.random(5, 8); i--; ) {
      new Ast.Explosion.Debris(this.layer, {
        shape: new Circle(this.shape.center.clone(), 5),
      });
    }
  },

  renderTo: function (ctx) {
    var image = this.animation.get();

    if (image) {
      ctx.drawImage({
        image: image,
        center: this.shape.center,
        angle: this.angle,
      });
    }
  },
});
