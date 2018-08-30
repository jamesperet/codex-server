module.exports.parse = function(data){
  var md = require('markdown-it')({
      html: true,
      linkify: true,
      typographer: true
    })
    .use(require('markdown-it-mermaid').default)
    .use(require('markdown-it-math'), {
      inlineOpen: '\\(',
      inlineClose: '\\)',
      blockOpen: '\\[',
      blockClose: '\\]'
    })
    //.use(require('markdown-it-highlightjs'), {auto: true, code: false})
  return md.render(data)
}
