# warehouse_system_ui

> A Vue.js project

## deploy script
``` bash
# build and deploy to development server
npm run deploy-dev

# build and deploy to core server
npm run deploy-core

# build and deploy to production server (warning: It will overwrite the production server, make sure you know what you are doing!!!)
npm run release-to-stage-be-Careful
``` 

## breakdown Build steps

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for development server without minification
npm run build

# build for core server without minification
npm run build -- core

# build for production with minification (be extremely careful when you run this, it can mess up server with wrong config)
npm run build -- production

# build for production and view the bundle analyzer report
npm run build --report

# deploy on firebase development server
firebase deploy -P development

# deploy on firebase core server
firebase deploy -P core

# deploy on firebase production server (be extremely careful when you run this, it can mess up server with wrong config)
firebase deploy -P production
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
# warehouse_system_ui
