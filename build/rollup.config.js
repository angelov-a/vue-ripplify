import { terser } from "rollup-plugin-terser"
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'

export default {
    input: 'src/wrapper.js',

    output: {
        name: 'VueRipplify',
        exports: 'named',
    },
    
    plugins: [
        postcss({
            plugins: [autoprefixer()],
            minimize: true
        }),
        terser()
    ],
}