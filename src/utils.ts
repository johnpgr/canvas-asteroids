export function assert(
    condition: boolean,
    message?: string,
): asserts condition {
    if (!condition) throw new Error(message);
}

export function unreachable(message: string): never {
    throw new Error("UNREACHABLE: " + message);
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
