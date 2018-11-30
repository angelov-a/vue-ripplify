import {
    DURATION_MS,
    DEACTIVATION_MS,
    COLOR,
    Z_INDEX,
    ACTIVATION_EVENT_TYPES,
    DEACTIVATION_EVENT_TYPES,
    SCALE_INITIAL
} from './constants'

import './style.css'

var Ripplify = {
    bind(el, binding) {
        var value = binding.value || {}

        if (!value.isDisabled) {
            init(el, binding)
        }
    },

    // Checks if any ripple settings have been updated and if needed either
    // turns the ripple effect on/off or reinitializes it
    update(el, binding) {
        var value = binding.value || {},
            oldValue = binding.oldValue || {}

        if (value.isDisabled !== oldValue.isDisabled) {
            if (!value.isDisabled) {
                init(el, binding)
            } else {
                destroy(el)
            }
        } else if (
            !value.isDisabled && (
                value.isUnbounded !== oldValue.isUnbounded ||
                value.duration !== oldValue.duration ||
                value.fadeDuration !== oldValue.fadeDuration ||
                value.color !== oldValue.color ||
                value.zIndex !== oldValue.zIndex
            )
        ) {
            destroy(el)
            init(el, binding)
        }
    }    
}

function destroy(el) {
    dettachActivationListeners(el)
}

function dettachActivationListeners(el) {
    Object.keys(el.ripplifyActivationListeners).forEach(type => {
        el.removeEventListener(type, el.ripplifyActivationListeners[type])
    })
}

function init(
    el,
    {
        // Ripple defaults
        value: {
            isUnbounded = Ripplify.isUnbounded || false,
            duration = ensurePositiveNumber(Ripplify.duration) || DURATION_MS,
            fadeDuration = ensurePositiveNumber(Ripplify.fadeDuration) || DEACTIVATION_MS,
            color = Ripplify.color || COLOR,
            zIndex = Ripplify.zIndex || Z_INDEX
        } = {},
        arg: activationEventTypes = ACTIVATION_EVENT_TYPES
    } = {}
) {
    var settings = {
        isUnbounded,
        duration,
        fadeDuration,
        color,
        zIndex,
        activationEventTypes
    }
    var state = {
        isAnimationInProgress: false,
        hasInteractionEnded: false,
        rippleSurface: {},
        timeouts: {},
        elOriginalPosition: '',
        el
    }

    attachActivationListeners(el, settings, state)
}

// returns null if the value is not a number or is not positive
function ensurePositiveNumber(val) {
    return (
        isNaN(val) || val <= 0
        ? null
        : val
    )
}

// Listen for user interactions
function attachActivationListeners(el, { isUnbounded, duration, fadeDuration, color, zIndex, activationEventTypes }, state) {
    if (!Array.isArray(activationEventTypes)) {
        activationEventTypes = [ activationEventTypes ]
    }

    el.ripplifyActivationListeners = {}

    activationEventTypes.forEach(type => {
        el.ripplifyActivationListeners[type] = function (event) {
            doRipple(event, el, { isUnbounded, duration, fadeDuration, color, zIndex }, state);
        }

        el.addEventListener(type, el.ripplifyActivationListeners[type])
    })
}

// Produces the ripple effect itself
function doRipple(event, el, settings, state) {
    // Contains references to the rippleContainer and ripple elements.
    // Styles are applied with attributes calculated upon the target's
    // dimensions.
    // Initial transform scale is set to a fraction of the longer of
    // the target's dimensions (width and height).
    var rippleSurface = prepare(event, el, settings)

    // This means that a ripple from a previous interaction still exists.
    // It needs to be destroyed and any timeouts that reference it removed
    // as well before creating a new ripple
    if (state.isAnimationInProgress || state.hasInteractionEnded) {
        Object.keys(state.timeouts).forEach(timeout => {
            clearTimeout(state.timeouts[timeout])
            delete state.timeouts[timeout]
        })

        destroyRippleSurface(state.rippleSurface)
    }

    state.rippleSurface = rippleSurface
    state.isAnimationInProgress = true
    state.hasInteractionEnded = false
    
    setElPositionToRelative(state)
    
    attachDeactivationListeners(rippleSurface, state, settings.fadeDuration)

    // Requests an animation frame which sets the ripple's
    // tranform scale to full size (=== 1).
    // Timeouts are set to fade and destroy the rippleSurface
    animate(rippleSurface, state, settings.duration, settings.fadeDuration)
}

function prepare(event, el, settings) {
    var rippleSurface = createRippleSurface()
    
    setStyles(rippleSurface, el, event, settings)
    attachSurface(el, rippleSurface)
    
    return rippleSurface
}

function createRippleSurface() {
    var ripple = document.createElement("div"),
        rippleContainer = document.createElement("div")

    return { rippleContainer, ripple }
}

function setStyles({ rippleContainer, ripple }, el, event, { isUnbounded, duration, fadeDuration, color, zIndex }) {
    var {
        width,
        height,
        left,
        top,
        scale,
        borderTopLeftRadius,
        borderTopRightRadius,
        borderBottomLeftRadius,
        borderBottomRightRadius
    } = calcRippleSurfaceDimensions(el, event, isUnbounded)

    rippleContainer.className = 'vue-ripplify-container'
    ripple.className = 'vue-ripplify-ripple'

    rippleContainer.style.cssText = `
        border-top-left-radius: ${borderTopLeftRadius};
        border-top-right-radius: ${borderTopRightRadius};
        border-bottom-left-radius: ${borderBottomLeftRadius};
        border-bottom-right-radius: ${borderBottomRightRadius};
    `

    ripple.style.cssText = `
        top: ${top};
        left: ${left};
        width: ${width};
        height: ${height};
        z-index: ${zIndex};
        background-color: ${color};
        transition:
            opacity ${fadeDuration}ms linear,
            transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1);
        transform: scale(${scale});
    `
}

function calcRippleSurfaceDimensions(el, event, isUnbounded) {
    var rippleDimensions = (
        isUnbounded
        ? calcUnbounded()
        : calcBounded(el, event)
    )

    var style = window.getComputedStyle(el)

    return {
        ...rippleDimensions,

        borderTopLeftRadius: style.borderTopLeftRadius,
        borderTopRightRadius: style.borderTopRightRadius,
        borderBottomLeftRadius: style.borderBottomLeftRadius,
        borderBottomRightRadius: style.borderBottomRightRadius
    }

}

function calcUnbounded() {
    return {
        width: '102%',
        height: '102%',
        left: '-1%',
        top: '-1%',
        scale: SCALE_INITIAL
    }
}

function calcBounded(el, event) {
    var rect                = el.getBoundingClientRect(),
        rectLeft            = rect.left,
        rectTop             = rect.top,
        elWidth             = el.offsetWidth,
        elHeight            = el.offsetHeight,
        widthToHeightRatio  = elWidth / elHeight,
        eventX              = (100 * (event.clientX - rectLeft)) / elWidth,
        eventY              = (100 * (event.clientY - rectTop)) / elHeight,
        eventYRelavite      = eventY / widthToHeightRatio,
        maxX                = Math.max(eventX, 100 - eventX),
        maxY                = Math.max(eventYRelavite, 100 / widthToHeightRatio - eventYRelavite),
        radius              = Math.sqrt(Math.pow(maxX, 2) + Math.pow(maxY, 2)),
        diameter            = radius * 2,
        maxDim              = Math.max(100, (100 * elHeight) / elWidth)

    return {
        width: diameter + "%",
        height: diameter * widthToHeightRatio + "%",
        left: eventX - radius + "%",
        top: eventY - radius * widthToHeightRatio + "%",
        scale: (SCALE_INITIAL * maxDim) / diameter
    }
}

function attachSurface(el, { rippleContainer, ripple }) {
    rippleContainer.appendChild(ripple);
    el.appendChild(rippleContainer);
}

// The target's position needs to be 'relative' in order to
// properly set the ripple's dimensions and position
function setElPositionToRelative(state) {
    var el = state.el

    // The original position is saved so it can
    // be restored after the ripple has ended
    state.elOriginalPosition =  (
        el.style.position.length > 0
        ? el.style.position
        : getComputedStyle(el).position
    )

    if (state.elOriginalPosition !== 'relative') {
        el.style.position = 'relative'
    }
}

function restoreElOriginalPosition(state) {
    var el = state.el

    if (state.elOriginalPosition !== getComputedStyle(el).position) {
        el.style.position = state.elOriginalPosition
    }
}

// Listens to deactivation events like 'mouseup'.
// The ripple surface will not be faded and destroyed unless
// the animation has ended AND a deactivation event has occurred
function attachDeactivationListeners(rippleSurface, state, fadeDuration) {
    document.body.ripplifyDeactivationListeners = {}

    DEACTIVATION_EVENT_TYPES.forEach(type => {
        document.body.ripplifyDeactivationListeners[type] = function () {
            state.hasInteractionEnded = true

            dettachDeactivationListeners()

            fadeRipple(rippleSurface, state, fadeDuration)
        }

        document.body.addEventListener(type, document.body.ripplifyDeactivationListeners[type])
    })
}

function dettachDeactivationListeners() {
    Object.keys(document.body.ripplifyDeactivationListeners).forEach(type => {
        document.body.removeEventListener(type, document.body.ripplifyDeactivationListeners[type])
    })
}

function animate(rippleSurface, state, duration, fadeDuration) {
    var ripple = rippleSurface.ripple

    function scale() {
        if (ripple) {
            ripple.classList.add('vue-ripplify-full-scale')

            state.timeouts.fade = setTimeout(() => {
                state.isAnimationInProgress = false
                fadeRipple(rippleSurface, state, fadeDuration)
            }, duration)
        }
    }

    requestAnimationFrame(scale)
}

function fadeRipple(rippleSurface, state, fadeDuration) {
    var ripple = rippleSurface.ripple

    function fade() {
        ripple.style.opacity = 0
    }

    // The animation and the user interaction both need to end
    // before fading and destroying the ripple
    if (!state.isAnimationInProgress && state.hasInteractionEnded) {
        requestAnimationFrame(fade)

        state.timeouts.destroy = setTimeout(() => {
            state.hasInteractionEnded = false
            destroyRippleSurface(rippleSurface)
            restoreElOriginalPosition(state)
        }, fadeDuration)
    }
}

function destroyRippleSurface(rippleSurface) {
    rippleSurface.rippleContainer.parentNode.removeChild(rippleSurface.rippleContainer)
}

export default Ripplify