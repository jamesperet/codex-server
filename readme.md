# Codex Server

Codex is a markdown wiki server with mathjax and syntax highlighting.

### How it works

The codex server works as web server for local files inside a directory and its subdirectories. Codex will render each filetype with a nice customizable webpage template.

### Configuration

To quickly create a new configuration file, run the command ``codex create config``. This will create the file ``.codex-data/config/default.json`` and add a basic configuration:

```json
{
    "server-title" : "Untitled Codex",
    "views-path" : "/Users/james/dev/codex/codex-classic-theme/views/",
    "modules" : [
      {
        "name" : "codex-classic-theme",
        "module" : "../codex-classic-theme"
      }
    ]
}
```

### Starting

To start the server, navigate to the root folder of your file hierarchy and run the command: ```codex start``` to start the program.

Press ```Ctrl + c``` to stop the process.

### Templates

For nice looking pages, you will need to place a templates folder called ```views/``` in the root of your hierarchy. In this folder place ```.html``` or ```.ejs``` files for each type of template:

- ```index.html``` - This is the main template for rendering most pages (like markdown). Add ```<%- body %>``` somewhere in this file for rendering content passed from codex.
- ```error-404.html``` - A basic error page template.

Restarting the server is not required when changing templates.

### Development

Details and ideas about the development of **codex-server**.

##### Resources

- [Auth0](https://auth0.com/) – External user manager and authentication.
- [express-ejs-layout using different layout](https://stackoverflow.com/questions/51913819/express-ejs-layout-using-different-layout) – Use different themes.
- [Notion Icons 2.0](https://awesomeopensource.com/project/Vyshnav2255/Notion-Icons-2.0?categoryPage=44) – alternative icons that maybe could be used for this app.
- [The Top 42 Notion Open Source Projects](https://awesomeopensource.com/projects/notion?categoryPage=44) – Projects related to Notion that could be a source of inspiration for this project.
- [How to create an SQLite database in node.js](https://www.atdatabases.org/blog/2021/02/03/create-sqlite-database) – Embed a database inside **codex-server**.
- [Bootstrap v5](https://getbootstrap.com/docs/5.0/) and [icons](https://icons.getbootstrap.com/)
- [Vorpal Docs](https://github.com/dthree/vorpal/wiki/api-%7C-vorpal)
- [Node Config](https://www.npmjs.com/package/config)
- [Change view default path](https://stackoverflow.com/questions/45903473/set-the-lookup-path-of-view-folder-of-ejs-in-express/58341138):
  
  ```javascript
  app.set('views', path.join(__dirname, '../views'))
  ```
- [VueJS 3 crash course](https://www.youtube.com/watch?v=qZXt1Aom3Cs)

---

*Codex Server – create by James Peret – 2017*
