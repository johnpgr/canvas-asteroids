import { Vector2 } from "./math";
import { unreachable } from "./utils";

interface State {
    shipPos: Vector2;
}

class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d") ?? unreachable("2d context not supported.");
        canvas.width = 800;
        canvas.height = 600;
    }

    render(timestamp: number) {
        this.drawBackground("#202020");
        this.drawShip();
    }

    private drawShip(state: State = { shipPos: new Vector2(200, 200) }) {
        const shipColor = "#ffffff";
        const shipLineWidth = 2;
        const shipScale = 32;
        this.drawLines(
            state.shipPos,
            shipColor,
            shipLineWidth,
            shipScale,
            new Vector2(0, -0.5),
            new Vector2(0.4, 0.4),
            new Vector2(0.2, 0.2),
            new Vector2(-0.2, 0.2),
            new Vector2(-0.4, 0.4),
        );
    }

    private drawBackground(color: string) {
        this.drawRectFill(new Vector2(0, 0), this.canvas.width, this.canvas.height, color);
    }

    private drawLines(origin: Vector2, strokeStyle: string, lineWidth: number, scale: number, ...points: Vector2[]) {
        const transform = (p: Vector2) => p.clone().scale(scale).add(origin);

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

    private drawCircle(center: Vector2, radius: number, lineWidth: number, strokeStyle: string) {
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

    private drawRect(topLeft: Vector2, width: number, height: number, lineWidth: number, strokeStyle: string) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
        this.ctx.restore();
    }

    private drawRectFill(topLeft: Vector2, width: number, height: number, fillStyle: string) {
        this.ctx.save();
        this.ctx.fillStyle = fillStyle;
        this.ctx.fillRect(topLeft.x, topLeft.y, width, height);
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
    const canvas =
        (document.getElementById("game") as HTMLCanvasElement | null) ?? unreachable("Game canvas element not found.");

    const state: State = { shipPos: new Vector2() };
    const game = new Game(canvas);

    let previousTimestamp = 0;

    const frame = (timestamp: number) => {
        const dt = (timestamp - previousTimestamp) / 1000;
        previousTimestamp = timestamp;
        game.render(dt);
        requestAnimationFrame(frame);
    };

    // Start the game loop
    requestAnimationFrame(frame);
}

main();
