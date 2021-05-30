canvas = document.getElementById("screen");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");
let q = 40
colors = []

for (let i = 0; i < 8; i++) {
    let n = Math.floor(canvas.width / 8);
    ctx.fillStyle = makeColor();
    ctx.fillRect(i * n, 0, n, canvas.height)
}


function makeColor() {
    color = Math.floor(Math.random() * 16777216)
    while (!acceptable(color)) {
        color = Math.floor(Math.random() * 16777216)
    }
    return "#" + (("000000" + color.toString(16)).substr(-6));
}

function acceptable(color) {
    R = color >> 16;
    G = color >> 8 & 255;
    B = color & 255;
    brightness = R + G + B;
    if (brightness < 30 || brightness > 600){
        return false;
    }
    avg = (R + G + B) / 255;
    fakeSat = Math.abs(R - avg) + Math.abs(G - avg) + Math.abs(B - avg);
    if (fakeSat < 200){
        return false;
    }
    for (let c of colors){
        diff = Math.abs(c.R - R)
        diff += Math.abs(c.G - G)
        diff += Math.abs(c.B - B)
        if (diff < 180){
            return false;
        }
    }

    a = {}
    a.R = R
    a.G = G
    a.B = B
    colors.push(a)
    return true;
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.drawImage(img, x, y, IMWIDTH, IMHEIGHT);
    x += STEP * dx;
    y += STEP * dy;
    if (y < 0) {
        dy = Math.max(dy, -1 * dy)
    }
    if (y + IMHEIGHT > canvas.height) {
        dy = Math.min(dy, -1 * dy)
    }
    if (x < 0) {
        dx = Math.max(dx, -1 * dx)
    }
    if (x + IMWIDTH > canvas.width) {
        dx = Math.min(dx, -1 * dx)
    }
}


function getRandomLoc(max, offset) {
	return Math.floor(Math.random() * (max - offset));
}

function websocketOnce(path) {
    const socket_path = "ws://localhost:8081/";
    const full_path = "ws://localhost:8081/" + path;//socket_path.value + path;
    let localsocket = new WebSocket(full_path);


    localsocket.onopen = function () {
        console.log("opened socket.")//add_to_output("### Did open websocket at " + full_path);
    };

    localsocket.onmessage = function (message) {
            console.log(message.data)//add_to_output("### Calling callback on websocket data");
    };

    localsocket.onclose = function () {
            console.log("close")//add_to_output("### Got data successfully!");
    }
};

