import { Vector2 } from "./math";
import {
    exhaustive,
    getRng,
    prngIntInRange,
    registerKey,
    unreachable,
} from "./utils";
import { PRNG } from "seedrandom";

const PI = Math.PI;
const TAU = PI * 2;
const FACTOR = 256;
const GAME_SIZE = new Vector2(4 * FACTOR, 3 * FACTOR);
const THICKNESS = 2.0;
const SCALE = 32;
const DRAG = 0.015;
const FONT_STYLE = "bold 12px monospace";
const COLOR = "#fff";
const BACKGROUND_COLOR = "#000";
const TURN_SPEED = 0.8;
const MOVE_SPEED = 5;
const ASTEROID_SPEED = 1.0;
const PROJECTILE_SPEED = 0.2;
const MAX_PROJECTILES = 20;
const SHOOTING_RATE = 500; // 500ms
const ASTEROID_COUNT = 1;
const ASTEROID_HIT_COOLDOWN = 500; // 500ms

export enum AsteroidSize {
    SMALL = SCALE * 0.8,
    MEDIUM = SCALE * 1.5,
    BIG = SCALE * 2.5,
}

class Asteroid {
    static randomSize(rng: PRNG): AsteroidSize {
        return rng() > 0.3
            ? AsteroidSize.BIG
            : rng() > 0.6
                ? AsteroidSize.MEDIUM
                : AsteroidSize.SMALL;
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

    constructor(
        public size: AsteroidSize,
        public pos: Vector2,
        public vel: Vector2,
        public rot: number,
        public shape: Vector2[],
        public hitBy: Projectile | null = null,
    ) { }

    get collisionScale(): number {
        let scale: number;

        switch (this.size) {
            case AsteroidSize.BIG:
                scale = 0.55;
                break;
            case AsteroidSize.MEDIUM:
                scale = 0.65;
                break;
            case AsteroidSize.SMALL:
                scale = 1.0;
                break;
        }

        return scale;
    }

    get velocityScale(): number {
        let scale: number;

        switch (this.size) {
            case AsteroidSize.BIG:
                scale = 0.75;
                break;
            case AsteroidSize.MEDIUM:
                scale = 1.0;
                break;
            case AsteroidSize.SMALL:
                scale = 1.6;
                break;
        }

        return scale;
    }

    isColliding(pos: Vector2): boolean {
        return this.pos.distanceTo(pos) < this.size * this.collisionScale
    }
}

class Ship {
    constructor(
        public pos: Vector2 = GAME_SIZE.clone().scale(0.5),
        public vel: Vector2 = new Vector2(),
        public rot: number = 0,
        public shooting: boolean = false,
        public movingForward: boolean = false,
        public turning: { left: boolean; right: boolean } = {
            left: false,
            right: false,
        },
        public diedAt: number = -1,
    ) { }

    get dead(): boolean {
        return this.diedAt !== -1;
    }

    reset() {
        this.pos = GAME_SIZE.clone().scale(0.5);
        this.vel = new Vector2();
        this.rot = 0;
        this.movingForward = false;
        this.turning.left = false;
        this.turning.right = false;
        this.diedAt = -1;
    }
}

class BaseParticle {
    constructor(
        public pos: Vector2,
        public vel: Vector2,
        public ttl: number,
    ) { }
}

class LineParticle extends BaseParticle {
    constructor(
        pos: Vector2,
        vel: Vector2,
        ttl: number,
        public rot: number,
        public length: number,
    ) {
        super(pos, vel, ttl);
    }
}

class DotParticle extends BaseParticle {
    constructor(
        pos: Vector2,
        vel: Vector2,
        ttl: number,
        public radius: number,
    ) {
        super(pos, vel, ttl);
    }
}

type Particle = LineParticle | DotParticle;

class Projectile {
    constructor(
        public pos: Vector2,
        public vel: Vector2,
        public ttl: number,
    ) { }
}

class State {
    constructor(
        public seed: string,
        public rng: PRNG = getRng(seed),
        public timestamp: number = 0,
        public deltaTime: number = 0,
        public ship: Ship = new Ship(),
        public asteroids: Set<Asteroid> = new Set(),
        public particles: Set<Particle> = new Set(),
        public projectiles: Set<Projectile> = new Set(),
        private lastShotAt: number = 0,
    ) {
        this.initAsteroids(ASTEROID_COUNT);
    }

    reset() {
        this.seed = String(Math.random());
        this.rng = getRng(this.seed);
        this.ship.reset();
        this.initAsteroids(ASTEROID_COUNT);
        this.particles.clear();
        this.projectiles.clear();
    }

    initAsteroids(asteroidCount: number) {
        this.asteroids.clear();

        for (let i = 0; i < asteroidCount; i++) {
            const size = Asteroid.randomSize(this.rng);
            const shape = Asteroid.randomShape(this.rng);
            const pos = new Vector2(
                Math.random() * GAME_SIZE.x,
                Math.random() * GAME_SIZE.y,
            );
            const vel = new Vector2();
            const rot = this.rng() * prngIntInRange(this.rng, 1, 9);

            this.asteroids.add(new Asteroid(size, pos, vel, rot, shape));
        }
    }

    update(timestamp: number, deltaTime: number) {
        this.timestamp = timestamp;
        this.deltaTime = deltaTime;
        this.updateShip();
        if (this.ship.dead) {
            this.particles.forEach((p) => (p.ttl = Math.max(0, p.ttl - deltaTime)));
            if (timestamp - this.ship.diedAt > 3.0 * 1000) this.reset();
        }
        this.particles.forEach(this.updateParticle.bind(this));
        this.projectiles.forEach(this.updateProjectile.bind(this));
        this.asteroids.forEach(this.updateAsteroid.bind(this));
    }

    private updateShip() {
        if (this.ship.dead) return;

        const dirAngle = this.ship.rot - Math.PI * 0.5;
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
        if (this.ship.shooting) {
            if (this.timestamp - this.lastShotAt >= SHOOTING_RATE) this.shoot();
        }

        this.ship.vel.scale(1 - DRAG);
        this.ship.pos.add(this.ship.vel);
        this.ship.pos.mod(GAME_SIZE);
    }

    private shoot() {
        if (this.projectiles.size >= MAX_PROJECTILES) return
        this.lastShotAt = this.timestamp;
        const dirAngle = this.ship.rot - Math.PI * 0.5;
        const direction = new Vector2().setAngle(dirAngle);
        const pos = this.ship.pos.clone().add(direction.scale(SCALE / 3.0));
        const vel = direction.scale(PROJECTILE_SPEED);
        this.projectiles.add(new Projectile(pos, vel, 3.0));
    }

    private updateAsteroid(a: Asteroid) {
        const dirAngle = a.rot + Math.PI * 0.5;
        const direction = new Vector2().setAngle(dirAngle);
        a.vel.add(direction.scale(ASTEROID_SPEED * this.deltaTime));
        a.vel.scale(1 - DRAG);
        a.pos.add(a.vel);
        a.pos.mod(GAME_SIZE);
        if(a.hitBy && a.hitBy.ttl < this.deltaTime) a.hitBy = null;
        this.checkAsteroidCollision(a);
    }

    private checkAsteroidCollision(a: Asteroid) {
        if (
            !this.ship.dead &&
            a.isColliding(this.ship.pos)
        ) {
            this.ship.diedAt = this.timestamp;
            for (let i = 0; i < 4; i++) {
                const angle = TAU * this.rng.quick();
                const pos = this.ship.pos
                    .clone()
                    .add(
                        new Vector2(this.rng.quick() * 3, this.rng.quick() * 3),
                    );
                const vel = new Vector2()
                    .setAngle(angle)
                    .scale(0.3 * this.rng.quick());
                const ttl = 1.0 + i + this.rng.quick();
                const rot = TAU * this.rng.quick();
                const length = SCALE * (0.6 + 0.4 * this.rng.quick());
                this.particles.add(
                    new LineParticle(pos, vel, ttl, rot, length),
                );
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

    private updateProjectile(p: Projectile) {
        this.asteroids.forEach((a) => {
            if (a.isColliding(p.pos)) {
                if (!a.hitBy || a.hitBy !== p) {
                    switch (a.size) {
                        case AsteroidSize.BIG: a.size = AsteroidSize.MEDIUM; break
                        case AsteroidSize.MEDIUM: a.size = AsteroidSize.SMALL; break
                        case AsteroidSize.SMALL: this.asteroids.delete(a); break
                        default: exhaustive(a.size);
                    }
                    a.hitBy = p;
                }
            }
        });
        p.pos.add(p.vel);
        p.pos.mod(GAME_SIZE);
        if (p.ttl > this.deltaTime) {
            p.ttl -= this.deltaTime;
        } else {
            this.projectiles.delete(p);
        }
    }
}

class Game {
    constructor(
        public state: State,
        public canvas: HTMLCanvasElement,
        public ctx: CanvasRenderingContext2D,
        public fps: number = 0,
        public lastFpsUpdate: number = 0,
        public paused: boolean = false,
    ) { }

    render(timestamp: number, deltaTime: number) {
        this.drawBackground(BACKGROUND_COLOR);
        this.drawShip(timestamp);
        this.state.asteroids.forEach(this.drawAsteroid.bind(this));
        this.state.particles.forEach(this.drawParticle.bind(this));
        this.state.projectiles.forEach(this.drawProjectile.bind(this));
        this.drawDebug(deltaTime);
    }

    private drawDebug(deltaTime: number, updateMs = 100) {
        const fps = 1 / deltaTime;
        const currentTime = performance.now();

        if (currentTime - this.lastFpsUpdate >= updateMs) {
            this.fps = fps;
            this.lastFpsUpdate = currentTime;
        }

        const textFps = `FPS: ${this.fps.toFixed(0)}`;
        const textSeed = `Seed: ${this.state.seed}`
        const textPos = `Pos: x ${this.state.ship.pos.x.toFixed(2)} y ${this.state.ship.pos.y.toFixed(2)}`;
        const textVel = `Vel: x ${this.state.ship.vel.x.toFixed(2)} y ${this.state.ship.vel.y.toFixed(2)}`;
        const textRot = `Rot: ${this.state.ship.rot.toFixed(2)}`;
        const textMoving = `Moving forward: ${this.state.ship.movingForward}`;
        const textTurning = `Turning: left ${this.state.ship.turning.left} right ${this.state.ship.turning.right}`;
        const textShooting = `Shooting: ${this.state.ship.shooting}`
        const textDied = `Died: ${this.state.ship.diedAt}`
        this.drawText(textFps, new Vector2(5, 15), FONT_STYLE, COLOR);
        this.drawText(textSeed, new Vector2(5, 30), FONT_STYLE, COLOR);
        this.drawText(textPos, new Vector2(5, 45), FONT_STYLE, COLOR);
        this.drawText(textVel, new Vector2(5, 60), FONT_STYLE, COLOR);
        this.drawText(textRot, new Vector2(5, 75), FONT_STYLE, COLOR);
        this.drawText(textMoving, new Vector2(5, 90), FONT_STYLE, COLOR);
        this.drawText(textTurning, new Vector2(5, 105), FONT_STYLE, COLOR);
        this.drawText(textShooting, new Vector2(5, 120), FONT_STYLE, COLOR);
        this.drawText(textDied, new Vector2(5, 135), FONT_STYLE, COLOR);
    }

    private drawAsteroid(a: Asteroid) {
        this.drawLines(a.pos, a.size, 0.0, COLOR, THICKNESS, ...a.shape);
    }

    private drawParticle(p: Particle) {
        if (p instanceof LineParticle) {
            this.drawLines(
                p.pos,
                p.length,
                p.rot,
                COLOR,
                THICKNESS,
                new Vector2(-0.5, 0),
                new Vector2(0.5, 0),
            );
        } else if (p instanceof DotParticle) {
            this.drawCircleFill(p.pos, p.radius, COLOR);
        } else {
            exhaustive(p);
        }
    }

    private drawProjectile(p: Projectile) {
        this.drawCircleFill(p.pos, Math.max(SCALE * 0.05, 1), COLOR);
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
        this.drawRectFill(
            new Vector2(0, 0),
            this.canvas.width,
            this.canvas.height,
            color,
        );
    }

    private drawLines(
        origin: Vector2,
        scale: number,
        rotation: number,
        strokeStyle: string,
        lineWidth: number,
        ...points: Vector2[]
    ) {
        const transform = (p: Vector2) =>
            p.clone().rotate(rotation).scale(scale).add(origin);

        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        for (let i = 0; i < points.length; i++) {
            const from = points[i]!;
            const to = points[(i + 1) % points.length]!;
            this.drawLine(
                transform(from),
                transform(to),
                lineWidth,
                strokeStyle,
            );
        }
        this.ctx.restore();
    }

    private drawLine(
        from: Vector2,
        to: Vector2,
        lineWidth: number,
        strokeStyle: string,
    ) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawRectFill(
        topLeft: Vector2,
        width: number,
        height: number,
        fillStyle: string,
    ) {
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

    private drawText(
        text: string,
        position: Vector2,
        font: string,
        fillStyle: string,
    ) {
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
    const seed = String(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    const state = new State(seed);
    const canvas: HTMLCanvasElement =
        document.querySelector("#game") ??
        unreachable("Game canvas element not found.");
    canvas.width = GAME_SIZE.x;
    canvas.height = GAME_SIZE.y;
    const ctx =
        canvas.getContext("2d") ?? unreachable("2d context not supported.");
    const game = new Game(state, canvas, ctx);

    registerKey("KeyW", (down) => {
        game.state.ship.movingForward = down;
    });
    registerKey("KeyA", (down) => {
        game.state.ship.turning.left = down;
    });
    registerKey("KeyD", (down) => {
        game.state.ship.turning.right = down;
    });
    registerKey("Space", (down) => {
        game.state.ship.shooting = down;
    });

    const frame = (timestamp: number) => {
        if (game.paused) return;
        const dt = (timestamp - previousTimestamp) / 1000;
        previousTimestamp = timestamp;
        state.update(timestamp, dt);
        game.render(timestamp, dt);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // window.addEventListener("blur", () => {
    //     game.paused = true;
    // });
    // window.addEventListener("focus", () => {
    //     game.paused = false;
    //     requestAnimationFrame(frame);
    // });

    //@ts-expect-error ok
    window.DEBUG = function() {
        console.log(game);
        console.log(state);
    };
}

main();
