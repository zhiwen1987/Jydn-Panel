(function () {
  'use strict'
  const q = (s, r = document) => r.querySelector(s)
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s))
  const text = v => v === undefined || v === null || v === '' ? '-' : String(v)
  const esc = v => text(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  function stored(k) { try { return JSON.parse(localStorage.getItem(k) || 'null')?.data || {} } catch { return {} } }
  function auth() { return { token: stored('AUTH_TOKEN').token || '', lang: stored('appSetting').language || 'zh-CN' } }
  async function api(path, data = {}) {
    const response = await fetch(`/api/system/docker/${path}`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const result = await response.json()
    if (!response.ok || result.code !== 0) throw new Error(result.msg || '请求失败')
    return result.data || {}
  }
  function notify(message, bad = false) {
    const node = document.createElement('div'); node.className = `jydn-toast ${bad ? 'bad' : ''}`; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 3000)
  }
  function button(label, action, danger = false) {
    const node = document.createElement('button'); node.type = 'button'; node.className = danger ? 'danger' : ''; node.textContent = label
    node.addEventListener('click', event => { event.stopPropagation(); Promise.resolve(action()).catch(error => notify(error.message || String(error), true)) })
    return node
  }
  function confirmAction(message, action) {
    const overlay = document.createElement('div'); overlay.className = 'jydn-admin-overlay confirm'; overlay.innerHTML = `<div class="jydn-confirm"><strong>确认操作</strong><p>${esc(message)}</p><div class="actions"></div></div>`
    q('.actions', overlay).append(button('取消', () => overlay.remove()), button('确认', async () => { await action(); overlay.remove() }, true)); document.body.appendChild(overlay)
  }
  function injectStyle() {
    if (q('#jydn-admin-style')) return
    const style = document.createElement('style'); style.id = 'jydn-admin-style'; style.textContent = `
#jydn-docker-trigger{display:none!important}.jydn-catalog-toggle{width:10px;height:10px;min-width:10px;flex:0 0 10px;padding:0;margin:0 auto 4px;border:1px solid #ffffffe6;border-radius:999px;background:#facc15;font-size:0;cursor:pointer;box-shadow:0 0 0 2px #0f172a33}.jydn-catalog-toggle:hover{background:#fde047;box-shadow:0 0 0 3px #facc1547}.left-catalog{display:flex!important;flex-direction:column}.left-catalog .left-catalog-track{flex:1}.left-catalog.jydn-catalog-label-fixed .catalog-label{opacity:1!important;color:#fef08a!important}
.jydn-plugin-entry>div{background:#fff;padding:10px;border-radius:8px;margin-bottom:5px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center}.dark .jydn-plugin-entry>div{background:#27272a}.jydn-about-logo{display:block;width:88px;height:88px;object-fit:contain;margin:6px auto 12px;border-radius:18px}
.jydn-admin-overlay{position:fixed;inset:0;z-index:10020;background:#0f172ad9;padding:20px;display:flex;align-items:center;justify-content:center}.jydn-admin-panel{width:min(1180px,97vw);height:min(780px,94vh);overflow:auto;background:#f8fafc;color:#0f172a;border-radius:14px;padding:18px;box-shadow:0 24px 80px #0008}.jydn-admin-panel.jydn-admin-embedded{width:100%;max-width:100%;height:100%;max-height:100%;min-width:0;box-sizing:border-box;overflow:auto;box-shadow:none;border-radius:12px;padding:16px;contain:layout paint}.jydn-admin-embedded .jydn-table{display:block;width:100%;max-width:100%;overflow-x:auto;white-space:nowrap}.jydn-admin-embedded .jydn-tabs{max-width:100%;overflow-x:auto;flex-wrap:nowrap}.dark .jydn-admin-panel{background:#18181b;color:#f8fafc}.jydn-admin-head,.jydn-toolbar,.jydn-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.jydn-admin-head{justify-content:space-between;margin-bottom:14px}.jydn-admin-head h2{margin:0}.jydn-admin-panel button{padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#1e293b;cursor:pointer}.dark .jydn-admin-panel button{background:#27272a;color:#f8fafc;border-color:#52525b}.jydn-admin-panel button.primary{background:#2563eb;color:#fff;border-color:#2563eb}.jydn-admin-panel button.danger{background:#dc2626;color:#fff;border-color:#dc2626}.jydn-admin-panel input,.jydn-admin-panel select{padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:transparent;color:inherit}.jydn-tabs{display:flex;gap:6px;border-bottom:1px solid #cbd5e1;margin-bottom:14px}.jydn-tabs button{border:0;border-radius:7px 7px 0 0}.jydn-tabs button.active{background:#2563eb;color:#fff}.jydn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.jydn-card{padding:13px;border:1px solid #cbd5e1;border-radius:10px;background:#fff}.dark .jydn-card{background:#27272a;border-color:#3f3f46}.jydn-card b{display:block;font-size:22px;margin-top:4px}.jydn-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}.jydn-table th,.jydn-table td{text-align:left;padding:8px;border-bottom:1px solid #cbd5e1;vertical-align:top}.jydn-code{white-space:pre-wrap;word-break:break-all;max-height:56vh;overflow:auto;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:9px}.jydn-plugin-card{display:flex;gap:14px;align-items:center;padding:16px;border:1px solid #cbd5e1;border-radius:12px}.jydn-plugin-icon{font-size:36px}.jydn-grow{flex:1}.jydn-toast{position:fixed;right:22px;top:22px;z-index:10050;background:#16a34a;color:#fff;padding:10px 16px;border-radius:8px}.jydn-toast.bad{background:#dc2626}.jydn-admin-overlay.confirm{z-index:10040}.jydn-confirm{width:min(380px,90vw);background:#fff;color:#111827;border-radius:12px;padding:18px}.jydn-confirm .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.jydn-muted{opacity:.62;font-size:12px}`; document.head.appendChild(style)
  }
  function panelConfig() { return stored('panelStorage').panelConfig || {} }
  function savePanel(config) {
    let wrapper; try { wrapper = JSON.parse(localStorage.getItem('panelStorage') || 'null') } catch { wrapper = null }
    if (!wrapper?.data) wrapper = { data: {}, expire: null }; wrapper.data.panelConfig = config; localStorage.setItem('panelStorage', JSON.stringify(wrapper))
    fetch('/api/panel/userConfig/set', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ panel: config }) }).catch(() => {})
  }
  function installCatalogButton() {
    const catalog = q('.left-catalog'); if (!catalog || q('.jydn-catalog-toggle', catalog)) return
    const visible = panelConfig().leftCatalogLabelFixed !== false; catalog.classList.toggle('jydn-catalog-label-fixed', visible)
    const toggle = button('☷', () => { const next = !catalog.classList.contains('jydn-catalog-label-fixed'); catalog.classList.toggle('jydn-catalog-label-fixed', next); toggle.title = next ? '隐藏左侧分组名称' : '固定显示左侧分组名称'; savePanel({ ...panelConfig(), leftCatalogLabelFixed: next }) })
    toggle.className = 'jydn-catalog-toggle'; toggle.title = visible ? '隐藏左侧分组名称' : '固定显示左侧分组名称'; catalog.prepend(toggle)
  }
  function enhanceAbout() {
    const modal = q('.app-starter-modal-content'); if (!modal) return
    const content = q('.n-layout-content', modal) || modal
    const marker = qa('*', content).find(node => node.children.length === 0 && /版本|Version|SUPERDOOR|OPENDOOR/.test(node.textContent || ''))
    if (!marker) return
    qa('img', content).forEach(image => image.remove())
    qa('a', content).forEach(anchor => {
      if (/github|安格视界|TG群|安格超市|superdoor|opendoor/i.test(`${anchor.textContent} ${anchor.href}`)) anchor.remove()
    })
    qa('.jydn-about-logo', content).forEach(node => node.remove())
  }
  function installPluginEntry() {
    const modal = q('.app-starter-modal-content'); const list = modal && q('.n-layout-sider .overflow-auto', modal)
    if (Number(stored('AUTH_TOKEN').userInfo?.role) !== 1 || !list || q('.jydn-plugin-entry', list)) return
    const item = document.createElement('div'); item.className = 'jydn-plugin-entry'; item.innerHTML = '<div><span>🧩</span><span>插件管理器</span></div>'; item.addEventListener('click', e => { e.stopPropagation(); showPluginManager(q('.n-layout-content', modal)) }); list.appendChild(item)
  }  function basePanel(title) {
    const overlay = document.createElement('div'); overlay.className = 'jydn-admin-overlay'
    const panel = document.createElement('section'); panel.className = 'jydn-admin-panel'
    const head = document.createElement('header'); head.className = 'jydn-admin-head'; head.innerHTML = `<h2>${esc(title)}</h2><div class="jydn-actions"></div>`
    q('.jydn-actions', head).append(button('关闭', () => overlay.remove())); panel.appendChild(head); overlay.appendChild(panel); document.body.appendChild(overlay)
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove() }); return { overlay, panel, head }
  }
  function contentPanel(mount, title) {
    if (!mount) return basePanel(title)
    mount.replaceChildren()
    const panel = document.createElement('section'); panel.className = 'jydn-admin-panel jydn-admin-embedded'
    const head = document.createElement('header'); head.className = 'jydn-admin-head'; head.innerHTML = `<h2>${esc(title)}</h2><div class="jydn-actions"></div>`
    panel.appendChild(head); mount.appendChild(panel); return { overlay: null, panel, head }
  }
  function showPluginManager(mount) {
    q('#jydn-docker-trigger')?.remove(); const { panel } = contentPanel(mount, '系统应用 / 插件管理器')
    const card = document.createElement('div'); card.className = 'jydn-plugin-card'; card.innerHTML = '<div class="jydn-plugin-icon">🐳</div><div class="jydn-grow"><strong>cockpit-docker</strong><div class="jydn-muted">Docker API · Overview · Containers · Images · Volumes · Networks</div></div><span>已安装</span>'
    card.append(button('打开', () => showDocker(mount))); panel.appendChild(card)
  }
  function table(headers, rows) {
    const node = document.createElement('table'); node.className = 'jydn-table'; const thead = document.createElement('thead'); const tr = document.createElement('tr')
    headers.forEach(label => { const th = document.createElement('th'); th.textContent = label; tr.appendChild(th) }); thead.appendChild(tr); node.appendChild(thead)
    const body = document.createElement('tbody'); rows.forEach(cells => { const row = document.createElement('tr'); cells.forEach(value => { const cell = document.createElement('td'); value instanceof Node ? cell.appendChild(value) : cell.textContent = text(value); row.appendChild(cell) }); body.appendChild(row) }); node.appendChild(body); return node
  }
  function input(placeholder, type = 'text') { const node = document.createElement('input'); node.type = type; node.placeholder = placeholder; return node }
  function actions(...nodes) { const box = document.createElement('div'); box.className = 'jydn-actions'; nodes.forEach(node => box.appendChild(node)); return box }
  function showData(title, value) { const { panel } = basePanel(title); const pre = document.createElement('pre'); pre.className = 'jydn-code'; pre.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); panel.appendChild(pre) }
  function showDocker(mount) {
    const { panel, head } = contentPanel(mount, 'cockpit-docker'); q('.jydn-actions', head).prepend(button('返回插件管理器', () => showPluginManager(mount)))
    const tabs = document.createElement('div'); tabs.className = 'jydn-tabs'; const content = document.createElement('div')
    const definitions = [['overview', '全局概览'], ['containers', '容器'], ['images', '镜像'], ['volumes', '数据卷'], ['networks', '网络']]
    async function activate(name, tab) { qa('button', tabs).forEach(item => item.classList.remove('active')); tab.classList.add('active'); content.textContent = '正在加载…'; try { await renderTab(name, content) } catch (error) { content.textContent = `加载失败：${error.message || error}` } }
    definitions.forEach(([name, label], index) => { const tab = button(label, () => activate(name, tab)); tabs.appendChild(tab); if (!index) setTimeout(() => activate(name, tab)) }); panel.append(tabs, content)
  }
  async function renderTab(name, root) {
    root.replaceChildren(); if (name === 'overview') return renderOverview(root); if (name === 'containers') return renderContainers(root); if (name === 'images') return renderImages(root); if (name === 'volumes') return renderVolumes(root); return renderNetworks(root)
  }
  async function renderOverview(root) {
    const data = await api('overview'); if (!data.available) { root.textContent = `Docker 不可用：${data.message || '无法连接守护进程'}`; return }
    const grid = document.createElement('div'); grid.className = 'jydn-grid'
    ;[['Docker', data.version], ['API', data.apiVersion], ['容器', data.containers], ['运行中', data.containersRunning], ['镜像', data.images], ['数据卷', data.volumes], ['网络', data.networks], ['存储驱动', data.storageDriver]].forEach(([label, value]) => { const card = document.createElement('div'); card.className = 'jydn-card'; card.innerHTML = `<span>${esc(label)}</span><b>${esc(value)}</b>`; grid.appendChild(card) })
    const daemon = actions(button('启动 Docker', () => confirmAction('启动 Docker 守护进程？', async () => { await api('daemon/action', { action: 'start' }); notify('已提交启动操作') })), button('停止 Docker', () => confirmAction('停止 Docker 会中断所有容器，继续吗？', async () => { await api('daemon/action', { action: 'stop' }); notify('已提交停止操作') }), true), button('重启 Docker', () => confirmAction('重启 Docker 守护进程？', async () => { await api('daemon/action', { action: 'restart' }); notify('已提交重启操作') })))
    const host = document.createElement('pre'); host.className = 'jydn-code'; host.textContent = `宿主机监控\n负载: ${text(data.host?.load1)} / ${text(data.host?.load5)} / ${text(data.host?.load15)}\n内存可用: ${text(data.host?.memoryAvailable)} / ${text(data.host?.memoryTotal)} bytes\n磁盘可用: ${text(data.host?.diskFree)} / ${text(data.host?.diskTotal)} bytes\n网卡: ↓ ${text(data.host?.networkRxBytes)}  ↑ ${text(data.host?.networkTxBytes)} bytes\n日志驱动: ${text(data.loggingDriver)}`
    const eventsButton = button('查看最近事件', async () => showData('Docker 最近事件', (await api('events')).list || [])); root.append(actions(daemon, eventsButton), grid, host)
  }
  function containerEditor(item, refresh) {
    const { panel } = basePanel(`在线设置 - ${item.name}`); const newName = input('新容器名称'); newName.value = item.name || ''; const cpus = input('CPU 限额，例如 1.5', 'number'); const memory = input('内存限额，例如 512m')
    const form = document.createElement('div'); form.className = 'jydn-grid'; [newName, cpus, memory].forEach(node => { const wrap = document.createElement('div'); wrap.className = 'jydn-card'; wrap.appendChild(node); form.appendChild(wrap) })
    const saveName = button('重命名', async () => { await api('container/rename', { id: item.id || item.name, name: newName.value }); notify('容器已重命名'); panel.closest('.jydn-admin-overlay').remove(); refresh() }); saveName.className = 'primary'
    const saveLimits = button('更新 CPU / 内存', async () => { await api('container/update', { id: item.id || item.name, cpus: Number(cpus.value || 0), memory: memory.value }); notify('资源限额已更新') }); saveLimits.className = 'primary'
    const note = document.createElement('p'); note.className = 'jydn-muted'; note.textContent = '端口、环境变量、挂载、启动命令等 Docker 不支持在线修改，需停止后删除并按新配置重建容器。'
    panel.append(form, actions(saveName, saveLimits), note)
  }
  async function renderContainers(root) {
    const response = await api('containers'); const list = response.list || []; const search = input('搜索名称或 ID'); const state = document.createElement('select'); state.innerHTML = '<option value="all">全部</option><option value="running">运行</option><option value="stopped">停止</option>'; const holder = document.createElement('div')
    const draw = () => {
      const term = search.value.toLowerCase(); const rows = list.filter(item => (!term || `${item.name} ${item.id}`.toLowerCase().includes(term)) && (state.value === 'all' || (state.value === 'running' ? item.state === 'running' : item.state !== 'running'))).map(item => {
        const id = item.id || item.name; const run = async action => { await api('action', { id, action }); notify('操作成功'); renderContainers(root) }
        const detail = button('详情', async () => { const [info, stats, top] = await Promise.all([api('container/inspect', { id }), item.state === 'running' ? api('container/stats', { id }).catch(() => ({})) : {}, item.state === 'running' ? api('container/top', { id }).catch(() => ({})) : {}]); showData(`容器详情 - ${item.name}`, { info, stats, processes: top.processes }) })
        const logs = button('日志', async () => showData(`容器日志 - ${item.name}`, (await api('logs', { id, tail: 500 })).logs || ''))
        const lifecycle = item.state === 'running' ? button('停止', () => confirmAction(`停止 ${item.name}？`, () => run('stop'))) : button('启动', () => run('start'))
        return [item.name, item.image, item.status || item.state, item.ports, actions(detail, logs, button('在线设置', () => containerEditor(item, () => renderContainers(root))), lifecycle, item.state === 'running' ? button('暂停', () => run('pause')) : button('恢复', () => run('unpause')), button('重启', () => confirmAction(`重启 ${item.name}？`, () => run('restart'))), button('强杀', () => confirmAction(`强制杀死 ${item.name}？`, () => run('kill')), true), button('删除', () => confirmAction(`删除容器 ${item.name}？`, () => run('remove')), true))]
      }); holder.replaceChildren(table(['容器', '镜像', '状态', '端口', '操作'], rows))
    }
    const deleteStopped = button('批量删除已停止容器', () => confirmAction('删除列表中全部已停止容器？', async () => { for (const item of list.filter(v => v.state !== 'running')) await api('action', { id: item.id || item.name, action: 'remove' }); notify('已清理停止容器'); renderContainers(root) }), true); search.addEventListener('input', draw); state.addEventListener('change', draw); root.append(actions(search, state, deleteStopped), holder); draw()
  }  async function renderImages(root) {
    const response = await api('images'); const list = response.list || []; const image = input('镜像，例如 nginx:latest')
    const pull = button('拉取镜像', async () => { await api('image/action', { action: 'pull', image: image.value }); notify('镜像拉取完成'); renderImages(root) }); pull.className = 'primary'
    const prune = button('清理悬空镜像', () => confirmAction('清理所有悬空镜像？', async () => { await api('image/action', { action: 'prune' }); renderImages(root) }))
    const createContainer = button('可视化新建容器', () => containerCreator(image.value))
    const rows = list.map(item => { const id = item.ID || item.Id; return [`${text(item.Repository)}:${text(item.Tag)}`, String(id || '').slice(0, 20), item.Size, item.CreatedSince || item.CreatedAt, actions(button('分层', async () => showData('镜像分层', (await api('image/history', { image: id })).list || [])), button('创建容器', () => containerCreator(`${text(item.Repository)}:${text(item.Tag)}`)), button('删除', () => confirmAction(`删除镜像 ${id}？`, async () => { await api('image/action', { action: 'remove', image: id }); renderImages(root) }), true))] })
    root.append(actions(image, pull, createContainer, prune), table(['镜像', 'ID', '大小', '创建时间', '操作'], rows))
  }
  function containerCreator(defaultImage) {
    const { panel } = basePanel('基于镜像新建容器'); const name = input('容器名称'); const image = input('镜像'); image.value = defaultImage === '-' ? '' : defaultImage
    const env = input('环境变量，逗号分隔 KEY=VALUE'); const ports = input('端口映射，逗号分隔 8080:80'); const volumes = input('挂载，逗号分隔 /host:/container'); const cpus = input('CPU，例如 1.5', 'number'); const memory = input('内存，例如 512m'); const restart = document.createElement('select'); restart.innerHTML = '<option value="no">不自动重启</option><option value="always">always</option><option value="unless-stopped">unless-stopped</option><option value="on-failure">on-failure</option>'
    const form = document.createElement('div'); form.className = 'jydn-grid'; [name, image, env, ports, volumes, cpus, memory, restart].forEach(node => { const wrap = document.createElement('div'); wrap.className = 'jydn-card'; wrap.appendChild(node); form.appendChild(wrap) })
    const create = button('创建容器', async () => { await api('container/create', { name: name.value, image: image.value, env: env.value.split(',').map(v => v.trim()).filter(Boolean), ports: ports.value.split(',').map(v => v.trim()).filter(Boolean), volumes: volumes.value.split(',').map(v => v.trim()).filter(Boolean), cpus: Number(cpus.value || 0), memory: memory.value, restart: restart.value }); notify('容器创建成功'); panel.closest('.jydn-admin-overlay').remove() }); create.className = 'primary'; panel.append(form, create)
  }
  async function renderVolumes(root) {
    const response = await api('volumes'); const list = response.list || []; const name = input('新数据卷名称'); const create = button('创建', async () => { await api('volume/action', { action: 'create', name: name.value }); renderVolumes(root) }); create.className = 'primary'
    const rows = list.map(item => [item.Name, item.Driver, item.Mountpoint, item.Containers || '未使用', button('删除', () => confirmAction(`删除数据卷 ${item.Name}？`, async () => { await api('volume/action', { action: 'remove', name: item.Name }); renderVolumes(root) }), true)])
    root.append(actions(name, create), table(['名称', '驱动', '挂载路径', '关联容器', '操作'], rows))
  }
  async function renderNetworks(root) {
    const response = await api('networks'); const list = response.list || []; const name = input('网络名称'); const subnet = input('CIDR，例如 172.28.0.0/16'); const gateway = input('网关'); const create = button('新建 Bridge 网络', async () => { await api('network/action', { action: 'create', name: name.value, subnet: subnet.value, gateway: gateway.value }); renderNetworks(root) }); create.className = 'primary'
    const network = input('附属网络名称'); const container = input('容器名称或 ID'); const connect = button('接入网络', async () => { await api('network/action', { action: 'connect', name: network.value, container: container.value }); notify('容器已接入网络') }); const disconnect = button('脱离网络', () => confirmAction(`让 ${container.value} 脱离 ${network.value}？`, async () => { await api('network/action', { action: 'disconnect', name: network.value, container: container.value }); notify('容器已脱离网络') }))
    const rows = list.map(item => [item.Name, item.Driver, item.Scope, item.Internal, actions(button('查看', async () => showData(`网络详情 - ${item.Name}`, await api('network/inspect', { name: item.Name }))), button('删除', () => confirmAction(`删除网络 ${item.Name}？`, async () => { await api('network/action', { action: 'remove', name: item.Name }); renderNetworks(root) }), true))])
    root.append(actions(name, subnet, gateway, create), actions(network, container, connect, disconnect), table(['名称', '驱动', '范围', '内部网络', '操作'], rows))
  }
  function installVersionCheck() {
    if (window.__jydnVersionCheckInstalled) return
    window.__jydnVersionCheckInstalled = true
    document.addEventListener('click', async event => {
      const target = event.target instanceof Element ? event.target.closest('button') : null
      if (!target || !target.closest('.app-starter-modal-content') || !/检查版本|Check Version/i.test(target.textContent || '')) return
      event.preventDefault(); event.stopImmediatePropagation()
      try {
        const response = await fetch('/api/about/checkVersion', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: '{}' })
        const result = await response.json()
        if (!response.ok || result.code !== 0) throw new Error(result.msg || '检查失败')
        const data = result.data || {}
        notify(data.hasUpdate ? `发现新版本 ${data.latestVersion}，当前版本 ${data.currentVersion}` : `当前已是最新版本 ${data.currentVersion}`)
      }
      catch (error) { notify(`GitHub 版本检查失败：${error.message || error}`, true) }
    }, true)
  }
  function maintain() { q('#jydn-docker-trigger')?.remove(); injectStyle(); installVersionCheck(); installCatalogButton(); installPluginEntry(); enhanceAbout() }
  new MutationObserver(maintain).observe(document.documentElement, { childList: true, subtree: true }); maintain()
})()