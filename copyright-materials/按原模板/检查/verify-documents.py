import json, pathlib, re, subprocess, zipfile, xml.etree.ElementTree as ET
folder=pathlib.Path("copyright-materials/按原模板")
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
info={}
for filename in ["代码模板_已填写.docx","功能-填写模板_已填写.docx","说明书模板_已套版待补截图.docx"]:
    p=folder/filename
    with zipfile.ZipFile(p) as z:
        for n in z.namelist():
            if n.endswith((".xml",".rels")):
                ET.fromstring(z.read(n))
        root=ET.fromstring(z.read("word/document.xml"))
        paragraphs=root.findall(".//w:p",ns)
        code_lines=len(paragraphs) if filename.startswith("代码") else None
        breaks=len(root.findall(".//w:pageBreakBefore",ns))
        images=[n for n in z.namelist() if n.startswith("word/media/")]
    pdf=pathlib.Path("/tmp/copyright-pdf")/(p.stem+".pdf")
    output=subprocess.check_output(["pdfinfo",str(pdf)],text=True)
    pages=int(re.search(r"^Pages:\s+(\d+)",output,re.M).group(1))
    text=subprocess.check_output(["pdftotext","-layout",str(pdf),"-"],text=True)
    if "建筑三维漫游模拟展示系统" in text or "访织仁平台" in text:
        raise RuntimeError("Unrelated software name")
    if filename.startswith("代码"):
        assert pages==60,(filename,pages)
        assert code_lines==3000 and breaks==59
    if filename.startswith("说明"):
        assert pages==15,(filename,pages)
        assert breaks==14
    info[filename]={"renderedPages":pages,"codeParagraphs":code_lines,"pageBreaks":breaks,"actualScreenshots":len(images)}
print("DOCUMENT_CHECK="+json.dumps(info,ensure_ascii=False))
print("MANUAL_STATUS=awaiting_8_actual_app_screenshots")

fixture=subprocess.check_output(["pdfinfo","/tmp/copyright-pdf/layout-fixture.pdf"],text=True)
fixture_pages=int(re.search(r"^Pages:\s+(\d+)",fixture,re.M).group(1))
fixture_text=subprocess.check_output(["pdftotext","-layout","/tmp/copyright-pdf/layout-fixture.pdf","-"],text=True)
print("FIXTURE_PAGE_HEADS="+json.dumps([t.strip()[:100] for t in fixture_text.split("\f") if t.strip()],ensure_ascii=False))
assert fixture_pages==15,("image-layout-fixture",fixture_pages)
print("IMAGE_LAYOUT_FIXTURE_PAGES="+str(fixture_pages))
