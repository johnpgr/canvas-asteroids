import { Vector2 } from "./math";
import { registerKey, unreachable } from "./utils";

const FACTOR = 256;
const GAME_SIZE = new Vector2(4 * FACTOR, 3 * FACTOR);
const THICKNESS = 1.5;
const SCALE = 32;
const TURN_SPEED = 0.8;
const MOVE_SPEED = 10;
const DRAG = 0.015;
const FONT_STYLE = "16px monospace";
const FONT_COLOR = "#fff";

type Direction = "forward";
type TurnDirection = "left" | "right";
type Moving = { [key in Direction]: boolean };
type Turning = { [key in TurnDirection]: boolean };

interface Ship {
    pos: Vector2;
    vel: Vector2;
    rot: number;
    moving: Moving;
    turning: Turning;
}

interface IState {
    ship: Ship;
}

class State implements IState {
    ship: Ship;

    constructor(_state: IState) {
        Object.assign(this, _state);
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
        this.drawBackground("#202020");
        this.drawDebug(deltaTime);
        this.drawShip(timestamp);
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

    private drawShip(timestamp: number) {
        this.drawLines(
            this.state.ship.pos,
            this.state.ship.rot,
            FONT_COLOR,
            THICKNESS,
            SCALE,
            new Vector2(0, -0.5),
            new Vector2(0.3, 0.3),
            new Vector2(0.1, 0.1),
            new Vector2(-0.1, 0.1),
            new Vector2(-0.3, 0.3),
        );
        if (this.state.ship.moving.forward && (timestamp * 10) % 2 === 0) {
            this.drawLines(
                this.state.ship.pos,
                this.state.ship.rot,
                FONT_COLOR,
                THICKNESS,
                SCALE,
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
        rotation: number,
        strokeStyle: string,
        lineWidth: number,
        scale: number,
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
    const state = new State({
        ship: {
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
        },
    });
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
}

main();
