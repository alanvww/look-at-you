// Alan Ren & Kyrie Yang
// NYU ITP, Spring 2024

let faceMesh;
let handPose;
let video;
let faces = [];
let hands = [];
let options = { maxFaces: 20, refineLandmarks: false, flipHorizontal: false };
let eyeSizes = []; // Array to store eye sizes for each face
// Calculate scaled positions for hand tracking
let scaleX;
let scaleY;

async function modelLoader() {
	// Create a function that returns a promise for loading faceMesh
	const loadFaceMesh = () =>
		new Promise((resolve) => {
			faceMesh = ml5.faceMesh(options, () => {
				console.log('faceMesh loaded');
				resolve();
			});
		});

	// Create a function that returns a promise for loading handPose
	const loadHandPose = () =>
		new Promise((resolve) => {
			handPose = ml5.handPose({ maxHands: 20 }, () => {
				console.log('handPose loaded');
				resolve();
			});
		});

	// Await the promises in sequence to ensure proper order of execution
	await loadFaceMesh();
	await loadHandPose();
}

function preload() {
	modelLoader();
}

function setup() {
	let camWidth, camHeight;
	video = createCapture(VIDEO);
	camWidth = video.width;
	camHeight = video.height;
	createCanvas(windowWidth, windowWidth * (3 / 4));

	video.size(windowWidth, windowWidth * (3 / 4));

	scaleX = width / 640;

	scaleY = height / 480;
	video.hide();

	// Start detecting faces from the webcam video
	faceMesh.detectStart(video, gotFaces);
	handPose.detectStart(video, gotHands);
}

function draw() {
	//move image by the width of image to the left
	translate(video.width, 0);
	//then scale it by -1 in the x-axis
	//to flip the image
	scale(-1, 1);
	//draw video capture feed as image inside p5 canvas
	image(video, 0, 0, width, height);

	if (faces.length == 0 && eyeSizes.length != 0) {
		eyeSizes = [];
	}

	// Iterate through each face to draw the regions and check hand presence

	// Process each face
	faces.forEach((face, faceIndex) => {
		// Ensure there is an eyeSize value for each face
		if (eyeSizes.length <= faceIndex) {
			eyeSizes.push(0); // Initialize with 0 if not present
		}

		let invisibleArea = {
			width: face.box.width * scaleX,
			height: face.box.height * scaleY,
			x: (face.box.xMin - face.box.width) * scaleX,
			y: face.box.yMin * scaleY,
		};
		push();
		stroke(255);
		//fill(255, 0, 0, 100);
		noFill();
		rect(
			invisibleArea.x,
			invisibleArea.y,
			invisibleArea.width,
			invisibleArea.height
		);
		pop();

		// Check if any hand is within the invisible area and adjust eyeSize for this face
		hands.forEach((hand) => {
			let thumbTip = hand.thumb_tip; // Change index based on specific data structure
			let indexTip = hand.index_finger_tip; // Change index based on specific data structure

			if (
				thumbTip &&
				indexTip &&
				isHandInArea(thumbTip, indexTip, invisibleArea)
			) {
				push();
				fill(255);
				stroke(255);
				line(
					thumbTip.x * scaleX,
					thumbTip.y * scaleY,
					indexTip.x * scaleX,
					indexTip.y * scaleY
				);
				circle(thumbTip.x * scaleX, thumbTip.y * scaleY, 28);
				circle(indexTip.x * scaleX, indexTip.y * scaleY, 28);
				pop();

				let distance = dist(
					thumbTip.x * scaleX,
					thumbTip.y * scaleY,
					indexTip.x * scaleX,
					indexTip.y * scaleY
				);
				adjustEyes(faceIndex, distance);
			}
		});

		capturePortion(
			'mouth',
			face.lips.x * scaleX,
			face.lips.y * scaleY,
			face.lips.width * scaleX,
			face.lips.height * scaleY
		);

		// Draw parts of the face
		capturePortion(
			'eye',
			face.leftEye.x * scaleX,
			face.leftEye.y * scaleY,
			face.leftEye.width * scaleX,
			face.leftEye.height * scaleY,
			eyeSizes[faceIndex] // Use the specific eyeSize for this face
		);

		capturePortion(
			'eye',
			face.rightEye.x * scaleX,
			face.rightEye.y * scaleY,
			face.rightEye.width * scaleX,
			face.rightEye.height * scaleY,
			eyeSizes[faceIndex] // Use the specific eyeSize for this face
		);
	});
}

function isHandInArea(thumbTip, indexTip, area) {
	let thumbTipX = thumbTip.x * scaleX;
	let thumbTipY = thumbTip.y * scaleY;
	let indexTipX = indexTip.x * scaleX;
	let indexTipY = indexTip.y * scaleY;

	// Check if either the thumb or index finger tip is within the invisible area
	return (
		(thumbTipX > area.x &&
			thumbTipX < area.x + area.width &&
			thumbTipY > area.y &&
			thumbTipY < area.y + area.height) ||
		(indexTipX > area.x &&
			indexTipX < area.x + area.width &&
			indexTipY > area.y &&
			indexTipY < area.y + area.height)
	);
}

function capturePortion(type, x, y, w, h, eyeSize = 0) {
	if (type === 'eye') {
		image(
			video,
			x - w / 2,
			y - h / 2 - eyeSize,
			w * 2,
			h * 2 + eyeSize,
			x,
			y,
			w,
			h
		);
	} else if (type === 'mouth') {
		image(
			video,
			x - w / 2,
			y - h - eyeSize,
			w * 2,
			h * 2 + eyeSize,
			x,
			y,
			w,
			h
		);
	}
}

function adjustEyes(faceIndex, distance) {
	eyeSizes[faceIndex] = distance; // Update the eye size for the specific face
	console.log(`Eye size for face ${faceIndex}: ${eyeSizes[faceIndex]}`);
}

// Callback function for when faceMesh outputs data
function gotFaces(results) {
	// Save the output to the faces variable
	faces = results;
}

// Callback function for when handPose outputs data
function gotHands(results) {
	// save the output to the hands variable
	hands = results;
}
