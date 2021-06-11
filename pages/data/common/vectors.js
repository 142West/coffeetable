function vNew(a, b) {
    return {x: a, y: b};
}

function vFromAngle(angle) {
    return vNew(Math.cos(angle), Math.sin(angle));
}

function vAdd(a, b) {
    return {x: a.x + b.x, y: a.y + b.y};
}

function vSub(a, b){
    return vAdd(a, vScale(b, -1));
}

function vDot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function vScale(v, a) {
    return {x: v.x * a, y: v.y * a};
}

function vLength(v) {
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
}

function vLength2(v) {
    return Math.pow(v.x, 2) + Math.pow(v.y, 2);
}

function vProj(a, b) {
    return vScale(b, vDot(a, b) / vDot(b, b));
}

function vNorm(a) {
    return vScale(a, 1/vLength(a));
}

