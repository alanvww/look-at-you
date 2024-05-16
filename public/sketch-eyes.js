// Alan Ren & Kyrie Yang
// NYU ITP, Spring 2024

let faceMesh;
let handPose;
let video;
let faces = [];
let hands = [];
let options = { maxFaces: 10, refineLandmarks: false, flipHorizontal: false };
let eyeSizes = []; // Array to store eye sizes for each face
let scaleX;
let scaleY;
let aspectRatio;

async function modelLoader() {
	const loadFaceMesh = () =>
		new Promise((resolve) => {
			faceMesh = ml5.faceMesh(options, () => {
				console.log('faceMesh loaded');
				resolve();
			});
		});

	const loadHandPose = () =>
		new Promise((resolve) => {
			handPose = ml5.handPose({ maxHands: 20 }, () => {
				console.log('handPose loaded');
				resolve();
			});
		});

	await loadFaceMesh();
	await loadHandPose();
}

async function preload() {
	await modelLoader();
}

async function setup() {
	await getWebcamAspectRatio();
	video = createCapture(VIDEO);
	video.hide();

	if (aspectRatio === 16 / 9) {
		createCanvas(windowWidth, windowWidth * (9 / 16));
		video.size(windowWidth, windowWidth * (9 / 16));
		scaleX = width / 1920;
		scaleY = height / 1080;
	} else if (aspectRatio === 4 / 3) {
		createCanvas((windowHeight * 4) / 3, windowHeight);
		video.size((windowHeight * 4) / 3, windowHeight);
		scaleX = width / 640;
		scaleY = height / 480;
	} else {
		console.error('Unsupported aspect ratio');
		return;
	}

	faceMesh.detectStart(video, gotFaces);
	handPose.detectStart(video, gotHands);
}

function draw() {
	if (!aspectRatio) return;

	translate(video.width, 0);
	scale(-1, 1);
	image(video, 0, 0, width, height);

	if (faces.length === 0 && eyeSizes.length !== 0) {
		eyeSizes = [];
	}

	faces.forEach((face, faceIndex) => {
		if (eyeSizes.length <= faceIndex) {
			eyeSizes.push(0);
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
	eyeSizes[faceIndex] = distance;
	console.log(`Eye size for face ${faceIndex}: ${eyeSizes[faceIndex]}`);
}

function gotFaces(results) {
	faces = results;
}

function gotHands(results) {
	hands = results;
}

async function getWebcamAspectRatio() {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({ video: true });
		const videoTrack = stream.getVideoTracks()[0];
		const camAspectRatio = videoTrack.getSettings().aspectRatio;
		console.log('Webcam Aspect Ratio: ' + camAspectRatio);
		aspectRatio = camAspectRatio;
		stream.getTracks().forEach((track) => track.stop());
	} catch (error) {
		console.error('Error accessing webcam:', error);
	}
}
