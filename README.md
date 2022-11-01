# Carallax

This class will create a canvas element to draw a layered parallax effect.

## Installation

```bash
npm i carallax
```

## Usage

#### HTML

```html
<section class="banner">
    <svg> ... </svg>
    <svg> ... </svg>
    <svg> ... </svg>
    <svg> ... </svg>
</section>
```

#### JavaScript

```es6
import CarallaxController from 'carallax';

const banner = document.querySelector('.banner');

const Carallax = new CarallaxController({
    depth: 50,
    alignment: 'bottom',
});
```

#### Put the canvas into the document

```es6
banner.appendChild(Carallax.canvas.element);
```

#### We can either load SVGs from the DOM
```es6
Carallax.add(banner.querySelectorAll('svg'));
```

#### Or we can load images from a URL
```es6
Carallax.add('https://example.com/image.png');
```

#### The front most layer is always static and will not move on scroll. The static layer needs to be added manually.

```es6
banner.appendChild(Carallax.static);
```

## Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `depth` | `number` | The depth of the parallax effect. | `50` |
| `alignment` | `string` | The alignment of the parallax effect. Can be `top`, `center` or `bottom`. | `center` |
| `throttle` | `number` | The resize calculations throttle time in milliseconds. | `100` |
| `firefoxDPR ` | `number` | The DPR multiplier value for Firefox. `0 - 1` | `1` |

## Note:

Currently Firefox struggles to call the canvas `drawImage` method repeatedly. This causes the parallax effect to stutter on larger images / displays. To remedy this I have halved the dpr on Firefox. The "static" layer will render full resolution, while the parallax layers will render at half resolution. This is a temporary fix until I can find a better solution or Firefox fixes the issue. If you have any ideas please let me know.

I have personally found Firefox can perform well with a `firefoxDPR` multiplier value around `0.5` - `0.75`. Any higher than this and the parallax effect will stutter at large scale. It's best to test this on your own project to find the best value for your needs as the lower the value the better the performance, but the image resolution will be lower.

## License
[MIT](https://choosealicense.com/licenses/mit/)

