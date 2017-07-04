# Codex Server

Codex is a markdown wiki server with mathjax and syntax highlighting.

### How it works

The codex server works as web server for local files inside a directory and its subdirectorys. Codex will render each filetype with a nice customizable webpage template.

### Starting

To start the server, navigate to the root folder of your file hierarchy and run the command: ```codex``` to start the program.

Press ```Ctrl + c``` to stop the process.

### Templating

For nice looking pages, you will need to place a templates folder called ```views/``` in the root of your hierarchy. In this folder place ```.html``` or ```.ejs``` files for each type of template:

- ```index.html``` - This is the main template for rendering most pages (like markdown). Add ```<%- body %>``` somewhere in this file for rendering content passed from codex.
- ```error-404.html``` - A basic error page template.

Restarting the server is not required when changin templates.

---

*Codex Server – create by James Peret – 2017*
