const SHADES = [0.85, 1, 0.1, 0.5];
const DEFAULT_COLOR = "#505050"

const VIEWS = ["select", "direction", "proportion", "text"]

let COLOR = "#000000";
let COLOR_COMP = {R: 0, G: 0, B: 0};

let SOCKET = undefined;

let VIEW = "select"; // of SELECT, DIRECTION, PROPORTION, TEXT

let LOCKED = false;

let PAGE_LIST = {};

load();

/*----------- LOADING -----------*/
function load() {
    recolor(DEFAULT_COLOR);
    connect()
}


/*----------- UTILITY -----------*/
function changeView(view) {
    if (VIEWS.indexOf(view) < 0) {
        console.warn("Attempted to load invalid view.")
        return;
    }
    VIEW = view;
    renderClear();
    renderView(view);

}

/*----------- SOCKETS -----------*/
function connect() {
    if (SOCKET != undefined) {
        console.warn("WARNING: Attempting to reconnect while socket is open!");
        SOCKET.close();
    }
    const socket_path = "ws://" + window.location.host + "/connect";
    console.log(socket_path);
    SOCKET = new WebSocket(socket_path);
    SOCKET.onopen = socketOpen;
    SOCKET.onmessage = socketMessage;
    SOCKET.onclose = socketClose;
}

function socketOpen() {
    console.log("successfully opened socket.");
}

function socketMessage(message) {
    //console.log(message);
    const m = JSON.parse(message.data);
    //console.log(m);
    switch (m.type) {
        case "user_register":
            recolor(m.payload);
            break;
        case "switch_view":
            changeView(m.payload);
            break;
        case "lock_input":
            lockInput();
            break;
        case "unlock_input":
            unlockInput();
            break;
        case "set_mode":
            break;
        case "page_list":
            console.log(m.payload);
            break;
    }
}

function socketClose() {
    console.log("websocket closed...");
    SOCKET = undefined;
    recolor(DEFAULT_COLOR);
}

/*----------- COLORS -----------*/
function recolor(color) {
    COLOR = color;
    COLOR_COMP = colorToComp(color);
    theme = themeColors(color);
    document.getElementById("menubar").style.backgroundColor = theme[0];
    document.getElementById("menubar").style.borderColor = theme[1]
    document.getElementById("screen").style.backgroundColor = theme[2];
    document.getElementById("footer").style.backgroundColor = theme[3];
}

function colorToComp(color) {
    return {R: parseInt(color.substr(1,2), 16), 
        G: parseInt(color.substr(3,2), 16), 
        B: parseInt(color.substr(5,2), 16)};
}

function compToColor(comp) {
    return "#" + ("00" + comp.R.toString(16)).substr(-2) + 
        ("00" + comp.G.toString(16)).substr(-2) + 
        ("00" + comp.B.toString(16)).substr(-2);
}

function themeColors(color) {
    let colors = [];
    for (let shade of SHADES) {
        let comp = colorToComp(color);
        comp.R = Math.floor(comp.R * shade);
        comp.G = Math.floor(comp.G * shade);
        comp.B = Math.floor(comp.B * shade);
        colors.push(compToColor(comp));
    }
    return colors;
}

/*----------- RENDERING -----------*/

/*----------- INTERFACE -----------*/




/*const MIRROR_RATIO = 0.00005;
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

function vAdd(a, b) {
    return {x: a.x + b.x, y: a.y + b.y}
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

function vProj(a, b) {
    return vScale(b, vDot(a, b) / vDot(b, b));
}

function vNorm(a) {
    return vScale(a, 1/vLength(a));
}

function getRandomLoc(max, offset) {
	return Math.floor(Math.random() * (max - offset));
}*/
