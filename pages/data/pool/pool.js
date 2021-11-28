const FRICTION = 0.993;
const MAX_CHARGE = 50;
const CHARGE_RATE = 1 / 3000; // 1000 b/c time is in ms
const BALL_COUNT = 18;

let canvas = document.getElementById("screen");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext("2d");

const BALL_RADIUS = canvas.height / 40;
const ballcolors = ["#FFFFFF", "#ABAB22"];

let players = [];
let playermap = {};
let balls = [];


HOST.view = "proportion";
HOST.help = "Knock other players and balls into the pockets.  Hold to charge, release to travel.";
//HOST.ontap = tapHandler;
HOST.onjoystick = joystickHandler;
//HOST.ondirection = dirHandler;
HOST.onuserjoin = joinHandler;
HOST.onuserleave = leaveHandler;
HOST.init();

requestAnimationFrame(run);


function run() {
    runGame();
    draw();
    requestAnimationFrame(run);
}

function runGame() {
    tickBalls();
    if (balls.length < BALL_COUNT && random(500) < 1) {
        Ball(ballcolors[randInt(ballcolors.length - 1)]);
    }
}

function tickBalls() {
    //TODO
}


// GRAPHICS --------------------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawEdges();
    drawPockets();
    for (let b of balls) {
        drawBall(b);
    }
}

function drawLine(start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

function drawCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawEdges() {

}

function drawPockets() {

}

function drawBall(ball) {
    //TODO Fill / stroke styles, number, charge, etc.
    ctx.fillStyle = ball.color;
    drawCircle(Math.round(ball.loc.x), Math.round(ball.loc.y), BALL_RADIUS);
    if (playermap[ball.playerID] != undefined) {
        let p = playermap[ball.playerID];
        // draw text
        // draw charge
        if (p.chargeTime > 0) {
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 4;
            ctx.beginPath();
            let time = Date.now() - p.chargeTime;
            ctx.arc(ball.loc.x, ball.loc.y, BALL_RADIUS + 6, 0, Math.PI * 2 * Math.min(1, time * CHARGE_RATE));
            ctx.stroke();
        }
    }
}


// HANDLERS -----------------------------
function joinHandler(e) {
    let p = Player(e.uid);
    players.push(p);
    playermap[e.uid] = p;
    sendPacket("lock_input", "host", e.uid, "");
}

function leaveHandler(e) {
    for (let i = 0; i < players.length; i++) {
        if (e.uid == players[i].color) {
            players.splice(i, 1);
            delete playermap[e.uid];
            return;
        }
    }
}

function joystickHandler(e) {
    let p = playermap[e.uid];
    if (e.end) {
        let time = Date.now() - p.chargeTime;
        let impulse = vScale(vFromAngle(e.angle), Math.min(1, time * CHARGE_RATE) * MAX_CHARGE)
        p.ball.vel = vAdd(p.ball.vel, impulse);
        p.chargeTime = 0;
        console.log("tap!");
    } else {
        if (p.chargeTime == 0) {
            p.chargeTime = Date.now();
        }
    }
}

// UTILITY ===================

function intersectingCircles(loc, rad) {
    for (let b of balls) {
        if (Math.pow(loc.x - b.loc.x, 2) + Math.pow(loc.y - b.loc.y, 2) < Math.pow(BALL_RADIUS + rad, 2)) {
            return true;
        }
    }
    return false;
}

function openSpace() {
    let l = vNew(random(canvas.width), random(canvas.height));
    while (intersectingCircles(l, 2 * BALL_RADIUS)) {
        l = vNew(random(canvas.width), random(canvas.height));
    }
    console.log("found location @" + l.x + ", " + l.y);
    return l;
}

// OBJECTS ===================

function Player(color) {
    let p = {ball: Ball(color), color: color, score: 0, chargeTime: 0};
    p.ball.playerID = color;
    return p;
}

function Ball(color) {
    let b = {loc: openSpace(), vel: vNew(0, 0), color: color, playerID:-1};
    balls.push(b);
    return b;
}


// MATH ======================
function random(max) {
    return Math.random() * max;
}
function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

function mod(x, a) {
    return ((x % a) + a) % a;
}
