const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const backendDir = path.join(__dirname, '..', 'backend')
const distDir = path.join(backendDir, 'dist')
const mainPy = path.join(backendDir, 'src', 'main.py')

// Clean up previous builds
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
}

const specFile = path.join(backendDir, 'sonosano.spec')
const command = `pyinstaller --noconfirm "${specFile}" --distpath "${distDir}"`

const pyinstaller = exec(command, { cwd: backendDir })

pyinstaller.stdout.on('data', (data) => {
  console.log(data)
})

pyinstaller.stderr.on('data', (data) => {
  console.error(data)
})

pyinstaller.on('close', (code) => {
  console.log(`PyInstaller process exited with code ${code}`)
  if (code !== 0) {
    process.exit(1)
  }
})
