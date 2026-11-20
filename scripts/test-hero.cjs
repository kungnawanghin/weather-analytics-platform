/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".tsx"] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename,
);

const originalLoad = Module._load;
let reduced = false, scrollProgress = 0;
Module._load = function (name, ...args) {
  const value = originalLoad.call(this, name, ...args);
  if (name !== "framer-motion") return value;
  return {
    ...value,
    useReducedMotion: () => reduced,
    useScroll: () => ({ scrollYProgress: value.motionValue(scrollProgress) }),
  };
};
const Hero = require("../components/ui/scroll-expansion-hero.tsx").default;
Module._load = originalLoad;

for (const mode of [false, true]) {
  reduced = mode;
  for (const position of [0, 0.5, 1]) {
    scrollProgress = position;
    const html = renderToStaticMarkup(React.createElement(Hero, { mediaType: "video", mediaSrc: "/weather.mp4", title: "BEYOND THE FORECAST" }));
    assert.ok(html.includes('class="relative h-[220svh]"'), "Scroll track must remain in both motion modes");
    assert.ok(html.includes(`* ${position})`), "Media expansion must follow scroll, including reduced motion");
    if (position === 0) assert.match(html, /<h1[^>]*opacity:1/);
    assert.equal(html.includes('autoPlay=""'), !mode);
    if (mode) assert.ok(!html.includes("-37.5vw"), "Reduced mode must not fly the title sideways");
  }
}
console.log("PASS: hero start/mid/end expansion and scroll track in normal/reduced modes; readable title and video preference");
