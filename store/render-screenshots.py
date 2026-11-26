"""Frame raw screenshots for the Chrome Web Store: 1280x800 PNG, brand ground,
one headline + subline, screenshot rising from the bottom edge.

    python store/render-screenshots.py

Reads store/screenshots/source/<n>.(png|webp|jpg) and writes
store/assets/screenshot-<n>.png. Captions live in SHOTS below.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'screenshots' / 'source'
OUT = ROOT / 'assets'

SHOTS = {
    '1': ('Learn every shortcut as you go', 'Hover any button to see its key.'),
    '2': ('A calmer, cleaner Gmail™', 'Hide Gemini, Upgrade, side panels and more in one click.'),
    '3': ('Every shortcut, your call', 'Turn each one on or off. Changes apply instantly.'),
    '4': ('Ready in one click', 'GG turns on Gmail’s keyboard shortcuts for each account.'),
}

# Boxes (in source-image pixels) to paint over: account email and profile photo.
# Each is covered with a solid black box.
_PRIVATE = [
    ('bar', (580, 280, 735, 314)),     # sender address next to the name
    ('chip', (1480, 210, 1650, 246)),  # address label chip beside the subject
    ('circle', (1914, 18, 1982, 84)),  # profile photo, top right
]
MASKS = {'1': _PRIVATE, '2': _PRIVATE}


def _shade(c, amount: float):
    """Nudge a colour toward grey-dark so the skeleton reads on any background."""
    return tuple(round(v * (1 - amount)) for v in c)


def cover_private(img: Image.Image, key: str) -> None:
    """Replace private bits with loading-skeleton shapes in the page's own tint."""
    d = ImageDraw.Draw(img)
    for shape, (x0, y0, x1, y1) in MASKS.get(key, []):
        bg = img.getpixel((max(x0 - 6, 0), y0 + 2))
        d.rectangle((x0, y0, x1, y1), fill=bg)  # erase
        tint = _shade(bg, 0.09)
        cy = (y0 + y1) / 2
        if shape == 'bar':  # a text line: shorter than the box, fully rounded
            d.rounded_rectangle((x0 + 8, cy - 9, x1 - 18, cy + 9), 9, fill=tint)
        elif shape == 'chip':  # a label chip, with a shorter "text" bar inside
            d.rounded_rectangle((x0 + 4, y0 + 4, x1 - 6, y1 - 4), 6, fill=tint)
            d.rounded_rectangle((x0 + 16, cy - 6, x1 - 40, cy + 6), 6, fill=_shade(bg, 0.17))
        else:  # an avatar
            r = min(x1 - x0, y1 - y0) / 2 - 6
            cx = (x0 + x1) / 2
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=_shade(bg, 0.12))


S = 2  # render at 2x, downscale for crisp text and edges
W, H = 1280 * S, 800 * S
INK, PAPER, MUTED, BLUE = (22, 22, 24), (245, 245, 243), (163, 163, 168), (57, 142, 255)
FONTS = Path('C:/Windows/Fonts')
BOLD = ImageFont.truetype(str(FONTS / 'segoeuib.ttf'), 46 * S)
REG = ImageFont.truetype(str(FONTS / 'segoeui.ttf'), 22 * S)


def ground() -> Image.Image:
    img = Image.new('RGB', (W, H), INK)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W // 2 - 620 * S, -420 * S, W // 2 + 620 * S, 520 * S), fill=95)
    glow = glow.filter(ImageFilter.GaussianBlur(170 * S))
    img.paste(Image.new('RGB', (W, H), BLUE), mask=glow)
    return img


def rounded(im: Image.Image, r: int) -> Image.Image:
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height + r), r, fill=255)  # top corners only
    out = im.convert('RGBA')
    out.putalpha(mask)
    return out


def frame(src: Path, title: str, sub: str) -> Image.Image:
    img = ground()
    d = ImageDraw.Draw(img)
    d.text((W // 2, 74 * S), title, font=BOLD, fill=PAPER, anchor='mt')
    d.text((W // 2, 140 * S), sub, font=REG, fill=MUTED, anchor='mt')

    shot = Image.open(src).convert('RGB')
    cover_private(shot, src.stem)
    sw = 1040 * S
    shot = shot.resize((sw, round(shot.height * sw / shot.width)), Image.LANCZOS)
    x, y = (W - sw) // 2, 200 * S
    shot = rounded(shot, 18 * S)

    shadow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x, y + 14 * S, x + sw, H + 40 * S), 18 * S, fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(28 * S))
    img.paste(Image.new('RGB', (W, H), (0, 0, 0)), mask=shadow)
    img.paste(shot, (x, y), shot)
    ImageDraw.Draw(img).rounded_rectangle((x, y, x + sw, H + 40 * S), 18 * S, outline=(62, 62, 68), width=S)
    return img.resize((1280, 800), Image.LANCZOS)


def logo(size: int) -> Image.Image:
    """GG's mark (branding/logo.svg) drawn in 128-unit space, scaled to `size`."""
    k = size / 128
    p = lambda x, y: (x * k, y * k)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, size - 1, size - 1), 30 * k, fill=INK)

    def stroke(points, width, color):
        w = round(width * k)
        d.line([p(*q) for q in points], fill=color, width=w, joint='curve')
        for q in (points[0], points[-1]):
            x, y = p(*q)
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=color)

    # Key outline: a rounded square open at the top-right corner.
    w = round(8 * k)
    d.rounded_rectangle((*p(28, 28), *p(100, 100)), 16 * k, outline=PAPER, width=w)
    d.rectangle((*p(73, 18), *p(110, 55)), fill=INK)
    for q in ((72, 28), (100, 56)):
        x, y = p(*q)
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=PAPER)
    # Arrow.
    stroke([(56, 72), (100, 28)], 9, BLUE)
    stroke([(74, 28), (100, 28), (100, 54)], 9, BLUE)
    return im


def keycap(d: ImageDraw.ImageDraw, x: int, y: int, label: str, font) -> int:
    """A keycap chip like the settings page's <kbd>; returns its width."""
    tw = d.textlength(label, font=font)
    w, h = int(max(tw + 28 * S, 44 * S)), 44 * S
    d.rounded_rectangle((x, y + 3 * S, x + w, y + h + 3 * S), 9 * S, fill=(11, 11, 13))
    d.rounded_rectangle((x, y, x + w, y + h), 9 * S, fill=(36, 36, 42), outline=(52, 52, 58), width=S)
    d.text((x + w / 2, y + h / 2), label, font=font, fill=PAPER, anchor='mm')
    return w


def cover() -> Image.Image:
    img = ground()
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(str(FONTS / 'segoeuib.ttf'), 64 * S)
    mid = ImageFont.truetype(str(FONTS / 'segoeuib.ttf'), 26 * S)
    body = ImageFont.truetype(str(FONTS / 'segoeui.ttf'), 22 * S)
    label = ImageFont.truetype(str(FONTS / 'segoeuib.ttf'), 21 * S)
    small = ImageFont.truetype(str(FONTS / 'segoeui.ttf'), 16 * S)
    kbd = ImageFont.truetype(str(FONTS / 'consolab.ttf'), 20 * S)

    # Left: mark, name, promise.
    lx = 96 * S
    mark = logo(168 * S)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).rounded_rectangle((lx - 10 * S, 150 * S, lx + 178 * S, 338 * S), 44 * S, fill=120)
    img.paste(Image.new('RGB', (W, H), BLUE), mask=glow.filter(ImageFilter.GaussianBlur(40 * S)))
    img.paste(mark, (lx, 160 * S), mark)
    d.rounded_rectangle((lx, 160 * S, lx + 168 * S, 328 * S), 38 * S, outline=(58, 58, 66), width=S)

    d.text((lx, 372 * S), 'GG', font=big, fill=PAPER)
    d.text((lx, 456 * S), 'Greater experience for Gmail™', font=mid, fill=(156, 197, 255))
    d.text((lx, 510 * S), 'Fly through your inbox', font=body, fill=MUTED)
    d.text((lx, 540 * S), 'without touching the mouse.', font=body, fill=MUTED)

    # Right: a card of shortcut rows, in the settings page's style.
    cx, cy, cw = 640 * S, 150 * S, 544 * S
    rows = [('E', 'Archive', 'Hover an email, press E'), ('R', 'Reply', 'Straight from the list'),
            ('Del', 'Delete', 'Gone in one key'), ('S', 'Star', 'Mark what matters'), ('Esc', 'Smart escape', 'Back to your inbox')]
    rh = 96 * S
    ch = rh * len(rows)
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((cx, cy + 20 * S, cx + cw, cy + ch + 20 * S), 22 * S, fill=170)
    img.paste(Image.new('RGB', (W, H), (0, 0, 0)), mask=sh.filter(ImageFilter.GaussianBlur(30 * S)))
    d.rounded_rectangle((cx, cy, cx + cw, cy + ch), 22 * S, fill=(26, 26, 29), outline=(46, 46, 52), width=S)
    for i, (key, name, desc) in enumerate(rows):
        y = cy + i * rh
        if i:
            d.line((cx + S, y, cx + cw - S, y), fill=(38, 38, 43), width=S)
        keycap(d, cx + 28 * S, y + (rh - 44 * S) // 2, key, kbd)
        d.text((cx + 128 * S, y + 26 * S), name, font=label, fill=PAPER)
        d.text((cx + 128 * S, y + 56 * S), desc, font=small, fill=MUTED)
        # Switch, on.
        sx, sy = cx + cw - 28 * S - 52 * S, y + (rh - 30 * S) // 2
        d.rounded_rectangle((sx, sy, sx + 52 * S, sy + 30 * S), 15 * S, fill=BLUE)
        d.ellipse((sx + 25 * S, sy + 3 * S, sx + 49 * S, sy + 27 * S), fill=PAPER)

    d.text((W // 2, H - 44 * S), 'Free  ·  No data collected  ·  Runs only on mail.google.com', font=small, fill=(120, 120, 128), anchor='mm')
    return img.resize((1280, 800), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    cover().save(OUT / 'screenshot-1.png', optimize=True)
    print('wrote store/assets/screenshot-1.png (cover)')
    for key, (title, sub) in SHOTS.items():
        src = next((p for p in SRC.glob(f'{key}.*')), None)
        if not src:
            print(f'skip {key}: no source image')
            continue
        dest = OUT / f'screenshot-{int(key) + 1}.png'  # the cover is screenshot-1
        frame(src, title, sub).save(dest, optimize=True)
        print('wrote', dest.relative_to(ROOT.parent))


if __name__ == '__main__':
    main()
