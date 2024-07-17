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

    render(timestamp: number) {}
    private drawLines() {}

    private drawLine(from: Vector2, to: Vector2, strokeStyle: string, lineWidth: number) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawCircle(center: Vector2, radius: number, strokeStyle: string, lineWidth: number) {
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

    private drawRect(topLeft: Vector2, width: number, height: number, strokeStyle: string, lineWidth: number) {
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

    private drawText(text: string, position: Vector2, fillStyle: string, font: string) {
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
