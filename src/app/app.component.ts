import { Component, VERSION } from '@angular/core';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  loadAPI: Promise<any>;

  constructor() {
    this.loadAPI = new Promise((resolve) => {
      this.loadScript();
      resolve(true);
    });
  }

  public loadScript() {
    var isFound = false;
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; ++i) {
      if (
        scripts[i].getAttribute('src') != null &&
        (scripts[i].getAttribute('src').includes('atomjs') ||
          scripts[i].getAttribute('src').includes('libcanvas'))
      ) {
        isFound = true;
      }
    }

    if (!isFound) {
      const dynamicScripts = [
        'https://cdn.rawgit.com/theshock/atomjs/master/atom-full-compiled.js',
        'https://cdn.rawgit.com/theshock/libcanvas/master/libcanvas-full-compiled.js',
      ];

      for (var i = 0; i < dynamicScripts.length; i++) {
        let node = document.createElement('script');
        node.src = dynamicScripts[i];
        node.type = 'text/javascript';
        node.async = false;
        node.charset = 'utf-8';
        document.getElementsByTagName('head')[0].appendChild(node);
      }
    }
  }
}
