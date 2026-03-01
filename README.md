[[ 简体中文 ]](https://sun-panel-doc.enianteam.com/zh_cn/introduce/project.html) |
[[ English ]](https://sun-panel-doc.enianteam.com/introduce/project.html)

<div align=center>

<img src="./doc/images/logo.png" width="100" height="100" />

# Sun-Panel

[![Github](https://img.shields.io/badge/Github-123456?logo=github&labelColor=242424)](https://github.com/hslr-s/sun-panel)
[![Gitee](https://img.shields.io/badge/Gitee-123456?logo=gitee&labelColor=c71d23)](https://gitee.com/hslr/sun-panel)
[![docker](https://img.shields.io/badge/docker-123456?logo=docker&logoColor=fff&labelColor=1c7aed)](https://hub.docker.com/r/hslr/sun-panel) 
[![Bilibili](https://img.shields.io/badge/Bilibili-123456?logo=bilibili&logoColor=fff&labelColor=fb7299)](https://space.bilibili.com/27407696/channel/collectiondetail?sid=2023810)
[![YouTube](https://img.shields.io/badge/YouTube-123456?logo=youtube&labelColor=ff0000)](https://www.youtube.com/channel/UCKwbFmKU25R602z6P2fgPYg)
<br>
[![GitHub User's stars](https://img.shields.io/github/stars/hslr-s%2Fsun-panel?style=flat&logo=github)](https://github.com/hslr-s/sun-panel)
[![github downloads](https://img.shields.io/github/downloads/hslr-s/sun-panel/total.svg?logo=github)](https://github.com/hslr-s/sun-panel/releases)
[![docker pulls](https://img.shields.io/docker/pulls/hslr/sun-panel.svg?logo=docker)](https://hub.docker.com/r/hslr/sun-panel)

[[ 中文文档 ]](https://sun-panel-doc.enianteam.com/zh_cn) |
[[ Document ]](https://sun-panel-doc.enianteam.com) |
[[ Demo ]](http://sunpaneldemo.enianteam.com) 

A server, NAS navigation panel, Homepage, Browser homepage.
<br>
一个服务器、NAS导航面板、Homepage、浏览器首页。

</div>


![](./doc/images/main-dark.png)

> [!IMPORTANT]
> In order to maintain the livelihood, the author added some [`PRO`] (https://pro.sun-panel.top) function, so the project temporarily entered a closed source state.; At present, the latest version of the open source is `v1.3.0`, [Please see the latest version of closed source](https://github.com/hslr-s/sun-panel/releases).; When the modular technology is developed, the separation of the PRO and the programs will be opened again, and the closed source will have no effect on ordinary users.; Let's look forward to open source again, and at the same time, we are welcome to supervise and review the security of the program.
> 
> 作者为了维持生计，增加了一些 [`PRO`](https://pro.sun-panel.top) 功能，所以项目暂时进入闭源状态。目前开源最新版本为`v1.3.0`，[闭源最新版本请查看](https://github.com/hslr-s/sun-panel/releases)。待开发出模块化技术，然后对PRO和主程序进行分离会再次开源，闭源对普通用户没有任何影响。我们一起期待再次开源吧，同时也欢迎各位大佬对程序的安全性进行监督和审查。

## 📌 Fork / 二次开发说明（本仓库改动声明）

本仓库基于 **Sun‑Panel 开源版本（MIT License）** 做了面向“网站导航 + 网页信息流”使用场景的二次开发与体验优化。

- 本仓库 **不是官方仓库**，与原作者/官方无隶属关系；如需官方版本/PRO 功能请前往原项目。
- 原项目地址：<https://github.com/hslr-s/sun-panel>
- License：保留原项目 MIT License（见 `LICENSE`）。

### ✨ 主要改动（摘要）

以下为本仓库相对上游的主要功能与 UX 调整（持续更新）：

#### 1) 分组体系与列表体验
- 增加分组大类：**网站 / 网页**（后端持久化字段 + 前端 Tab 切换）。
- 网页列表：hover 操作按钮、标题单行省略与仅溢出时 Tooltip（最大宽度 90% 面板宽）。
- 网页列表：右键菜单“打开/复制”拆分为独立图标行，降低误触。
- 搜索关键字在“网站/网页”切换时保持过滤状态。

#### 2) 置顶（Pin）与排序
- 网页条目支持 **置顶/取消置顶**（后端字段持久化）。
- 默认排序：置顶在前，其余按创建时间从新到旧。

#### 3) 不刷新整页的局部更新
- 置顶/取消置顶、新建、修改、删除：改为 **仅本地更新对应分组列表**，避免整页/全量列表刷新造成视觉断裂。

#### 4) 布局与样式细节
- 全局 hover 高亮色统一为浅黄色：`#fef08a`。
- 滚动条宽度、圆角等做了变量化与一致性处理（如 `--sp-scrollbar-width`、`--sp-ui-radius`）。
- **左侧分组目录条（特色功能）**：与右侧滚动条同宽（默认 14px），无背景仅灰色边框；悬停显示半透明分组标签（`rgba(0,0,0,0.35)`），统一 10px 圆角；点击圆点可快速滚动定位到对应分组。
- 移动端体验：登录页更窄；内容间距更紧凑；可隐藏部分悬浮工具按钮。

#### 5) 间距可配置（新加设置项）
- 新增 3 个可配置间距项（默认值：30/40/40）：
  - 搜索框到下面间距（px）
  - 网站/网页切换条到第 1 分组间距（px）
  - 分组与分组之间间距（px）

### ⚠️ 兼容性与说明
- 本仓库会引入少量自定义交互与样式，建议在升级/合并上游变更时做一次回归测试。
- 若你在内网/无外网环境使用，请留意图标加载策略（本仓库已尽量做本地/兼容处理）。

## 😎 Features

- 🍉 Clean interface, powerful functionality, low resource consumption
- 🍊 Easy to use, visual operation, zero-code usage
- 🍠 One-click switch between internal and external network modes
- 🍵 Supports Docker deployment (compatible with Arm systems)
- 🎪 Supports multi-account isolation
- 🎏 Supports viewing system status
- 🫙 Supports custom JS, CSS
- 🍻 Simple usage without the need to connect to an external database
- 🍾 Rich icon styles for free combination, supports [Iconify icon library](https://icon-sets.iconify.design/)
- 🚁 Supports opening small windows in the webpage (some third-party websites may block this feature)

## 🖼️ Preview Screenshots

**Various styles, freely combined**

![](./doc/images/icon-small-new.png)
![](./doc/images/transparent-info.png)
![](./doc/images/transparent-small.png)
![](./doc/images/solid-color-info.png)
![](./doc/images/full-color-small.jpg)

**Built-in small windows**

![](./doc/images/window-ssh.png)
![](./doc/images/window-xunlei.png)



## 🐳 Deployment tutorial
[Deployment Tutorial](https://sun-panel-doc.enianteam.com/usage/quick_deploy.html)

## 🍵 Donate

> Open-source development is not easy. If you feel that my project has helped you, you are welcome to [donate](./doc/donate.md) or buy me a cup of tea☕ (please leave your nickname or name in the note if possible). Your support is my motivation, thank you.


<a href="https://www.paypal.me/hslrs">
<img height="60" src="./doc/images/donate/paypal.png" target="_blank"></img> 
</a>


|   |   |
| ------------ | ------------ |
| <img height="300" src="./doc/images/donate/weixin.png"/> |  <img height="300" src="./doc/images/donate/alipay.png" /> |

## 🏖️ Communication group & community

Author：**[红烧猎人](https://blog.enianteam.com/u/sun/content/11)**

[Github Discussions](https://github.com/hslr-s/sun-panel/discussions)

QQ交流群，进不去可以点上方连接联系作者

<img src="./doc/images/qq_group_qr2.png"  height="350" />

## ❤️ Thanks

- [Roc](https://github.com/RocCheng)
- [jackloves111](https://github.com/jackloves111)
- [Rock.L](https://github.com/gitlyp)


---

[![Star History Chart](https://api.star-history.com/svg?repos=hslr-s/sun-panel&type=Date)](https://star-history.com/#hslr-s/sun-panel&Date)
