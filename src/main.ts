import { Vector2 } from "./math";
import { prngIntInRange, registerKey, unreachable } from "./utils";
import { alea } from "seedrandom";

const PI = Math.PI
const TAU = PI * 2;
const FACTOR = 256;
const GAME_SIZE = new Vector2(4 * FACTOR, 3 * FACTOR);
const THICKNESS = 2.0;
const SCALE = 32;
const TURN_SPEED = 0.8;
const MOVE_SPEED = 10;
const DRAG = 0.015;
const FONT_STYLE = "16px monospace";
const FONT_COLOR = "#fff";
const BACKGROUND_COLOR = "#000";

type Direction = "forward";
type TurnDirection = "left" | "right";
type Moving = { [key in Direction]: boolean };
type Turning = { [key in TurnDirection]: boolean };

enum AsteroidSize {
    SMALL = SCALE * 0.8,
    MEDIUM = SCALE * 1.5,
    BIG = SCALE * 2.5,
}

interface Asteroid {
    seed: string;
    size: AsteroidSize;
    pos: Vector2;
    vel: Vector2;
    rot: number;
}

interface Ship {
    pos: Vector2;
    vel: Vector2;
    rot: number;
    moving: Moving;
    turning: Turning;
}


class State {
    ship: Ship;
    asteroids: Asteroid[];

    constructor(ship: Ship, asteroids: Asteroid[]) {
        this.ship = ship;
        this.asteroids = asteroids;
    }

    update(deltaTime: number) {
        const dirAngle = this.ship.rot + Math.PI * 0.5;
        const direction = new Vector2().setAngle(dirAngle);
        if (this.ship.turning.left) {
            this.ship.rot -= deltaTime * Math.PI * 2 * TURN_SPEED;
        }
        if (this.ship.turning.right) {
            this.ship.rot += deltaTime * Math.PI * 2 * TURN_SPEED;
        }
        if (this.ship.moving.forward) {
            this.ship.vel.add(direction.scale(MOVE_SPEED * deltaTime));
        }

        this.ship.vel.scale(1 - DRAG);
        this.ship.pos.sub(this.ship.vel); //sub to move forward idk
        this.ship.pos.mod(GAME_SIZE);
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
            (document.getElementById("game") as HTMLCanvasElement | null) ??
            unreachable("Game canvas element not found.");
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
        this.state.asteroids.forEach((asteroid) => this.drawAsteroid(asteroid, timestamp));
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
        const textMoving = `Moving: forward ${this.state.ship.moving.forward}`;
        const textTurning = `Turning: left ${this.state.ship.turning.left} right ${this.state.ship.turning.right}`;
        //prettier-ignore
        {
            this.drawText(textFps, new Vector2(10, 20), FONT_STYLE, FONT_COLOR);
            this.drawText(textPos, new Vector2(10, 40), FONT_STYLE, FONT_COLOR);
            this.drawText(textVel, new Vector2(10, 60), FONT_STYLE, FONT_COLOR);
            this.drawText(textRot, new Vector2(10, 80), FONT_STYLE, FONT_COLOR);
            this.drawText(textMoving, new Vector2(10, 100), FONT_STYLE, FONT_COLOR);
            this.drawText(textTurning, new Vector2(10, 120), FONT_STYLE, FONT_COLOR);
        }
    }

    private drawAsteroid(asteroid: Asteroid, timestamp: number) {
        const prng = alea(asteroid.seed);
        const n = prngIntInRange(prng, 8, 15);
        const points: Vector2[] = [];

        for (let i = 0; i < n; i++) {
            let radius = 0.3 + (0.2 * prng.quick());
            if(prng.quick() < 0.2) {
                radius -= 0.15;
            }

            const angle = i * (TAU / n) + (PI * 0.125 * prng.quick());
            points.push(new Vector2().setAngle(angle).scale(radius));
        }

        this.drawLines(asteroid.pos, asteroid.size, 0.0, FONT_COLOR, THICKNESS, ...points);
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
        if (this.state.ship.moving.forward && (timestamp * 10) % 2 === 0) {
            this.drawLines(
                this.state.ship.pos,
                SCALE,
                this.state.ship.rot,
                FONT_COLOR,
                THICKNESS,
                new Vector2(-0.1, 0.1),
                new Vector2(0.0, 0.4),
                new Vector2(0.1, 0.1),
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

    private drawCircle(
        center: Vector2,
        radius: number,
        lineWidth: number,
        strokeStyle: string,
    ) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawCircleFill(center: Vector2, radius: number, fillStyle: string) {
        this.ctx.save();
        this.ctx.fillStyle = fillStyle;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    private drawRect(
        topLeft: Vector2,
        width: number,
        height: number,
        lineWidth: number,
        strokeStyle: string,
    ) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
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
    const ship: Ship = {
        pos: GAME_SIZE.clone().scale(0.5),
        vel: new Vector2(),
        rot: 0,
        moving: {
            forward: false,
        },
        turning: {
            left: false,
            right: false,
        },
    };
    const asteroids: Asteroid[] = [];
    for(let i = 0; i < 10; i++){
        const sizeRng = Math.random();
        const size = sizeRng > 0.3 ? AsteroidSize.BIG : sizeRng > 0.6 ? AsteroidSize.MEDIUM : AsteroidSize.SMALL;
        const a: Asteroid = {
            pos: new Vector2((Math.random() * GAME_SIZE.x), (Math.random() * GAME_SIZE.y)),
            rot: 0.0,
            seed: String(Math.random()),
            size,
            vel: new Vector2()
        };
        asteroids.push(a);
    }
    const state = new State(ship, asteroids);
    const game = new Game(state);

    registerKey("KeyW", (down) => {
        game.state.ship.moving.forward = down;
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
        state.update(dt);
        game.render(timestamp, dt);
        requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    //@ts-expect-error ok
    window.DEBUG = function(){
        console.log(game,state);
    }
}

main();
