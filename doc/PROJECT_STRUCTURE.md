# Jydn-Panel 文件目录架构

本文档描述当前 Go + Vue 单仓库的主要目录、运行时目录以及代码入口。仅列出需要维护的文件；本地备份压缩包、临时二进制和日志不属于发布结构。

## 1. 源码仓库

```text
Jydn-Panel/
├── main.go                         # Go 程序入口
├── go.mod / go.sum                 # Go 模块与依赖（模块名暂保留 sun-panel）
├── install.sh                      # 原生 Linux/systemd 安装器
├── Dockerfile                      # Docker 镜像构建
├── docker-compose.yml              # Docker Compose 部署定义
├── conf/
│   ├── conf.example.ini            # 配置模板，默认端口 8008
│   └── conf.ini                    # 本地运行配置，不应覆盖用户配置
├── api/
│   └── api_v1/
│       ├── panel/                  # 面板配置、站点、分组、用户数据 API
│       ├── system/                 # 系统、账号、关于、文件、Docker API
│       │   ├── about.go            # 外观公开读取、Favicon、版本检查
│       │   ├── docker.go           # Docker 基础能力
│       │   ├── docker_extended.go  # 容器/镜像/网络扩展能力
│       │   └── docker_resources.go # Docker 资源请求与辅助逻辑
│       ├── openness/               # 开放接口
│       └── middleware/             # 登录、管理员、公开模式中间件
├── router/
│   ├── panel/                      # /api/panel 相关路由
│   ├── system/
│   │   ├── about.go                # /api/about 路由
│   │   └── docker.go               # /api/system/docker 路由
│   └── openness/                   # 开放路由
├── models/                         # Gorm 数据模型
├── initialize/                     # 配置、数据库、语言、缓存和程序初始化
├── global/                         # 全局数据库、配置和共享状态
├── lib/                            # 通用库、缓存、邮件、系统信息、站点图标
├── structs/                        # Go 公共结构体
├── lang/                           # 后端中英文语言资源
├── assets/                         # 后端嵌入资源
├── seed/
│   ├── conf/                       # 新安装配置种子
│   ├── database/                   # 新安装数据库种子
│   └── uploads/                    # 新安装上传文件种子
├── src/                            # Vue 3/TypeScript 可维护源代码
│   ├── api/                        # 前端 API 包装
│   ├── components/                 # 页面与系统应用组件
│   │   └── apps/Style/             # 风格设置源代码
│   ├── store/modules/              # Pinia 状态与默认配置
│   ├── router/                     # Hash 路由
│   ├── locales/                    # 前端中英文语言资源
│   ├── typings/                    # TypeScript 类型
│   ├── utils/                      # 请求、存储等工具
│   └── views/                      # 登录页、首页等视图
├── dist/                           # 当前后端实际提供的前端发布包
│   ├── index.html                  # 页面入口、缓存版本号、Favicon 入口
│   ├── assets/                     # 已构建 JS/CSS/图片
│   ├── custom/
│   │   ├── jydn-enhancements.js    # Logo、Favicon、Powered By、导入导出增强
│   │   ├── jydn-admin-integration.js # 系统菜单、插件管理器、Docker UI、版本检查
│   │   └── jydn-oem.*              # OEM 品牌图片
│   └── static/                     # 其他静态资源
├── public/                         # Vite 公共资源源目录
├── packaging/
│   ├── systemd/                    # systemd 打包模板/辅助文件
│   ├── windows/                    # Windows 计划任务安装器
│   ├── macos/                      # macOS launchd 安装器
│   ├── openwrt/                    # OpenWrt procd 安装器与 init 脚本
│   └── docker/                     # Docker 一键安装器
├── .github/workflows/release.yml   # 多平台构建、GHCR 和 Release 主工作流
├── scripts/                        # 构建、检查和发布辅助脚本
├── doc/
│   ├── images/                     # README 图片
│   ├── JYDN_CHANGELOG.md           # 当前定制变更说明
│   └── PROJECT_STRUCTURE.md        # 本文件
├── README.md / README_EN.md        # 项目入口文档
├── UPDATELOG.md                    # 正式版本与当前测试版更新记录
└── AGENTS.md                       # 项目维护和构建约束
```

## 2. 启动链路

```text
main.go
└── initialize.InitApp()
    ├── 读取 conf/conf.ini
    ├── 连接 SQLite/MySQL
    ├── 初始化语言、缓存和运行日志
    └── 缺少数据时从 seed/ 初始化
└── router.InitRouters(":" + http_port)
    ├── 挂载 /api
    ├── 提供 dist/web 静态前端
    ├── 提供 /uploads
    └── 监听 8008（默认）
```

API 返回统一格式：

```json
{
  "code": 0,
  "msg": "OK",
  "data": {}
}
```

前端鉴权请求头由公共请求工具统一加入 `token` 和 `lang`。

## 3. 源码与发布包关系

```text
src/（Vue 源代码）
        │
        │ 正常发布流程构建
        ▼
dist/（已构建前端）
        │
        │ 安装/打包时复制
        ▼
/opt/jydn-panel/web/
        │
        ▼
Go 后端通过 8008 提供页面
```

当前测试版的界面修复还包含 `dist/custom/` 运行时增强，因此不能只修改 `src/` 后就认为功能已经部署。涉及外观、系统应用或 Docker UI 时，要同时确认当前 `dist/index.html` 实际加载的脚本。

## 4. 运行环境目录

原生 systemd 部署：

```text
/opt/jydn-panel/
├── jydn-panel              # Go 可执行文件
├── web/                    # 后端提供的前端发布包
├── conf/
│   ├── conf.ini            # 真实运行配置
│   ├── conf.example.ini    # 配置模板
│   └── github.env          # 可选私有仓库版本检查环境变量，禁止提交
├── database/               # SQLite 等持久数据库
├── uploads/                # 用户上传 Logo、图标、壁纸等
├── runtime/                # 运行日志和临时状态
├── seed/                   # 首次启动种子
├── lang/                   # 后端语言文件
├── assets/                 # 后端资源
└── backups/                # 安装器/人工部署备份
```

Docker 部署把同类持久数据映射到 `/data`：

```text
/data/
├── conf/
├── database/
├── uploads/
└── runtime/
```

升级时只能替换程序和 Web 发布文件，不得覆盖这四个数据目录。

## 5. 关键配置字段

`Panel.panelConfig` 中与本次定制直接相关的字段：

| 字段 | 用途 |
| --- | --- |
| `logoText` | 顶部文字名称 |
| `logoImageSrc` | 站点统一 Logo，同时作为 Favicon 首选来源 |
| `faviconImageSrc` | 旧标签图标字段，仅作兼容回退 |
| `poweredByHtml` | 登录页 Powered By HTML 代码 |
| `poweredByText` | 旧 Powered By 名称，兼容迁移 |
| `poweredByUrl` | 旧 Powered By 链接，兼容迁移 |
| `leftCatalogLabelFixed` | 固定显示左侧目录名称 |
| `leftCatalogSize` | 左侧目录轨道/圆点尺寸 |

类型定义：`src/typings/panel.d.ts`
默认值：`src/store/modules/panel/helper.ts`

## 6. Docker 管理代码分层

```text
系统应用右侧 UI
└── dist/custom/jydn-admin-integration.js
    └── POST /api/system/docker/**
        └── router/system/docker.go
            └── api/api_v1/system/docker*.go
                └── Docker Engine API / 守护进程控制
```

所有 Docker 路由经过登录和管理员中间件。运行服务用户需要访问 Docker socket；启动、停止、重启守护进程还需要安装器生成的受限 sudoers 权限。

## 7. 构建与检查

后端：

```bash
go test ./...
go build ./main.go
```

前端只做类型/代码检查：

```bash
pnpm install
pnpm run type-check
pnpm run lint
```

当前不要执行会覆盖发布包的 Vite 构建或开发服务器命令。发布包和源码样式完全统一后，才能恢复标准的 `src → dist` 构建流程。

## 8. 不应进入发布包的内容

- `*.log` 运行日志。
- 本地编译的临时二进制，例如 `*.new`、`*.previous`、`before-*`。
- 调试阶段的 `*.tar.gz` 备份。
- `database/` 中的真实用户数据库。
- `uploads/` 中未经确认的真实用户文件。
- `conf/conf.ini` 中的环境专用配置。
- `conf/github.env`、Token 文件、密码或任何密钥。

发布前应检查这些文件是否已由 `.gitignore`、打包脚本和人工审核排除。
