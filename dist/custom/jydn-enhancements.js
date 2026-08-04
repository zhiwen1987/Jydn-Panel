(function () {
  'use strict'

  const BRAND = 'Jydn'
  const CONFIG_APP = 'Jydn-Panel-Config'
  const legacyLogo = ['AnGe', 'Panel'].join('-')
  const originalAnchorClick = HTMLAnchorElement.prototype.click
  const handledInputs = new WeakSet()
  let visualPanelConfig = {}

  function storedData(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null')?.data || null
    }
    catch {
      return null
    }
  }

  function authHeaders() {
    const auth = storedData('AUTH_TOKEN') || {}
    const app = storedData('appSetting') || {}
    return { token: auth.token || '', lang: app.language || 'zh-CN' }
  }

  function localPanelConfig() {
    return storedData('panelStorage')?.panelConfig || {}
  }

  function storePanelConfig(panelConfig) {
    let wrapper
    try {
      wrapper = JSON.parse(localStorage.getItem('panelStorage') || 'null')
    }
    catch {
      wrapper = null
    }
    if (!wrapper || typeof wrapper !== 'object')
      wrapper = { data: {}, expire: null }
    if (!wrapper.data || typeof wrapper.data !== 'object')
      wrapper.data = {}
    wrapper.data.panelConfig = panelConfig
    localStorage.setItem('panelStorage', JSON.stringify(wrapper))
  }

  async function apiPost(path, data) {
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    })
    const result = await response.json()
    if (!response.ok || result.code !== 0) {
      const error = new Error(result.msg || `API request failed: ${path}`)
      error.code = result.code
      throw error
    }
    return result
  }

  async function getPublicAppearance() {
    const response = await fetch('/api/about/siteAppearance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', lang: authHeaders().lang },
      body: '{}',
    })
    const result = await response.json()
    if (!response.ok || result.code !== 0)
      throw new Error(result.msg || 'Site appearance request failed')
    return result.data || {}
  }

  async function getPanelConfig() {
    try {
      return (await apiPost('/panel/userConfig/get', {})).data?.panel || localPanelConfig()
    }
    catch {
      try {
        return { ...localPanelConfig(), ...await getPublicAppearance() }
      }
      catch {
        return localPanelConfig()
      }
    }
  }

  async function savePanelConfig(panelConfig) {
    storePanelConfig(panelConfig)
    await apiPost('/panel/userConfig/set', { panel: panelConfig })
  }

  async function uploadImage(file, fileType) {
    const form = new FormData()
    form.append('imgfile', file)
    const response = await fetch(`/api/file/uploadImg?fileType=${encodeURIComponent(fileType)}`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })
    const result = await response.json()
    if (!response.ok || result.code !== 0 || !result.data?.imageUrl) {
      const error = new Error(result.msg || 'Image upload failed')
      error.code = result.code
      throw error
    }
    return result.data.imageUrl
  }

  function notifyEnhancement(message, bad = false) {
    document.querySelector('.jydn-enhancement-toast')?.remove()
    const toast = document.createElement('div')
    toast.className = `jydn-enhancement-toast${bad ? ' bad' : ''}`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3600)
  }

  function notifyActionError(error, fallback) {
    const expired = error?.code === 1000 || error?.code === 1001
    notifyEnhancement(expired ? '登录状态已过期，请重新登录' : (error?.message || fallback), true)
    if (expired)
      setTimeout(() => { location.hash = '#/login' }, 900)
  }

  function injectStyle() {
    if (document.getElementById('jydn-enhancement-style'))
      return
    const style = document.createElement('style')
    style.id = 'jydn-enhancement-style'
    style.textContent = `
      .jydn-logo-admin{margin-top:14px;padding-top:12px;border-top:1px solid rgba(148,163,184,.35)}
      .jydn-logo-admin__title{font-weight:600;color:#64748b;margin-bottom:8px}
      .jydn-logo-admin__preview{height:90px;border:1px dashed #94a3b8;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8fafc;margin-bottom:8px}
      .jydn-logo-admin__preview img{max-width:90%;max-height:76px;object-fit:contain}
      .jydn-logo-admin__row{display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap}
      .jydn-logo-admin input[type=url],.jydn-logo-admin input[type=text]{min-width:240px;flex:1;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a}
      .jydn-logo-admin textarea{width:100%;min-height:118px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:6px;background:#0f172a;color:#e2e8f0;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;tab-size:2}
      .jydn-logo-admin button,.jydn-logo-admin__file{padding:7px 11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#334155;cursor:pointer}
      .jydn-logo-admin__file input{display:none}
      .jydn-extra-style{margin-top:16px;padding-top:14px;border-top:1px solid rgba(148,163,184,.35)}
      .jydn-extra-style .jydn-logo-admin__preview{height:76px}
      .jydn-extra-style .jydn-logo-admin__preview img{width:48px;height:48px}
      .jydn-extra-style input[type=range]{min-width:190px;flex:1}
      .left-catalog{--jydn-catalog-size:14px}
      .left-catalog .left-catalog-track{width:var(--jydn-catalog-size)!important}
      .left-catalog .catalog-dot{width:max(8px,calc(var(--jydn-catalog-size) - 4px))!important;height:max(8px,calc(var(--jydn-catalog-size) - 4px))!important;left:50%!important;transform:translate(-50%,-50%)!important}
      .left-catalog .catalog-label{left:calc(var(--jydn-catalog-size) + 5px)!important;font-size:max(11px,calc(var(--jydn-catalog-size) - 1px))!important}
      .left-catalog.jydn-catalog-label-fixed .catalog-label{opacity:1!important;color:#fef08a!important}
      .jydn-docker-trigger{position:fixed;z-index:9997;left:44px;bottom:18px;padding:9px 13px;border:1px solid #93c5fd;border-radius:9px;background:#0f172acc;color:#e0f2fe;cursor:pointer;box-shadow:0 4px 18px #0005}
      .jydn-docker-overlay{position:fixed;inset:0;z-index:9999;background:#0f172acc;display:flex;align-items:center;justify-content:center;padding:18px}
      .jydn-docker-panel{width:min(1050px,96vw);max-height:88vh;overflow:auto;background:#fff;color:#0f172a;border-radius:12px;padding:16px;box-shadow:0 18px 60px #0008}
      .jydn-docker-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .jydn-docker-actions{display:flex;gap:6px;flex-wrap:wrap}
      .jydn-docker-table{width:100%;border-collapse:collapse;font-size:13px}
      .jydn-docker-table th,.jydn-docker-table td{padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:middle}
      .jydn-docker-table button,.jydn-docker-head button{padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer}
      .jydn-docker-logs{max-height:55vh;overflow:auto;background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all;user-select:text}
      .jydn-enhancement-toast{position:fixed;z-index:10050;left:50%;top:24px;transform:translateX(-50%);padding:10px 16px;border-radius:8px;background:#16a34a;color:#fff;box-shadow:0 8px 30px #0004;font-size:14px;max-width:min(90vw,520px)}
      .jydn-enhancement-toast.bad{background:#dc2626}
      .jydn-logo-admin__file.is-loading{opacity:.55;pointer-events:none}
    `
    document.head.appendChild(style)
  }

  async function installLogoAdmin() {
    if (!location.hash.includes('/'))
      return
    const textInput = Array.from(document.querySelectorAll('input')).find((input) =>
      ['Jydn', 'Jydn-Panel'].includes(input.getAttribute('placeholder') || ''),
    )
    if (!textInput)
      return
    const card = textInput.closest('.n-card') || textInput.parentElement?.parentElement
    if (!card || card.querySelector('.jydn-logo-admin') || card.dataset.jydnLogoInstalling === 'true')
      return

    card.dataset.jydnLogoInstalling = 'true'
    injectStyle()
    const panelConfig = await getPanelConfig()
    if (panelConfig.logoText === legacyLogo) {
      panelConfig.logoText = BRAND
      await savePanelConfig(panelConfig).catch(() => {})
    }

    const root = document.createElement('div')
    root.className = 'jydn-logo-admin'
    root.innerHTML = `
      <div class="jydn-logo-admin__title">站点 Logo / Site Logo</div>
      <div class="jydn-logo-admin__preview"><span>未设置 Logo</span></div>
      <div class="jydn-logo-admin__row">
        <label class="jydn-logo-admin__file">上传 Logo<input type="file" accept="image/*"></label>
        <button type="button" data-action="clear">清除 Logo</button>
      </div>
      <div class="jydn-logo-admin__row">
        <input type="url" placeholder="Logo 图片地址" value="${String(panelConfig.logoImageSrc || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">
        <button type="button" data-action="save">保存 Logo</button>
      </div>
    `
    const cardContent = card.querySelector('.n-card__content')
    if (!cardContent) {
      delete card.dataset.jydnLogoInstalling
      return
    }
    cardContent.appendChild(root)
    delete card.dataset.jydnLogoInstalling

    const preview = root.querySelector('.jydn-logo-admin__preview')
    const urlInput = root.querySelector('input[type=url]')
    const fileInput = root.querySelector('input[type=file]')
    function renderPreview(url) {
      preview.replaceChildren()
      if (url) {
        const image = document.createElement('img')
        image.src = url
        image.alt = BRAND
        preview.appendChild(image)
      }
      else {
        const empty = document.createElement('span')
        empty.textContent = '未设置 Logo'
        preview.appendChild(empty)
      }
    }
    renderPreview(panelConfig.logoImageSrc || '')

    root.querySelector('[data-action=save]').addEventListener('click', async () => {
      try {
        panelConfig.logoImageSrc = urlInput.value.trim()
        panelConfig.faviconImageSrc = panelConfig.logoImageSrc
        await savePanelConfig(panelConfig)
        visualPanelConfig = panelConfig
        renderPreview(panelConfig.logoImageSrc)
        applyVisualConfig(panelConfig)
        notifyEnhancement('站点 Logo 已保存，标签图标已同步')
      }
      catch (error) {
        notifyActionError(error, '站点 Logo 保存失败')
      }
    })
    root.querySelector('[data-action=clear]').addEventListener('click', async () => {
      try {
        panelConfig.logoImageSrc = ''
        panelConfig.faviconImageSrc = ''
        urlInput.value = ''
        await savePanelConfig(panelConfig)
        visualPanelConfig = panelConfig
        renderPreview('')
        applyVisualConfig(panelConfig)
        notifyEnhancement('站点 Logo 已清除')
      }
      catch (error) {
        notifyActionError(error, '站点 Logo 清除失败')
      }
    })
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files?.[0])
        return
      const label = fileInput.closest('.jydn-logo-admin__file')
      fileInput.disabled = true
      label?.classList.add('is-loading')
      notifyEnhancement('正在上传站点 Logo…')
      try {
        panelConfig.logoImageSrc = await uploadImage(fileInput.files[0], 'icon')
        panelConfig.faviconImageSrc = panelConfig.logoImageSrc
        urlInput.value = panelConfig.logoImageSrc
        await savePanelConfig(panelConfig)
        visualPanelConfig = panelConfig
        renderPreview(panelConfig.logoImageSrc)
        applyVisualConfig(panelConfig)
        notifyEnhancement('站点 Logo 上传成功，标签图标已同步')
      }
      catch (error) {
        notifyActionError(error, '站点 Logo 上传失败')
      }
      finally {
        fileInput.disabled = false
        label?.classList.remove('is-loading')
        fileInput.value = ''
      }
    })
  }

  function faviconUrl(source) {
    if (!source || /^(data:|blob:)/i.test(source)) return source || '/favicon.svg'
    let hash = 0
    for (let index = 0; index < source.length; index++) hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0
    return source + (source.includes('?') ? '&' : '?') + 'jydn_favicon=' + Math.abs(hash).toString(36)
  }

  function legacyPoweredByHtml(panelConfig) {
    const text = String(panelConfig?.poweredByText || 'Jydn-Panel').trim() || 'Jydn-Panel'
    const url = String(panelConfig?.poweredByUrl || 'https://github.com/zhiwen1987/Jydn-Panel').trim()
    const wrapper = document.createElement('div')
    wrapper.appendChild(document.createTextNode('Powered By '))
    const link = document.createElement('a')
    link.className = 'login-powered-link'
    link.textContent = text
    if (url) {
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
    wrapper.appendChild(link)
    return wrapper.innerHTML
  }

  function sanitizePoweredByHtml(source) {
    const template = document.createElement('template')
    template.innerHTML = String(source || '')
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,link,meta,svg,math').forEach(node => node.remove())
    template.content.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase()
        const value = attribute.value.trim()
        if (name.startsWith('on') || ((name === 'href' || name === 'src' || name === 'xlink:href') && /^(javascript|data):/i.test(value)))
          node.removeAttribute(attribute.name)
        if (name === 'style' && /(expression\s*\(|url\s*\()/i.test(value))
          node.removeAttribute(attribute.name)
      })
      if (node.tagName === 'A') {
        node.classList.add('login-powered-link')
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    })
    return template.innerHTML
  }

  function poweredByHtml(panelConfig) {
    return sanitizePoweredByHtml(panelConfig?.poweredByHtml || legacyPoweredByHtml(panelConfig))
  }

  function applyPoweredBy(panelConfig) {
    const powered = document.querySelector('.login-powered')
    if (!powered)
      return
    const html = poweredByHtml(panelConfig)
    if (powered.innerHTML !== html)
      powered.innerHTML = html
  }

  function applyVisualConfig(panelConfig) {
    const iconSource = faviconUrl(panelConfig?.logoImageSrc || panelConfig?.faviconImageSrc || '/favicon.svg')
    let favicons = Array.from(document.querySelectorAll('link[rel~="icon"]'))
    if (favicons.length === 0) {
      const link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
      favicons = [link]
    }
    favicons.forEach((link) => {
      link.removeAttribute('type')
      link.href = iconSource
    })
    let appleIcons = Array.from(document.querySelectorAll('link[rel="apple-touch-icon"]'))
    if (appleIcons.length === 0) {
      const link = document.createElement('link')
      link.rel = 'apple-touch-icon'
      document.head.appendChild(link)
      appleIcons = [link]
    }
    appleIcons.forEach(link => { link.href = iconSource })

    applyPoweredBy(panelConfig)

    const catalog = document.querySelector('.left-catalog')
    if (catalog) {
      const size = Math.min(30, Math.max(10, Number(panelConfig?.leftCatalogSize || 14)))
      catalog.style.setProperty('--jydn-catalog-size', size + 'px')
      catalog.classList.toggle('jydn-catalog-label-fixed', !!panelConfig?.leftCatalogLabelFixed)
    }
  }

  function renderImagePreview(preview, url, emptyText) {
    preview.replaceChildren()
    if (url) {
      const image = document.createElement('img')
      image.src = url
      image.alt = BRAND
      preview.appendChild(image)
    }
    else {
      const empty = document.createElement('span')
      empty.textContent = emptyText
      preview.appendChild(empty)
    }
  }

  async function installAdditionalStyleControls() {
    const logoRoot = document.querySelector('.jydn-logo-admin')
    if (!logoRoot || logoRoot.querySelector('.jydn-extra-style') || logoRoot.dataset.jydnExtraInstalling === 'true')
      return

    logoRoot.dataset.jydnExtraInstalling = 'true'
    const panelConfig = await getPanelConfig()
    const section = document.createElement('div')
    section.className = 'jydn-extra-style'
    section.innerHTML =
      '<div class="jydn-logo-admin__title">浏览器标签图标 / Browser Tab Icon</div>' +
      '<div class="jydn-logo-admin__preview" data-preview="favicon"><span>未设置站点 Logo</span></div>' +
      '<div class="jydn-logo-admin__row"><span>自动跟随“站点 Logo”，上传或修改站点 Logo 后会同步更新浏览器标签图标。</span></div>' +
      '<div class="jydn-extra-style"><div class="jydn-logo-admin__title">Powered By 代码</div>' +
      '<div class="jydn-logo-admin__row"><textarea data-field="powered-code" rows="5" spellcheck="false" placeholder="输入 Powered By HTML 代码"></textarea></div>' +
      '<div class="jydn-logo-admin__row"><span>支持 HTML；危险脚本、事件属性和不安全链接会自动过滤。</span><button type="button" data-action="save-powered">保存代码</button></div></div>' +
      '<div class="jydn-extra-style"><div class="jydn-logo-admin__title">左侧分组目录 / Left Catalog</div>' +
      '<div class="jydn-logo-admin__row"><label><input data-field="catalog-fixed" type="checkbox"> 固定显示目录名称</label></div>' +
      '<div class="jydn-logo-admin__row"><label>目录尺寸 <output data-field="catalog-output"></output></label><input data-field="catalog-size" type="range" min="10" max="30" step="1"><button type="button" data-action="save-catalog">保存目录设置</button></div></div>'
    logoRoot.appendChild(section)
    delete logoRoot.dataset.jydnExtraInstalling

    const faviconPreview = section.querySelector('[data-preview=favicon]')
    const poweredCode = section.querySelector('[data-field=powered-code]')
    const catalogFixed = section.querySelector('[data-field=catalog-fixed]')
    const catalogSize = section.querySelector('[data-field=catalog-size]')
    const catalogOutput = section.querySelector('[data-field=catalog-output]')
    poweredCode.value = poweredByHtml(panelConfig)
    catalogFixed.checked = !!panelConfig.leftCatalogLabelFixed
    catalogSize.value = String(panelConfig.leftCatalogSize || 14)
    catalogOutput.textContent = catalogSize.value + 'px'
    renderImagePreview(faviconPreview, panelConfig.logoImageSrc || '', '未设置站点 Logo')

    catalogSize.addEventListener('input', () => {
      catalogOutput.textContent = catalogSize.value + 'px'
    })
    section.querySelector('[data-action=save-powered]').addEventListener('click', async () => {
      try {
        panelConfig.poweredByHtml = sanitizePoweredByHtml(poweredCode.value.trim() || legacyPoweredByHtml(panelConfig))
        poweredCode.value = panelConfig.poweredByHtml
        await savePanelConfig(panelConfig)
        visualPanelConfig = panelConfig
        applyVisualConfig(panelConfig)
        notifyEnhancement('Powered By 代码已保存')
      }
      catch (error) {
        notifyActionError(error, 'Powered By 代码保存失败')
      }
    })
    section.querySelector('[data-action=save-catalog]').addEventListener('click', async () => {
      try {
        panelConfig.leftCatalogLabelFixed = catalogFixed.checked
        panelConfig.leftCatalogSize = Number(catalogSize.value)
        await savePanelConfig(panelConfig)
        visualPanelConfig = panelConfig
        applyVisualConfig(panelConfig)
        notifyEnhancement('目录设置已保存')
      }
      catch (error) {
        notifyActionError(error, '目录设置保存失败')
      }
    })
  }
  function add32(a, b) { return (a + b) & 0xFFFFFFFF }
  function cmn(q, a, b, x, s, t) { return add32((add32(add32(a, q), add32(x, t)) << s) | (add32(add32(a, q), add32(x, t)) >>> (32 - s)), b) }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t) }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t) }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t) }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t) }
  function md5cycle(state, block) {
    let [a, b, c, d] = state
    const oa = a; const ob = b; const oc = c; const od = d
    a=ff(a,b,c,d,block[0],7,-680876936);d=ff(d,a,b,c,block[1],12,-389564586);c=ff(c,d,a,b,block[2],17,606105819);b=ff(b,c,d,a,block[3],22,-1044525330)
    a=ff(a,b,c,d,block[4],7,-176418897);d=ff(d,a,b,c,block[5],12,1200080426);c=ff(c,d,a,b,block[6],17,-1473231341);b=ff(b,c,d,a,block[7],22,-45705983)
    a=ff(a,b,c,d,block[8],7,1770035416);d=ff(d,a,b,c,block[9],12,-1958414417);c=ff(c,d,a,b,block[10],17,-42063);b=ff(b,c,d,a,block[11],22,-1990404162)
    a=ff(a,b,c,d,block[12],7,1804603682);d=ff(d,a,b,c,block[13],12,-40341101);c=ff(c,d,a,b,block[14],17,-1502002290);b=ff(b,c,d,a,block[15],22,1236535329)
    a=gg(a,b,c,d,block[1],5,-165796510);d=gg(d,a,b,c,block[6],9,-1069501632);c=gg(c,d,a,b,block[11],14,643717713);b=gg(b,c,d,a,block[0],20,-373897302)
    a=gg(a,b,c,d,block[5],5,-701558691);d=gg(d,a,b,c,block[10],9,38016083);c=gg(c,d,a,b,block[15],14,-660478335);b=gg(b,c,d,a,block[4],20,-405537848)
    a=gg(a,b,c,d,block[9],5,568446438);d=gg(d,a,b,c,block[14],9,-1019803690);c=gg(c,d,a,b,block[3],14,-187363961);b=gg(b,c,d,a,block[8],20,1163531501)
    a=gg(a,b,c,d,block[13],5,-1444681467);d=gg(d,a,b,c,block[2],9,-51403784);c=gg(c,d,a,b,block[7],14,1735328473);b=gg(b,c,d,a,block[12],20,-1926607734)
    a=hh(a,b,c,d,block[5],4,-378558);d=hh(d,a,b,c,block[8],11,-2022574463);c=hh(c,d,a,b,block[11],16,1839030562);b=hh(b,c,d,a,block[14],23,-35309556)
    a=hh(a,b,c,d,block[1],4,-1530992060);d=hh(d,a,b,c,block[4],11,1272893353);c=hh(c,d,a,b,block[7],16,-155497632);b=hh(b,c,d,a,block[10],23,-1094730640)
    a=hh(a,b,c,d,block[13],4,681279174);d=hh(d,a,b,c,block[0],11,-358537222);c=hh(c,d,a,b,block[3],16,-722521979);b=hh(b,c,d,a,block[6],23,76029189)
    a=hh(a,b,c,d,block[9],4,-640364487);d=hh(d,a,b,c,block[12],11,-421815835);c=hh(c,d,a,b,block[15],16,530742520);b=hh(b,c,d,a,block[2],23,-995338651)
    a=ii(a,b,c,d,block[0],6,-198630844);d=ii(d,a,b,c,block[7],10,1126891415);c=ii(c,d,a,b,block[14],15,-1416354905);b=ii(b,c,d,a,block[5],21,-57434055)
    a=ii(a,b,c,d,block[12],6,1700485571);d=ii(d,a,b,c,block[3],10,-1894986606);c=ii(c,d,a,b,block[10],15,-1051523);b=ii(b,c,d,a,block[1],21,-2054922799)
    a=ii(a,b,c,d,block[8],6,1873313359);d=ii(d,a,b,c,block[15],10,-30611744);c=ii(c,d,a,b,block[6],15,-1560198380);b=ii(b,c,d,a,block[13],21,1309151649)
    a=ii(a,b,c,d,block[4],6,-145523070);d=ii(d,a,b,c,block[11],10,-1120210379);c=ii(c,d,a,b,block[2],15,718787259);b=ii(b,c,d,a,block[9],21,-343485551)
    state[0]=add32(a,oa);state[1]=add32(b,ob);state[2]=add32(c,oc);state[3]=add32(d,od)
  }
  function md5block(text) { const block=[]; for(let i=0;i<64;i+=4) block[i>>2]=text.charCodeAt(i)+(text.charCodeAt(i+1)<<8)+(text.charCodeAt(i+2)<<16)+(text.charCodeAt(i+3)<<24); return block }
  function hex(value) { const chars='0123456789abcdef'; let out=''; for(let j=0;j<4;j++) out+=chars[(value>>(j*8+4))&15]+chars[(value>>(j*8))&15]; return out }
  function md5(text) {
    text = unescape(encodeURIComponent(text))
    const state=[1732584193,-271733879,-1732584194,271733878]
    let index
    for(index=64;index<=text.length;index+=64) md5cycle(state,md5block(text.substring(index-64,index)))
    text=text.substring(index-64);const tail=new Array(16).fill(0)
    for(let i=0;i<text.length;i++) tail[i>>2]|=text.charCodeAt(i)<<((i%4)<<3)
    tail[text.length>>2]|=0x80<<((text.length%4)<<3)
    if(text.length>55){md5cycle(state,tail);tail.fill(0)}
    tail[14]=(text.length*8);md5cycle(state,tail)
    return state.map(hex).join('')
  }

  function updateMd5(data) {
    const unsigned = { ...data }
    delete unsigned.md5
    data.md5 = md5(JSON.stringify(unsigned))
  }

  function dataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  async function embeddedAsset(sourceUrl, fileType, index) {
    if (!sourceUrl || sourceUrl.startsWith('data:'))
      return null
    try {
      const response = await fetch(new URL(sourceUrl, location.origin), { credentials: 'same-origin' })
      if (!response.ok)
        return null
      const blob = await response.blob()
      if (!blob.type.startsWith('image/'))
        return null
      const pathname = new URL(sourceUrl, location.origin).pathname
      return {
        sourceUrl,
        fileName: decodeURIComponent(pathname.split('/').pop() || `jydn-asset-${index}.png`),
        fileType,
        mimeType: blob.type,
        dataUrl: await dataUrl(blob),
      }
    }
    catch {
      return null
    }
  }

  async function enrichExport(href, downloadName) {
    const data = JSON.parse(await (await fetch(href)).text())
    if (data.appName === CONFIG_APP && Array.isArray(data.assets)) {
      const ready = document.createElement('a')
      ready.href = href; ready.download = downloadName.replace(/^SunPanel-Data/, 'JydnPanel-Data').replace(/\.sun-panel\.json$/, '.jydn-panel.json')
      originalAnchorClick.call(ready)
      return
    }

    const panelConfig = localPanelConfig()
    const sources = new Map()
    for (const group of data.icons || [])
      for (const item of group.children || [])
        if (item.icon?.src) sources.set(item.icon.src, 'icon')
    if (panelConfig.logoImageSrc) sources.set(panelConfig.logoImageSrc, 'icon')
    if (panelConfig.faviconImageSrc) sources.set(panelConfig.faviconImageSrc, 'icon')
    if (panelConfig.backgroundImageSrc) sources.set(panelConfig.backgroundImageSrc, 'wallpaper')
    const assets = (await Promise.all(Array.from(sources.entries()).map(([url, type], index) => embeddedAsset(url, type, index)))).filter(Boolean)
    data.version = 2; data.appName = CONFIG_APP; data.panelConfig = panelConfig; data.assets = assets
    updateMd5(data)
    const ready = document.createElement('a')
    ready.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    ready.download = downloadName.replace(/^SunPanel-Data/, 'JydnPanel-Data').replace(/\.sun-panel\.json$/, '.jydn-panel.json')
    originalAnchorClick.call(ready)
    setTimeout(() => URL.revokeObjectURL(ready.href), 1000)
  }

  HTMLAnchorElement.prototype.click = function () {
    if (/Panel-Data/.test(this.download || '') && this.href.startsWith('blob:')) {
      enrichExport(this.href, this.download).catch(() => originalAnchorClick.call(this))
      return
    }
    return originalAnchorClick.call(this)
  }

  async function detectMissingImportIcons(groups) {
    const missing = []
    for (const group of groups || []) {
      if (group.groupType === 'webpage')
        continue
      for (const item of group.children || []) {
        if (!item.url || !/^https?:\/\//i.test(item.url))
          continue
        if (item.icon?.src || item.icon?.text)
          continue
        missing.push(item)
      }
    }

    let cursor = 0
    const workers = Array.from({ length: Math.min(4, missing.length) }, async () => {
      while (cursor < missing.length) {
        const item = missing[cursor++]
        try {
          const response = await apiPost('/panel/itemIcon/getSiteFavicon', { url: item.url })
          if (response.data?.iconUrl)
            item.icon = { itemType: 2, src: response.data.iconUrl }
        }
        catch (error) {
          console.warn('Jydn favicon detection failed', item.url, error)
        }
      }
    })
    await Promise.all(workers)
  }
  async function restoreImportFile(input, file, data) {
    const map = new Map()
    for (const asset of data.assets || []) {
      try {
        const blob = await (await fetch(asset.dataUrl)).blob()
        const restored = await uploadImage(new File([blob], asset.fileName, { type: asset.mimeType || blob.type }), asset.fileType || 'icon')
        map.set(asset.sourceUrl, restored)
      }
      catch (error) {
        console.warn('Jydn asset restore failed', asset.fileName, error)
      }
    }
    for (const group of data.icons || [])
      for (const item of group.children || [])
        if (item.icon?.src && map.has(item.icon.src)) item.icon.src = map.get(item.icon.src)
    if (data.panelConfig) {
      const next = { ...localPanelConfig(), ...data.panelConfig }
      if (next.logoImageSrc && map.has(next.logoImageSrc)) next.logoImageSrc = map.get(next.logoImageSrc)
      if (next.faviconImageSrc && map.has(next.faviconImageSrc)) next.faviconImageSrc = map.get(next.faviconImageSrc)
      if (next.backgroundImageSrc && map.has(next.backgroundImageSrc)) next.backgroundImageSrc = map.get(next.backgroundImageSrc)
      await savePanelConfig(next)
      data.panelConfig = next
    }
    await detectMissingImportIcons(data.icons || [])
    updateMd5(data)
    const replacement = new File([JSON.stringify(data)], file.name, { type: 'application/json' })
    const transfer = new DataTransfer(); transfer.items.add(replacement); input.files = transfer.files
    handledInputs.add(input)
    input.dispatchEvent(new Event('change', { bubbles: true }))
    handledInputs.delete(input)
  }

  document.addEventListener('change', async (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || handledInputs.has(input))
      return
    const file = input.files?.[0]
    if (!file || !/\.json$/i.test(file.name))
      return
    let data
    try { data = JSON.parse(await file.text()) } catch { return }
    if ((!Array.isArray(data.assets) || data.assets.length === 0) && (!Array.isArray(data.icons) || data.icons.length === 0))
      return
    event.preventDefault(); event.stopImmediatePropagation()
    await restoreImportFile(input, file, data)
  }, true)

  function installDockerTrigger() {
    const auth = storedData('AUTH_TOKEN') || {}
    if (Number(auth.userInfo?.role) !== 1 || document.getElementById('jydn-docker-trigger'))
      return
    injectStyle()
    const trigger = document.createElement('button')
    trigger.id = 'jydn-docker-trigger'
    trigger.className = 'jydn-docker-trigger'
    trigger.type = 'button'
    trigger.textContent = 'Docker 管理'
    trigger.addEventListener('click', showDockerManager)
    document.body.appendChild(trigger)
  }

  function dockerButton(label, handler) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', handler)
    return button
  }

  async function showDockerManager() {
    document.getElementById('jydn-docker-overlay')?.remove()
    const overlay = document.createElement('div')
    overlay.id = 'jydn-docker-overlay'
    overlay.className = 'jydn-docker-overlay'
    const panel = document.createElement('div')
    panel.className = 'jydn-docker-panel'
    const head = document.createElement('div')
    head.className = 'jydn-docker-head'
    const title = document.createElement('strong')
    title.textContent = 'Docker 管理'
    const headActions = document.createElement('div')
    headActions.className = 'jydn-docker-actions'
    headActions.appendChild(dockerButton('刷新', () => showDockerManager()))
    headActions.appendChild(dockerButton('关闭', () => overlay.remove()))
    head.append(title, headActions)
    const content = document.createElement('div')
    content.textContent = '正在读取 Docker 状态...'
    panel.append(head, content)
    overlay.appendChild(panel)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay)
        overlay.remove()
    })
    document.body.appendChild(overlay)

    try {
      const infoResponse = await apiPost('/system/docker/info', {})
      if (!infoResponse.data?.available) {
        content.textContent = 'Docker 不可用：' + (infoResponse.data?.message || '当前进程无法访问 Docker')
        return
      }
      title.textContent = 'Docker 管理 v' + (infoResponse.data.version || '')
      const listResponse = await apiPost('/system/docker/containers', {})
      const containers = listResponse.data?.list || []
      content.replaceChildren()
      if (containers.length === 0) {
        content.textContent = '没有发现 Docker 容器'
        return
      }

      const table = document.createElement('table')
      table.className = 'jydn-docker-table'
      table.innerHTML = '<thead><tr><th>容器</th><th>镜像</th><th>状态</th><th>端口</th><th>操作</th></tr></thead>'
      const body = document.createElement('tbody')
      for (const container of containers) {
        const row = document.createElement('tr')
        for (const value of [container.name, container.image, container.status || container.state, container.ports || '-']) {
          const cell = document.createElement('td')
          cell.textContent = value || '-'
          row.appendChild(cell)
        }
        const actions = document.createElement('td')
        const actionBox = document.createElement('div')
        actionBox.className = 'jydn-docker-actions'
        const identifier = container.id || container.name
        const runAction = async (action) => {
          if (action !== 'start' && !confirm(action + ' ' + container.name + '?'))
            return
          await apiPost('/system/docker/action', { id: identifier, action })
          await showDockerManager()
        }
        if (container.state === 'running')
          actionBox.appendChild(dockerButton('停止', () => runAction('stop').catch(alert)))
        else
          actionBox.appendChild(dockerButton('启动', () => runAction('start').catch(alert)))
        actionBox.appendChild(dockerButton('重启', () => runAction('restart').catch(alert)))
        actionBox.appendChild(dockerButton('日志', async () => {
          try {
            const response = await apiPost('/system/docker/logs', { id: identifier, tail: 200 })
            content.replaceChildren()
            const back = dockerButton('返回容器列表', () => showDockerManager())
            const logs = document.createElement('pre')
            logs.className = 'jydn-docker-logs'
            logs.textContent = response.data?.logs || ''
            content.append(back, logs)
          }
          catch (error) {
            alert(error.message || String(error))
          }
        }))
        actions.appendChild(actionBox)
        row.appendChild(actions)
        body.appendChild(row)
      }
      table.appendChild(body)
      content.appendChild(table)
    }
    catch (error) {
      content.textContent = 'Docker 管理加载失败：' + (error.message || String(error))
    }
  }
  const observer = new MutationObserver(() => {
    document.querySelectorAll('input[type=file]').forEach((input) => {
      const accept = input.getAttribute('accept') || ''
      if (accept.includes('.json') && !accept.includes('jydn-panel'))
        input.setAttribute('accept', `.jydn-panel.json,${accept}`)
    })
    installLogoAdmin().catch(console.warn)
    installAdditionalStyleControls().catch(console.warn)
    const currentConfig = localPanelConfig()
    if (Object.keys(currentConfig).length)
      visualPanelConfig = { ...visualPanelConfig, ...currentConfig }
    applyVisualConfig(visualPanelConfig)
    document.getElementById('jydn-docker-trigger')?.remove()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  installLogoAdmin().catch(console.warn)
  installAdditionalStyleControls().catch(console.warn)
  document.getElementById('jydn-docker-trigger')?.remove()
  getPanelConfig().then((config) => {
    visualPanelConfig = config
    storePanelConfig(config)
    applyVisualConfig(config)
    if (config.logoText === legacyLogo) {
      config.logoText = BRAND
      savePanelConfig(config).then(() => location.reload()).catch(() => {})
    }
  })
})()