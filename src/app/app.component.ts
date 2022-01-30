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

    /* Controller */
    /** @class Ast.Controller */
    atom.declare('Ast.Controller', {
      settings: {
        showShapes: true,
        fieldSize: new Size(800, 500),
        boundsSize: new Size(64, 64),
      },

      initialize: function () {
        this.settings = new Settings(this.settings);

        atom.ImagePreloader.run(
          {
            explosion:
              'https://libcanvas.github.io/games/asteroids/im/explosion.png',
            debris:
              'https://libcanvas.github.io/games/asteroids/im/explosion-debris.png',
            ships: 'https://libcanvas.github.io/games/asteroids/im/ships.png',
            shot: 'https://libcanvas.github.io/games/asteroids/im/shot.png',
            stones: 'https://libcanvas.github.io/games/asteroids/im/stones.png',
          },
          this.run,
          this
        );

        this.fpsMeter();
      },

      fpsMeter: function () {
        var fps = atom.trace(),
          time = [],
          last = Date.now();

        atom.frame.add(function () {
          if (time.length > 5) time.shift();

          time.push(Date.now() - last);
          last = Date.now();

          fps.value = Math.ceil(1000 / time.average()) + ' FPS';
        });
      },

      get randomFieldPoint() {
        return this.fieldRectangle.getRandomPoint(50);
      },

      run: function (images) {
        this.collisions = new Ast.Collisions(this);

        atom.frame.add(this.collisions.update);

        this.fieldRectangle = new Rectangle({
          from: new Point(0, 0),
          size: this.settings.get('fieldSize'),
        });

        this.sounds = new Ast.Sounds(
          '//libcanvas.github.io/games/asteroids/sounds/'
        );

        this.astBelt = new Ast.Belt(this, images);
        this.shipSheets = this.createShipSheets(images.get('ships'));
        this.explosionSheet = new Animation.Sheet({
          frames: new Animation.Frames(images.get('explosion'), 150, 125),
          delay: 30,
        });

        this.createLayers(this.settings.get('fieldSize'), images);

        this.ships = [
          new Ast.Ship(this.layer, {
            type: Number.random(0, 1),
            manipulator: new Ast.Manipulator(Ast.Manipulator.defaultSets[0]),
            controller: this,
            shape: new Circle(this.randomFieldPoint, 25),
          }),
        ];

        this.collisions.add(this.ships[0]);

        this.collisions.createAsteroids();
      },

      createLayers: function (size, images) {
        this.app = new App({
          size: size,
          simple: true,
        });

        this.layer = this.app.createLayer({
          intersection: 'all',
          invoke: true,
        });

        this.layer.dom.element.css({
          background:
            'url(https://libcanvas.github.io/games/asteroids/im/stars.jpg)',
        });

        this.app.resources.set('images', images);
      },

      createShipSheets: function (image) {
        var length = 9,
          frames = new Animation.Frames(image, 40, 40);

        return [0, length].map(function (start) {
          return new Animation.Sheet({
            sequence: Array.range(start, start + length - 1),
            frames: frames,
            looped: true,
            delay: 50,
          });
        });
      },
    });
    /* Controller */

    /* Collisions  */

    /** @class Ast.Collisions */
    declare('Ast.Collisions', {
      initialize: function (controller) {
        this.bindMethods('update');

        this.controller = controller;
        this.ships = [];
        this.bullets = [];
        this.asteroids = [];
      },

      /** @private */
      getArray: function (item) {
        var a =
          item instanceof Ast.Asteroid
            ? this.asteroids
            : item instanceof Ast.Bullet
            ? this.bullets
            : item instanceof Ast.Ship
            ? this.ships
            : null;

        if (a == null) throw new TypeError('unknown type of ' + item);

        return a;
      },

      add: function (item) {
        this.getArray(item).push(item);
        return this;
      },

      remove: function (item) {
        this.getArray(item).erase(item);
        return this;
      },

      update: function () {
        this.shipsAsteroids();
        this.bulletsAsteroids();
      },
      shipsAsteroids: function () {
        var s,
          a,
          ship,
          ast = this.asteroids;

        for (s = this.ships.length; s--; ) {
          ship = this.ships[s];

          if (!ship.invulnerable)
            for (a = ast.length; a--; ) {
              if (ship.shape.intersect(ast[a].shape)) {
                ship.explode();
                break;
              }
            }
        }
      },
      createAsteroids: function () {
        [0, 1, 2, 3].map(
          function () {
            return this.controller.astBelt.createAsteroid();
          }.bind(this)
        );
      },
      bulletsAsteroids: function () {
        var b,
          a,
          bullet,
          ast = this.asteroids;

        for (b = this.bullets.length; b--; ) {
          bullet = this.bullets[b];

          for (a = ast.length; a--; ) {
            if (ast[a].shape.hasPoint(bullet.position)) {
              bullet.hit(ast[a]);
              break;
            }
          }
        }

        if (this.asteroids.length < 3) {
          this.ships.invoke('makeInvulnerable');
          this.createAsteroids();
        }
        return this;
      },
    });
    /* Collisions  */

    /* Manipulator */
    /** @class Ast.Manipulator */
    declare('Ast.Manipulator', {
      keys: {
        forward: '',
        backward: '',
        left: '',
        right: '',
        shoot: '',
      },

      states: {},

      owner: null,

      initialize: function (keys) {
        this.keyboard = new atom.Keyboard();
        if (Array.isArray(keys)) {
          keys = keys.associate('forward backward left right shoot'.split(' '));
        }
        this.keys = keys;
      },

      setOwner: function (owner) {
        this.owner = owner;
        return this;
      },

      /** @private */
      stateChange: function (state, callback, status, e) {
        if (this.states[state] == null) this.states[state] = false;
        if (this.states[state] == status) return;

        this.states[state] = status;

        callback.call(this.owner);
        e.preventDefault();
      },

      setStates: function (states) {
        var state;

        for (state in states)
          if (states.hasOwnProperty(state)) {
            this.keyboard.events
              .add(
                this.keys[state],
                this.stateChange.bind(this, state, states[state][0], true)
              )
              .add(
                this.keys[state] + ':up',
                this.stateChange.bind(this, state, states[state][1], false)
              );
          }
        return this;
      },
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

    /* Bomber  */
    /** @class Ast.Bomber */
    declare('Ast.Bomber', {});
    /* Bomber  */

    /** @class Ast.Explosion */
    declare('Ast.Explosion', App.Element, {
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
    /* Explosion */

    /** @class Ast.Flying */
    declare('Ast.Flying', App.Element, {
      angle: 0,
      angleShift: 0,
      rotateSpeed: 0,
      speed: 0,
      color: 'red',

      hidden: false,

      configure: function () {
        this.position = this.shape.center;
      },

      get globalSettings() {
        return this.controller.settings;
      },

      get controller() {
        return this.settings.get('controller');
      },

      rotate: function (change, reverse) {
        if (!change) return this;

        if (reverse) change *= -1;
        this.angle = (this.angle + change).normalizeAngle();
        this.redraw();
        return this;
      },

      impulse: function (pos, reverse) {
        this.redraw();
        this.position.move(pos, reverse);
        this.checkBounds();
        return this;
      },

      getVelocity: function (withoutShift) {
        var angle = this.angle;
        if (!withoutShift) angle += this.angleShift;
        return new Point(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        );
      },

      getRandomAngle: function () {
        return Number.random(0, 360).degree();
      },

      /** @private */
      checkBounds: function () {
        var pos = this.position,
          gSet = this.globalSettings,
          field = gSet.get('fieldSize'),
          bounds = gSet.get('boundsSize'),
          impulse = new Point(0, 0);

        if (pos.x > field.width + bounds.x / 2) {
          impulse.x = -(field.width + bounds.x);
        } else if (pos.x < -bounds.x / 2) {
          impulse.x = field.width + bounds.x;
        }
        if (pos.y > field.height + bounds.y / 2) {
          impulse.y = -(field.height + bounds.y);
        } else if (pos.y < -bounds.y / 2) {
          impulse.y = field.height + bounds.y;
        }
        this.position.move(impulse);
        return this;
      },

      get currentBoundingShape() {
        return this.shape.getBoundingRectangle().grow(8).fillToPixel();
      },

      stop: function () {
        this.velocity.set(0, 0);
        return this;
      },

      onUpdate: function (time) {
        time /= 1000;

        this.rotate(this.rotateSpeed * time);
        this.impulse(this.getVelocity().mul(time));
      },

      renderTo: function (ctx) {
        if (this.hidden || !this.globalSettings.get('showShapes')) return;

        ctx
          .save()
          .clip(this.currentBoundingShape)
          .stroke(this.shape, this.color)
          .stroke(
            new Line(
              this.position,
              this.position.clone().move(this.getVelocity(true))
            ),
            this.color
          )
          .restore();
      },
    });
    /* Flying */

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

    /** @class Ast.Asteroid */
    declare('Ast.Asteroid', Ast.Flying, {
      speed: 40,

      configure: function method() {
        method.previous.call(this);
        this.rotateSpeed = Number.random(3, 12).degree();
        this.angle = this.getRandomAngle();
        this.angleShift = this.getRandomAngle();
      },

      die: function () {
        this.destroy();
        this.events.fire('die', [this]);
      },

      renderTo: function method(ctx, resources) {
        method.previous.call(this, ctx, resources);

        ctx.drawImage({
          image: this.settings.get('image'),
          center: this.shape.center,
          angle: this.angle,
        });
      },
    });
    /* Asteroid */

    /** @class Ast.Bullet */
    declare('Ast.Bullet', Ast.Flying, {
      zIndex: 2,
      speed: 300,

      configure: function method() {
        method.previous.call(this);

        this.controller.sounds.play('shot');

        this.angle = this.settings.get('angle');
      },

      checkBounds: function () {
        var pos = this.position,
          gSet = this.globalSettings,
          field = gSet.get('fieldSize'),
          bounds = gSet.get('boundsSize');

        if (
          pos.x > field.width + bounds.x / 2 ||
          pos.x < -bounds.x / 2 ||
          pos.y > field.height + bounds.y / 2 ||
          pos.y < -bounds.y / 2
        )
          this.die();

        return this;
      },

      hit: function (ast) {
        new Ast.Explosion(this.layer, {
          controller: this.controller,
          shape: new Circle(this.position, 80),
          sheet: this.controller.explosionSheet,
        });
        ast.die();
        this.die();
      },

      die: function () {
        this.controller.collisions.remove(this);
        this.destroy();
      },

      renderTo: function method(ctx, resources) {
        method.previous.call(this, ctx, resources);

        ctx.save();

        ctx.clip(this.shape);

        ctx.drawImage({
          image: resources.get('images').get('shot'),
          center: this.shape.center,
          angle: this.angle,
        });

        ctx.restore();
      },
    });
    /* Bullet */

    /** @class Ast.Belt */
    declare('Ast.Belt', {
      count: 0,

      initialize: function (controller, images) {
        this.bindMethods('asteroidDie');

        this.stonesRegistry = new Ast.Stones.Registry(
          images.get('stones')
        ).defaultMarkup();
        this.controller = controller;
      },

      asteroidDie: function (ast) {
        var children = 3,
          set = ast.settings.get('set'),
          size = ast.settings.get('size');

        if (size < 2)
          while (children--) {
            this.createAsteroid(ast.position.clone(), size + 1, set);
          }

        ast.events.remove('die', this.asteroidDie);
        this.controller.collisions.remove(ast);
      },

      createAsteroid: function (point, size, set) {
        if (!set) set = this.stonesRegistry.getRandomSet();
        if (!size) size = 0;

        var ast = new Ast.Asteroid(this.controller.layer, {
          zIndex: 1 + this.count++ / 10000000,
          controller: this.controller,
          shape: new Circle(
            point || this.controller.randomFieldPoint,
            [40, 26, 15][size]
          ),
          size: size,
          set: set,
          image: set.getImage(size),
        });

        this.controller.collisions.add(ast);

        ast.events.add('die', this.asteroidDie);

        return ast;
      },
    });
    /* Belt */

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
