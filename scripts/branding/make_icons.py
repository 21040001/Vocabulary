"""
Geçici uygulama ikonu + açılış (splash) görseli üretir.
Marka belli olunca: kendi logonuzu foreground olarak koyup bu betiği uyarlayın
ya da Android Studio > New > Image Asset kullanın.

Çalıştırma (proje kökünden):
    pip install pillow
    python scripts/branding/make_icons.py

Üretilenler:
    android/app/src/main/res/mipmap-*/ic_launcher*.png      (eski tip ikonlar)
    android/app/src/main/res/mipmap-*/ic_launcher_foreground.png, _monochrome.png
    android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml  (adaptive icon)
    android/app/src/main/res/drawable-*/splash_icon.png
    android/app/src/main/res/values/ic_launcher_background.xml
    docs/store/play-icon-512.png, docs/store/feature-graphic-1024x500.png
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
STORE = os.path.join(ROOT, 'docs', 'store')

PRIMARY = (79, 70, 229)       # #4F46E5 (uygulamanın ana rengi)
PRIMARY_DARK = (67, 56, 202)  # #4338CA
ACCENT = (165, 180, 252)      # #A5B4FC
WHITE = (255, 255, 255)
SUITE_NAME = 'LinguaUz'
APP_NAME = 'Vocabulary'

DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
S = 1024  # çizim çözünürlüğü


def font(size, symbols=False):
    # symbols=True: ʻ ve ↔ karakterlerini de içeren yazı tipi
    first = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if symbols else []
    for f in first + [
        '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    ]:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def bubble(d, box, fill, tail_left):
    x0, y0, x1, y1 = box
    r = (x1 - x0) * 0.22
    d.rounded_rectangle(box, radius=r, fill=fill)
    w = x1 - x0
    if tail_left:
        d.polygon([(x0 + w * 0.18, y1 - 2), (x0 + w * 0.40, y1 - 2), (x0 + w * 0.10, y1 + w * 0.20)], fill=fill)
    else:
        d.polygon([(x1 - w * 0.18, y1 - 2), (x1 - w * 0.40, y1 - 2), (x1 - w * 0.10, y1 + w * 0.20)], fill=fill)


def center_text(d, box, text, size, fill):
    f = font(size)
    x0, y0, x1, y1 = box
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text(((x0 + x1 - (r - l)) / 2 - l, (y0 + y1 - (b - t)) / 2 - t), text, font=f, fill=fill)


def glyph(mono=False):
    """İki konuşma balonu: arkada 'Uz' (Özbekçe), önde 'Aa' (İngilizce). Şeffaf zemin, 1024px."""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    back = WHITE if mono else ACCENT
    front = WHITE
    bubble(d, (S * 0.36, S * 0.16, S * 0.86, S * 0.56), back, tail_left=False)
    center_text(d, (S * 0.56, S * 0.17, S * 0.84, S * 0.40), 'Uz', int(S * 0.15), (0, 0, 0, 0) if mono else PRIMARY_DARK)
    # öndeki balonun etrafında boşluk (balonlar ayrışsın)
    gap = S * 0.035
    d.rounded_rectangle((S * 0.14 - gap, S * 0.40 - gap, S * 0.64 + gap, S * 0.80 + gap), radius=S * 0.13, fill=(0, 0, 0, 0))
    bubble(d, (S * 0.14, S * 0.40, S * 0.64, S * 0.80), front, tail_left=True)
    center_text(d, (S * 0.14, S * 0.40, S * 0.64, S * 0.80), 'Aa', int(S * 0.20), (0, 0, 0, 0) if mono else PRIMARY)
    return im


def scaled(im, size, content=1.0):
    """im'i size×size kareye, içerik oranı `content` olacak şekilde yerleştirir"""
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = max(1, round(size * content))
    g = im.resize((inner, inner), Image.LANCZOS)
    out.paste(g, ((size - inner) // 2, (size - inner) // 2), g)
    return out


def on_background(g, size, shape):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    if shape == 'circle':
        md.ellipse((0, 0, size - 1, size - 1), fill=255)
    else:
        md.rounded_rectangle((0, 0, size - 1, size - 1), radius=size * 0.22, fill=255)
    fill = Image.new('RGBA', (size, size), PRIMARY + (255,))
    bg.paste(fill, (0, 0), mask)
    fg = scaled(g, size, 0.78)
    bg.alpha_composite(fg)
    return bg


def save(im, *parts):
    path = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    return path


def write(text, *parts):
    path = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def main():
    g = glyph()
    mono = glyph(mono=True)
    for name, k in DENSITIES.items():
        legacy = round(48 * k)
        save(on_background(g, legacy, 'rounded'), RES, f'mipmap-{name}', 'ic_launcher.png')
        save(on_background(g, legacy, 'circle'), RES, f'mipmap-{name}', 'ic_launcher_round.png')
        fg = round(108 * k)  # adaptive: 108dp tuval, içerik ortadaki 66dp güvenli alanda
        save(scaled(g, fg, 0.60), RES, f'mipmap-{name}', 'ic_launcher_foreground.png')
        save(scaled(mono, fg, 0.60), RES, f'mipmap-{name}', 'ic_launcher_monochrome.png')
        sp = round(288 * k)  # Android 12 splash: 288dp tuval, içerik 192dp daire içinde
        save(scaled(g, sp, 0.58), RES, f'drawable-{name}', 'splash_icon.png')

    adaptive = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
'''
    write(adaptive, RES, 'mipmap-anydpi-v26', 'ic_launcher.xml')
    write(adaptive, RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml')
    write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#4F46E5</color>
    <color name="splash_background">#4F46E5</color>
</resources>
''', RES, 'values', 'ic_launcher_background.xml')

    # Play Store görselleri
    save(store_icon(g), STORE, 'play-icon-512.png')
    save(feature_graphic(g), STORE, 'feature-graphic-1024x500.png')
    print('Tamam:', RES, STORE)


def store_icon(g):
    # Play Store kendi köşe yuvarlamasını uygular: kare ve opak olmalı
    im = Image.new('RGB', (512, 512), PRIMARY)
    im.paste(scaled(g, 512, 0.80), (0, 0), scaled(g, 512, 0.80))
    return im


def feature_graphic(g):
    im = Image.new('RGB', (1024, 500), PRIMARY)
    d = ImageDraw.Draw(im)
    for i in range(500):  # hafif dikey geçiş
        t = i / 499
        c = tuple(round(PRIMARY[j] * (1 - t) + PRIMARY_DARK[j] * t) for j in range(3))
        d.line([(0, i), (1024, i)], fill=c)
    icon = scaled(g, 360, 1.0)
    im.paste(icon, (60, 70), icon)
    d.text((450, 160), SUITE_NAME, font=font(84), fill=WHITE)
    d.text((454, 270), APP_NAME, font=font(48), fill=ACCENT)
    d.text((454, 340), 'English ↔ Oʻzbekcha', font=font(34, symbols=True), fill=WHITE)
    return im


if __name__ == '__main__':
    sys.exit(main())
