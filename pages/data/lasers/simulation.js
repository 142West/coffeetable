// Uses common/vectors.js
const MIRROR_RATIO = 0.00005;
const MIRROR_LEN = 0.2;
const LASER_RATIO = 0.5;
const MIN_LEN = 5;

let canvas = document.getElementById("screen");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext("2d");

let mirror_ct = MIRROR_RATIO * canvas.width * canvas.height;

let mirrors = generateMirrors(mirror_ct);
let lasers = makeLasers(mirror_ct * LASER_RATIO);

requestAnimationFrame(simulate);

function draw() {
    ctx.fillStyle = "#0000000F";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#C00000";
    for (let laser of lasers){
        drawLine(laser.pos, vAdd(laser.pos, vScale(laser.vel, -1)));
    }

    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#DFDFDF";
    for (let mirror of mirrors){
        drawLine(mirror.start, mirror.end);
    }
}

function simulate() {
    for (let laser of lasers) {
        //reflect off walls
        if (laser.pos.y < 0) {
            laser.vel.y = Math.abs(laser.vel.y);
        }
        if (laser.pos.y  > canvas.height) {
            laser.vel.y = -1 * Math.abs(laser.vel.y);
        }
        if (laser.pos.x < 0) {
            laser.vel.x = Math.abs(laser.vel.x);
        }
        if (laser.pos.x  > canvas.width) {
            laser.vel.x = -1 * Math.abs(laser.vel.x);
        }
        //reflect off mirrors
        for (let mirr of mirrors) {
            collisionHandle(laser, mirr);
        }
        laser.pos = vAdd(laser.pos, laser.vel);
    }
    draw();
    requestAnimationFrame(simulate);
}

function generateMirrors(n) {
    let mirrors = [];
    for (let i = 0; i < n; i++){
        let mirror = {};
        let x = getRandomLoc(canvas.width, 0);
        let y = getRandomLoc(canvas.height, 0);
        let theta = Math.random() * 2 * Math.PI;
        let len = Math.random() * MIRROR_LEN * canvas.width + MIN_LEN;
        let x2 = x + Math.cos(theta) * len;
        let y2 = y + Math.sin(theta) * len;

        mirror.start = {x: x, y: y}
        mirror.end = {x: x2, y: y2};
        mirror.len = len;
        mirror.theta = theta;
        mirror.norm = {x: -1 * Math.sin(theta), y: Math.cos(theta)};
        if (mirrorOverlap(mirror, mirrors)) {
            i--;
        }
        else {
            mirrors.push(mirror);
        }
    }
    return mirrors;
}

function mirrorOverlap(mirror, mirrors) {
    for (let mirr of mirrors) {
        if (doesIntersect(mirr.start, mirr.end, mirror.start, mirror.end)){
            return true;
        }
    }
    return false;
}

function makeLasers(n) {
    let lasers = [];
    for (let i = 0; i < n; i++){
        let x = getRandomLoc(canvas.width, 0);
        let y = getRandomLoc(canvas.height, 0);
        let theta = Math.random() * 2 * Math.PI;
        let speed = (Math.random() + 0.1) * 5
        let dx = Math.cos(theta) * speed;
        let dy = Math.sin(theta) * speed;
        laser = {};
        laser.pos = {x: x, y: y};
        laser.vel = {x: dx, y: dy};
        lasers.push(laser);
    }
    return lasers;
}

function drawLine(start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

function collisionHandle(l, m) {
    if (doesIntersect(l.pos, vAdd(l.pos, l.vel), m.start, m.end)) {
       l.vel = vSub(vScale(vProj(l.vel, vNorm(vSub(m.end, m.start))), 2), l.vel);
    }
    return false;
}

function doesIntersect(a1, a2, a3, a4) {
    const t = ((a1.x - a3.x)*(a3.y - a4.y) - (a1.y - a3.y)*(a3.x - a4.x)) / ((a1.x - a2.x)*(a3.y - a4.y) - (a1.y - a2.y)*(a3.x - a4.x))
    const u = ((a2.x - a1.x)*(a1.y - a3.y) - (a2.y - a1.y)*(a1.x - a3.x)) / ((a1.x - a2.x)*(a3.y - a4.y) - (a1.y - a2.y)*(a3.x - a4.x))
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;

}

function getRandomLoc(max, offset) {
	return Math.floor(Math.random() * (max - offset));
}

