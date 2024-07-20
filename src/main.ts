import { Vector2 } from "./math";
import { getRng, prngIntInRange, registerKey, unreachable } from "./utils";
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
const FONT_COLOR = "#fff";
const BACKGROUND_COLOR = "#000";

class Asteroid {
    constructor(
        public size: Asteroid.Size,
        public pos: Vector2,
        public vel: Vector2,
        public rot: number,
        public shape: Vector2[],
    ) { }

    static randomSize(rng: PRNG): Asteroid.Size {
        return rng() > 0.3
            ? Asteroid.Size.BIG
            : rng() > 0.6
                ? Asteroid.Size.MEDIUM
                : Asteroid.Size.SMALL;
    }

    static randomShape(rng: PRNG): Vector2[] {
        const n = prngIntInRange(rng, 8, 15);
        return Array.from({ length: n }).map((_, i) => {
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
    turning: { left: boolean, right: boolean };
    dead: boolean;

    constructor() {
        this.pos = GAME_SIZE.clone().scale(0.5);
        this.vel = new Vector2();
        this.rot = 0;
        this.movingForward = false;
        this.turning = {
            left: false,
            right: false,
        };
        this.dead = false;
    }

    reset() {
        this.dead = false;
        this.pos = GAME_SIZE.clone().scale(0.5);
        this.vel = new Vector2();
        this.rot = 0;
        this.movingForward = false;
        this.turning.left = false;
        this.turning.right = false;
        this.dead = false;
    }
}

class State {
    seed: string;
    rng: PRNG;
    timestamp: number;
    deltaTime: number;
    ship: Ship;
    asteroids: Asteroid[];

    constructor(seed: string) {
        this.seed = seed;
        this.rng = getRng(seed);
        this.ship = new Ship();
        this.asteroids = this.initAsteroids(ASTEROID_COUNT);
        this.timestamp = 0;
        this.deltaTime = 0;
    }

    reset() {
        this.seed = String(Math.random());
        this.rng = getRng(this.seed);
        this.ship.reset();
        this.asteroids = this.initAsteroids(ASTEROID_COUNT);
    }

    initAsteroids(asteroidCount: number): Asteroid[] {
        return Array.from({ length: asteroidCount }).map(() => {
            const size = Asteroid.randomSize(this.rng);
            const shape = Asteroid.randomShape(this.rng);
            const pos = new Vector2(
                Math.random() * GAME_SIZE.x,
                Math.random() * GAME_SIZE.y,
            );
            const vel = new Vector2();
            const rot = this.rng() * prngIntInRange(this.rng, 1, 9);

            return new Asteroid(size, pos, vel, rot, shape);
        });
    }

    update(timestamp: number, deltaTime: number) {
        this.timestamp = timestamp;
        this.deltaTime = deltaTime;
        this.updateShip();
        this.asteroids.forEach(this.updateAsteroid.bind(this));
    }

    private updateShip() {
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

    private updateAsteroid(asteroid: Asteroid) {
        const dirAngle = asteroid.rot + Math.PI * 0.5;
        const direction = new Vector2().setAngle(dirAngle);
        asteroid.vel.add(direction.scale(ASTEROID_SPEED * this.deltaTime));
        asteroid.vel.scale(1 - DRAG);
        asteroid.pos.add(asteroid.vel);
        asteroid.pos.mod(GAME_SIZE);

        this.checkAsteroidCollision(asteroid);
    }

    private checkAsteroidCollision(asteroid: Asteroid) {
        if (asteroid.pos.distanceTo(this.ship.pos) < asteroid.size) {
            this.ship.dead = true;
        }
    }
}

class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    state: State;
    fps = 0;
    lastFpsUpdate = 0;

    constructor(state: State) {
        this.canvas =
            document.querySelector("#game") ?? unreachable("Game canvas element not found.");
        this.ctx =
            this.canvas.getContext("2d") ??
            unreachable("2d context not supported.");
        this.state = state;
        this.canvas.width = GAME_SIZE.x;
        this.canvas.height = GAME_SIZE.y;
    }


    render(timestamp: number, deltaTime: number) {
        this.drawBackground(BACKGROUND_COLOR);
        this.drawShip(timestamp);
        this.state.asteroids.forEach((asteroid) =>
            this.drawAsteroid(asteroid, timestamp),
        );
        // this.drawDebug(deltaTime);
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
        this.drawText(textFps, new Vector2(10, 20), FONT_STYLE, FONT_COLOR);
        this.drawText(textPos, new Vector2(10, 40), FONT_STYLE, FONT_COLOR);
        this.drawText(textVel, new Vector2(10, 60), FONT_STYLE, FONT_COLOR);
        this.drawText(textRot, new Vector2(10, 80), FONT_STYLE, FONT_COLOR);
        this.drawText(textMoving, new Vector2(10, 100), FONT_STYLE, FONT_COLOR);
        this.drawText(
            textTurning,
            new Vector2(10, 120),
            FONT_STYLE,
            FONT_COLOR,
        );
    }

    private drawAsteroid(asteroid: Asteroid, timestamp: number) {
        this.drawLines(
            asteroid.pos,
            asteroid.size,
            0.0,
            FONT_COLOR,
            THICKNESS,
            ...asteroid.shape,
        );
    }

    private drawShip(timestamp: number) {
        this.drawLines(
            this.state.ship.pos,
            SCALE,
            this.state.ship.rot,
            FONT_COLOR,
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
                FONT_COLOR,
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
        const dt = (timestamp - previousTimestamp) / 1000;
        previousTimestamp = timestamp;
        state.update(timestamp, dt);
        if (state.ship.dead) {
            state.reset();
            console.log("You died");
        }
        game.render(timestamp, dt);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    //@ts-expect-error ok
    window.DEBUG = function() {
        console.log(game);
        console.log(state);
    };
}

main();
