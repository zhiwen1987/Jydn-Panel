# GitHub Actions 多平台构建与一键安装包

## 1. 自动化入口

主工作流：`.github/workflows/release.yml`

| 触发方式 | 行为 |
| --- | --- |
| Pull Request | 校验脚本、解析 Windows 安装器、执行 `go test ./...` |
| 推送 `main` | 完整多平台构建，产物保留在 Actions Artifacts，并推送 GHCR `dev`/SHA 镜像 |
| 手动运行 | 完整多平台构建并推送 SHA Docker 镜像，不创建正式 Release |
| 推送 `v*` 标签 | 完整构建、生成校验和、推送 Docker 版本/`latest` 镜像并创建 GitHub Release |

旧的 `service/` 路径 Docker 工作流已移除，避免重复发布或因过期目录而构建失败。

## 2. Release 产物

标签 `v1.05` 会生成类似文件：

```text
jydn-panel_1.05_linux-amd64.tar.gz
jydn-panel_1.05_linux-arm64.tar.gz
jydn-panel_1.05_windows-amd64.zip
jydn-panel_1.05_macos-amd64.tar.gz
jydn-panel_1.05_macos-arm64.tar.gz
jydn-panel_1.05_openwrt-amd64.tar.gz
jydn-panel_1.05_openwrt-arm64.tar.gz
jydn-panel_1.05_docker-installer.tar.gz
SHA256SUMS.txt
```

所有原生包都包含当前提交的 `dist/`、配置模板、种子数据、语言文件和文档。`SHA256SUMS.txt` 用于下载后校验。

## 3. 支持范围

| 平台 | 架构 | 启动方式 | 安装器 |
| --- | --- | --- | --- |
| Linux | amd64、arm64 | systemd | `install.sh` |
| Windows | amd64 | 计划任务（SYSTEM） | `install-windows.ps1` |
| macOS | Intel amd64、Apple Silicon arm64 | launchd | `install-macos.sh` |
| OpenWrt/软路由 | amd64、arm64 | procd | `install-openwrt.sh` |
| Docker | amd64、arm64 | Docker restart policy | `install-docker.sh` |

OpenWrt 包使用 musl 静态链接，适合 x86_64 和 aarch64 软路由。MIPS/MIPSEL、ARMv7 暂未列入正式支持矩阵，因为项目使用 CGO SQLite，需要对应 OpenWrt SDK 交叉编译和真机验证。

## 4. 一键安装

### Linux

解压后执行：

```bash
sudo bash install.sh --local .
```

默认安装到 `/opt/jydn-panel`，端口 `8008`，保留已有 `conf`、`database`、`uploads`、`runtime`。

### Windows

解压 ZIP，以管理员身份打开 PowerShell：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install-windows.ps1
```

默认安装到 `%ProgramData%\Jydn-Panel`，注册 `Jydn-Panel` 开机计划任务并开放 TCP 8008。Windows 包没有商业代码签名，浏览器或 Defender 首次运行时可能显示未知发布者提示。

### macOS

根据 CPU 下载 `macos-amd64` 或 `macos-arm64`，解压后执行：

```bash
sudo bash install-macos.sh
```

默认安装到 `/usr/local/jydn-panel`，注册 `com.jydn.panel` LaunchDaemon。二进制未使用 Apple Developer ID 签名；安装器会移除下载隔离属性，但正式公开发布前仍建议配置签名与公证。

### OpenWrt/软路由

根据 `uname -m` 下载 `openwrt-amd64` 或 `openwrt-arm64`，上传并解压后执行：

```sh
sh install-openwrt.sh
```

可指定路径和端口：

```sh
sh install-openwrt.sh --dir /mnt/data/jydn-panel --port 8008
```

安装器注册 `/etc/init.d/jydn-panel` procd 服务。建议把安装目录放在有足够空间的持久存储上。

### Docker

解压 Docker 安装器后：

```bash
sudo bash install-docker.sh
```

可覆盖参数：

```bash
JYDN_IMAGE=ghcr.io/OWNER/Jydn-Panel:v1.05 \
JYDN_PORT=8008 \
JYDN_DATA_DIR=/opt/jydn-panel-data \
sudo -E bash install-docker.sh
```

为支持面板内 Docker 管理，安装器默认在存在 `/var/run/docker.sock` 时挂载该 socket。若不需要 Docker 管理功能：

```bash
JYDN_DOCKER_SOCKET=no sudo -E bash install-docker.sh
```

Docker socket 等同于高权限宿主机控制入口，只应提供给可信管理员。

## 5. GitHub 仓库设置

工作流只使用仓库自带 `GITHUB_TOKEN`：

- `contents: write`：创建或更新 Release。
- `packages: write`：推送 `ghcr.io` 镜像。

仓库应允许 GitHub Actions 写入 Contents 和 Packages。私有仓库的 Release 和 GHCR 镜像默认也可能是私有资源，下载/拉取时需要具备读取权限的 Token。

Docker 镜像标签：

```text
ghcr.io/<owner>/<repo>:dev       # main 分支
ghcr.io/<owner>/<repo>:sha-xxxx  # 每次完整构建
ghcr.io/<owner>/<repo>:v1.05     # 标签发布
ghcr.io/<owner>/<repo>:latest    # 最新标签发布
```

## 6. 发布步骤

1. 确认 `dist/index.html` 和 `dist/custom/` 是准备发布的界面。
2. 执行后端测试：`go test ./...`。
3. 在 `UPDATELOG.md` 增加对应版本，例如 `## v1.05`。
4. 版本号按项目约定递增第二小数位，不使用 `1.00.1` 形式。
5. 提交代码后创建并推送标签：

```bash
git tag v1.05
git push origin v1.05
```

6. 等待 `Build, Package and Release` 全部任务完成。
7. 下载任一产物并使用 `SHA256SUMS.txt` 校验。
8. 至少在 Windows、Linux、macOS、OpenWrt 和 Docker 各验证一次安装、升级、重启与数据保留。

## 7. 数据保护

所有安装器都以保留以下目录为原则：

```text
conf/
database/
uploads/
runtime/
```

程序、Web 文件和安装脚本可以更新，真实配置与用户数据不能由发布包覆盖。安装前仍建议做独立备份。
