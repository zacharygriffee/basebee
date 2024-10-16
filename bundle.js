import {
    pack,
    rollupFromJsdelivr,
    rollupFromSourcePlugin,
    rollupVirtualPlugin
} from "bring-your-own-storage-utilities/deploy";
import commonjs from "@rollup/plugin-commonjs";
import {fileURLToPath} from "bring-your-own-storage-utilities/find";
import path from "node:path";

import LocalDrive from "localdrive";
import terser from "@rollup/plugin-terser";

const p = fileURLToPath(import.meta.url);
const __dirname = path.dirname(p);

const projectFolder = new LocalDrive(path.resolve(__dirname, "./"));

// prebundles

await pack("prebundling", "./lib/prebundles/from-cjs.js", {
    plugins: [
        rollupFromJsdelivr(),
        rollupVirtualPlugin({
            "prebundling": `export {default as Autobase} from "autobase";export {default as Hyperbee} from "hyperbee";export {default as hypercoreId} from "hypercore-id-encoding";`
        }),
        rollupFromSourcePlugin(projectFolder)
    ]
})

// await Promise.all([
//     ["autobase", "./lib/prebundles/autobase.js"],
//     ["hyperbee", "./lib/prebundles/hyperbee.js"],
//     ["hypercore-id-encoding", "./lib/prebundles/hypercore-id-encoding.js"],
// ].map(([mod, dest]) => {
//     return pack(mod + "_", dest, {
//         plugins: [
//             rollupFromJsdelivr(),
//             rollupVirtualPlugin({
//                 [mod + "_"]: `export {default} from "${mod}";`
//             }),
//             rollupFromSourcePlugin(projectFolder)
//         ]
//     })
// }));

// await pack("./index.js", "./dist/index.min.js", {
//     plugins: [
//         rollupFromSourcePlugin(projectFolder),
//         commonjs(),
//         terser()
//     ]
// });

