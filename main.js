const { app, BrowserWindow, ipcMain } = require('electron')
const { Client } = require('ssh2')
const path = require('path')
const tmp = require('os-tmpdir')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('src/index.html')
}

app.whenReady().then(createWindow)

// SSH Connection Handler
pcMain.on('ssh-connect', (event, { host, username, password, benchPath }) => {
  const conn = new Client()
  let outputBuffer = ""

  // Function to send output with slight buffering
  const sendOutput = (data, isError = false) => {
    outputBuffer += data
    // Send chunks every 100ms to avoid flooding the UI
    if (!sendOutput.timeout) {
      sendOutput.timeout = setTimeout(() => {
        event.sender.send('command-output', { 
          output: outputBuffer,
          isError: isError
        })
        outputBuffer = ""
        sendOutput.timeout = null
      }, 100)
    }
  }

  conn.on('ready', () => {
    sendOutput(`\n=== SSH Connection Established ===\n`)
    event.sender.send('ssh-status', { connected: true })
    
    // Store connection for later use
    mainWindow.sshConn = conn
    
    // First check basic environment
    conn.exec('pwd && ls -la', (err, stream) => {
      if (err) {
        sendOutput(`Error checking environment: ${err.message}\n`, true)
        return
      }
      
      stream.on('data', (data) => sendOutput(data))
      stream.on('close', () => {
        sendOutput(`\n=== Environment Check Complete ===\n`)
        
        // If benchPath wasn't provided, try to find it
        if (!benchPath) {
          sendOutput(`\nSearching for bench installation...\n`)
          conn.exec('find ~ -name "bench.py" -type f 2>/dev/null', (err, stream) => {
            if (err) {
              sendOutput(`Error finding bench: ${err.message}\n`, true)
              return
            }
            
            let foundPaths = []
            stream.on('data', (data) => foundPaths.push(data.toString()))
            stream.on('close', () => {
              if (foundPaths.length > 0) {
                const benchDir = path.dirname(foundPaths[0].trim())
                mainWindow.benchPath = benchDir
                sendOutput(`\nFound bench at: ${benchDir}\n`)
                sendOutput(`\nRunning bench version check...\n`)
                
                // Verify bench works
                conn.exec(`cd ${benchDir} && bench --version`, (err, stream) => {
                  if (err) {
                    sendOutput(`Error running bench: ${err.message}\n`, true)
                    return
                  }
                  stream.on('data', (data) => sendOutput(data))
                  stream.on('close', () => sendOutput(`\nReady to execute bench commands!\n`))
                })
              } else {
                sendOutput(`\nNo bench installation found. Please specify path manually.\n`, true)
              }
            })
          })
        } else {
          mainWindow.benchPath = benchPath
          sendOutput(`\nUsing specified bench path: ${benchPath}\n`)
          sendOutput(`\nRunning bench version check...\n`)
          
          // Verify bench works
          conn.exec(`cd ${benchPath} && bench --version`, (err, stream) => {
            if (err) {
              sendOutput(`Error running bench: ${err.message}\n`, true)
              return
            }
            stream.on('data', (data) => sendOutput(data))
            stream.on('close', () => sendOutput(`\nReady to execute bench commands!\n`))
          })
        }
      })
    })
  })
  
  conn.on('error', (err) => {
    sendOutput(`\nSSH Connection Error: ${err.message}\n`, true)
    event.sender.send('ssh-status', { connected: false })
  })
  
  conn.on('close', () => {
    sendOutput(`\n=== SSH Connection Closed ===\n`)
    event.sender.send('ssh-status', { connected: false })
  })
  
  sendOutput(`\nConnecting to ${username}@${host}...\n`)
  conn.connect({
    host: host,
    username: username,
    password: password,
    tryKeyboard: true
  })
})

// Bench Command Execution
// Update the execute-bench-command handler
ipcMain.on('execute-bench-command', (event, { command }) => {
  if (!mainWindow.sshConn || !mainWindow.benchPath) {
    event.sender.send('command-output', {
      output: "\nError: Not connected or no bench path set\n",
      isError: true
    })
    return
  }

  const conn = mainWindow.sshConn
  const fullCommand = `cd ${mainWindow.benchPath} && ${command}`
  
  event.sender.send('command-output', {
    output: `\n$ ${fullCommand}\n`,
    isError: false
  })

  conn.exec(fullCommand, (err, stream) => {
    if (err) {
      event.sender.send('command-output', {
        output: `Command error: ${err.message}\n`,
        isError: true
      })
      return
    }

    stream.on('data', (data) => {
      event.sender.send('command-output', {
        output: data.toString(),
        isError: false
      })
    })
    
    stream.stderr.on('data', (data) => {
      event.sender.send('command-output', {
        output: data.toString(),
        isError: true
      })
    })
    
    stream.on('close', (code) => {
      event.sender.send('command-output', {
        output: `\nCommand exited with code ${code}\n`,
        isError: code !== 0
      })
    })
  })
})

// Disconnect Handler
ipcMain.on('ssh-disconnect', () => {
  if (mainWindow.sshConn) {
    mainWindow.sshConn.end()
    mainWindow.sshConn = null
  }
})