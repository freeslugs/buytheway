# buy the way
find restaurants along your route

## tl;dr
- react
- es7 (babel)
- webpack

## install
1. `brew install node`
1. `npm install --dev`
- troubles with webpack? 
  - `npm install webpack -g`
  - `npm install webpack-dev-server -g`

## run
### local server
- `npm start`
- run's webpack server, hot reloading

### build for prod
- `webpack`
- add `--watch` to watch files

#### deploy
- build for prod
- `git checkout gh-pages`
- `git merge master`
- `git push origin`
- github auto deploys gh-pages to freeslugs.github.io/buytheway

## debug
- google, stackoverflow
- ask [@freeslugs](https://github.com/freeslugs)

## code conventions
- avoid callback hell. use promises, and if you're returning a value (such a geocode pt), use `async` and `await`. 
