# 生成 iOS 启动图标 / 启动图（不依赖网络，用 PIL 纯绘制）
# 设计沿用 Android 版：蓝底 + 白色时钟环 + 白色表针（10:10）
# 与 Android 的区别：
#   - iOS 图标由系统自己裁圆角，所以必须整幅不透明（不能有透明区域），
#     蓝底直接铺满整张画布，不能画圆角方块
#   - iOS 启动图尺寸固定 2732x2732（横竖屏通用），居中放一个小的蓝底圆角 logo
import math
import os

from PIL import Image, ImageDraw

BG = (63, 140, 255)          # 主色 #3F8CFF
SPLASH_BG = (242, 247, 255)  # 页面底色 #F2F7FF
WHITE = (255, 255, 255)
BLUE = (63, 140, 255)

SS = 4  # 超采样倍数，抗锯齿


def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    r = max(1, int(radius))
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.pieslice([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=fill)


def clock(draw, cx, cy, R, ring_w, hand_w, hand_h, hand_m, ring_color, hand_color):
    # 白色圆环
    draw.ellipse([cx - R, cy - R, cx + R, cy + R], outline=ring_color, width=max(1, int(ring_w)))
    # 表针指向 10:10
    for angle, length in ((-60, hand_h), (60, hand_m)):
        dx = math.sin(math.radians(angle))
        dy = -math.cos(math.radians(angle))
        draw.line([cx, cy, cx + dx * length, cy + dy * length],
                  fill=hand_color, width=max(1, int(hand_w)))
    r = max(1, int(hand_w * 1.2))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hand_color)


def render_icon(size):
    """iOS 应用图标：整幅蓝底铺满，白色时钟居中，不透明。"""
    S = size * SS
    img = Image.new('RGBA', (S, S), BG + (255,))  # 整幅蓝底，完全不透明
    draw = ImageDraw.Draw(img)
    cx = cy = S / 2
    R = S * 0.30
    ring_w = S * 0.055
    hand_w = S * 0.05
    clock(draw, cx, cy, R, ring_w, hand_w, hand_h=S * 0.17, hand_m=S * 0.23,
          ring_color=WHITE, hand_color=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def render_splash(size):
    """iOS 启动图：浅色底 + 居中蓝色圆角方块小 logo，不透明。"""
    S = size * SS
    img = Image.new('RGBA', (S, S), SPLASH_BG + (255,))
    draw = ImageDraw.Draw(img)
    side = S * 0.30
    x0, y0 = (S - side) / 2, (S - side) / 2
    rounded_rect(draw, [x0, y0, x0 + side, y0 + side], side * 0.22, BG)
    cx = cy = S / 2
    R = side * 0.30
    ring_w = side * 0.055
    hand_w = side * 0.05
    clock(draw, cx, cy, R, ring_w, hand_w, hand_h=side * 0.16, hand_m=side * 0.22,
          ring_color=WHITE, hand_color=BLUE)
    return img.resize((size, size), Image.LANCZOS)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert('RGBA').save(path)
    print(' ', path)


ROOT = 'ios/App/App/Assets.xcassets'

# iOS 图标：Capacitor 6 模板的 Contents.json 只引用 AppIcon-512@2x.png（1024x1024），
# 系统自动裁圆角，所以整幅蓝底不透明
save(render_icon(1024), f'{ROOT}/AppIcon.appiconset/AppIcon-512@2x.png')
# iOS 启动图：模板 Contents.json 引用三张同名 2732x2732（1x/2x/3x 同尺寸），横竖屏通用
save(render_splash(2732), f'{ROOT}/Splash.imageset/splash-2732x2732.png')
save(render_splash(2732), f'{ROOT}/Splash.imageset/splash-2732x2732-1.png')
save(render_splash(2732), f'{ROOT}/Splash.imageset/splash-2732x2732-2.png')

print('iOS 图标生成完成')