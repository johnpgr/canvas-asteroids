export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) throw new Error(message);
}

export function unreachable(message: string): never {
    throw new Error("UNREACHABLE: " + message);
}
