import { Vector2 } from "./math";
import { unreachable } from "./utils";

interface State {
    shipPos: Vector2;
}

const state: State = {};

function main() {
    const canvas =
        (document.getElementById("game") as HTMLCanvasElement | null) ?? unreachable("Game canvas element not found.");
}
