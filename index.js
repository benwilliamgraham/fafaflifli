"use strict";

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Error compiling shader", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Error linking program", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function main() {
  // Make body take up full screen
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
  document.body.style.background = "#333333";

  // Create the top bar
  const topBar = document.createElement("div");
  topBar.style.top = "0";
  topBar.style.left = "0";
  topBar.style.width = "100%";
  topBar.style.height = "30px";
  topBar.style.background = "#444444";
  topBar.style.color = "#FFFFFF";
  topBar.style.textAlign = "center";

  document.body.appendChild(topBar);

  // Create conent div
  const content = document.createElement("div");
  content.style.display = "flex";
  content.style.justifyContent = "center";
  document.body.appendChild(content);

  // Create dragging canvas
  const draggingCanvas = document.createElement("canvas");
  draggingCanvas.width = 512;
  draggingCanvas.height = 512;

  const draggingCanvasDiv = document.createElement("div");
  draggingCanvasDiv.style.padding = "10px";

  const draggingCanvasLabel = document.createElement("div");
  draggingCanvasLabel.innerText =
    "Drag the sliders to change the image sampling:";
  draggingCanvasLabel.style.marginBottom = "10px";
  draggingCanvasLabel.style.color = "#FFFFFF";
  draggingCanvasLabel.style.textAlign = "center";
  draggingCanvasLabel.style.fontSize = "20px";

  draggingCanvasDiv.appendChild(draggingCanvasLabel);
  draggingCanvasDiv.appendChild(draggingCanvas);

  content.appendChild(draggingCanvasDiv);

  const draggingCanvasContext = draggingCanvas.getContext("2d");

  // Create image
  const image = new Image();
  image.style.userSelect = "none";
  image.draggable = false;

  // Add 2d sliders to image
  const sliders = [];

  const defaultSliderPos = [
    [0.05, 0.05], // 0
    [0.5, 0.05], // 1
    [0.95, 0.05], // 2
    [0.05, 0.95], // 3
    [0.5, 0.95], // 4
    [0.95, 0.95], // 5
  ];
  const sliderIsDraggable = [true, true, false, true, true, false];

  // Add sliders
  for (let i = 0; i < 6; i++) {
    const slider = document.createElement("div");
    slider.style.position = "absolute";

    slider.style.borderRadius = "50%";
    slider.style.width = "10px";
    slider.style.height = "10px";
    slider.style.left = "30px";
    slider.posInCanvasXPercent = defaultSliderPos[i][0];
    slider.posInCanvasYPercent = defaultSliderPos[i][1];
    content.appendChild(slider);

    if (sliderIsDraggable[i]) {
      slider.style.cursor = "grab";
      slider.style.background = "#CCCCCCCC";
      slider.onmousedown = (e) => {
        dragging = slider;
      };
    } else {
      slider.style.background = "#66666666";
      slider.style.pointerEvents = "none";
    }

    sliders.push(slider);
  }

  let dragging = null;

  document.body.onmousemove = (e) => {
    if (dragging) {
      dragging.posInCanvasXPercent =
        (e.clientX - draggingCanvas.offsetLeft) / draggingCanvas.width;
      dragging.posInCanvasYPercent =
        (e.clientY - draggingCanvas.offsetTop) / draggingCanvas.height;

      dragging.posInCanvasXPercent = Math.max(
        0,
        Math.min(1, dragging.posInCanvasXPercent)
      );
      dragging.posInCanvasYPercent = Math.max(
        0,
        Math.min(1, dragging.posInCanvasYPercent)
      );

      render();
    }
  };

  document.body.onmouseup = (e) => {
    dragging = null;
  };

  // Create render canvas
  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = 2048;
  renderCanvas.height = 1536;
  renderCanvas.style.width = "512px";
  renderCanvas.style.height = "384px";
  renderCanvas.style.marginTop = "64px";

  const renderCanvasDiv = document.createElement("div");
  renderCanvasDiv.style.padding = "10px";

  const renderCanvasLabel = document.createElement("div");
  renderCanvasLabel.innerText = "Result:";
  renderCanvasLabel.style.marginBottom = "10px";
  renderCanvasLabel.style.color = "#FFFFFF";
  renderCanvasLabel.style.textAlign = "center";
  renderCanvasLabel.style.fontSize = "20px";

  renderCanvasDiv.appendChild(renderCanvasLabel);
  renderCanvasDiv.appendChild(renderCanvas);

  content.appendChild(renderCanvasDiv);

  // Create upload button
  const uploadButton = document.createElement("input");
  uploadButton.type = "file";
  uploadButton.accept = "image/*";
  uploadButton.innerText = "Upload";
  uploadButton.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };
  topBar.appendChild(uploadButton);

  // Create download button
  const downloadButton = document.createElement("button");
  downloadButton.innerText = "Download";
  downloadButton.onclick = (e) => {
    const link = document.createElement("a");
    link.download = "image.png";
    link.href = renderCanvas.toDataURL("image/png");
    link.click();
  };
  topBar.appendChild(downloadButton);

  // Setup WebGL
  const gl = renderCanvas.getContext("experimental-webgl", {
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  // Setup shaders
  const vertexShaderSource = `
    attribute vec4 aPos;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    void main(void) {
      gl_Position = aPos;
      vTexCoord = aTexCoord;
    }
    `;

  const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D uSampler;

    varying vec2 vTexCoord;

    void main(void) {
        gl_FragColor = texture2D(uSampler, vTexCoord);
    }
    `;

  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = loadShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  const program = createProgram(gl, vertexShader, fragmentShader);

  gl.useProgram(program);

  const programInfo = {
    attribLocations: {
      aPos: gl.getAttribLocation(program, "aPos"),
      aTexCoord: gl.getAttribLocation(program, "aTexCoord"),
    },
    uniformLocations: {
      uSampler: gl.getUniformLocation(program, "uSampler"),
    },
  };

  // Setup buffers
  /* Faces are as follows:
   * *--> x
   * |
   * y   0---1---2
   *     |   |   |
   *     3---4---5
   */

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0.0,
      0.0,
      0.0, // 0
      0.5,
      0.0,
      0.0, // 1
      1.0,
      0.0,
      0.0, // 2
      0.0,
      1.0,
      0.0, // 3
      0.5,
      1.0,
      0.0, // 4
      1.0,
      1.0,
      0.0, // 5
    ]),
    gl.STATIC_DRAW
  );

  const texCoordBuffer = gl.createBuffer();

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([
      0,
      1,
      3,
      1,
      4,
      3, // Left
      1,
      2,
      4,
      2,
      5,
      4, // Right
    ]),
    gl.STATIC_DRAW
  );

  // Load texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Upload the image into the texture.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image
    );
    render();
  };
  image.src = "placeholder.png";

  // Create projection matrix
  const fieldOfView = (5 * Math.PI) / 180; // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projMat = mat4.create();
  mat4.perspective(projMat, fieldOfView, aspect, zNear, zFar);

  // Create model matrix
  const modelMat = mat4.create();
  mat4.translate(modelMat, modelMat, [0.0, 0.0, -50.0]);
  mat4.rotate(modelMat, modelMat, (45 * Math.PI) / 180, [1.0, 0.0, 0.0]);
  mat4.rotate(modelMat, modelMat, (-45 * Math.PI) / 180, [0.0, 1.0, 0.0]);

  // Draw the scene
  function render() {
    // Draw dragging canvas
    draggingCanvasContext.clearRect(
      0,
      0,
      draggingCanvas.width,
      draggingCanvas.height
    );
    draggingCanvasContext.drawImage(
      image,
      0,
      0,
      draggingCanvas.width,
      draggingCanvas.height
    );

    // Draw line between sliders
    const sliderLinePairs = [
      [0, 1, true],
      [1, 2, false],
      [0, 3, true],
      [1, 4, true],
      [2, 5, false],
      [3, 4, true],
      [4, 5, false],
    ];

    for (const [index1, index2, draggable] of sliderLinePairs) {
      const slider1 = sliders[index1];
      const slider2 = sliders[index2];

      const x1 = slider1.posInCanvasXPercent * draggingCanvas.width;
      const y1 = slider1.posInCanvasYPercent * draggingCanvas.height;

      const x2 = slider2.posInCanvasXPercent * draggingCanvas.width;
      const y2 = slider2.posInCanvasYPercent * draggingCanvas.height;

      draggingCanvasContext.beginPath();
      draggingCanvasContext.moveTo(x1, y1);
      draggingCanvasContext.lineTo(x2, y2);
      if (draggable) {
        draggingCanvasContext.strokeStyle = "#CCCCCCCC";
        draggingCanvasContext.setLineDash([]);
      } else {
        draggingCanvasContext.strokeStyle = "#66666666";
        draggingCanvasContext.setLineDash([5, 5]);
      }
      draggingCanvasContext.lineWidth = 2;
      draggingCanvasContext.stroke();
    }

    // Draw sliders
    for (const slider of sliders) {
      slider.style.left =
        draggingCanvas.offsetLeft +
        slider.posInCanvasXPercent * draggingCanvas.width -
        5 +
        "px";
      slider.style.top =
        draggingCanvas.offsetTop +
        slider.posInCanvasYPercent * draggingCanvas.height -
        5 +
        "px";
    }

    // Render cube
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(
      programInfo.attribLocations.aPos,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.aPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoordPoses = [];
    for (const slider of sliders) {
      texCoordPoses.push(
        slider.posInCanvasXPercent,
        slider.posInCanvasYPercent
      );
    }
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(texCoordPoses),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(
      programInfo.attribLocations.aTexCoord,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.aTexCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.uniformMatrix4fv(
      programInfo.uniformLocations.uModelMat,
      false,
      modelMat
    );
    gl.uniformMatrix4fv(programInfo.uniformLocations.uProjMat, false, projMat);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
  }

  render();
}

main();
