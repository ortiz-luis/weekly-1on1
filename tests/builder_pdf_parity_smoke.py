from __future__ import annotations

import base64
import http.server
import io
import statistics
import threading
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops, ImageFilter, ImageStat
from pypdf import PdfReader
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "builder_pdf_parity_deck.md"
EXPECTED_IDS = [
    "pasqal-front",
    "pasqal-agenda",
    "pasqal-focus-parity",
    "pasqal-dark-parity",
    "pasqal-closing",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def normalized_mae(left_png: bytes, right_png: bytes) -> float:
    left = Image.open(io.BytesIO(left_png)).convert("RGB").resize((640, 360)).filter(ImageFilter.GaussianBlur(0.55))
    right = Image.open(io.BytesIO(right_png)).convert("RGB").resize((640, 360)).filter(ImageFilter.GaussianBlur(0.55))
    diff = ImageChops.difference(left, right)
    means = ImageStat.Stat(diff).mean
    return sum(means) / (len(means) * 255.0)


def render_pdf_pages(pdf_bytes: bytes) -> list[bytes]:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    rendered: list[bytes] = []
    try:
        for page in doc:
            sx = 1280.0 / page.rect.width
            sy = 720.0 / page.rect.height
            pix = page.get_pixmap(matrix=pymupdf.Matrix(sx, sy), alpha=False)
            rendered.append(pix.tobytes("png"))
    finally:
        doc.close()
    return rendered


def current_slide_id(driver: webdriver.Chrome) -> str:
    return driver.execute_script(
        "return document.querySelector('.scientific-slide.present')?.dataset.slideId || '';"
    )


def set_exact_viewport(driver: webdriver.Chrome) -> None:
    driver.execute_cdp_cmd(
        "Emulation.setDeviceMetricsOverride",
        {"width": 1280, "height": 720, "deviceScaleFactor": 1, "mobile": False},
    )
    driver.execute_script("window.dispatchEvent(new Event('resize'))")


def logos_ok(driver: webdriver.Chrome) -> bool:
    return bool(
        driver.execute_script(
            """
            const logos=[...document.querySelectorAll('.pasqal-logo')];
            return logos.length>0 && logos.every(img=>img.complete && img.naturalWidth>0);
            """
        )
    )


def css_page_contract_ok(driver: webdriver.Chrome) -> bool:
    return bool(
        driver.execute_script(
            """
            return [...document.querySelectorAll('style')].some(style =>
              style.textContent.includes('@page{size:13.333333in 7.5in;margin:0}')
            );
            """
        )
    )


def main() -> None:
    deck = FIXTURE.read_text(encoding="utf-8")
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 60)
    pdf_path = ROOT / "builder-pdf-parity-smoke.pdf"

    try:
        driver.get(f"http://127.0.0.1:{server.server_port}/#builder")
        wait.until(lambda d: d.find_elements(By.ID, "qf-editor"))
        driver.execute_script(
            "const e=document.getElementById('qf-editor'); e.value=arguments[0]; "
            "e.dispatchEvent(new Event('input',{bubbles:true}));",
            deck,
        )

        builder_handle = driver.current_window_handle
        before = set(driver.window_handles)
        driver.find_element(By.ID, "qf-preview").click()
        wait.until(lambda d: len(set(d.window_handles) - before) == 1)
        preview_handle = next(iter(set(driver.window_handles) - before))
        driver.switch_to.window(preview_handle)
        wait.until(lambda d: d.execute_script("return document.documentElement.dataset.qfPreviewPrintGuard === 'true'"))
        assert not driver.find_elements(By.ID, "qf-local-print"), "Visualizar still exposes the broken local print button"
        preview_status = driver.find_element(By.ID, "qf-local-status").text
        assert "Generar PDF" in preview_status, f"Preview export guidance missing: {preview_status!r}"
        set_exact_viewport(driver)
        wait.until(
            lambda d: abs(
                d.execute_script(
                    "return document.querySelector('.scientific-slide.present')?.getBoundingClientRect().width || 0"
                )
                - 1280
            )
            < 1
        )
        wait.until(logos_ok)
        driver.execute_script(
            "const s=document.createElement('style');"
            "s.textContent='#qf-local-status,.controls,.progress,.slide-number{display:none!important}';"
            "document.head.appendChild(s);"
        )

        preview_pngs: list[bytes] = []
        for index, expected_id in enumerate(EXPECTED_IDS):
            wait.until(lambda d, value=expected_id: current_slide_id(d) == value)
            slide = driver.find_element(By.CSS_SELECTOR, ".scientific-slide.present")
            rect = driver.execute_script(
                "const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};", slide
            )
            assert abs(rect["width"] - 1280) < 1, f"Preview width drifted: {rect}"
            assert abs(rect["height"] - 720) < 2, f"Preview height drifted: {rect}"
            preview_pngs.append(slide.screenshot_as_png)
            if index < len(EXPECTED_IDS) - 1:
                driver.execute_script("document.querySelector('.navigate-right')?.click()")

        driver.close()
        driver.switch_to.window(builder_handle)

        before = set(driver.window_handles)
        driver.find_element(By.ID, "qf-pdf").click()
        wait.until(lambda d: len(set(d.window_handles) - before) == 1)
        pdf_handle = next(iter(set(driver.window_handles) - before))
        driver.switch_to.window(pdf_handle)
        wait.until(
            lambda d: d.execute_script(
                "return document.documentElement.dataset.qfPdfReady === 'true' || "
                "document.documentElement.dataset.qfPdfError || '';"
            )
        )
        pdf_error = driver.execute_script("return document.documentElement.dataset.qfPdfError || ''")
        assert not pdf_error, f"Vector PDF popup failed: {pdf_error}"
        classes = driver.execute_script("return document.documentElement.className")
        assert "reveal-print" in classes, f"Reveal print mode missing: {classes!r}"
        assert "print-pdf" in classes, f"Reveal PDF class missing: {classes!r}"
        assert driver.execute_script("return document.documentElement.dataset.qfVectorPdf") == "v1.7.4"
        assert css_page_contract_ok(driver), "Explicit 16:9 @page print contract missing"
        wait.until(logos_ok)

        pdf_data = driver.execute_cdp_cmd(
            "Page.printToPDF",
            {
                "printBackground": True,
                "marginTop": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                "marginRight": 0,
                "preferCSSPageSize": True,
            },
        )["data"]
        pdf_bytes = base64.b64decode(pdf_data)
        pdf_path.write_bytes(pdf_bytes)

        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == len(EXPECTED_IDS), f"Expected {len(EXPECTED_IDS)} PDF pages, got {len(reader.pages)}"
        for page in reader.pages:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            ratio = width / height
            assert width > height, f"PDF page is portrait: {width}x{height}"
            assert abs(ratio - 16 / 9) < 0.02, f"PDF page is not 16:9: {width}x{height}"

        extracted = "\n".join((page.extract_text() or "") for page in reader.pages)
        for phrase in [
            "PDF parity regression",
            "Evidence and interpretation",
            "Decision / next step",
            "Preview and PDF come from the same rendered PASQAL structure.",
        ]:
            assert phrase in extracted, f"Expected selectable PDF text missing: {phrase!r}"

        pdf_pngs = render_pdf_pages(pdf_bytes)
        assert len(pdf_pngs) == len(preview_pngs)
        errors = [normalized_mae(preview, pdf) for preview, pdf in zip(preview_pngs, pdf_pngs)]
        assert max(errors) < 0.18, f"Preview/PDF page divergence too high: {errors}"
        assert statistics.mean(errors) < 0.12, f"Preview/PDF mean divergence too high: {errors}"

        print(
            "BUILDER_PDF_PARITY_SMOKE=PASS "
            f"pages={len(reader.pages)} max_mae={max(errors):.4f} mean_mae={statistics.mean(errors):.4f} "
            "logos=ok css_page=ok preview_guard=ok"
        )
    except Exception:
        for entry in driver.get_log("browser"):
            print("BROWSER_LOG", entry)
        raise
    finally:
        driver.quit()
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        if pdf_path.exists():
            pdf_path.unlink()


if __name__ == "__main__":
    main()
