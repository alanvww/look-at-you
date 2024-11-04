let video;
let depthResult;
let depthEstimation;
let results;
let points = [];
let processingCanvas; // Separate canvas for video processing
let processingContext; // 2D context for processing canvas
const DEPTHWIDTH = 320;  // Matching video width
const DEPTHHEIGHT = 240; // Matching video height

async function setup() {
  // Create main canvas with WEBGL for point cloud visualization
  createCanvas(windowWidth, windowHeight, WEBGL);

  // Create video capture
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  // Create separate canvas for video processing
  processingCanvas = document.createElement('canvas');
  processingCanvas.width = DEPTHWIDTH;
  processingCanvas.height = DEPTHHEIGHT;
  processingContext = processingCanvas.getContext('2d');

  // Load the Transformers.js model pipeline with async/await
  let pipeline = await loadTransformers();

  // Initialize the depth estimation model
  depthEstimation = await pipeline(
    "depth-estimation",
    "onnx-community/depth-anything-v2-small",
    { dtype: 'q4f16', device: "webgpu" }
  );

  // Create initial point cloud structure
  createPointCloud();

  // Start processing the video for depth estimation
  processVideo();
}

function createPointCloud() {
  // Initialize points array with 3D coordinates
  for (let y = 0; y < DEPTHHEIGHT; y++) {
    for (let x = 0; x < DEPTHWIDTH; x++) {
      let index = x + y * DEPTHWIDTH;
      // Center the point cloud around origin
      let newX = map(x, 0, DEPTHWIDTH, -width / 2, width / 2);
      let newY = map(y, 0, DEPTHHEIGHT, -height / 2, height / 2);
      points[index] = {
        x: newX,
        y: newY,
        z: 0,
        color: { r: 0, g: 0, b: 0 }
      };
    }
  }
}

function draw() {
  background(0);

  // Add orbit control for interactive viewing
  orbitControl();


  // If depth results are available, update and display point cloud
  if (results) {
    const { depth } = results;

    // Get video frame data
    processingContext.drawImage(video.elt, 0, 0, DEPTHWIDTH, DEPTHHEIGHT);

    // Update point cloud positions and colors
    for (let y = 0; y < depth.height; y++) {
      for (let x = 0; x < depth.width; x++) {
        let index = x + y * depth.width;
        let depthValue = depth.data[index];

        // Map depth value to a reasonable Z-range
        let z = map(depthValue, 0, 255, 0, -1000);

        // Update point data
        points[index].z = z;
      }
    }

    // Draw point cloud
    push();

    // Draw all points
    strokeWeight(2);
    beginShape(POINTS);
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      stroke(255);
      vertex(point.x, point.y, point.z);
    }
    endShape();
    pop();
  }
}

// Modified processVideo function to use the processing canvas
async function processVideo() {
  // Draw current video frame to processing canvas
  processingContext.drawImage(video.elt, 0, 0, 0, 0);

  // Get data URL from processing canvas
  const dataURL = processingCanvas.toDataURL();

  // Process depth estimation
  results = await depthEstimation(dataURL);

  // Continue processing
  setTimeout(processVideo,100)
}