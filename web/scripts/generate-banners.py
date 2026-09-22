"""Generates the six hero banners from one layout system.

Every element is declared as a rectangle first, and the script refuses to
write a file whose content rectangles overlap — which is how the old set
ended up with type sitting on top of type.
"""
import pathlib

FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
OUT = pathlib.Path("/Users/mac/Desktop/worldwidecoupon/web/public/banners")

DEFS = """    <filter id="lift" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0B3B2A" flood-opacity="0.2"/>
    </filter>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0E9F6E"/>
      <stop offset="100%" stop-color="#22C55E"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06301F"/>
      <stop offset="55%" stop-color="#0B5B3E"/>
      <stop offset="100%" stop-color="#0E9F6E"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F3F6F9"/>
    </linearGradient>
"""

class Layout:
    """Collects drawn boxes so overlaps can be caught before writing."""

    def __init__(self, width, height):
        self.width, self.height = width, height
        self.parts, self.boxes = [], []

    def add(self, box, markup):
        x, y, w, h = box
        assert x >= 24 and y >= 20, f"element too close to the edge: {box}"
        assert x + w <= self.width - 24, f"element runs off the right: {box}"
        assert y + h <= self.height - 16, f"element runs off the bottom: {box}"

        for other in self.boxes:
            ox, oy, ow, oh = other
            if x < ox + ow and ox < x + w and y < oy + oh and oy < y + h:
                raise AssertionError(f"overlap: {box} and {other}")

        self.boxes.append(box)
        self.parts.append(markup)

    def backdrop(self, markup):
        self.parts.append(markup)

    def render(self, label):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.width} {self.height}" '
            f'width="{self.width}" height="{self.height}" role="img" aria-label="{label}">\n'
            f"  <defs>\n{DEFS}  </defs>\n" + "\n".join(self.parts) + "\n</svg>\n"
        )


def text(x, y, body, size, weight=700, fill="#10241C", anchor="start", spacing=0, extra=""):
    return (
        f'  <text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{spacing}" font-family="{FONT}"{extra}>{body}</text>'
    )


def pill(layout, x, y, label, bg, fg, dot=None, size=13, spacing=1.7):
    width = 40 + len(label) * (size * 0.72)
    height = 36
    dot_markup = f'    <circle cx="20" cy="18" r="5" fill="{dot}"/>\n' if dot else ""
    text_x = 36 if dot else 22
    layout.add(
        (x, y, width, height),
        f'  <g transform="translate({x} {y})">\n'
        f'    <rect width="{width:.0f}" height="{height}" rx="18" fill="{bg}"/>\n'
        f"{dot_markup}"
        f'    <text x="{text_x}" y="23" font-size="{size}" font-weight="700" letter-spacing="{spacing}" '
        f'fill="{fg}" font-family="{FONT}">{label}</text>\n'
        f"  </g>",
    )


def headline(layout, x, baseline, line, size, fill, width_hint):
    """Baseline text, boxed by its cap height so neighbours keep their distance."""
    layout.add(
        (x, baseline - size * 0.82, width_hint, size * 1.12),
        text(x, baseline, line, size, 800, fill, spacing=-1.6),
    )


def paragraph(layout, x, baseline, line, size, width_hint, fill="#4B5563"):
    layout.add((x, baseline - size * 0.8, width_hint, size * 1.3), text(x, baseline, line, size, 500, fill))


def chips(layout, x, y, labels, fill="#0E9F6E", opacity=0.1, colour="#0B7D58", dot="#0E9F6E"):
    offset = 0
    for label in labels:
        width = 34 + len(label) * 6.9
        layout.add(
            (x + offset, y, width, 32),
            f'  <g transform="translate({x + offset} {y})">\n'
            f'    <rect width="{width:.0f}" height="32" rx="16" fill="{fill}" fill-opacity="{opacity}"/>\n'
            f'    <circle cx="15" cy="16" r="4" fill="{dot}"/>\n'
            f'    <text x="26" y="21" font-size="12.5" font-weight="700" fill="{colour}" '
            f'font-family="{FONT}">{label}</text>\n'
            f"  </g>",
        )
        offset += width + 10


def button(layout, x, y, label, width=None, height=50, fill="url(#cta)", colour="#FFFFFF", size=17):
    width = width or 40 + len(label) * (size * 0.62)
    layout.add(
        (x, y, width, height),
        f'  <g transform="translate({x} {y})" filter="url(#lift)">\n'
        f'    <rect width="{width:.0f}" height="{height}" rx="{height / 2:.0f}" fill="{fill}"/>\n'
        f'    <text x="{width / 2:.0f}" y="{height / 2 + 6:.0f}" text-anchor="middle" font-size="{size}" '
        f'font-weight="800" fill="{colour}" font-family="{FONT}">{label}</text>\n'
        f"  </g>",
    )


def lockup(layout, x, y, light=False, anchor="end", width=340):
    name_fill = "#FFFFFF" if light else "#10241C"
    accent = "#8FE3B9" if light else "#0E9F6E"
    tag_fill = "#FFFFFF" if light else "#6B7280"
    box_x = x - width if anchor == "end" else x
    layout.add(
        (box_x, y - 20, width, 44),
        f'  <g transform="translate({x} {y})">\n'
        f'    <text x="0" y="0" text-anchor="{anchor}" font-size="20" font-weight="800" fill="{name_fill}" '
        f'letter-spacing="-0.4" font-family="{FONT}">Worldwide<tspan fill="{accent}">Coupons</tspan></text>\n'
        f'    <text x="0" y="20" text-anchor="{anchor}" font-size="10.5" font-weight="600" fill="{tag_fill}" '
        f'fill-opacity="{0.65 if light else 1}" letter-spacing="1.5" font-family="{FONT}">'
        f"BETTER DEALS. BIGGER SAVINGS.</text>\n"
        f"  </g>",
    )


def offer_card(layout, x, y, w, h, kicker, headline_text, figure):
    layout.add(
        (x, y, w, h),
        f'  <g transform="translate({x} {y})" filter="url(#lift)">\n'
        f'    <rect width="{w}" height="{h}" rx="24" fill="url(#card)"/>\n'
        f'    <rect x="24" y="{(h - 66) / 2:.0f}" width="88" height="66" rx="18" fill="#0E9F6E"/>\n'
        f'    <text x="68" y="{h / 2 + 9:.0f}" text-anchor="middle" font-size="25" font-weight="800" '
        f'fill="#FFFFFF" font-family="{FONT}">{figure}</text>\n'
        f'    <text x="128" y="{h / 2 - 8:.0f}" font-size="12.5" font-weight="700" letter-spacing="1.5" '
        f'fill="#9CA3AF" font-family="{FONT}">{kicker}</text>\n'
        f'    <text x="128" y="{h / 2 + 20:.0f}" font-size="21" font-weight="800" fill="#10241C" '
        f'font-family="{FONT}">{headline_text}</text>\n'
        f"  </g>",
    )


def ticket(layout, x, y, w, h, code, save):
    layout.add(
        (x, y, w, h),
        f'  <g transform="translate({x} {y})" filter="url(#lift)">\n'
        f'    <rect width="{w}" height="{h}" rx="24" fill="#FFFFFF"/>\n'
        f'    <circle cx="0" cy="{h / 2:.0f}" r="14" fill="#F2FBF6"/>\n'
        f'    <circle cx="{w}" cy="{h / 2:.0f}" r="14" fill="#F2FBF6"/>\n'
        f'    <path d="M{w - 108} 20v{h - 40}" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="6 8"/>\n'
        f'    <text x="34" y="{h / 2 - 12:.0f}" font-size="12.5" font-weight="700" letter-spacing="1.7" '
        f'fill="#9CA3AF" font-family="{FONT}">EXCLUSIVE CODE</text>\n'
        f'    <text x="34" y="{h / 2 + 22:.0f}" font-size="27" font-weight="800" letter-spacing="1.4" '
        f'fill="#0E9F6E" font-family="{FONT}">{code}</text>\n'
        f'    <text x="{w - 54}" y="{h / 2 - 12:.0f}" text-anchor="middle" font-size="12" font-weight="700" '
        f'letter-spacing="1.4" fill="#9CA3AF" font-family="{FONT}">SAVE</text>\n'
        f'    <text x="{w - 54}" y="{h / 2 + 20:.0f}" text-anchor="middle" font-size="26" font-weight="800" '
        f'fill="#10241C" font-family="{FONT}">{save}</text>\n'
        f"  </g>",
    )


def parcel(layout, x, y, w, h):
    layout.add(
        (x, y, w, h),
        f'  <g transform="translate({x} {y})" filter="url(#lift)">\n'
        f'    <rect width="{w}" height="{h}" rx="26" fill="url(#card)"/>\n'
        f'    <path d="M0 26A26 26 0 0 1 26 0h{w - 52}a26 26 0 0 1 26 26v40H0Z" fill="#FFDCC7"/>\n'
        f'    <rect x="{w / 2 - 18:.0f}" y="0" width="36" height="{h}" fill="#22C55E" opacity="0.92"/>\n'
        f'    <circle cx="{w / 2:.0f}" cy="66" r="24" fill="#0E9F6E"/>\n'
        f'    <text x="{w / 2:.0f}" y="75" text-anchor="middle" font-size="23" font-weight="800" fill="#FFFFFF" '
        f'font-family="{FONT}">%</text>\n'
        f'    <text x="{w / 2:.0f}" y="{h - 28}" text-anchor="middle" font-size="13" font-weight="700" '
        f'letter-spacing="1.6" fill="#4B5563" font-family="{FONT}">POSTAGE ON US</text>\n'
        f"  </g>",
    )


def note(layout, x, y, w, h, label, light=False):
    fill = "#FFFFFF" if not light else "#FFFFFF"
    opacity = "1" if not light else "0.14"
    stroke = "" if not light else ' stroke="#FFFFFF" stroke-opacity="0.35"'
    colour = "#10241C" if not light else "#FFFFFF"
    layout.add(
        (x, y, w, h),
        f'  <g transform="translate({x} {y})" filter="url(#lift)">\n'
        f'    <rect width="{w}" height="{h}" rx="{h / 2:.0f}" fill="{fill}" fill-opacity="{opacity}"{stroke}/>\n'
        f'    <circle cx="{h / 2:.0f}" cy="{h / 2:.0f}" r="{h / 2 - 12:.0f}" fill="#22C55E"/>\n'
        f'    <path d="M{h / 2 - 7:.0f} {h / 2:.0f}l5 5 9-10" fill="none" stroke="#06281C" stroke-width="2.6" '
        f'stroke-linecap="round" stroke-linejoin="round"/>\n'
        f'    <text x="{h - 4:.0f}" y="{h / 2 + 5:.0f}" font-size="15" font-weight="700" fill="{colour}" '
        f'font-family="{FONT}">{label}</text>\n'
        f"  </g>",
    )


# ---------------------------------------------------------------- compositions
def deals(width, height, mobile):
    layout = Layout(width, height)
    split = 0.52 if not mobile else 1.0

    layout.backdrop(f'  <rect width="{width}" height="{height}" rx="30" fill="#FFF6F2"/>')
    if not mobile:
        layout.backdrop(
            '  <g clip-path="inset(0 round 30)">\n'
            f'    <path d="M{width * split:.0f} 0H{width}V{height}H{width * split - 120:.0f}Z" fill="url(#panel)"/>\n'
            f'    <circle cx="{width * 0.88:.0f}" cy="60" r="150" fill="#22C55E" opacity="0.32" filter="url(#glow)"/>\n'
            '  </g>'
        )
    else:
        layout.backdrop(
            '  <g clip-path="inset(0 round 30)">\n'
            f'    <circle cx="{width - 90}" cy="60" r="150" fill="#DFF7E9" opacity="0.9" filter="url(#glow)"/>\n'
            f'    <circle cx="70" cy="{height}" r="120" fill="#FFE7E2" opacity="0.9" filter="url(#glow)"/>\n'
            '  </g>'
        )

    x = 64 if not mobile else 48
    pill(layout, x, 54 if not mobile else 40, "COUPON STORE", "#10241C", "#FFFFFF", dot="#22C55E")

    if not mobile:
        headline(layout, x, 166, "Real savings,", 50, "#10241C", 420)
        headline(layout, x, 222, "not stale codes", 50, "#0E9F6E", 470)
        paragraph(layout, x, 262, "Every offer opened and checked before it goes live.", 17, 470)
        chips(layout, x, 280, ["1,700+ live offers", "190+ brands"])
        button(layout, x, 322, "Browse the offers")
        offer_card(layout, 700, 92, 340, 122, "TODAY&#8217;S BEST", "Across 190 brands", "50%")
        note(layout, 700, 246, 286, 56, "Checked by an editor", light=True)
        lockup(layout, width - 64, height - 46, light=True)
    else:
        headline(layout, x, 144, "Real savings,", 42, "#10241C", 380)
        headline(layout, x, 192, "not stale codes", 42, "#0E9F6E", 400)
        paragraph(layout, x, 228, "Checked before they go live.", 16, 360)
        chips(layout, x, 244, ["1,700+ offers", "190+ brands"])
        button(layout, x, 290, "Browse the offers", height=48, size=16)
        offer_card(layout, 468, 64, 290, 104, "TODAY&#8217;S BEST", "190 brands", "50%")
        lockup(layout, width - 48, height - 42)

    return layout.render("Real savings, not stale codes — WorldwideCoupons")


def exclusive(width, height, mobile):
    layout = Layout(width, height)
    layout.backdrop(f'  <rect width="{width}" height="{height}" rx="30" fill="#F2FBF6"/>')

    if not mobile:
        layout.backdrop(
            '  <g clip-path="inset(0 round 30)">\n'
            f'    <path d="M0 0H{width * 0.46:.0f}L{width * 0.38:.0f} {height}H0Z" fill="url(#panel)"/>\n'
            f'    <circle cx="200" cy="40" r="150" fill="#22C55E" opacity="0.3" filter="url(#glow)"/>\n'
            f'    <circle cx="{width - 120}" cy="{height - 40}" r="150" fill="#FCE7E9" opacity="0.9" filter="url(#glow)"/>\n'
            '  </g>'
        )
        pill(layout, 64, 54, "MEMBERS ONLY", "#FFFFFF", "#8FE3B9")
        headline(layout, 64, 168, "Codes you", 44, "#FFFFFF", 340)
        headline(layout, 64, 220, "will not find", 44, "#43CF86", 360)
        headline(layout, 64, 272, "anywhere else", 44, "#FFFFFF", 380)
        ticket(layout, 604, 96, 470, 132, "WWC-EXTRA20", "20%")
        button(layout, 604, 262, "See exclusives", width=210)
        note(layout, 838, 262, 236, 50, "No sign-up", light=False)
        lockup(layout, width - 64, height - 46)
    else:
        # The dark panel covers the whole headline block, so no line ever
        # straddles the edge between the panel and the page.
        layout.backdrop(
            '  <g clip-path="inset(0 round 30)">\n'
            f'    <path d="M0 0H{width}V196L0 232Z" fill="url(#panel)"/>\n'
            f'    <circle cx="{width - 80}" cy="{height - 30}" r="130" fill="#FCE7E9" opacity="0.9" filter="url(#glow)"/>\n'
            '  </g>'
        )
        pill(layout, 48, 34, "MEMBERS ONLY", "#FFFFFF", "#8FE3B9")
        headline(layout, 48, 126, "Codes you will not", 36, "#FFFFFF", 480)
        headline(layout, 48, 172, "find anywhere else", 36, "#43CF86", 480)
        ticket(layout, 48, 236, 420, 96, "WWC-EXTRA20", "20%")
        button(layout, 500, 252, "See exclusives", width=252, height=48, size=16)
        lockup(layout, width - 48, height - 44, width=300)

    return layout.render("Codes you will not find anywhere else — WorldwideCoupons")


def shipping(width, height, mobile):
    layout = Layout(width, height)
    layout.backdrop(
        f'  <rect width="{width}" height="{height}" rx="30" fill="#E9F8EF"/>\n'
        '  <g clip-path="inset(0 round 30)">\n'
        f'    <circle cx="{width - 110}" cy="60" r="170" fill="#FFFFFF" opacity="0.8" filter="url(#glow)"/>\n'
        f'    <circle cx="70" cy="{height - 20}" r="130" fill="#FFE7E2" opacity="0.8" filter="url(#glow)"/>\n'
        '  </g>'
    )

    x = 64 if not mobile else 48
    pill(layout, x, 54 if not mobile else 38, "THIS WEEK ONLY", "#10241C", "#FFFFFF", dot="#FFDCC7")

    if not mobile:
        headline(layout, x, 166, "Free delivery,", 48, "#10241C", 400)
        headline(layout, x, 220, "no minimum spend", 48, "#0E9F6E", 490)
        paragraph(layout, x, 260, "Hundreds of shops are covering the postage.", 17, 470)
        chips(layout, x, 278, ["No minimum spend", "Hundreds of stores"])
        button(layout, x, 322, "Browse the offers")
        parcel(layout, 858, 92, 246, 186)
        note(layout, 610, 200, 216, 52, "Free delivery")
        lockup(layout, width - 64, height - 46)
    else:
        headline(layout, x, 144, "Free delivery,", 40, "#10241C", 340)
        headline(layout, x, 192, "no minimum", 40, "#0E9F6E", 320)
        paragraph(layout, x, 228, "Hundreds of shops, postage covered.", 16, 380)
        chips(layout, x, 244, ["No minimum", "This week"])
        button(layout, x, 290, "Browse the offers", height=48, size=16)
        parcel(layout, 560, 60, 200, 150)
        lockup(layout, width - 48, height - 42)

    return layout.render("Free delivery with no minimum spend — WorldwideCoupons")


for name, builder in [
    ("coupon-store-deals", deals),
    ("exclusive-codes", exclusive),
    ("free-shipping", shipping),
]:
    (OUT / f"{name}.svg").write_text(builder(1200, 400, mobile=False))
    (OUT / f"{name}-mobile.svg").write_text(builder(800, 400, mobile=True))
    print("written", name)
