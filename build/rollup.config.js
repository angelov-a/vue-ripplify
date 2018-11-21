import { terser } from "rollup-plugin-terser"

export default {
    input: 'src/wrapper.js',

    output: {
        name: 'VueRipplify',
        exports: 'named',
    },
    
    plugins: [terser()],
}