# Build a single PDF "posting pack" for tonight's posts: each post on its own page
# with the caption (selectable text) + graphics in upload order.
# Emojis are omitted from PDF text (built-in fonts can't render them) — add when posting.
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
                                Table, TableStyle, PageBreak)
from PIL import Image as PILImage

ROOT = r"C:\LocalDesktop\prospera-preps"
OUT = r"C:\Users\danud\OneDrive\Desktop\Prospera-Today-Playbook-06.16.pdf"
ORANGE = HexColor("#FF6A1A"); INK = HexColor("#14181F"); MUT = HexColor("#5d6470")
BOX = HexColor("#FBEDE3")

def p(path): return os.path.join(ROOT, path)
def img(path, w):
    iw, ih = PILImage.open(p(path)).size
    return RLImage(p(path), width=w, height=w * ih / iw)

styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=26, textColor=ORANGE, leading=30),
    "sub":   ParagraphStyle("sub", fontName="Helvetica", fontSize=13, textColor=MUT, leading=18),
    "h":     ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=17, textColor=INK, leading=21, spaceBefore=2, spaceAfter=2),
    "meta":  ParagraphStyle("meta", fontName="Helvetica-Bold", fontSize=10.5, textColor=ORANGE, leading=14, spaceAfter=6),
    "body":  ParagraphStyle("body", fontName="Helvetica", fontSize=11, textColor=INK, leading=16),
    "note":  ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=9.5, textColor=MUT, leading=13),
    "cap":   ParagraphStyle("cap", fontName="Helvetica", fontSize=12, textColor=INK, leading=17,
                            backColor=BOX, borderColor=ORANGE, borderWidth=1, borderPadding=10, borderRadius=6),
    "lbl":   ParagraphStyle("lbl", fontName="Helvetica-Bold", fontSize=9, textColor=INK, leading=11, alignment=1),
}

def caption(text):
    return [Paragraph("CAPTION (copy):", styles["meta"]), Paragraph(text, styles["cap"]), Spacer(1, 8)]

story = []

# ---- Cover / playbook ----
sched = ParagraphStyle("sched", fontName="Helvetica", fontSize=11, textColor=INK, leading=15, spaceAfter=7, leftIndent=4)
time_ = ParagraphStyle("time", fontName="Helvetica-Bold", fontSize=11, textColor=ORANGE, leading=15)
story += [
    Paragraph("PROSPERA HOOPS", styles["title"]),
    Paragraph("Today&rsquo;s Playbook &mdash; Tuesday, June 16 (2 days out)", styles["sub"]),
    Spacer(1, 14),

    Paragraph("Posting schedule (in order)", styles["h"]),
    Paragraph("<font color='#FF6A1A'><b>~10&ndash;11 AM &middot; IG STORY.</b></font> &nbsp;SEEN story + add the "
              "<b>Countdown sticker</b> set to Thu 6/18. Keeps presence early. &nbsp;<i>(Post 2 art)</i>", sched),
    Paragraph("<font color='#FF6A1A'><b>~12:30 PM &middot; STAT DROP (feed + X).</b></font> &nbsp;Towe&rsquo;s line. "
              "Quick value tease. &nbsp;<i>(Post 3 &mdash; optional; he&rsquo;s also in the carousel)</i>", sched),
    Paragraph("<font color='#FF6A1A'><b>~6:30 PM &middot; MARQUEE (feed).</b></font> &nbsp;Hayfield &lsquo;The "
              "Nucleus&rsquo; carousel &mdash; your big post, when engagement peaks. &nbsp;<i>(Post 1 art)</i>", sched),
    Paragraph("<font color='#FF6A1A'><b>Right after &middot; STORY RE-SHARE.</b></font> &nbsp;Re-share the carousel "
              "to your Story; tag Hayfield + the players.", sched),
    Spacer(1, 6),

    Paragraph("Do these too (more reach than another post)", styles["h"]),
    Paragraph("&bull; <b>DM each player their own card</b> so they repost to their stories &mdash; four players "
              "resharing to their followings beats anything you post yourself.", sched),
    Paragraph("&bull; <b>Cross-post the carousel</b> to TikTok (photo/slideshow) + X, same caption. Tag the "
              "<b>Hayfield Hawks</b> program account so they reshare.", sched),
    Spacer(1, 6),

    Paragraph("Skip today (on purpose)", styles["h"]),
    Paragraph("&bull; The live-site <b>screen-record reel</b> &mdash; the site is gated behind the &lsquo;Launching "
              "06.18&rsquo; page, so it&rsquo;d only show the countdown. Save it for launch day.", sched),
    Spacer(1, 4),

    Paragraph("Reminders", styles["h"]),
    Paragraph("&bull; <b>Add emojis when posting</b> &mdash; they&rsquo;re left out of the captions below (PDF fonts "
              "render them as boxes). The hawk + baller emojis are in our chat.", styles["note"]),
    Paragraph("&bull; <b>Reply to comments in the first hour</b> &mdash; lead with the numbers, not promises.", styles["note"]),
    Paragraph("&bull; <b>Jackson&rsquo;s headshot</b> shows a non-Hayfield jersey &mdash; swap it if it&rsquo;s the wrong shot.", styles["note"]),
    PageBreak(),
]

# ---- POST 1: Hayfield carousel ----
story += [
    Paragraph("POST 1 &mdash; Hayfield &lsquo;The Nucleus&rsquo;", styles["h"]),
    Paragraph("FEATURE POST &middot; IG CAROUSEL (5 SLIDES) &middot; ~6:30 PM ET", styles["meta"]),
]
story += caption("The Nucleus. Four Hawks. One core. Swipe to meet Hayfield&rsquo;s summer standouts "
                 "&mdash; real numbers, full context. 06.18  #DMVHoops #CapitolHoops #HayfieldHawks")
story += [Paragraph("Upload in this order:", styles["meta"])]

cards = [
    ("hayfield-nucleus", "docs/social-posts/hayfield-nucleus.png", "1 &mdash; THE NUCLEUS"),
    ("towe", "docs/social-posts/hayfield-card-christiantowe.png", "2 &mdash; TOWE"),
    ("jackson", "docs/social-posts/hayfield-card-chasejackson.png", "3 &mdash; JACKSON"),
    ("cage", "docs/social-posts/hayfield-card-grantcage.png", "4 &mdash; CAGE"),
    ("payne", "docs/social-posts/hayfield-card-gavinpayne.png", "5 &mdash; PAYNE"),
]
cw = 2.25 * inch
cells = []
for _id, path, lbl in cards:
    cells.append([img(path, cw), Spacer(1, 3), Paragraph(lbl, styles["lbl"])])
# arrange 3 columns x 2 rows
def stack(c): return Table([[c[0]], [c[2]]], style=TableStyle([("ALIGN", (0,0), (-1,-1), "CENTER"), ("TOPPADDING",(0,1),(0,1),2), ("BOTTOMPADDING",(0,0),(-1,-1),2)]))
grid_rows = []
row = []
for c in cells:
    row.append(stack(c))
    if len(row) == 3:
        grid_rows.append(row); row = []
if row:
    while len(row) < 3: row.append("")
    grid_rows.append(row)
story += [Table(grid_rows, colWidths=[cw + 12]*3, style=TableStyle([
    ("ALIGN", (0,0), (-1,-1), "CENTER"), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING",(0,0),(-1,-1),8), ("BOTTOMPADDING",(0,0),(-1,-1),8)]))]
story += [Spacer(1, 6), Paragraph("Slides 2&ndash;5 carry the stats + headshots; slide 1 sets the concept.", styles["note"]), PageBreak()]

# ---- POST 2: Countdown SEEN ----
story += [
    Paragraph("POST 2 &mdash; Countdown &lsquo;SEEN&rsquo; (2 days out)", styles["h"]),
    Paragraph("FEED + STORY &middot; ~12:30 PM or alongside the feature", styles["meta"]),
]
story += caption("If you hooped in the DMV this summer, you&rsquo;re already in here. Every player. Every game. "
                 "No hype &mdash; just the numbers. 2 days. Tag a hooper who deserves to be seen. "
                 "#DMVHoops #DMVBasketball #CapitolHoops")
feed = img("docs/launch-set/prospera_launch_0616-seen_square.png", 2.7 * inch)
storyimg = img("docs/launch-set/prospera_launch_0616-seen_story.png", 1.55 * inch)
t = Table([[feed, storyimg], [Paragraph("FEED 1:1", styles["lbl"]), Paragraph("STORY / TIKTOK 9:16", styles["lbl"])]],
          colWidths=[3.0*inch, 2.0*inch],
          style=TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,0),"TOP"),("TOPPADDING",(0,1),(-1,1),3)]))
story += [t, Spacer(1, 6),
          Paragraph("On the Story, add the Countdown sticker set to Thursday, June 18.", styles["note"]),
          PageBreak()]

# ---- POST 3: Stat Drop (optional) ----
story += [
    Paragraph("POST 3 &mdash; Stat Drop: Christian Towe (optional)", styles["h"]),
    Paragraph("EXTRA / ALT &middot; he&rsquo;s also slide 2 of the carousel", styles["meta"]),
]
story += caption("This is one summer-league line: 20.0 PPG, 7.3 RPG, 3.3 APG. Thursday, every DMV player has one "
                 "&mdash; real numbers, in one place. 06.18  ProsperaHoops.com #DMVHoops #CapitolHoops #HayfieldHawks")
story += [img("docs/social-posts/statdrop-christiantowe.png", 3.1 * inch)]

doc = SimpleDocTemplate(OUT, pagesize=letter, topMargin=0.6*inch, bottomMargin=0.6*inch,
                        leftMargin=0.75*inch, rightMargin=0.75*inch, title="Prospera Hoops Posting Pack 06.16")
doc.build(story)
print("wrote", OUT)
