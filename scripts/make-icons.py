# 生成 Android 启动图标 / 自适应前景 / 启动图（不依赖网络，用 PIL 纯绘制）
# 设计：蓝底圆角方块 + 白色时钟环 + 蓝色表针（10:10 的经典钟面）
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


def render(size, round_mask=False, splash_bg=None):
    """画一版图标。round_mask=True 时裁成圆形（round icon）。splash_bg 指定时用浅色背景 + 蓝方块。"""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if splash_bg is not None:
        draw.rectangle([0, 0, S, S], fill=splash_bg)
        # 居中蓝色圆角方块，占整图 30% 左右
        side = S * 0.62
        x0, y0 = (S - side) / 2, (S - side) / 2
        rounded_rect(draw, [x0, y0, x0 + side, y0 + side], side * 0.22, BG)
        cx = cy = S / 2
        R = side * 0.30
        ring_w = side * 0.055
        hand_w = side * 0.05
        clock(draw, cx, cy, R, ring_w, hand_w, hand_h=side * 0.16, hand_m=side * 0.22,
              ring_color=WHITE, hand_color=BLUE)
    else:
        # 整块蓝底圆角方块铺满
        rounded_rect(draw, [0, 0, S, S], S * 0.22, BG)
        cx = cy = S / 2
        R = S * 0.30
        ring_w = S * 0.055
        hand_w = S * 0.05
        clock(draw, cx, cy, R, ring_w, hand_w, hand_h=S * 0.17, hand_m=S * 0.23,
              ring_color=WHITE, hand_color=WHITE)

    if round_mask:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, S, S], fill=255)
        img.putalpha(mask)

    return img.resize((size, size), Image.LANCZOS)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert('RGBA').save(path)
    print(' ', path)


ROOT = 'android/app/src/main/res'

# 启动图标：mipmap-*dpi/ic_launcher.png
for name, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    save(render(size), f'{ROOT}/mipmap-{name}/ic_launcher.png')
    save(render(size, round_mask=True), f'{ROOT}/mipmap-{name}/ic_launcher_round.png')
    # 自适应前景：透明底，只画时钟，尺寸是 108dp 对应到各密度
    save(render(int(size * 108 / 48), splash_bg=None, round_mask=False),
         f'{ROOT}/mipmap-{name}/ic_launcher_foreground.png')

# 启动图：横屏 / 竖屏各密度（尺寸沿用 Capacitor 模板）
splash_sizes = {
    'drawable-port-mdpi': (320, 480),
    'drawable-port-hdpi': (480, 720),
    'drawable-port-xhdpi': (720, 1280),
    'drawable-port-xxhdpi': (960, 1600),
    'drawable-port-xxxhdpi': (1280, 1920),
    'drawable-land-mdpi': (480, 320),
    'drawable-land-hdpi': (720, 480),
    'drawable-land-xhdpi': (1280, 720),
    'drawable-land-xxhdpi': (1600, 960),
    'drawable-land-xxxhdpi': (1920, 1280),
}
for folder, (w, h) in splash_sizes.items():
    img = render(min(w, h), splash_bg=SPLASH_BG).resize((w, h), Image.LANCZOS)
    save(img, f'{ROOT}/{folder}/splash.png')
# 默认 splash（横屏 480x320，被 SplashScreen 主题引用）
save(render(320, splash_bg=SPLASH_BG).resize((480, 320), Image.LANCZOS), f'{ROOT}/drawable/splash.png')

print('图标生成完成')