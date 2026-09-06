from __future__ import annotations

import base64
import http.server
import threading
from pathlib import Path

from pypdf import PdfReader
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]

DECK = """---
title: Builder V1.7 smoke
short-title: Builder V1.7 smoke
author: Test
aspect-ratio: 16:9
theme: scientific-light
defaults:
  footer: PASQAL · CONFIDENTIAL
---

# Builder V1.7 smoke {#pasqal-front .layout-front footer="none"}

::: core
## *Real Quarkfoil renderer*

**Test**

End-to-end smoke
:::

---

## Agenda {#pasqal-agenda .layout-1}

::: core
1. Markdown input
2. Real renderer
3. PDF output
:::

---

## Thank you {#pasqal-closing .layout-1 footer="none"}

::: core
Questions?
:::
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> None:
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,1000")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 45)
    try:
        driver.get(f"http://127.0.0.1:{server.server_port}/#builder")
        wait.until(lambda d: d.find_elements(By.ID, "qf-editor"))
        driver.execute_script(
            "const e=document.getElementById('qf-editor'); e.value=arguments[0]; "
            "e.dispatchEvent(new Event('input',{bubbles:true}));",
            DECK,
        )
        before = set(driver.window_handles)
        driver.find_element(By.ID, "qf-preview").click()
        wait.until(lambda d: len(set(d.window_handles) - before) == 1)
        popup = next(iter(set(driver.window_handles) - before))
        driver.switch_to.window(popup)
        wait.until(lambda d: "Quarkfoil PASQAL listo" in d.find_element(By.ID, "qf-local-status").text)
        slides = driver.find_elements(By.CSS_SELECTOR, ".scientific-slide[data-slide-id^='pasqal-']")
        assert len(slides) == 3, f"Expected 3 PASQAL slides, got {len(slides)}"
        assert driver.find_elements(By.CSS_SELECTOR, "[data-slide-id='pasqal-front']")
        assert driver.find_elements(By.CSS_SELECTOR, "[data-slide-id='pasqal-agenda']")
        assert driver.find_elements(By.CSS_SELECTOR, "[data-slide-id='pasqal-closing']")

        pdf_data = driver.execute_cdp_cmd(
            "Page.printToPDF",
            {
                "printBackground": True,
                "landscape": True,
                "paperWidth": 13.333333,
                "paperHeight": 7.5,
                "marginTop": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                "marginRight": 0,
                "preferCSSPageSize": True,
            },
        )["data"]
        pdf_path = ROOT / "builder-v1_7-smoke.pdf"
        pdf_path.write_bytes(base64.b64decode(pdf_data))
        pages = len(PdfReader(str(pdf_path)).pages)
        assert pages == 3, f"Expected 3 PDF pages, got {pages}"
        print(f"BUILDER_V1_7_SMOKE=PASS slides={len(slides)} pdf_pages={pages}")
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
