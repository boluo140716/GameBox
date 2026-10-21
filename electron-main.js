/* Electron 入口：本地起一个只监听 127.0.0.1 的静态服务器，再用窗口加载。
   这样 iframe、hash 路由、localStorage、Service Worker 都能按正常 http 页面工作。 */
const { app, BrowserWindow, shell } = require('electron');
const { start } = require('./server');

let mainWindow = null;
let httpServer = null;

app.setAppUserModelId('com.gamebox.app');

async function createWindow() {
  const port = await start(0);

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#0b1220',
    autoHideMenuBar: true,
    show: false,
    title: '游戏盒 GameBox',
    icon: require('node:path').join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  // 外链一律用系统浏览器打开，不在应用内跳走
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (httpServer) httpServer.close();
});
