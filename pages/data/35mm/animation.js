img = new Image();
img.src="35mm-2.svg";
img.onload = function(){setInterval(animate, 35)};
const IMWIDTH = 110;
const IMHEIGHT = 68;
const STEP = 1;

canvas = document.getElementById("screen");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");
let x = getRandomLoc(canvas.width, IMWIDTH);
let y = getRandomLoc(canvas.height, IMHEIGHT);
let direction = Math.random() * 2 * Math.PI;
let dx = Math.cos(direction);
let dy = Math.sin(direction);




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
