import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { createRequire } from 'node:module'
import esbuild from 'esbuild'

/**
 * 解析命令行参数
 */
const {
    values: { format },
    positionals
} = parseArgs({
    allowPositionals: true, // 允许未知参数
    // 配置 options 即类似配置 vue 的 props
    options: {
        format: {
            type: 'string', // 类型
            default: 'cjs', // 默认值
            short: 'f' // 别名
        }
    }
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename, '..')

// 要打包的目标模块
const target = positionals.length ? positionals[0] : 'vue'

const entry = resolve(__dirname, '../packages', target, 'src/index.ts')
const outfile = resolve(
    __dirname,
    '../packages',
    target,
    `dist/${target}.${format}.js`
)

const require = createRequire(import.meta.url)

async function run() {
    const pkgPath = resolve(__dirname, '../packages', target, 'package.json')
    const pkg = require(pkgPath)

    esbuild
        .context({
            entryPoints: [entry],
            outfile,
            format,
            platform: format === 'cjs' ? 'node' : 'browser',
            sourcemap: true,
            bundle: true, // 把所有的依赖打包成一个文件
            globalName: pkg.buildOptions.name // 打包后的全局变量名
        })
        .then(build => {
            build.watch({})
        })
}
run()
