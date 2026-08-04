const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const versionPath = path.join(root, 'VERSION')
const version = fs.readFileSync(versionPath, 'utf8').trim()
const match = version.match(/^(\d+)\.(\d{2})$/)

if (!match)
  throw new Error(`Invalid VERSION "${version}"; expected format such as 1.01`)

const major = Number(match[1])
const minor = Number(match[2])
const versionCode = major * 100 + minor
const npmVersion = `${major}.0.${minor}`

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content)
}

function replaceRequired(relativePath, pattern, replacement) {
  const content = read(relativePath)
  if (!pattern.test(content))
    throw new Error(`Version marker not found in ${relativePath}`)
  write(relativePath, content.replace(pattern, replacement))
}

const oldVersionMatch = read('assets/version').trim().match(/^\d+\|(.+)$/)
if (!oldVersionMatch)
  throw new Error('Invalid assets/version format')
const oldVersion = oldVersionMatch[1]

let env = read('.env')
if (/^VITE_APP_VERSION=.*$/m.test(env))
  env = env.replace(/^VITE_APP_VERSION=.*$/m, `VITE_APP_VERSION=${version}`)
else
  env += `\nVITE_APP_VERSION=${version}\n`
write('.env', env)

for (const file of ['assets/lang/en-us.ini', 'assets/lang/zh-cn.ini', 'lang/en-us.ini', 'lang/zh-cn.ini'])
  replaceRequired(file, /^version=.*$/m, `version=${version}`)

write('assets/version', `${versionCode}|${version}\n`)
replaceRequired('package.json', /"version":\s*"[^"]+"/, `"version": "${npmVersion}"`)
replaceRequired('src/components/apps/About/index.vue', /const versionName = '[^']+'/, `const versionName = '${version}'`)
replaceRequired('src/components/apps/ImportExport/index.vue', /VITE_APP_VERSION \|\| '[^']+'/, `VITE_APP_VERSION || '${version}'`)

let distReplacements = 0
const distAssets = path.join(root, 'dist', 'assets')
if (oldVersion !== version && fs.existsSync(distAssets)) {
  for (const name of fs.readdirSync(distAssets)) {
    if (!name.endsWith('.js')) continue
    const file = path.join(distAssets, name)
    const content = fs.readFileSync(file, 'utf8')
    const updated = content.split(`"${oldVersion}"`).join(`"${version}"`)
    if (updated !== content) {
      fs.writeFileSync(file, updated)
      distReplacements += 1
    }
  }
  if (distReplacements === 0)
    throw new Error(`Built frontend version ${oldVersion} was not found under dist/assets`)
}

console.log(`Synced project version ${version} (code ${versionCode}, npm ${npmVersion})`)