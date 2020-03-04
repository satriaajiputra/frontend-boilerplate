const { parallel, series, src, task, dest, watch } = require("gulp");
const package = require("./package.json");
const autoprefixer = require("autoprefixer");
const postcss = require("gulp-postcss");
const tailwindcss = require("tailwindcss");
const rollup = require("@rollup/stream");
const babel = require("rollup-plugin-babel");
const buffer = require("vinyl-buffer");
const source = require("vinyl-source-stream");
const nodeResolve = require("@rollup/plugin-node-resolve");
const commonJS = require("@rollup/plugin-commonjs");
const { uglify } = require("rollup-plugin-uglify");
const sourcemaps = require("gulp-sourcemaps");
const browserSync = require("browser-sync").create();
const reload = browserSync.reload;
const sass = require("gulp-sass");
const cssnano = require("cssnano")({
  preset: "default"
});
const purgecss = require("@fullhuman/postcss-purgecss")({
  // Specify the paths to all of the template files in your project
  content: [
    "./src/**/*.html"
    // etc.
  ],

  // Include any special characters you're using in this regular expression
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
});

// Config
const config = {
  indexJS: package.main,
  indexCSS: "app.scss"
};

task("scss", function(cb) {
  src("src/assets/scss/" + config.indexCSS)
    .pipe(sass().on("error", sass.logError))
    .pipe(
      postcss([
        tailwindcss("./tailwind.config.js"),
        autoprefixer,
        ...(process.env.NODE_ENV === "production" ? [purgecss] : []),
        ...(process.env.NODE_ENV === "production" ? [cssnano] : [])
      ])
    )
    .pipe(dest("dist/assets/css/"));

  src(["src/assets/scss/*", "!src/assets/scss/" + config.indexCSS])
    .pipe(sass().on("error", sass.logError))
    .pipe(
      postcss([
        autoprefixer,
        ...(process.env.NODE_ENV === "production" ? [cssnano] : [])
      ])
    )
    .pipe(dest("dist/assets/css/"));
  cb();
});

task("html", function(cb) {
  src("src/**/*.html").pipe(dest("dist/"));
  cb();
});

task("js", function() {
  return rollup({
    input: "src/assets/js/" + config.indexJS,
    external: ["jquery"],
    output: {
      format: "umd",
      sourcemap: process.env.NODE_ENV === "production" ? false : true,
      globals: {
        jquery: "jQuery"
      }
    },
    onwarn: function(warning, next) {
      return;
    },
    plugins: [
      nodeResolve(),
      commonJS(),
      babel({
        presets: ["@babel/preset-env"]
      }),
      ...(process.env.NODE_ENV === "production" ? [uglify()] : [])
    ]
  })
    .pipe(source(config.indexJS, "./src/assets/js"))
    .pipe(buffer())
    .pipe(
      process.env.NODE_ENV !== "production"
        ? sourcemaps.init({ loadMaps: true })
        : buffer()
    )
    .pipe(
      process.env.NODE_ENV !== "production" ? sourcemaps.write(".") : buffer()
    )
    .pipe(dest("dist/assets/js"));
});

task("fonts", function(cb) {
  src("src/assets/fonts/*").pipe(dest("dist/assets/fonts/"));
  cb();
});

task("images", function(cb) {
  src("src/assets/images/*").pipe(dest("dist/assets/images/"));
  cb();
});

task("watch", function(cb) {
  browserSync.init({
    server: "./dist",
    notify: false
  });

  watch("src/assets/images/*", task("images"));
  watch("src/assets/fonts/*", task("fonts"));
  watch("src/**/*.scss", task("scss")).on("change", reload);
  watch("src/**/*.html", task("html")).on("change", reload);
  watch("src/**/*.js", task("js")).on("change", reload);
  cb();
});

exports.scss = task("scss");
exports.html = task("html");
exports.js = task("js");
exports.fonts = task("fonts");
exports.images = task("images");
exports.watch = task("watch");
exports.default = series("scss", "html", "js", "fonts", "images", "watch");
exports.production = series("scss", "html", "js", "fonts", "images");
