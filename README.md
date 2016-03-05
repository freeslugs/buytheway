# buy the way
find restaurants along your route

## tl;dr
- react
- es7 (babel)
- webpack

## install
1. `brew install node`
1. `npm install --dev`

## run
### local server
- `npm start`
- run's webpack server, hot reloading

### build for prod
- `webpack`
- add `--watch` to watch files

## debug
- google, stackoverflow
- ask [@freeslugs](https://github.com/freeslugs)

## code conventions
- avoid callback hell. use promises, and if you're returning a value (such a geocode pt), use `async` and `await`.

## development tools:
- I recommend using Sublime and the [babel](https://github.com/babel/babel-sublime) library for syntax highlighting

## to-do
- location after time
- split app.js into different component files
- gas stations?
- config keys
- scrollable restaurant list?
