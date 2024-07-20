import { type PRNG, alea } from "seedrandom";

export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) throw new Error(message);
}

export function unreachable(message: string): never {
    throw new Error("UNREACHABLE: " + message);
}

export function exhaustive(e: never): never {
    unreachable("FAILED Exhaustive check for value: " + JSON.stringify(e));
}

export function registerKey(key: string, callback: (down: boolean) => void) {
    document.addEventListener("keydown", (event) => {
        if (event.repeat) return;
        if (event.code === key) {
            callback(true);
        }
    });

    document.addEventListener("keyup", (event) => {
        if (event.repeat) return;
        if (event.code === key) {
            callback(false);
        }
    });
}

// Returns a random integer in the range [atLeast, atMost]
export function prngIntInRange(prng: PRNG, atLeast: number, atMost: number): number {
    return Math.floor(prng.quick() * (atMost - atLeast + 1)) + atLeast;
}

export function getRng(seed: string): PRNG {
    return alea(seed);
}
