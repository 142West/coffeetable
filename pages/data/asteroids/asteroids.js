const FRICTION = 0.993;
const TURN = 0.055;
const THRUST = 0.05;
const ASTEROID_R = 20;

const LIFE_SCORE = 10000;
const STARTING_LIVES = 4

let canvas = document.getElementById("screen");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext("2d");

let STATE = "start"; // "start", "game", "gameover"
let level = 0;
let totalScore = 0;
let players = [];
let playermap = {};
let asteroids = [];
let bullets = [];
let particles = [];

let ready = 0;


HOST.view = "direction";
HOST.help = "Shoot the asteroids without getting hit.\nLEFT/RIGHT to turn, UP to move, TAP to shoot";
HOST.ontap = tapHandler;
HOST.ondirection = dirHandler;
HOST.onuserjoin = joinHandler;
HOST.onuserleave = leaveHandler;
HOST.init();

prepStart();
requestAnimationFrame(run);


function run() {
    switch(STATE) {
        case "start":
            runStart();
            break;
        case "game":
            runGame();
            break;
        case "gameover":
            runGame();
            break;
    }
    draw();
    requestAnimationFrame(run);
}

function runStart() {
    if(players.length > 0 && ready > 0 && ready > players.length / 2) {
        prepGame();
        STATE = "game";
    }
    tickParticles();
    tickAsteroids();
}

function runGame() {
    // TICK PLAYERS
    let players_living = 0;
    for (let player of players) {
        let user_data = HOST.user_data[player.color];
        if (player.lives > 0){
            players_living++;
        }
        if (player.lives > 0 && !player.respawn) {
            player.loc = vAdd(player.loc, player.vel);
            player.loc.x = mod(player.loc.x, canvas.width);
            player.loc.y = mod(player.loc.y, canvas.height);
            player.vel = vScale(player.vel, FRICTION);
            if (user_data.left) {
                player.angle -= TURN;
            }
            if (user_data.right) {
                player.angle += TURN;
            }
            if (user_data.up) {
                player.vel = vAdd(player.vel, vScale(vNew(Math.cos(player.angle), Math.sin(player.angle)), THRUST));
            }

            for (let asteroid of asteroids) {
                playerCollision(player, asteroid);
            }
        }
    }
    // TICK BULLETS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        bullet.loc = vAdd(bullet.vel, bullet.loc);
        let kill = false;
        for (let asteroid of asteroids) {
            if (vLength2(vSub(asteroid.loc, bullet.loc)) < Math.pow(ASTEROID_R * asteroid.size, 2)) {
                explodeAsteroid(asteroid, bullet);
                kill = true;
            }
        }
        if (bullet.loc.x < 0 || bullet.loc.x > canvas.width || bullet.loc.y < 0 || bullet.loc.y > canvas.height || kill) {
            bullets.splice(i, 1);
        }
    }
    // TICK PARTICLES
    tickParticles();

    // TICK ASTEROIDS
    tickAsteroids();


    if (asteroids.length == 0) {
        nextLevel();
    }
    if (players_living == 0 && STATE == "game") {
        STATE = "gameover";
        setTimeout(prepStart, 5000);
    }
}

function prepStart() {
    ready = 0;
    STATE = "start";
    for (let x = 0; x < 5; x ++) {
        spawnAsteroid();
    }
    for (let player of players) {
        player.score = 0;
    }
}

function prepGame() {
    for (let player of players) {
        player.loc = vNew(canvas.width / 2, canvas.height / 2);
        player.vel = vNew(0, 0);
        player.score = 0;
        player.angle = Math.PI / -2;
        player.lives = STARTING_LIVES;
        player.respawn = false;
    }
    level = 0;
    asteroids = [];
}

function nextLevel() {
    level += 1;
    for (let i = 0; i < 4 + 2 * level; i++) {
        spawnAsteroid();
    }
}

function spawnAsteroid() {
    const offset = 30;
    let n = randInt(1);
    let m = randInt(1);
    let x = offset;
    let y = offset;
    if (n == 0) {
        y = random(canvas.height);
        if (m == 0) {
            x = canvas.width - offset;
        }
    } else {
        x = random(canvas.width);
        if (m == 0) {
            y = canvas.height - offset;
        }
    }
    asteroids.push(AsteroidL(x, y, 3));
}

function explodeAsteroid(asteroid, bullet) {
    let player = playermap[bullet.color];
    addScore(player, Math.pow(10, 4 - asteroid.size));
    asteroid.to_remove = true;
    Particles(asteroid.loc, "#FFFFFF");
    if (asteroid.size > 1) {
        for (let i = randInt(3); i > 0; i--) {
            asteroids.push(AsteroidL(asteroid.loc.x, asteroid.loc.y, asteroid.size - 1));
        }
    }
}

function playerPoints(player) {
    let pts = [];
    pts.push(vAdd(player.loc, vScale(vFromAngle(player.angle), 12)));
    pts.push(vAdd(player.loc, vScale(vFromAngle(player.angle + 4 * Math.PI / 5), 12)));
    pts.push(vAdd(player.loc, vScale(vFromAngle(player.angle - 4 * Math.PI / 5), 12)));
    pts.push(vAdd(player.loc, vScale(vFromAngle(player.angle + 5 * Math.PI / 6), 8)));
    pts.push(vAdd(player.loc, vScale(vFromAngle(player.angle - 5 * Math.PI / 6), 8)));
    return pts;
}

function playerCollision(player, asteroid) {
    let pts = playerPoints(player);
    let collision = false;
    for(point of pts) {
        if (vLength2(vSub(point, asteroid.loc)) < Math.pow(ASTEROID_R * asteroid.size, 2)) {
            collision = true;
        }
    }
    if (collision) {
        player.lives--;
        player.respawn = true;
        Particles(player.loc, player.color);
        Particles(player.loc, player.color);
        if (player.lives > 0) {
            setTimeout(function() {
                playerRespawn(player);
            }, 1500);
        }
    }
    return collision;
}
function playerRespawn(player) {
    player.respawn = false;
    player.loc = vNew(canvas.width / 2, canvas.height / 2);
    player.angle = Math.PI / -2;
    player.vel = vNew(0, 0);
    Particles(player.loc, player.color);
}
function addScore(player, score) {
    let s = totalScore;
    player.score += score;
    totalScore += score;
    if (s % LIFE_SCORE > totalScore % LIFE_SCORE) {
        players.sort((a, b) => {a.score - b.score});
        players.sort((a, b) => {a.lives - b.lives});
        players[0].lives++;
        if (players[0].lives == 1){
            playerRespawn(players[0]);
        }
    }
}

function tickAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        let asteroid = asteroids[i];
        asteroid.loc = vAdd(asteroid.loc, asteroid.vel);
        asteroid.loc.x = mod(asteroid.loc.x, canvas.width);
        asteroid.loc.y = mod(asteroid.loc.y, canvas.height);
        if (asteroid.to_remove == true) {
            asteroids.splice(i, 1);
        }
    }
}

function tickParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let particle = particles[i];
        particle.loc = vAdd(particle.vel, particle.loc);
        particle.ttl--;
        if (particle.ttl <= 0) {
            particles.splice(i, 1);
        }
    }
}

// GRAPHICS --------------------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    switch (STATE) {
        case "gameover":
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.font = "80px pixel";
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            drawScores();
            break;
        case "start":
            let x = canvas.width / 2;
            let y = canvas.height / 2;
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.font = "80px pixel";
            ctx.fillText('ASTEROIDS', x, y);
            ctx.font = "30px pixel";
            ctx.fillText("TAP TO START", x, y + 140);
            ctx.fillText("" + ready + " / " + Math.floor(players.length / 2 + 1), x, y + 170 );
            ctx.textAlign = "start";
            ctx.fillText("DRAG LEFT AND RIGHT ON YOUR SCREEN TO TURN", 10, 40);
            ctx.fillText("DRUG UP TO ACCELERATE FORWARDS", 10, 80);
            ctx.fillText("TAP TO FIRE", 10, 120);
            drawStartPlayers();
            break;
        case "game":
            drawScores();
            break;
    }
    ctx.lineCap = "round";
    for (let i = 0; i < players.length; i++) {
        let player = players[i];
        if (player.lives > 0 && !player.respawn) {
            drawPlayer(player);
        }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#FFFFFF";
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        drawLine(bullet.loc, vAdd(bullet.loc, vNorm(bullet.vel)));
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let particle = particles[i];
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.loc.x, particle.loc.y, 2, 2);
    }

    ctx.strokeStyle = "#FFFFFF";
    ctx.fillStyle = "#FFFFFF";
    for (let i = asteroids.length - 1; i >= 0; i--) {
        let asteroid = asteroids[i];
        drawAsteroid(asteroid);
    }
}

function drawLine(start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

function drawPlayer(player) {
    let points = playerPoints(player);
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 2;
    drawLine(points[0], points[1]);
    drawLine(points[0], points[2]);
    drawLine(points[1], points[3]);
    drawLine(points[2], points[4]);
    drawLine(points[4], points[3]);
}

function drawAsteroid(asteroid) {
    const dists = asteroid.r;
    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeWidth = 2;
    for (let i = 0; i < dists.length; i++) {
        drawLine(vAdd(asteroid.loc, vScale(vFromAngle(0 + i * Math.PI * 2 / dists.length),
                dists[i] * asteroid.size * ASTEROID_R)),
            vAdd(asteroid.loc, vScale(vFromAngle(0 + (i + 1) * Math.PI * 2 / dists.length),
                dists[(i + 1) % dists.length] * asteroid.size * ASTEROID_R))
        );
    }
}

function drawScores() {
    for (let i = 0; i < players.length; i++) {
        let player = players[i]
        let x = 30 + i * 180;
        let fakePlayer = {loc: vNew(x + 10, 50), angle: Math.PI / -2, color: player.color};
        ctx.textAlign = "left";
        ctx.font = "30px pixel";
        ctx.fillStyle = player.color;
        ctx.fillText("" + player.score, x, 30);
        for (let l = 0; l < player.lives - 1; l++) {
            drawPlayer(fakePlayer);
            fakePlayer.loc.x += 20;
        }
    }
    ctx.textAlign = "right";
    ctx.font = "50px pixel";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("" + totalScore, canvas.width - 10, 50);
    
    ctx.fillStyle = "#888888";
    ctx.fillRect(canvas.width - 10 - 200, 60, 200, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(canvas.width - 10 - 200, 60, 200 * ((totalScore % LIFE_SCORE) / LIFE_SCORE), 4);
}

function drawStartPlayers() {
    for (let i = 0; i < players.length; i++) {
        let player = players[i];
        let dx = Math.floor(canvas.width / (players.length + 1));
        let x = dx * (i + 1)
        player.loc = vNew(x, canvas.height - 50);
        player.angle = Math.PI / -2
        drawPlayer(player);
    }

}

// HANDLERS -----------------------------
function joinHandler(e) {
    let p = Player(e.uid);
    players.push(p);
    playermap[e.uid] = p;
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

function tapHandler(e) {
    let player = playermap[e.uid];
    switch (STATE) {
        case "start":
            Particles(player.loc, player.color);
            if (player.score == 0) {
                ready += 1;
                player.score = 1;
            }
            break;
        case "game":
            if (player.lives > 0 && !player.respawn) {
                Bullet(player);
            }
            break;
        case "gameover":
            break;
    }

}

function dirHandler(e) {
}

function Player(color) {
    return {loc: vNew(0, 0), vel: vNew(0, 0), angle: 0, color: color, lives: 0, score: 0};
}

// asteroid init
function AsteroidLV(x, y, vx, vy, s) {
    let rendering = [];
    for (let i = 0; i < 10; i++) {
        rendering.push(random(0.75) + 0.4);
    }
    return {loc: vNew(x, y), vel: vNew(vx, vy), size: s, r: rendering};
}
function AsteroidL(x, y, s) {
    const v = 10 - 2 * s;
    let vx = random(v) - v / 2;
    let vy = random(v) - v / 2;
    return AsteroidLV(x, y, vx, vy, s);
}
function Asteroid() {
    return AsteroidL(random(canvas.width), random(canvas.height), 3);
}

function Bullet(player) {
    bullets.push({loc: vAdd(player.loc, vScale(vFromAngle(player.angle), 10)), 
        vel: vScale(vFromAngle(player.angle), 10), color: player.color});
}

function Particles(loc, color) {
    const v = 7;
    const ct = 24;
    const ttl = 30;
    for (i = 0; i < ct; i++) {
        particles.push({loc: loc, vel: vNew(random(v) - v/2, random(v) - v/2), color: color, ttl: ttl});
    }
}

// MATH ------------------------
function random(max) {
    return Math.random() * max;
}
function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

function mod(x, a) {
    return ((x % a) + a) % a;
}
