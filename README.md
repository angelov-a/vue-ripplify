
# Material Design Ripple for Vue

A configurable directive-based Ripple effect for Vue.

Notable features:

* Ability to change options and turn on/off dynamically
* Ripple resizes correctly if target size changes mid-effect
* Unbounded option

[Live demo](https://angelov-a.github.io/vue-ripplify/)

## Installation

```
npm install vue-ripplify --save
```


## Usage

```javascript
// in builds
import VueRipplify from 'vue-ripplify'

Vue.directive('ripple', VueRipplify)
```

```html
<!-- when using a <script> tag -->
<script type="text/javascript" src="https://unpkg.com/vue-ripplify"></script>
```

```html
<!-- application -->
<div v-ripple class="button">A button with ripple</div>
```


## Options

The directive can be configured by assigning an object with the following optional keys.

| Key           | Type    | Default Value           | Description
| :------------ | :------ | :---------------------- | :--------------------------------------------------------- |
| `isDisabled`  | Boolean | `false`                 | Disables the ripple effect.                                |
| `isUnbounded` | Boolean | `false`                 | Unbounded ripple variant for icons, action buttons, etc.   |
| `duration`    | Number  | `250`                   | Effect duration in ms. Does not include fade time.         |
| `color`       | String  | `'rgba(0, 0, 0, 0.26)'` | A CSS-valid color value. RGBA with low opacity recommended.|
| `zIndex`      | Number  | `20`                    | Effect z-index.                                            |


## Examples

A custom colored ripple.
```html
<div v-ripple="{ color: 'rgba(44, 221, 0, .36)' }">Custom Ripple</div>
```

Variables can be used for dynamic control.
vue-ripplify will reconfigure the effect when either of `this.isRippleDisabled` or `this.rippleColor` changes.
```html
<div v-ripple="{ isDisabled: isRippleDisabled, color: rippleColor }">Dynamically Configured Ripple</div>
```


## Global Options

Setting default values can be set thus:

```js
import Ripplify from 'vue-ripplify'

Ripplify.isUnbounded = false
Ripplify.duration = 125
Ripplify.color = 'rgba(255, 255, 255, 0.26)'
Ripplify.zIndex = 150

Vue.directive('ripple', Ripplify)
```
