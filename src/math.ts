export class Vector2 {
    x: number;
    y: number;
    constructor(x: number = 0, y?: number) {
        this.x = x;
        this.y = y ?? x;
    }
    setScalar(scalar: number): this {
        this.x = scalar;
        this.y = scalar;
        return this;
    }
    setAngle(angle: number, len: number = 1): this {
        this.x = Math.cos(angle) * len;
        this.y = Math.sin(angle) * len;
        return this;
    }
    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }
    copy(that: Vector2): this {
        this.x = that.x;
        this.y = that.y;
        return this;
    }
    add(that: Vector2): this {
        this.x += that.x;
        this.y += that.y;
        return this;
    }
    sub(that: Vector2): this {
        this.x -= that.x;
        this.y -= that.y;
        return this;
    }
    div(that: Vector2): this {
        this.x /= that.x;
        this.y /= that.y;
        return this;
    }
    mul(that: Vector2): this {
        this.x *= that.x;
        this.y *= that.y;
        return this;
    }
    sqrLength(): number {
        return this.x * this.x + this.y * this.y;
    }
    length(): number {
        return Math.sqrt(this.sqrLength());
    }
    scale(value: number): this {
        this.x *= value;
        this.y *= value;
        return this;
    }
    norm(): this {
        const l = this.length();
        return l === 0 ? this : this.scale(1 / l);
    }
    /**
     * Rotates the vector by 90 degrees (PI/2 radians).
     */
    rotate90(): this {
        const oldX = this.x;
        this.x = -this.y;
        this.y = oldX;
        return this;
    }
    /**
     * Rotates the vector by 180 degrees (PI radians).
     */
    rotate270(): this {
        const oldX = this.x;
        this.x = this.y;
        this.y = -oldX;
        return this;
    }
    /**
     * Rotates the vector by the given angle in radians.
     */
    rotate(angle: number): this {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x;
        this.x = x * cos - this.y * sin;
        this.y = x * sin + this.y * cos;
        return this;
    }
    sqrDistanceTo(that: Vector2): number {
        const dx = that.x - this.x;
        const dy = that.y - this.y;
        return dx * dx + dy * dy;
    }
    distanceTo(that: Vector2): number {
        return Math.sqrt(this.sqrDistanceTo(that));
    }
    lerp(that: Vector2, t: number): this {
        this.x += (that.x - this.x) * t;
        this.y += (that.y - this.y) * t;
        return this;
    }
    dot(that: Vector2): number {
        return this.x * that.x + this.y * that.y;
    }
    map(f: (x: number) => number): this {
        this.x = f(this.x);
        this.y = f(this.y);
        return this;
    }
    mod(that: Vector2): this {
        this.x = mod(this.x, that.x);
        this.y = mod(this.y, that.y);
        return this;
    }
}

export function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}
