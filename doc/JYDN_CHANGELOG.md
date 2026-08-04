# Jydn-Panel 定制变更说明

> 文档状态：2026-08-04 测试版，尚未同步 GitHub，也未同步到 `10.88.0.251`。

## 1. 当前运行基线

| 项目 | 当前值 |
| --- | --- |
| 项目名称 | Jydn-Panel |
| 后端 | Go、Gin、Gorm |
| 前端 | Vue 3、Vite、TypeScript、Pinia、Naive UI |
| 默认端口 | `8008` |
| 测试地址 | `http://10.88.0.247:8008/` |
| 测试部署 | 原生 Linux + systemd，不依赖 Docker 运行面板 |
| 安装目录 | `/opt/jydn-panel` |
| systemd 服务 | `jydn-panel.service` |
| 运行数据 | `/opt/jydn-panel/{conf,database,uploads,runtime}` |

## 2. 已完成变更

### 2.1 品牌与外观

- 项目显示名称统一为 **Jydn-Panel**，界面简称使用 **Jydn**。
- “站点 Logo”作为统一图片来源：首页 Logo、登录相关 Logo 和浏览器标签图标均优先读取 `logoImageSrc`。
- 浏览器 Favicon 自动跟随站点 Logo；旧字段 `faviconImageSrc` 继续保留，用于兼容已有配置。
- 新增公开只读接口：
  - `POST /api/about/siteAppearance`：只返回允许公开的站点外观字段。
  - `GET /api/about/siteFavicon`：跳转到当前站点 Logo，未设置时回退 `/favicon.svg`。
- Powered By 改为后台“风格设置”中的 HTML 代码编辑框，配置字段为 `poweredByHtml`。
- Powered By 代码在显示前会过滤 `script`、事件属性、危险协议以及部分高风险标签。
- 保留旧的 `poweredByText`、`poweredByUrl`，首次打开编辑器时会自动转换成 HTML，避免旧配置丢失。
- 站点 Logo 上传加入“上传中、成功、失败、登录过期”提示，并允许同一文件失败后重新选择。
- 桌面端与移动端 Logo 尺寸分别约束，避免图片过大挤压标题和时间。

Powered By 示例：

```html
Powered By <a href="https://github.com/zhiwen1987/Jydn-Panel">Jydn-Panel</a>
```

### 2.2 系统应用菜单

后台菜单当前顺序：

1. 我的信息
2. 账号管理
3. 风格设置
4. 分组管理
5. 导出导入
6. 上传文件管理
7. 插件管理器
8. 关于

“关于”固定在菜单最下面；插件管理器和 Docker 页面挂载在系统应用右侧原生内容区域，返回插件管理器或其他系统应用时不替换外层框架。

### 2.3 左侧分组目录

- 左侧分组目录支持固定显示名称。
- 目录圆点/轨道尺寸可在风格设置中调整。
- 首页目录顶部提供低干扰入口，不占用明显的顶部空间。
- 配置字段：`leftCatalogLabelFixed`、`leftCatalogSize`。

### 2.4 导出、导入和图标

- 导出站点配置时可把站点图片嵌入导出数据，降低跨设备导入后的图片丢失概率。
- 导入时恢复内嵌图片并修正对应路径。
- 导入站点后对缺失图标执行自动探测；探测失败不会阻断其余数据导入。
- 相关运行时代码集中在 `dist/custom/jydn-enhancements.js`。

### 2.5 Docker 插件管理器

入口位置：**系统应用 → 插件管理器 → cockpit-docker**。

当前后台路由均需要登录且具备管理员权限。已提供的 API/UI 范围：

- 全局概览：Docker 版本、API、驱动、容器/镜像/卷/网络统计、事件。
- Docker 守护进程：启动、停止、重启。
- 容器：列表、筛选、详情、日志、进程、统计、启动/停止/重启/暂停/恢复/杀死/删除、重命名、CPU/内存更新、创建。
- 镜像：列表、拉取/删除等操作、分层历史、基于镜像创建容器。
- 数据卷：列表、创建和删除。
- 网络：列表、详情、创建/删除、容器接入和脱离。

当前未作为已完成功能承诺的扩展项：

- Docker Compose 图形编排。
- 私有仓库登录、镜像推送、镜像导入导出。
- Docker Swarm 管理。
- 容器快照、备份恢复图形操作。
- MACVLAN、Overlay 高级网络完整图形配置。

这些扩展项应在实现、权限检查和测试完成后再更新为“已完成”。

### 2.6 关于与版本检查

- 关于页面使用 Jydn-Panel 品牌资源。
- 移除原界面的 Github、TG 群和商城入口。
- 新增 GitHub Release 版本检查。
- 私有仓库通过 systemd 的 `EnvironmentFile=-/opt/jydn-panel/conf/github.env` 注入只读 Token。
- Token 文件、环境变量和真实 Token 不得写入仓库、导出文件、日志或本文档。

### 2.7 账号管理

- 修复后台新增账号请求无法正常创建的问题。
- 新增账号会先清理账号首尾空格，并校验账号长度为 3–50 个字符。
- 仅允许管理员和普通用户两种合法角色值。
- 密码在写入数据库前统一加密。
- 创建成功同时返回 `id` 和 `userId`，兼容不同前端调用字段。
- 创建、修改、删除和列表接口均经过登录与管理员权限中间件。

### 2.8 原生 Linux 安装

新增 `install.sh`，支持：

```bash
sudo bash install.sh --local /path/to/Jydn-Panel
sudo bash install.sh --package /path/to/jydn-panel_VERSION_linux_ARCH.tar.gz
sudo -E bash install.sh --version v1.00
```

安装器行为：

- 默认安装到 `/opt/jydn-panel`，默认端口 `8008`。
- 创建并启用 `jydn-panel.service`。
- 更新程序和 Web 文件前创建备份。
- 保留已有 `conf/conf.ini`、`database/`、`uploads/`、`runtime/`。
- Docker 可用时可让服务用户加入 `docker` 组；Docker 守护进程控制使用受限 sudoers 规则。

## 3. GitHub Actions 多平台发布

- `release.yml` 自动构建 Linux、Windows、macOS、OpenWrt 和 Docker 产物。
- 原生平台均包含对应的一键安装脚本，并保留用户数据目录。
- OpenWrt amd64/arm64 使用 musl 静态链接与 procd 服务。
- Docker 镜像发布到 GHCR，支持 linux/amd64 与 linux/arm64。
- 标签构建自动创建或更新 GitHub Release，并生成 `SHA256SUMS.txt`。
- 详细说明见 [GitHub Actions 多平台构建与一键安装包](./RELEASE_PACKAGING.md)。

## 4. 缓存与前端发布约束

当前 8008 正确界面由后端直接提供 `dist/` 内容。`src/` 是可维护源代码，但旧样式与当前发布包并非完全一致，因此：

- 不要直接运行 `pnpm run build`、`pnpm run dev` 覆盖当前 `dist/`。
- 紧急 UI 修复应修改 `dist/custom/*.js` 或当前 `dist/index.html` 引用的资源。
- 修改静态脚本后必须更新查询版本号，避免浏览器/PWA 缓存继续加载旧文件。
- 浏览器验证时使用 `Ctrl+F5`，必要时关闭旧标签页重新打开。

## 5. 验证清单

后端变更后：

```bash
go test ./...
go build ./main.go
```

部署后：

```bash
systemctl is-active jydn-panel.service
curl -I http://127.0.0.1:8008/
curl -X POST -H 'Content-Type: application/json' -d '{}' \
  http://127.0.0.1:8008/api/about/siteAppearance
curl -L -o /dev/null -w '%{http_code}\n' \
  http://127.0.0.1:8008/api/about/siteFavicon
```

人工验证：

- 登录、退出和会话过期提示。
- 风格设置保存、站点 Logo 上传、Favicon 更新、Powered By 代码显示。
- 系统应用菜单顺序及返回行为。
- 插件管理器和 Docker 五个页签。
- 导入、导出以及图片恢复。
- 账号管理新增账号流程。

## 6. 数据安全与回滚

升级或部署前至少备份：

```text
conf/conf.ini
database/
uploads/
runtime/
```

程序文件和 Web 文件可以从 `/opt/jydn-panel/backups/` 回滚；运行数据不要用旧安装包覆盖。任何文档、截图和支持日志都不得包含管理员密码、SSH 密码或 GitHub Token。
