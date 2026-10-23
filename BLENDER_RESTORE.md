# 第二张平面图：Blender源工程与素材

这是原生工程与素材备份，不是新的产品版本。

- [GitHub备份附件](https://github.com/falling-feather/second-floor-plan/releases/tag/blender-sources-20261024)
- 文件：`second-floor-plan-blender-sources.zip`，以及同名`.sha256`校验文件。
- 对应源码：`d5090c8f98c030b945701e2d275d26685360307c`。
- 当前Blender工程：1个；自动保存文件：0个。原件字节保持不变。
- 逐文件路径、长度及SHA-256见`source-assets/blender-files.csv`。

## 恢复

1. 克隆当前仓库，或检出上列源码提交；使用干净的工作目录。
2. 下载ZIP和SHA-256文件。PowerShell运行`Get-FileHash -Algorithm SHA256 <ZIP路径>`，与校验文件中的值比较。
3. 将ZIP按原目录结构解压到仓库根目录。原生工程与贴图会恢复到以下列出的路径。
4. 使用Blender 5.2.3 LTS或兼容版本打开`.blend`。本批全部当前工程已在5.2.3中实际打开，未发现未打包的外部输入依赖。

运行网页的依赖安装与构建仍见仓库README；源工程备份不包含node_modules、程序包、实际用户数据或报名人员资料。

## 工程入口

- `output/design/community-reading-room.blend`
