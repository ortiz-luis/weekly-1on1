from __future__ import annotations

import base64
import http.server
import io
import shutil
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
DIAG = ROOT / "_pdf_parity_diagnostics"
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


def main() -> None:
    if DIAG.exists():
        shutil.rmtree(DIAG)
    DIAG.mkdir()

    deck = FIXTURE.read_text(encoding="utf-8")
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,720")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 60)

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
        wait.until(lambda d: "Quarkfoil PASQAL listo" in d.find_element(By.ID, "qf-local-status").text)
        driver.execute_script(
            "const s=document.createElement('style');"
            "s.textContent='.controls,.progress,.slide-number{display:none!important}';"
            "document.head.appendChild(s);"
        )

        preview_pngs: list[bytes] = []
        for index, expected_id in enumerate(EXPECTED_IDS):
            wait.until(lambda d, value=expected_id: current_slide_id(d) == value)
            png = driver.find_element(By.CSS_SELECTOR, ".reveal").screenshot_as_png
            preview_pngs.append(png)
            (DIAG / f"{index + 1:02d}_{expected_id}_preview.png").write_bytes(png)
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
        assert driver.execute_script("return document.documentElement.dataset.qfVectorPdf") == "v1.7.2"

        pdf_data = driver.execute_cdp_cmd(
            "Page.printToPDF",
            {
                "printBackground": True,
                "landscape": True,
                "marginTop": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                "marginRight": 0,
                "preferCSSPageSize": True,
            },
        )["data"]
        pdf_bytes = base64.b64decode(pdf_data)
        (DIAG / "vector-output.pdf").write_bytes(pdf_bytes)

        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == len(EXPECTED_IDS), (
            f"Expected {len(EXPECTED_IDS)} PDF pages, got {len(reader.pages)}"
        )
        for page in reader.pages:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            ratio = width / height
            assert abs(ratio - 16 / 9) < 0.02, f"PDF page is not 16:9: {width}x{height}"

        extracted = "\n".join((page.extract_text() or "") for page in reader.pages)
        (DIAG / "extracted-text.txt").write_text(extracted, encoding="utf-8")
        for phrase in [
            "PDF parity regression",
            "Evidence and interpretation",
            "Decision / next step",
            "Preview and PDF come from the same rendered PASQAL structure.",
        ]:
            assert phrase in extracted, f"Expected selectable PDF text missing: {phrase!r}"

        pdf_pngs = render_pdf_pages(pdf_bytes)
        assert len(pdf_pngs) == len(preview_pngs)
        errors: list[float] = []
        for index, (expected_id, preview, pdf) in enumerate(zip(EXPECTED_IDS, preview_pngs, pdf_pngs)):
            (DIAG / f"{index + 1:02d}_{expected_id}_pdf.png").write_bytes(pdf)
            errors.append(normalized_mae(preview, pdf))

        metrics = "\n".join(
            f"{expected_id}: {error:.6f}" for expected_id, error in zip(EXPECTED_IDS, errors)
        ) + f"\nmax: {max(errors):.6f}\nmean: {statistics.mean(errors):.6f}\n"
        (DIAG / "metrics.txt").write_text(metrics, encoding="utf-8")
        print(metrics)

        assert max(errors) < 0.18, f"Preview/PDF page divergence too high: {errors}"
        assert statistics.mean(errors) < 0.12, f"Preview/PDF mean divergence too high: {errors}"

        print(
            "BUILDER_PDF_PARITY_SMOKE=PASS "
            f"pages={len(reader.pages)} max_mae={max(errors):.4f} mean_mae={statistics.mean(errors):.4f}"
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


if __name__ == "__main__":
    main()
