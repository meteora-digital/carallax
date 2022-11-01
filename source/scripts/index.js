/*------------------------------------------------------------------
Carallax
------------------------------------------------------------------*/

/* ██████╗  █████╗ ██████╗  █████╗ ██╗     ██╗      █████╗ ██╗  ██╗
   ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║     ██║     ██╔══██╗╚██╗██╔╝
   ██████╔╝███████║██████╔╝███████║██║     ██║     ███████║ ╚███╔╝ 
   ██╔═══╝ ██╔══██║██╔══██╗██╔══██║██║     ██║     ██╔══██║ ██╔██╗ 
   ██║     ██║  ██║██║  ██║██║  ██║███████╗███████╗██║  ██║██╔╝ ██╗
   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ */

export default class CarallaxController {
  constructor(options = {}) {
    // The parallax settings
    this.settings = {
      throttle: 100,
      depth: 50,
      alignment: 'center',
      firefoxDPR: window.devicePixelRatio || 1,
    }

    // Object assign the user settings
    for (const key in this.settings) {
      if (Object.hasOwnProperty.call(this.settings, key) && options[key]) this.settings[key] = options[key];
    }

    // Create a new buffer canvas
    this.canvas = new Canvas(this.settings);
    // Create a new buffer canvas
    this.buffer = new Canvas(this.settings);
    // The static layer
    this.static = new Image();
    // The layers in the canvas
    this.layers = {};
    // Some timeouts
    this.timeouts = {};
    // A store for all our already solved calculations
    this.calculations = {};

    // We will store some values here
    this.cache = {
      // ScrollY will be used to store the last scroll position, we can use it to check if we have scrolled
      scrollY: -1, // set to -1 so it will always update on the first run
      static: false,
      canvasOffset: 0,
    };

    // A resize observer
    this.ResizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    // An intersection observer
    this.IntersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) this.resize();
      });
    });

    this.IntersectionObserver.observe(this.canvas.element);

    // Observe the canvas element
    this.ResizeObserver.observe(this.canvas.element);

    // Set a classname for the static layer
    this.static.className = 'carallax-img';

    // Keep track of everything going on
    this.status = {
      active: false,
      loaded: false,
      layers: 0,
      alignment: this.settings.alignment,
      depth: this.settings.depth,
      view: {
        top: 0,
        bottom: 0,
      },
    };

    // Tell the canvas to begin drawing immediately
    this.enable();
    this.start();
  }

  enable() {
    // Change the cached scrollY to -1 so the draw function will run
    this.cache.scrollY = -1;
  }

  // A method to load a single image layer
  load(src = false) {
    // Add 1 to the number of layers we have
    this.status.layers += 1;

    // create a new image element
    const image = new Image;
    // store the index
    const index = this.status.layers;

    // When the image loads, we need to add a new ParallaxLayer
    image.addEventListener('load', () => {
      // Tell the status that something is loaded
      this.status.loaded = true;
      // Add this layer to the layers object
      this.layers[index] = new ParallaxLayer(image, index);
      // Now we need to update some things
      this.resize();
      // Enable drawing
      this.enable();

      clearTimeout(this.timeouts['loaded']);
      this.timeouts['loaded'] = setTimeout(() => {
        // if the canvas.element does not have loaded class
        if (!this.canvas.element.classList.contains('parallax-canvas--loaded')) {
          // Add the loaded class to the canvas.element
          this.canvas.element.classList.add('parallax-canvas--loaded');
        }
      }, 100);

      // Update the depth of the image
      this.withEachLayer((Layer) => {
        Layer.depth = this.status.layers - Layer.index;

        if (Layer.depth == 0) {
          this.static.src = Layer.image.src;
        }
      });
    });

    // if the src is an element
    if (src instanceof Element) {
      const viewBox = src.getAttribute('viewBox');
      const width = src.getAttribute('width') || (viewBox) ? viewBox.split(' ')[2] : 1;
      const height = src.getAttribute('height') || (viewBox) ? viewBox.split(' ')[3] : 1;

      src.setAttribute('width', width);
      src.setAttribute('height', height);
      src.setAttribute('viewBox', `0 0 ${width} ${height}`);

      // Set the height and width of the image
      image.width = parseInt(width) + 'px';
      image.height = parseInt(height) + 'px';
      // btoa the element and set it as the source
      image.src = 'data:image/svg+xml;base64,' + btoa(src.outerHTML);
      // Remove the orginal element
      src.parentElement.removeChild(src);
    } else {
      // Add the src to the image to make it load
      image.src = src;
    }
  }

  // A function to add a single or multiple images to the scene
  // Must be a string, or array of strings, or an svg element, or an array of svg elements
  add(images = []) {
    // Check if we passed in an array of images
    if (Array.isArray(images) || images instanceof NodeList) {
      // Loop through all the images and load them
      for (let index = 0; index < images.length; index++) {
        if (typeof images[index] == 'string' || images[index] instanceof Element) this.load(images[index]);
      };
    }
    // Otherwise if it is a single image, load that.
    else if (typeof images == 'string' || images instanceof Element) this.load(images);
  }

  calculateScrollPercent(offset = 0) {
    const distance = (offset + window.innerHeight) - (this.canvas.pageYOffset);
    let alignment = 0;
    let decimalPlaces = 2;

    switch (this.settings.alignment) {
      case 'top':
        alignment = 0;
      case 'bottom':
        alignment = 2;
      default:
        alignment = 1;
    }

    alignment = (decimalPlaces * .5) * alignment;

    const calculation = distance / ((window.innerHeight + this.canvas.element.clientHeight) / decimalPlaces);
    const decimal = ((calculation - alignment) * 2) / decimalPlaces;
    const result = decimal * this.status.depth;

    return result.toFixed(decimalPlaces);
  }

  getScrollPercentages() {
    this.calculations = {};

    const from = this.canvas.pageYOffset - window.innerHeight;
    const to = from + this.canvas.element.clientHeight + window.innerHeight;

    for (let index = from; index < to; index++) {
      this.calculations[index] = this.calculateScrollPercent(index);
      this.withEachLayer((Layer) => Layer.parallax(this.calculations[index]));
    }
  }

  getScrollPercent() {
    // this.getScrollPercentages();
    const offset = Math.round(window.pageYOffset);

    // If we have a cached value, return that, otherwise calculate it
    if (!this.calculations[offset]) {
      this.calculations[offset] = this.calculateScrollPercent(offset);
    }

    return this.calculations[offset];
  }

  draw() {
    if (window.pageYOffset + window.innerHeight > this.status.view.top && window.pageYOffset < this.status.view.bottom) {
      // Clear the buffer canvas
      this.buffer.ctx.clearRect(0, 0, this.buffer.element.width, this.buffer.element.height);

      const percentScrolled = this.getScrollPercent();

      // Draw each image to the buffer canvas;
      this.withEachLayer((Layer) => {
        if (Layer.depth != 0) {
          try {
            this.buffer.ctx.drawImage(Layer.canvas.element, 0, Layer.parallax(percentScrolled));
          } catch (e) { }
        }
      });

      // Draw the buffer image to the canvas
      this.canvas.ctx.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
      try {
        this.canvas.ctx.drawImage(this.buffer.element, 0, 0);
      } catch (e) { }
    }
  }

  update() {
    window.requestAnimationFrame(() => {
      this.update();

      if (this.cache.scrollY != window.pageYOffset) {
        this.cache.scrollY = window.pageYOffset;
        this.draw();
      }
    });
  }

  // A method that will wait for the loaded status to be true, then run the draw function
  start() {
    window.requestAnimationFrame(() => {
      (this.status.loaded) ? this.update() : this.start();
    });
  }

  resize() {
    clearTimeout(this.timeouts['resize']);

    this.timeouts['resize'] = setTimeout(() => {
      // Tell the canvas to resize
      this.canvas.resize(this.canvas.element.clientWidth, this.canvas.element.clientHeight);
      // Tell the buffer to resize
      this.buffer.resize(this.canvas.element.clientWidth, this.canvas.element.clientHeight);

      this.status.depth = ((this.canvas.element.clientWidth / Math.log(this.canvas.element.clientWidth)) / 100) * (this.settings.depth * this.canvas.dpr);

      // Loop through the layers and resize them too, they only need the width of the canvas as their height is calculated
      this.withEachLayer((Layer) => Layer.resize(this.canvas.element.clientWidth));

      // Update the alignment of the layers
      switch (this.settings.alignment) {
        case 'top':
          // align to the top of the canvas
          this.withEachLayer((Layer) => Layer.alignment = 0);
          break;
        case 'bottom':
          // align to the bottom of the canvas
          this.withEachLayer((Layer) => Layer.alignment = this.canvas.element.height - Layer.canvas.element.height);
          break;
        default:
          // align vertically in the canvas
          this.withEachLayer((Layer) => Layer.alignment = (this.canvas.element.height - Layer.canvas.element.height) * .5);
          break;
      }

      // Set the view area of the canvas
      this.status.view.top = this.canvas.pageYOffset;
      this.status.view.bottom = this.canvas.pageYOffset + this.canvas.element.clientHeight;

      this.cache.canvasOffset = this.canvas.pageYOffset;

      // Make sure it still draws during the resize
      this.enable();

      // Clear all the calculations
      this.calculations = {};
      this.getScrollPercentages();
    }, this.settings.throttle);
  }

  // A helper function to loop through the layers
  withEachLayer(func = false) {
    if (func && typeof func === 'function') {
      for (const layer in this.layers) {
        if (Object.hasOwnProperty.call(this.layers, layer)) func(this.layers[layer]);
      }
    }
  }
}

class ParallaxLayer {
  constructor(image, index) {
    // The actual image element
    this.image = image;
    // The layer index
    this.index = index;
    // The visual depth of the layer
    this.depth = 0;
    // Create a new buffer canvas
    this.canvas = new Canvas;
    // The vertical position of the image
    this.alignment = 0;
    // The perspective position of the layer
    this.perspective = 0;
    // The pixel height of the layer
    this.height = 0;
    // The pixel width of the layer
    this.width = 0;
    // The parallax position calculations
    this.calculations = {};
  }

  draw() {
    // Draw the image on the canvas at the appropriate size
    this.canvas.ctx.drawImage(this.image, 0, 0, this.canvas.element.width, this.canvas.element.height);
  }

  parallax(view) {
    // We only want to parallax the layer if it has some depth
    if (this.depth === 0) return this.alignment;

    if (!this.calculations[view]) {
      // const scale = this.height / window.innerHeight;
      const perspective = view * this.depth;
      const calculation = this.alignment + perspective;

      this.calculations[view] = Math.round(calculation);
    }

    return this.calculations[view];
  }

  resize(width) {
    // Reset the calculations
    this.calculations = {};
    // We want to maintain the aspect ratio so we work out the height manually
    this.canvas.resize(Math.round(width), Math.round(width / this.image.naturalWidth * this.image.naturalHeight));
    // Work out the pixel height of the layer
    this.height = this.canvas.element.height * (1 / this.canvas.dpr);
    // Work out the pixel width of the layer
    this.width = this.canvas.element.width * (1 / this.canvas.dpr);
    // After we have resized the image, we want to update the canvas
    this.draw();
  }
}

/* ██████╗ █████╗ ███╗   ██╗██╗   ██╗ █████╗ ███████╗
  ██╔════╝██╔══██╗████╗  ██║██║   ██║██╔══██╗██╔════╝
  ██║     ███████║██╔██╗ ██║██║   ██║███████║███████╗
  ██║     ██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══██║╚════██║
  ╚██████╗██║  ██║██║ ╚████║ ╚████╔╝ ██║  ██║███████║
   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝ */

class Canvas {
  constructor(options = {}) {
    // Create a new canvas element
    this.element = document.createElement('canvas');
    // The canvas context
    this.ctx = this.element.getContext('2d');
    // The devicePixelRatio
    this.dpr = window.devicePixelRatio || 1;
    // The page offset
    this.pageYOffset = 0;

    this.settings = { firefoxDPR: window.devicePixelRatio || 1 };

    for (const key in this.settings) {
      if (Object.hasOwnProperty.call(this.settings, key) && options[key]) this.settings[key] = options[key];
    }

    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
      // Min of 0 and max of window.devicePixelRatio || 1;
      this.dpr = Math.min(Math.max(this.settings.firefoxDPR, 0), this.dpr);
    }
  }

  // Resize the buffer canvas
  resize(width = 1, height = 1) {
    let offset = 0;
    let element = this.element;

    while (element) {
      offset += element.offsetTop;
      element = element.offsetParent;
    }

    this.element.width = width * this.dpr;
    this.element.height = height * this.dpr;
    // Update the pageYOffset of the canvas
    this.pageYOffset = offset;
  }
}