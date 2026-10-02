工时记录 App iOS 打包说明（iPad 第 9 代）
==========================================

一、现在做到哪一步了
------------------
- Windows 上已经生成了完整的 iOS Xcode 工程，在 `ios/` 目录
- App 图标 / 启动图已生成（蓝底白色时钟，和安卓版同一套设计）
- 已针对 iPad 适配：支持 iPad 运行、状态栏安全区、部署目标 iOS 13
  （iPad 第 9 代系统是 iPadOS 15 及以上，完全兼容）
- 包名 com.zuomian.worktime，显示名「工时记录」，版本 1.0（与安卓版一致）

二、为什么 Windows 上打不出 .ipa
--------------------------------
iOS 应用只能用苹果官方的 Xcode（macOS 专属）编译和签名。
Windows 上最多只能生成工程，最后一步必须在一台 Mac 上完成。
可以用家里的 Mac，也可以用云构建服务（后面第五节简单提一下）。

三、在 Mac 上打包（首次）
-------------------------
1. 把整个 `worktime-app` 文件夹拷到 Mac（要包含 `node_modules`，
   iOS 的 Podfile 会引用 `node_modules/@capacitor/ios`）

2. 装 CocoaPods（如果 Mac 上还没装过）：
   打开「终端」，运行：
     sudo gem install cocoapods
   或
     brew install cocoapods

3. 进入工程目录，安装 iOS 原生依赖：
     cd worktime-app/ios/App
     pod install

4. 用 Xcode 打开工程（注意是 .xcworkspace，不是 .xcodeproj）：
     open App.xcworkspace

5. 设置签名（用自己的 Apple ID 免费签名就够个人使用）：
   - 左侧点「App」这个 target → 右侧选 Signing & Capabilities
   - 勾选 Automatically manage signing
   - Team 选自己的 Apple ID（首次要在 Xcode → Settings → Accounts 里添加）

6. 连接 iPad（用数据线，或选无线调试），在 Xcode 顶部设备栏选你的 iPad

7. 点 ▶ 运行按钮，App 就会装到 iPad 上

四、以后改代码后重新打包
------------------------
在 Mac 的项目目录里运行：
     npm run ios
（这条命令会重新构建网页资源、同步到 iOS 工程、重新生成图标）
然后回到 Xcode，再点一次 ▶ 运行即可。

五、没有 Mac 的替代方案
----------------------
推荐用 GitHub Actions 免费云构建 + Windows 上的 Sideloadly 安装，
全程不需要 Mac。完整步骤见同目录的《iOS云构建说明.md》。
其他备选：
- Appflow（Ionic 官方云构建）：收费，但可以一键出 .ipa
- 淘宝/闲鱼有远程 Mac 或代打包服务

六、注意事项
------------
- 数据存在 App 内部（localStorage），卸载 App 会清空；
  和安卓版行为一致，覆盖安装不丢数据
- 免费 Apple ID 签名的 App 有效期只有 7 天，到期后需要重新用 Xcode 装一次；
  想长期使用可以花 ¥688/年 注册 Apple 开发者账号（$99），
  那样签名有效期一年，还能通过 TestFlight 分发
- 如果只是自己用，第七节也可以：装好后在 iPad 的 设置 → 通用 → VPN与设备管理
  里信任开发者证书即可正常打开