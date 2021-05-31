export function vNew(a, b) {
    return {x: a, y: b};
}

export function vAdd(a, b) {
    return {x: a.x + b.x, y: a.y + b.y};
}

export function vSub(a, b){
    return vAdd(a, vScale(b, -1));
}

export function vDot(a, b) {
    return a.x * b.x + a.y * b.y;
}

export function vScale(v, a) {
    return {x: v.x * a, y: v.y * a};
}

export function vLength(v) {
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
}

export function vProj(a, b) {
    return vScale(b, vDot(a, b) / vDot(b, b));
}

export function vNorm(a) {
    return vScale(a, 1/vLength(a));
}

