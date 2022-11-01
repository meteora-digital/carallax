"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
/*------------------------------------------------------------------
Carallax
------------------------------------------------------------------*/
/* ██████╗  █████╗ ██████╗  █████╗ ██╗     ██╗      █████╗ ██╗  ██╗
   ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║     ██║     ██╔══██╗╚██╗██╔╝
   ██████╔╝███████║██████╔╝███████║██║     ██║     ███████║ ╚███╔╝ 
   ██╔═══╝ ██╔══██║██╔══██╗██╔══██║██║     ██║     ██╔══██║ ██╔██╗ 
   ██║     ██║  ██║██║  ██║██║  ██║███████╗███████╗██║  ██║██╔╝ ██╗
   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ */
var CarallaxController = /*#__PURE__*/function () {
  function CarallaxController() {
    var _this = this;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, CarallaxController);
    // Create a new buffer canvas
    this.canvas = new Canvas();
    // Create a new buffer canvas
    this.buffer = new Canvas();
    // The static layer
    this["static"] = new Image();
    // The layers in the canvas
    this.layers = {};
    // Some timeouts
    this.timeouts = {};
    // The maximum dpr
    this.dpr = window.devicePixelRatio || 1;
    // A store for all our already solved calculations
    this.calculations = {};

    // We will store some values here
    this.cache = {
      // ScrollY will be used to store the last scroll position, we can use it to check if we have scrolled
      scrollY: -1,
      // set to -1 so it will always update on the first run
      "static": false,
      canvasOffset: 0
    };

    // A resize observer
    this.ResizeObserver = new ResizeObserver(function () {
      _this.resize();
    });

    // An intersection observer
    this.IntersectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) _this.resize();
      });
    });
    this.IntersectionObserver.observe(this.canvas.element);

    // The parallax settings
    this.settings = {
      throttle: 100,
      depth: 50,
      alignment: 'center',
      firefoxDPR: 0
    };

    // Object assign the user settings
    for (var key in this.settings) {
      if (Object.hasOwnProperty.call(this.settings, key)) {
        if (options[key]) this.settings[key] = options[key];
      }
    }

    // Hack for firefox to reduce the DPR and improve performance / reduce stuttering
    if (!isNaN(this.settings.firefoxDPR) && this.settings.firefoxDPR > 0 && navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
      // Make sure the user has not set the DPR too high
      if (this.settings.firefoxDPR > this.dpr) this.settings.firefoxDPR = this.dpr;
      this.canvas.dpr = this.settings.firefoxDPR;
      this.buffer.dpr = this.settings.firefoxDPR;

      // this.canvas.resize();
      // this.buffer.resize();
    }

    // Observe the canvas element
    this.ResizeObserver.observe(this.canvas.element);

    // Set a classname for the static layer
    this["static"].className = 'carallax-img';

    // Keep track of everything going on
    this.status = {
      active: false,
      loaded: false,
      layers: 0,
      alignment: this.settings.alignment,
      depth: this.settings.depth,
      view: {
        top: 0,
        bottom: 0
      }
    };

    // Tell the canvas to begin drawing immediately
    this.enable();
    this.start();
  }
  _createClass(CarallaxController, [{
    key: "enable",
    value: function enable() {
      // Change the cached scrollY to -1 so the draw function will run
      this.cache.scrollY = -1;
    }

    // A method to load a single image layer
  }, {
    key: "load",
    value: function load() {
      var _this2 = this;
      var src = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      // Add 1 to the number of layers we have
      this.status.layers += 1;

      // create a new image element
      var image = new Image();
      // store the index
      var index = this.status.layers;

      // When the image loads, we need to add a new ParallaxLayer
      image.addEventListener('load', function () {
        // Tell the status that something is loaded
        _this2.status.loaded = true;
        // Add this layer to the layers object
        _this2.layers[index] = new ParallaxLayer(image, index);
        // Now we need to update some things
        _this2.resize();
        // Enable drawing
        _this2.enable();
        clearTimeout(_this2.timeouts['loaded']);
        _this2.timeouts['loaded'] = setTimeout(function () {
          // if the canvas.element does not have loaded class
          if (!_this2.canvas.element.classList.contains('parallax-canvas--loaded')) {
            // Add the loaded class to the canvas.element
            _this2.canvas.element.classList.add('parallax-canvas--loaded');
          }
        }, 100);

        // Update the depth of the image
        _this2.withEachLayer(function (Layer) {
          Layer.depth = _this2.status.layers - Layer.index;
          if (Layer.depth == 0) {
            _this2["static"].src = Layer.image.src;
          }
        });
      });

      // if the src is an element
      if (src instanceof Element) {
        var viewBox = src.getAttribute('viewBox');
        var width = src.getAttribute('width') || viewBox ? viewBox.split(' ')[2] : 1;
        var height = src.getAttribute('height') || viewBox ? viewBox.split(' ')[3] : 1;
        src.setAttribute('width', width);
        src.setAttribute('height', height);
        src.setAttribute('viewBox', "0 0 ".concat(width, " ").concat(height));

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
  }, {
    key: "add",
    value: function add() {
      var images = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      // Check if we passed in an array of images
      if (Array.isArray(images) || images instanceof NodeList) {
        // Loop through all the images and load them
        for (var index = 0; index < images.length; index++) {
          if (typeof images[index] == 'string' || images[index] instanceof Element) this.load(images[index]);
        }
        ;
      }
      // Otherwise if it is a single image, load that.
      else if (typeof images == 'string' || images instanceof Element) this.load(images);
    }
  }, {
    key: "calculateScrollPercent",
    value: function calculateScrollPercent() {
      var offset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var distance = offset + window.innerHeight - this.canvas.pageYOffset;
      var alignment = 0;
      var decimalPlaces = 2;
      switch (this.settings.alignment) {
        case 'top':
          alignment = 0;
        case 'bottom':
          alignment = 2;
        default:
          alignment = 1;
      }
      alignment = decimalPlaces * .5 * alignment;
      var calculation = distance / ((window.innerHeight + this.canvas.element.clientHeight) / decimalPlaces);
      var decimal = (calculation - alignment) * 2 / decimalPlaces;
      var result = decimal * this.status.depth;
      return result.toFixed(decimalPlaces);
    }
  }, {
    key: "getScrollPercentages",
    value: function getScrollPercentages() {
      var _this3 = this;
      this.calculations = {};
      var from = this.canvas.pageYOffset - window.innerHeight;
      var to = from + this.canvas.element.clientHeight + window.innerHeight;
      var _loop = function _loop(index) {
        _this3.calculations[index] = _this3.calculateScrollPercent(index);
        _this3.withEachLayer(function (Layer) {
          return Layer.parallax(_this3.calculations[index]);
        });
      };
      for (var index = from; index < to; index++) {
        _loop(index);
      }
    }
  }, {
    key: "getScrollPercent",
    value: function getScrollPercent() {
      // this.getScrollPercentages();
      var offset = Math.round(window.pageYOffset);

      // If we have a cached value, return that, otherwise calculate it
      if (!this.calculations[offset]) {
        this.calculations[offset] = this.calculateScrollPercent(offset);
      }
      return this.calculations[offset];
    }
  }, {
    key: "draw",
    value: function draw() {
      var _this4 = this;
      if (window.pageYOffset + window.innerHeight > this.status.view.top && window.pageYOffset < this.status.view.bottom) {
        // Clear the buffer canvas
        this.buffer.ctx.clearRect(0, 0, this.buffer.element.width, this.buffer.element.height);
        var percentScrolled = this.getScrollPercent();

        // Draw each image to the buffer canvas;
        this.withEachLayer(function (Layer) {
          if (Layer.depth != 0) {
            try {
              _this4.buffer.ctx.drawImage(Layer.canvas.element, 0, Layer.parallax(percentScrolled));
            } catch (e) {}
          }
        });

        // Draw the buffer image to the canvas
        this.canvas.ctx.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
        try {
          this.canvas.ctx.drawImage(this.buffer.element, 0, 0);
        } catch (e) {}
      }
    }
  }, {
    key: "update",
    value: function update() {
      var _this5 = this;
      window.requestAnimationFrame(function () {
        _this5.update();
        if (_this5.cache.scrollY != window.pageYOffset) {
          _this5.cache.scrollY = window.pageYOffset;
          _this5.draw();
        }
      });
    }

    // A method that will wait for the loaded status to be true, then run the draw function
  }, {
    key: "start",
    value: function start() {
      var _this6 = this;
      window.requestAnimationFrame(function () {
        _this6.status.loaded ? _this6.update() : _this6.start();
      });
    }
  }, {
    key: "resize",
    value: function resize() {
      var _this7 = this;
      clearTimeout(this.timeouts['resize']);
      this.timeouts['resize'] = setTimeout(function () {
        // Tell the canvas to resize
        _this7.canvas.resize(_this7.canvas.element.clientWidth, _this7.canvas.element.clientHeight);
        // Tell the buffer to resize
        _this7.buffer.resize(_this7.canvas.element.clientWidth, _this7.canvas.element.clientHeight);
        _this7.status.depth = _this7.canvas.element.clientWidth / Math.log(_this7.canvas.element.clientWidth) / 100 * (_this7.settings.depth * _this7.canvas.dpr);

        // Loop through the layers and resize them too, they only need the width of the canvas as their height is calculated
        _this7.withEachLayer(function (Layer) {
          return Layer.resize(_this7.canvas.element.clientWidth);
        });

        // Update the alignment of the layers
        switch (_this7.settings.alignment) {
          case 'top':
            // align to the top of the canvas
            _this7.withEachLayer(function (Layer) {
              return Layer.alignment = 0;
            });
            break;
          case 'bottom':
            // align to the bottom of the canvas
            _this7.withEachLayer(function (Layer) {
              return Layer.alignment = _this7.canvas.element.height - Layer.canvas.element.height;
            });
            break;
          default:
            // align vertically in the canvas
            _this7.withEachLayer(function (Layer) {
              return Layer.alignment = (_this7.canvas.element.height - Layer.canvas.element.height) * .5;
            });
            break;
        }

        // Set the view area of the canvas
        _this7.status.view.top = _this7.canvas.pageYOffset;
        _this7.status.view.bottom = _this7.canvas.pageYOffset + _this7.canvas.element.clientHeight;
        _this7.cache.canvasOffset = _this7.canvas.pageYOffset;

        // Make sure it still draws during the resize
        _this7.enable();

        // Clear all the calculations
        _this7.calculations = {};
        _this7.getScrollPercentages();
      }, this.settings.throttle);
    }

    // A helper function to loop through the layers
  }, {
    key: "withEachLayer",
    value: function withEachLayer() {
      var func = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      if (func && typeof func === 'function') {
        for (var layer in this.layers) {
          if (Object.hasOwnProperty.call(this.layers, layer)) func(this.layers[layer]);
        }
      }
    }
  }]);
  return CarallaxController;
}();
exports["default"] = CarallaxController;
var ParallaxLayer = /*#__PURE__*/function () {
  function ParallaxLayer(image, index) {
    _classCallCheck(this, ParallaxLayer);
    // The actual image element
    this.image = image;
    // The layer index
    this.index = index;
    // The visual depth of the layer
    this.depth = 0;
    // Create a new buffer canvas
    this.canvas = new Canvas();
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
  _createClass(ParallaxLayer, [{
    key: "draw",
    value: function draw() {
      // Draw the image on the canvas at the appropriate size
      this.canvas.ctx.drawImage(this.image, 0, 0, this.canvas.element.width, this.canvas.element.height);
    }
  }, {
    key: "parallax",
    value: function parallax(view) {
      // We only want to parallax the layer if it has some depth
      if (this.depth === 0) return this.alignment;
      if (!this.calculations[view]) {
        // const scale = this.height / window.innerHeight;
        var perspective = view * this.depth;
        var calculation = this.alignment + perspective;
        this.calculations[view] = Math.round(calculation);
      }
      return this.calculations[view];
    }
  }, {
    key: "resize",
    value: function resize(width) {
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
  }]);
  return ParallaxLayer;
}();
/* ██████╗ █████╗ ███╗   ██╗██╗   ██╗ █████╗ ███████╗
  ██╔════╝██╔══██╗████╗  ██║██║   ██║██╔══██╗██╔════╝
  ██║     ███████║██╔██╗ ██║██║   ██║███████║███████╗
  ██║     ██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══██║╚════██║
  ╚██████╗██║  ██║██║ ╚████║ ╚████╔╝ ██║  ██║███████║
   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝ */
var Canvas = /*#__PURE__*/function () {
  function Canvas() {
    _classCallCheck(this, Canvas);
    // Create a new canvas element
    this.element = document.createElement('canvas');
    // The canvas context
    this.ctx = this.element.getContext('2d');
    // The devicePixelRatio
    this.dpr = window.devicePixelRatio || 1;
    // The page offset
    this.pageYOffset = 0;
  }

  // Resize the buffer canvas
  _createClass(Canvas, [{
    key: "resize",
    value: function resize() {
      var width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
      var height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      var offset = 0;
      var element = this.element;
      while (element) {
        offset += element.offsetTop;
        element = element.offsetParent;
      }
      this.element.width = width * this.dpr;
      this.element.height = height * this.dpr;
      // Update the pageYOffset of the canvas
      this.pageYOffset = offset;
    }
  }]);
  return Canvas;
}();