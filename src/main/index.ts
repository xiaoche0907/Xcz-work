import { app, shell, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initIpc } from './ipc'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 860,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#4b5563',
      height: 36
    },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register custom media scheme before app is ready to ensure privileges are set
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true, standard: true, corsEnabled: true } }
])

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 注册协议处理器来返回本地媒体文件
  protocol.handle('media', async (request) => {
    console.log('[Media Protocol] Raw request url:', request.url)
    
    // 提取 media:// 之后的部分
    let filePath = decodeURIComponent(request.url.slice('media://'.length))
    
    // 移除 Windows 路径下可能存在的多余开头的斜杠或对其进行补偿
    if (process.platform === 'win32') {
      // 兼容一些反斜杠被浏览器纠正为正斜杠的场景
      filePath = filePath.replace(/\\/g, '/')
      
      // 有时候可能是不带冒号的 e/代码备份 格式，我们将其恢复为 e:/代码备份
      if (/^[a-zA-Z]\//.test(filePath)) {
        filePath = filePath[0] + ':' + filePath.slice(1)
      }
      
      // 移除多余的开头斜杠，例如 /E:/代码备份 或 /e:/代码备份
      if (filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
    }
    
    console.log('[Media Protocol] Resolved path:', filePath)
    
    try {
      const fileUrl = pathToFileURL(filePath).toString()
      console.log('[Media Protocol] Redirecting to fileUrl:', fileUrl)
      
      const response = await net.fetch(fileUrl)
      
      // 复制已有的 headers 并设置允许跨域的 CORS 头
      const headers = new Headers()
      response.headers.forEach((val, key) => {
        headers.append(key, val)
      })
      headers.set('Access-Control-Allow-Origin', '*')
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    } catch (err) {
      console.error('[Media Protocol] Error fetching file:', err)
      throw err
    }
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化所有 IPC 信道监听器
  initIpc()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
