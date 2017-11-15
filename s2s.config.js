require('ts-node').register()

const { createPluginsFromMetaRules } = require('s2s-meta-rules')

const metaOpts = {
  babylonPlugins: ['typescript', 'classProperties']
}

const metaRule = {
  'index.ts': {
    plugin: './scripts/test-rule'
  }
}

const plugins = createPluginsFromMetaRules(metaRule, metaOpts)

module.exports = {
  watch: './**/*',
  plugins,
  prettier: false
}
