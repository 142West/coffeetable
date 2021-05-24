img = new Image();
img.src="pgotp.png";
img.onload = load;
IMWIDTH = 256
IMHEIGHT = 370

function load() {

	canvas = document.getElementById("table");

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	ctx = canvas.getContext("2d");
	ctx.drawImage(img, getRandomLoc(canvas.width, IMWIDTH), getRandomLoc(canvas.height, IMHEIGHT), 256, 370);

}

function getRandomLoc(max, offset) {
	return Math.floor(Math.random() * (max - offset));
}
