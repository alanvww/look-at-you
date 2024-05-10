// Alan Ren & Kyrie Yang
// NYU ITP, Spring 2024

let faceMesh;
let handPose;
let video;
let faces = [];
let hands = [];
let options = { maxFaces: 20, refineLandmarks: false, flipHorizontal: false };
let eyeSizes = [],
	mouthSides = []; // Array to store eye sizes for each face
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
	translate(video.width, 0);
	scale(-1, 1);
	image(video, 0, 0, width, height);

	if (faces.length == 0 && eyeSizes.length != 0 && mouthSides.length != 0) {
		eyeSizes = [];
		mouthSides = [];
	}

	faces.forEach((face, faceIndex) => {
		if (eyeSizes.length <= faceIndex) {
			eyeSizes.push(0);
		}
		if (mouthSides.length <= faceIndex) {
			mouthSides.push(0);
		}

		let invisibleArea = {
			width: face.box.width * scaleX,
			height: face.box.height * scaleY,
			x: (face.box.xMin - face.box.width) * scaleX,
			y: face.box.yMin * scaleY,
		};
		push();
		stroke(255);
		noFill();
		rect(
			invisibleArea.x,
			invisibleArea.y,
			invisibleArea.width,
			invisibleArea.height
		);
		pop();

		hands.forEach((hand) => {
			let thumbTip = hand.thumb_tip;
			let indexTip = hand.index_finger_tip;
			let handInfo = isHandInArea(thumbTip, indexTip, invisibleArea);

			if (handInfo.inArea) {
				adjustFeatures(faceIndex, handInfo.deltaX, handInfo.deltaY);
			}
		});

		capturePortion(
			'mouth',
			face.lips.x * scaleX,
			face.lips.y * scaleY,
			face.lips.width * scaleX,
			face.lips.height * scaleY,
			mouthSides[faceIndex]
		);

		capturePortion(
			'eye',
			face.leftEye.x * scaleX,
			face.leftEye.y * scaleY,
			face.leftEye.width * scaleX,
			face.leftEye.height * scaleY,
			eyeSizes[faceIndex]
		);

		capturePortion(
			'eye',
			face.rightEye.x * scaleX,
			face.rightEye.y * scaleY,
			face.rightEye.width * scaleX,
			face.rightEye.height * scaleY,
			eyeSizes[faceIndex]
		);
	});
}

function isHandInArea(thumbTip, indexTip, area) {
	let thumbTipX = thumbTip.x * scaleX;
	let thumbTipY = thumbTip.y * scaleY;
	let indexTipX = indexTip.x * scaleX;
	let indexTipY = indexTip.y * scaleY;

	let inArea =
		(thumbTipX > area.x &&
			thumbTipX < area.x + area.width &&
			thumbTipY > area.y &&
			thumbTipY < area.y + area.height) ||
		(indexTipX > area.x &&
			indexTipX < area.x + area.width &&
			indexTipY > area.y &&
			indexTipY < area.y + area.height);

	return {
		inArea: inArea,
		deltaX: Math.abs(thumbTipX - indexTipX),
		deltaY: Math.abs(thumbTipY - indexTipY),
	};
}

function adjustFeatures(faceIndex, deltaX, deltaY) {
	if (deltaY > deltaX) {
		adjustEyes(faceIndex, deltaY);
	} else {
		adjustMouth(faceIndex, deltaX);
	}
}

function adjustEyes(faceIndex, deltaY) {
	eyeSizes[faceIndex] = deltaY;
	console.log(`Eye height for face ${faceIndex}: ${eyeSizes[faceIndex]}`);
}

function adjustMouth(faceIndex, deltaX) {
	console.log(`Mouth width for face ${faceIndex}: ${deltaX}`);
	// Logic for adjusting the mouth width can be implemented here.
	mouthSides[faceIndex] = deltaX;
}

function capturePortion(type, x, y, w, h, size = 0) {
	if (type === 'eye') {
		image(video, x - w / 2, y - h / 2 - size, w * 2, h * 2 + size, x, y, w, h);
	} else if (type === 'mouth') {
		image(video, x - w / 2 - size / 2, y - h, w * 2 + size, h * 2, x, y, w, h);
	}
}

function gotFaces(results) {
	faces = results;
}

function gotHands(results) {
	hands = results;
}
