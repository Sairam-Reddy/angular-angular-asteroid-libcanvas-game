import { Component, VERSION } from '@angular/core';

declare var atom: any;
declare var LibCanvas: any;

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  loadAPI: Promise<any>;

  constructor() {
    this.loadAPI = new Promise((resolve) => {
      this.loadScript();
      resolve(true);
    });
  }

  public loadScript() {
    var isFound = false;
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; ++i) {
      if (
        scripts[i].getAttribute('src') != null &&
        (scripts[i].getAttribute('src').includes('atomjs') ||
          scripts[i].getAttribute('src').includes('libcanvas'))
      ) {
        isFound = true;
      }
    }

    if (!isFound) {
      const dynamicScripts = [
        'https://cdn.rawgit.com/theshock/atomjs/master/atom-full-compiled.js',
        'https://cdn.rawgit.com/theshock/libcanvas/master/libcanvas-full-compiled.js',
      ];

      for (var i = 0; i < dynamicScripts.length; i++) {
        let node = document.createElement('script');
        node.src = dynamicScripts[i];
        node.type = 'text/javascript';
        node.async = false;
        node.charset = 'utf-8';
        document.getElementsByTagName('head')[0].appendChild(node);
      }
    }
  }

  private initialise(): void {
    // window.declare = atom.declare;
    // window.Settings = atom.Settings;

    atom.patching(window);
    LibCanvas.extract();

    atom.dom(function () {
      new Ast.Controller();
    });

    

   

   

    Ast.Manipulator.defaultSets = [
      'aup adown aleft aright ctrl'.split(' '),
      'w s a d shift'.split(' '),
    ];
    /* Manipulator */

    /* Stones */

    /** @class Ast.Stones.Set */
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

    /** @class Ast.Stones.Registry */
    declare('Ast.Stones.Registry', {
      initialize: function (image) {
        this.image = image;
        this.map = {};
      },

      /** @returns {Ast.Stones.Set} */
      getRandomSet: function () {
        return new Ast.Stones.Set(this, Object.keys(this.map).random);
      },

      /** @returns {Ast.Stones.Registry} */
      defaultMarkup: function () {
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
      },

      /** @returns {Ast.Stones.Registry} */
      color: function (color) {
        this.currentColor = color;
        return this.ensureArray(this.map, color);
      },

      /** @returns {Ast.Stones.Registry} */
      size: function (size) {
        this.currentSize = size;
        return this.ensureArray(this.map[this.currentColor], size);
      },

      /** @returns {Ast.Stones.Registry} */
      add: function (size) {
        this.map[this.currentColor][this.currentSize].push(new Rectangle(size));
        return this;
      },

      /** @private */
      ensureArray: function (map, key) {
        if (!map[key]) map[key] = [];
        return this;
      },
    });
    /* Stones */

   

   

    /** @name Ast.Explosion.Debris */
    atom.declare('Ast.Explosion.Debris', App.Element, {
      zIndex: 7,
      angle: 0,

      configure: function () {
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
      },

      renderTo: function (ctx, resources) {
        ctx.drawImage({
          image: resources.get('images').get('debris'),
          center: this.shape.center,
          angle: this.angle,
        });
      },
    });
    

   

    /** @class Ast.Ship */
    declare('Ast.Ship', Ast.Flying, {
      zIndex: 3,
      acceleration: 0,
      friction: 0.99,
      rateOfFire: 0.4,
      isShoot: false,
      invulnerable: 0,

      gradColors: [
        {
          '0.0': 'rgba(0,0,0,0.0)',
          '0.4': 'rgba(255,255,0,0.0)',
          '0.8': 'rgba(255,0,0,0.5)',
          '1.0': 'rgba(255,0,0,0.0)',
        },
        {
          '0.0': 'rgba(0,0,0,0.0)',
          '0.4': 'rgba(0,255,255,0.0)',
          '0.8': 'rgba(0,0,255,0.5)',
          '1.0': 'rgba(0,0,255,0.0)',
        },
      ],

      configure: function method() {
        method.previous.call(this);

        this.angle = this.getRandomAngle();
        this.inner = new Circle(this.shape.center, 5);

        this.animatable = new atom.Animatable(this);

        this.animation = new Animation({
          sheet: this.controller.shipSheets[this.settings.get('type')],
          onUpdate: this.redraw,
        });

        this.settings.get('manipulator').setOwner(this).setStates(this.states);

        this.makeInvulnerable();
      },

      states: {
        forward: [
          function () {
            this.acceleration += 3;
          },
          function () {
            this.acceleration -= 3;
          },
        ],
        backward: [
          function () {
            this.acceleration -= 2;
          },
          function () {
            this.acceleration += 2;
          },
        ],
        left: [
          function () {
            this.rotateSpeed -= (90).degree();
          },
          function () {
            this.rotateSpeed += (90).degree();
          },
        ],
        right: [
          function () {
            this.rotateSpeed += (90).degree();
          },
          function () {
            this.rotateSpeed -= (90).degree();
          },
        ],
        shoot: [
          function () {
            this.isShoot = true;
          },
          function () {
            this.isShoot = false;
          },
        ],
      },

      lastShot: 0,

      onUpdate: function method(ctx) {
        this.updateSpeed();

        method.previous.call(this, ctx);

        if (this.isShoot) this.shoot();
      },

      explode: function () {
        new Ast.Explosion(this.layer, {
          controller: this.controller,
          shape: new Circle(this.shape.center.clone(), 80),
          sheet: this.controller.explosionSheet,
        });
        this.shape.center.set(this.controller.randomFieldPoint);
        this.makeInvulnerable();
      },

      makeInvulnerable: function () {
        this.animatable.stop(true);
        this.invulnerable = 1;
        this.animatable.animate({
          fn: 'expo-in',
          time: 3000,
          props: {
            invulnerable: 0,
          },
          onTick: this.redraw,
        });
      },

      shoot: function () {
        var now = +Date.now();
        if (now > this.lastShot + this.rateOfFire * 1000) {
          this.lastShot = now;

          this.controller.collisions.add(
            new Ast.Bullet(this.controller.layer, {
              controller: this.controller,
              shape: new Circle(this.position.clone(), 75),
              angle: this.angle,
            })
          );
        }
      },

      updateSpeed: function () {
        var speed = this.speed;
        if (this.acceleration) {
          speed = (speed + this.acceleration).limit(-70, 100);
        } else {
          speed *= this.friction;
          if (speed > 5) {
            speed = Math.floor(speed);
          } else if (speed < -5) {
            speed = Math.ceil(speed);
          } else {
            speed = 0;
          }
        }
        this.speed = speed;
      },

      renderTo: function method(ctx) {
        method.previous.call(this, ctx);

        ctx.drawImage({
          image: this.animation.get(),
          center: this.shape.center,
          angle: this.angle,
        });

        if (this.invulnerable) {
          ctx.save();
          ctx.set({
            globalAlpha: this.invulnerable,
          });

          var gradient = ctx
            .createRadialGradient(this.inner, this.shape)
            .addColorStop(this.gradColors[this.settings.get('type')]);

          ctx.fill(this.shape, gradient);

          ctx.restore();
        }
      },
    });
    /* Ship */

   

    /** @class Ast.Sounds */
    declare('Ast.Sounds', {
      ext: null,
      map: null,
      sounds: null,
      prefix: '//libcanvas.github.io/games/asteroids/',

      initialize: function (prefix, map) {
        var elem = document.createElement('audio'),
          cpt = elem.canPlayType;
        // some bugs with audio in firefox
        if (cpt && navigator.userAgent.toLowerCase().indexOf('firefox') == -1) {
          if (cpt.call(elem, 'audio/ogg; codecs="vorbis"')) this.ext = 'ogg';
          else if (cpt.call(elem, 'audio/mpeg;')) this.ext = 'mp3';
        }

        this.prefix = prefix;
        this.map = map || {};
        this.sounds = {};
      },

      getFileName: function (name) {
        return this.prefix + (this.map[name] || name) + '.' + this.ext;
      },

      play: function (name) {
        if (!this.ext) return;

        var audio,
          sounds = this.sounds,
          i,
          max = null;

        if (!sounds[name]) sounds[name] = [];

        for (i = sounds[name].length; i--; ) {
          audio = sounds[name][i];
          if (audio.ended) break;
          audio = null;
        }

        if (!audio) {
          audio = document.createElement('audio');
          audio.src = this.getFileName(name);
          sounds[name].push(audio);
        }

        audio.volume = 1;
        audio.play();
      },
    });
    /* Sounds */
  }
}
