工时记录 App：GitHub Actions 云构建 + Windows 安装到 iPad
============================================================

没有 Mac 也能把 App 装到 iPad 上，全程免费。
原理：GitHub 提供免费的 macOS 云服务器，在上面把工程编译成未签名的
iOS 安装包（.ipa）；下载到 Windows 后，用免费工具 Sideloadly
配合自己的 Apple ID 签名安装到 iPad。

一、准备工作
------------
1. 一个 GitHub 账号（没有就去 github.com 注册）
2. 一台 Windows 电脑（用来装 Sideloadly 和连 iPad）
3. iPad 数据线
4. 一个 Apple ID（免费即可，用来签名）

二、把项目推送到 GitHub（只做一次）
----------------------------------
1. 在 github.com 上新建一个仓库：
   点右上角 + 号 → New repository
   - Repository name 随便写，比如 worktime-app
   - 选 Private（私有，不公开代码）
   - 不要勾选 "Add a README"（项目里已经有文件）
   创建后，页面会显示几行 git 命令，先留着

2. 在本机把这个项目文件夹变成 git 仓库并提交（已帮你初始化好，
   只需要执行）：
     cd "D:\zuomian\Claude Code Test\worktime-app"
     git add -A
     git commit -m "初始化：工时记录 iOS 云构建"
     git branch -M main
     git remote add origin https://github.com/你的用户名/worktime-app.git
     git push -u origin main

三、触发云构建
--------------
1. 打开仓库页面 → 顶部 "Actions" 标签
2. 左侧点 "iOS 云构建"
3. 点右侧 "Run workflow" → 点绿色的 "Run workflow" 按钮
4. 等 5~15 分钟（第一次要装依赖，最慢）。构建过程中可以点进去看日志
5. 构建完成后，回到工作流的 "Summary" 页，底部 "Artifacts"
   区下载 worktime-app-ios.zip
6. 解压得到：工时记录-iOS.ipa

四、Windows 上用 Sideloadly 安装到 iPad
---------------------------------------
1. 在 Windows 上安装 iTunes 和 iCloud（Sideloadly 依赖它们驱动 iPad）：
   到微软商店或 Apple 官网下载
2. 下载 Sideloadly：https://sideloadly.io/ （免费）
3. 用数据线把 iPad 连到电脑，在 iPad 上点「信任此电脑」
4. 打开 Sideloadly：
   - 把 工时记录-iOS.ipa 拖进窗口
   - 填你的 Apple ID 和密码（App 专用密码也行）
   - 点 Start 开始安装
5. 安装完成后，去 iPad 上：设置 → 通用 → VPN与设备管理 →
   找到你的 Apple ID → 点「信任」
6. 回桌面，点「工时记录」图标就能用了

五、注意事项
------------
- 免费 Apple ID 签名有效期只有 7 天，到期后 App 会打不开，
  重新用 Sideloadly 装一次即可（数据还在，不会丢）
- 想免掉 7 天续签、或者以后上架 App Store，需要花 ¥688/年
  注册 Apple 开发者账号（$99），再把云构建改成自动签名
- App 数据存在 iPad 内部，卸载 App 会清空；覆盖安装不丢
- 云构建是免费额度的：私有仓库每月 2000 分钟，够用很久；
  公开仓库不限分钟

六、以后改了代码怎么重新打包
----------------------------
改完代码后，提交并推送：
  git add -A
  git commit -m "更新"
  git push
然后回到仓库 Actions 页面，再点一次 Run workflow 即可。
也可以打 tag（git tag v1.1 && git push origin v1.1）自动触发构建。