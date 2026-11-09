"""Insert the user's original screenshots into the supplied Word template."""
from pathlib import Path
from copy import deepcopy
import io, base64, subprocess, zipfile, hashlib, json
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from PIL import Image, ImageOps, ImageDraw
import fitz

SOURCE=Path('说明书模板_已套版待补截图.docx')
OUT=Path('说明书模板_已补截图.docx')
PDF=OUT.with_suffix('.pdf')
doc=Document(SOURCE)
original=Document(SOURCE)
paragraphs=list(doc.paragraphs)
print('ORIGINAL_DEFAULT',doc.styles['Normal'].font.name,doc.styles['Normal'].font.size)
# Preserve original fonts, margins, headers, footers and paragraph styles.
# Make the installation and configuration sections share a page to provide
# a separate, readable page for the accounting input sequence (15 pages total).
for p in paragraphs:
    p.paragraph_format.page_break_before=False
for i in [5,20,28,35,42,49,56,62,70,77,84,90,96]:
    paragraphs[i].paragraph_format.page_break_before=True
# The cover's title starts on page one.
paragraphs[0].paragraph_format.page_break_before=False
# Normal font remains the template font; drawings have their own line metrics.
paragraphs[3].text='著作权人：党鹏举'
paragraphs[4].text='软件使用说明书'
# Document the consent control visible in the supplied login screenshot.
paragraphs[26].text='3．操作3：阅读并勾选同意《用户协议》和《隐私政策》，输入有效验证码，点击“登录”。'
paragraphs[71].text+=' 已知自己的MBTI类型时，也可点击“我知道自己的类型”直接填写。'

def paragraph_after(anchor,text=''):
    elm=OxmlElement('w:p')
    anchor.addnext(elm)
    p=Paragraph(elm,doc._body)
    if text:p.add_run(text)
    return p

def caption_after(anchor,text):
    p=paragraph_after(anchor,text)
    p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    f=p.paragraph_format
    f.space_before=Pt(3);f.space_after=Pt(5);f.line_spacing=1
    f.keep_with_next=False
    for r in p.runs:r.font.size=Pt(9)
    return p

embedded=[]
groups=[]
def pictures_after(anchor,items,height):
    table=doc.add_table(rows=1,cols=len(items))
    table.autofit=False
    width=(doc.sections[0].page_width-doc.sections[0].left_margin-doc.sections[0].right_margin)/len(items)
    for col in table.columns:col.width=int(width)
    # No borders, no background, no cropping, no image recompression.
    props=table._tbl.tblPr
    borders=OxmlElement('w:tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']:
        edge=OxmlElement('w:'+side);edge.set(qn('w:val'),'nil');borders.append(edge)
    props.append(borders)
    for cell,(num,label) in zip(table.rows[0].cells,items):
        p=cell.paragraphs[0]
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        f=p.paragraph_format
        f.space_before=Pt(0);f.space_after=Pt(0);f.line_spacing=1
        f.keep_with_next=False
        path=Path('软著图片')/f'{num}.png'
        with Image.open(path) as im:w,h=im.size
        wanted=min(height,float(width)/914400*0.95*h/w)
        p.add_run().add_picture(str(path),height=Inches(wanted))
        p=cell.add_paragraph(label)
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before=Pt(3)
        p.paragraph_format.space_after=Pt(3)
        p.paragraph_format.line_spacing=1
        for r in p.runs:r.font.size=Pt(9)
        embedded.append((num,path))
    anchor.addnext(table._tbl)
    groups.append([n for n,_ in items])
    return table._tbl

mapping={
27: ([(8,'图1　邮箱验证码登录')],4.55),
34: ([(9,'图2　首页自由日'),(7,'图3　首页目标倒计时')],4.15),
41: ([(10,'图4　自由日参数填写'),(11,'图5　自由日计算结果')],4.15),
48: ([(12,'图6　目标储蓄测算结果'),(4,'图7　目标保存到首页')],4.15),
55: ([(5,'图8　记账总览与分类占比'),(3,'图9　选择收支分类')],4.1),
69: ([(13,'图12　极简拔草列表与操作入口')],4.55),
76: ([(6,'图13　人格测试与MBTI填写入口')],4.55),
83: ([(14,'图14　行为建议对话')],4.55),
}
for index,(items,height) in mapping.items():
    p=paragraphs[index]
    p.text=''
    p.paragraph_format.space_after=Pt(0)
    p.paragraph_format.space_before=Pt(0)
    p.paragraph_format.line_spacing=Pt(1)
    p.paragraph_format.keep_with_next=True
    last=pictures_after(p._p,items,height)
    if index==55:
        # Continue this chapter on one additional page without changing the source template.
        heading=paragraph_after(last,'5、收入与支出记账（续）')
        heading.style=doc.styles['Heading 2']
        heading.paragraph_format.page_break_before=True
        p=paragraph_after(heading._p,'选择分类后直接输入金额，可选填消费必要度、备注和日期；确认后点击“完成”。保存成功后页面显示“已记账”。')
        p.paragraph_format.keep_with_next=True
        pictures_after(p._p,[(1,'图10　输入金额并确认'),(2,'图11　保存成功提示')],4.65)

# Keep original page dimensions and footer PAGE fields; mark title/version consistently.
doc.core_properties.title='Fire生活个人财务与生活规划软件 V1.0.5 使用说明书'
doc.core_properties.author='党鹏举'
doc.core_properties.subject='软件操作说明及真实界面截图'
doc.save(OUT)

# Verify the source was not modified, all 14 originals are embedded byte-for-byte,
# every supplied file is used once, and none of the eight placeholders remain.
assert sorted(n for n,_ in embedded)==list(range(1,15))
with zipfile.ZipFile(OUT) as z:
    assert z.testzip() is None
    media=[z.read(n) for n in z.namelist() if n.startswith('word/media/')]
    assert len(media)==14, len(media)
    for _,path in embedded:
        assert path.read_bytes() in media, str(path)
    xml=z.read('word/document.xml').decode()
    assert '待插入正式版完整截图' not in xml
    assert '待补8张实际界面截图' not in xml
    assert xml.count('<wp:inline')==14
new=Document(OUT)
assert len(new.sections)==len(original.sections)
for a,b in zip(new.sections,original.sections):
    assert (a.page_width,a.page_height,a.top_margin,a.bottom_margin,a.left_margin,a.right_margin)==(b.page_width,b.page_height,b.top_margin,b.bottom_margin,b.left_margin,b.right_margin)
assert all(p.text in '\n'.join(x.text for x in new.paragraphs) for i,p in enumerate(original.paragraphs) if i not in [3,4,26,71,*mapping.keys()])
subprocess.run(['libreoffice','-env:UserInstallation=file:///tmp/fire-manual-lo','--headless','--convert-to','pdf','--outdir',str(OUT.parent),str(OUT)],check=True,timeout=150)
pdf=fitz.open(PDF)
print('MANUAL_PAGE_COUNT',len(pdf))
for i,p in enumerate(pdf):
    print('PDF_PAGE',i+1,'IMAGES',len(p.get_images()),'TEXT',p.get_text()[:150].replace('\n',' / '))
assert 13<=len(pdf)<=15, 'Manual must be 13–15 pages; got '+str(len(pdf))
assert all(p.get_text().strip() for p in pdf), 'Unexpected empty page'
# Render contact sheet for visual QA without leaking actual image bytes into text logs.
thumbs=[]
for p in pdf:
    pix=p.get_pixmap(matrix=fitz.Matrix(.45,.45),alpha=False)
    im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    thumbs.append(im)
w,h=thumbs[0].size
sheet=Image.new('RGB',(w*5,(h+25)*3),'#b8b8b8')
draw=ImageDraw.Draw(sheet)
for i,im in enumerate(thumbs):
    x=(i%5)*w;y=(i//5)*(h+25)
    sheet.paste(im,(x,y+25));draw.text((x+8,y+7),str(i+1),fill='black')
buf=io.BytesIO();sheet.save(buf,format='JPEG',quality=90)
print('MANUAL_PREVIEW_BASE64='+base64.b64encode(buf.getvalue()).decode())
for path in [OUT,PDF]:print('MANUAL_FILE',path.name,path.stat().st_size,hashlib.sha256(path.read_bytes()).hexdigest())
print('MANUAL_VERIFIED: 14 original screenshots, 8 placeholders replaced, original source preserved')
