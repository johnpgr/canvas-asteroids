import { Vector2 } from "./math";
import { exhaustive, getRng, prngIntInRange, registerKey, unreachable } from "./utils";
import { PRNG } from "seedrandom";

const ASTEROID_COUNT = 20;
const PI = Math.PI;
const TAU = PI * 2;
const FACTOR = 256;
const GAME_SIZE = new Vector2(4 * FACTOR, 3 * FACTOR);
const THICKNESS = 2.0;
const SCALE = 32;
const TURN_SPEED = 0.8;
const MOVE_SPEED = 5;
const ASTEROID_SPEED = 1.0;
const DRAG = 0.015;
const FONT_STYLE = "16px monospace";
const COLOR = "#fff";
const BACKGROUND_COLOR = "#000";

class Asteroid {
    constructor(
        public size: Asteroid.Size,
        public pos: Vector2,
        public vel: Vector2,
        public rot: number,
        public shape: Vector2[],
    ) {}

    static randomSize(rng: PRNG): Asteroid.Size {
        return rng() > 0.3 ? Asteroid.Size.BIG : rng() > 0.6 ? Asteroid.Size.MEDIUM : Asteroid.Size.SMALL;
    }

    static randomShape(rng: PRNG): Vector2[] {
        const n = prngIntInRange(rng, 8, 15);
        return Array.from({
            length: n,
        }).map((_, i) => {
            let radius = 0.3 + 0.2 * rng();
            if (rng() < 0.2) {
                radius -= 0.15;
            }
            const angle = i * (TAU / n) + PI * 0.125 * rng();
            return new Vector2().setAngle(angle).scale(radius);
        });
    }
}

namespace Asteroid {
    export enum Size {
        SMALL = SCALE * 0.8,
        MEDIUM = SCALE * 1.5,
        BIG = SCALE * 2.5,
    }
}

class Ship {
    pos: Vector2;
    vel: Vector2;
    rot: number;
    movingForward: boolean;
    turning: {
        left: boolean;
        right: boolean;
    };
    died_at: number;

    get dead(): boolean {
        return this.died_at !== -1;
    }

    constructor() {
        this.pos = GAME_SIZE.clone().scale(0.5);
        this.vel = new Vector2();
        this.rot = 0;
        this.movingForward = false;
        this.turning = {
            left: false,
            right: false,
        };
        this.died_at = -1;
    }

    reset() {
        this.pos = GAME_SIZE.clone().scale(0.5);
        this.vel = new Vector2();
        this.rot = 0;
        this.movingForward = false;
        this.turning.left = false;
        this.turning.right = false;
        this.died_at = -1;
    }
}

class BaseParticle {
    pos: Vector2;
    vel: Vector2;
    ttl: number;

    constructor(pos: Vector2, vel: Vector2, ttl: number) {
        this.pos = pos;
        this.vel = vel;
        this.ttl = ttl;
    }
}

class LineParticle extends BaseParticle {
    rot: number;
    length: number;

    constructor(pos: Vector2, vel: Vector2, ttl: number, rot: number, length: number) {
        super(pos, vel, ttl);
        this.rot = rot;
        this.length = length;
    }
}

class DotParticle extends BaseParticle {
    radius: number;

    constructor(pos: Vector2, vel: Vector2, ttl: number, radius: number) {
        super(pos, vel, ttl);
        this.radius = radius;
    }
}

type Particle = LineParticle | DotParticle;

class State {
    seed: string;
    rng: PRNG;
    timestamp: number;
    deltaTime: number;
    ship: Ship;
    asteroids: Set<Asteroid>;
    particles: Set<Particle>;

    constructor(seed: string) {
        this.seed = seed;
        this.rng = getRng(seed);
        this.timestamp = 0;
        this.deltaTime = 0;
        this.ship = new Ship();
        this.asteroids = new Set();
        this.initAsteroids(10);
        this.particles = new Set();
    }

    reset() {
        this.seed = String(Math.random());
        this.rng = getRng(this.seed);
        this.ship.reset();
        this.initAsteroids(ASTEROID_COUNT);
        this.particles.clear();
    }

    initAsteroids(asteroidCount: number) {
        this.asteroids.clear();

        for (let i = 0; i < asteroidCount; i++) {
            const size = Asteroid.randomSize(this.rng);
            const shape = Asteroid.randomShape(this.rng);
            const pos = new Vector2(Math.random() * GAME_SIZE.x, Math.random() * GAME_SIZE.y);
            const vel = new Vector2();
            const rot = this.rng() * prngIntInRange(this.rng, 1, 9);

            this.asteroids.add(new Asteroid(size, pos, vel, rot, shape));
        }
    }

    update(timestamp: number, deltaTime: number) {
        this.timestamp = timestamp;
        this.deltaTime = deltaTime;
        this.updateShip();
        this.asteroids.forEach(this.updateAsteroid.bind(this));
        this.particles.forEach(this.updateParticle.bind(this));
    }

    private updateShip() {
        if (this.ship.dead) return;

        const dirAngle = this.ship.rot + Math.PI * 0.5;
        const direction = new Vector2().setAngle(dirAngle);

        if (this.ship.turning.left) {
            this.ship.rot -= this.deltaTime * Math.PI * 2 * TURN_SPEED;
        }
        if (this.ship.turning.right) {
            this.ship.rot += this.deltaTime * Math.PI * 2 * TURN_SPEED;
        }
        if (this.ship.movingForward) {
            this.ship.vel.add(direction.scale(MOVE_SPEED * this.deltaTime));
        }

        this.ship.vel.scale(1 - DRAG);
        this.ship.pos.sub(this.ship.vel); // sub to move forward idk the ship is inverted
        this.ship.pos.mod(GAME_SIZE);
    }

    private updateAsteroid(a: Asteroid) {
        const dirAngle = a.rot + Math.PI * 0.5;
        const direction = new Vector2().setAngle(dirAngle);
        a.vel.add(direction.scale(ASTEROID_SPEED * this.deltaTime));
        a.vel.scale(1 - DRAG);
        a.pos.add(a.vel);
        a.pos.mod(GAME_SIZE);

        this.checkAsteroidCollision(a);
    }

    private checkAsteroidCollision(a: Asteroid) {
        if (!this.ship.dead && a.pos.distanceTo(this.ship.pos) < a.size) {
            this.ship.died_at = this.timestamp;
            for (let i = 0; i < 4; i++) {
                const angle = TAU * this.rng.quick();
                const pos = this.ship.pos.clone().add(new Vector2(this.rng.quick() * 3, this.rng.quick() * 3));
                const vel = new Vector2().setAngle(angle).scale(0.3 * this.rng.quick());
                const ttl = 1.0 + i + this.rng.quick();
                const rot = TAU * this.rng.quick();
                const length = SCALE * (0.6 + 0.4 * this.rng.quick());
                this.particles.add(new LineParticle(pos, vel, ttl, rot, length));
            }
        }
    }

    private updateParticle(p: Particle) {
        p.pos.add(p.vel);
        p.pos.mod(GAME_SIZE);

        if (p.ttl > this.deltaTime) {
            p.ttl -= this.deltaTime;
        } else {
            this.particles.delete(p);
        }
    }
}

class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    state: State;
    fps = 0;
    lastFpsUpdate = 0;
    paused = false;

    constructor(state: State) {
        this.canvas = document.querySelector("#game") ?? unreachable("Game canvas element not found.");
        this.ctx = this.canvas.getContext("2d") ?? unreachable("2d context not supported.");
        this.state = state;
        this.canvas.width = GAME_SIZE.x;
        this.canvas.height = GAME_SIZE.y;
    }

    render(timestamp: number, deltaTime: number) {
        this.drawBackground(BACKGROUND_COLOR);
        this.drawShip(timestamp);
        this.state.asteroids.forEach((asteroid) => this.drawAsteroid(asteroid));
        this.state.particles.forEach((particle) => this.drawParticle(particle));
    }

    private drawDebug(deltaTime: number, updateMs = 100) {
        const fps = 1 / deltaTime;
        const currentTime = performance.now();

        if (currentTime - this.lastFpsUpdate >= updateMs) {
            this.fps = fps;
            this.lastFpsUpdate = currentTime;
        }

        const textFps = `FPS: ${this.fps.toFixed(0)}`;
        const textPos = `Pos: x ${this.state.ship.pos.x.toFixed(2)} y ${this.state.ship.pos.y.toFixed(2)}`;
        const textVel = `Vel: x ${this.state.ship.vel.x.toFixed(2)} y ${this.state.ship.vel.y.toFixed(2)}`;
        const textRot = `Rot: ${this.state.ship.rot.toFixed(2)}`;
        const textMoving = `Moving: forward ${this.state.ship.movingForward}`;
        const textTurning = `Turning: left ${this.state.ship.turning.left} right ${this.state.ship.turning.right}`;
        this.drawText(textFps, new Vector2(10, 20), FONT_STYLE, COLOR);
        this.drawText(textPos, new Vector2(10, 40), FONT_STYLE, COLOR);
        this.drawText(textVel, new Vector2(10, 60), FONT_STYLE, COLOR);
        this.drawText(textRot, new Vector2(10, 80), FONT_STYLE, COLOR);
        this.drawText(textMoving, new Vector2(10, 100), FONT_STYLE, COLOR);
        this.drawText(textTurning, new Vector2(10, 120), FONT_STYLE, COLOR);
    }

    private drawAsteroid(a: Asteroid) {
        this.drawLines(a.pos, a.size, 0.0, COLOR, THICKNESS, ...a.shape);
    }

    private drawParticle(p: Particle) {
        if (p instanceof LineParticle) {
            this.drawLines(p.pos, p.length, p.rot, COLOR, THICKNESS, new Vector2(-0.5, 0), new Vector2(0.5, 0));
        } else if (p instanceof DotParticle) {
            this.drawCircleFill(p.pos, p.radius, COLOR);
        } else {
            exhaustive(p);
        }
    }

    private drawShip(timestamp: number) {
        if (this.state.ship.dead) return;

        this.drawLines(
            this.state.ship.pos,
            SCALE,
            this.state.ship.rot,
            COLOR,
            THICKNESS,
            new Vector2(0, -0.5),
            new Vector2(0.3, 0.3),
            new Vector2(0.1, 0.1),
            new Vector2(-0.1, 0.1),
            new Vector2(-0.3, 0.3),
        );
        if (this.state.ship.movingForward && (timestamp * 10) % 2 === 0) {
            this.drawLines(
                this.state.ship.pos,
                SCALE,
                this.state.ship.rot,
                COLOR,
                THICKNESS,
                new Vector2(-0.1, 0.2),
                new Vector2(0.0, 0.5),
                new Vector2(0.1, 0.2),
            );
        }
    }

    private drawBackground(color: string) {
        this.drawRectFill(new Vector2(0, 0), this.canvas.width, this.canvas.height, color);
    }

    private drawLines(
        origin: Vector2,
        scale: number,
        rotation: number,
        strokeStyle: string,
        lineWidth: number,
        ...points: Vector2[]
    ) {
        const transform = (p: Vector2) => p.clone().rotate(rotation).scale(scale).add(origin);

        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        for (let i = 0; i < points.length; i++) {
            const from = points[i]!;
            const to = points[(i + 1) % points.length]!;
            this.drawLine(transform(from), transform(to), lineWidth, strokeStyle);
        }
        this.ctx.restore();
    }

    private drawLine(from: Vector2, to: Vector2, lineWidth: number, strokeStyle: string) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawRectFill(topLeft: Vector2, width: number, height: number, fillStyle: string) {
        this.ctx.save();
        this.ctx.fillStyle = fillStyle;
        this.ctx.fillRect(topLeft.x, topLeft.y, width, height);
        this.ctx.restore();
    }

    private drawCircleFill(center: Vector2, radius: number, fillStyle: string) {
        this.ctx.save();
        this.ctx.fillStyle = fillStyle;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, TAU);
        this.ctx.fill();
        this.ctx.restore();
    }

    private drawText(text: string, position: Vector2, font: string, fillStyle: string) {
        this.ctx.save();
        this.ctx.fillStyle = fillStyle;
        this.ctx.font = font;
        this.ctx.fillText(text, position.x, position.y);
        this.ctx.restore();
    }
}

function main() {
    console.log("Hello, World!");
    let previousTimestamp = 0;
    const seed = String(Math.random());
    const state = new State(seed);
    const game = new Game(state);

    registerKey("KeyW", (down) => {
        game.state.ship.movingForward = down;
    });
    registerKey("KeyA", (down) => {
        game.state.ship.turning.left = down;
    });
    registerKey("KeyD", (down) => {
        game.state.ship.turning.right = down;
    });

    const frame = (timestamp: number) => {
        if (game.paused) return;
        const dt = (timestamp - previousTimestamp) / 1000;
        previousTimestamp = timestamp;
        state.update(timestamp, dt);
        if (state.ship.dead) {
            state.particles.forEach((p) => (p.ttl = Math.max(0, p.ttl - dt)));
            if (timestamp - state.ship.died_at > 3.0 * 1000) state.reset();
        }
        game.render(timestamp, dt);
        requestAnimationFrame(frame);
    };

    window.addEventListener("blur", () => {
        game.paused = true;
        requestAnimationFrame(frame);
    });
    window.addEventListener("focus", () => {
        game.paused = false;
        requestAnimationFrame(frame);
    });

    //@ts-expect-error ok
    window.DEBUG = function () {
        console.log(game);
        console.log(state);
    };
}

main();
