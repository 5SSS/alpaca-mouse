const cluster = require('cluster');
const url = require('url');
const path = require('path');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const cpuNums = require('os').cpus().length;
const PORT = process.env.PORT || 5000;
const ROOT = '/pages';

const parseItem = (name, parentPath) => {
  let path = '';
  if (/\/$/.test(parentPath)) {
    path = parentPath + name;
  } else {
    path = parentPath + '/' + name;
  }
  return '<div><a href="' + path + '">' + name + '</a></div>';
};

const list = (arr, parentPath) => {
  let str = arr.map(name => parseItem(name, parentPath)).join('');
  if (parentPath === ROOT + '/') {
    return str;
  }
  return '<div><a href="../">[back]</a></div>' + str;
};

if (cluster.isMaster) {
  console.log('主进程正在运行,PORT:', 3001);

  for (let i = 0; i < cpuNums; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {});
} else {
  http
    .createServer((req, res) => {
      let pathname = ROOT + url.parse(req.url).pathname;
      if (/(\/pages){2}/.test(pathname)) {
        pathname = pathname.replace(/^(\/pages)/, '');
      }
      let parentPath = pathname;
      let filepath = path.join(__dirname, pathname);

      try {
        let stats = fs.statSync(filepath);
        if (stats.isFile()) {
          // gzip
          res.setHeader('content-encoding', 'gzip');
          const gzip = zlib.createGzip();
          let readStream = fs.createReadStream(filepath);
          readStream.pipe(gzip).pipe(res);
        } else if (stats.isDirectory()) {
          let dirArr = fs.readdirSync(filepath);
          dirArr.sort((a, b) => {
            let p = /\./g;
            if (p.test(a) && !p.test(b)) {
              return -1;
            } else if (!p.test(a) && p.test(b)) {
              return 1;
            } else {
              return 0;
            }
          });
          res.end(list(dirArr, parentPath));
        } else {
          res.writeHead(404, 'not found');
          res.end('not found');
        }
      } catch (err) {
        res.writeHead(404, 'not found');
        res.end('not found');
      }
    })
    .listen(PORT);
}
