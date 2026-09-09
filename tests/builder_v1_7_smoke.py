from __future__ import annotations

import http.server
import threading
from pathlib import Path

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

# Builder V1.7 smoke {#weekly-front .layout-front footer="none"}

::: core
## *Real Quarkfoil renderer*

**Test**

End-to-end smoke
:::

---

## Agenda {#weekly-agenda .layout-1}

::: core
1. Markdown input
2. Real renderer
3. PDF output
:::

---

## Thank you {#weekly-closing .layout-1 footer="none"}

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

        normalized = driver.find_element(By.ID, "qf-editor").get_attribute("value")
        assert "#pasqal-front" in normalized
        assert "#pasqal-agenda" in normalized
        assert "#pasqal-closing" in normalized
        assert "#weekly-front" not in normalized
        assert "## *Real Quarkfoil renderer* {#pasqal" not in normalized, (
            "Nested subtitle heading was incorrectly promoted to a slide heading"
        )

        popup = next(iter(set(driver.window_handles) - before))
        driver.switch_to.window(popup)
        wait.until(lambda d: d.execute_script("return document.documentElement.dataset.qfPreviewPrintGuard === 'true'"))
        slides = driver.find_elements(By.CSS_SELECTOR, ".scientific-slide[data-slide-id^='pasqal-']")
        assert len(slides) == 3, f"Expected 3 PASQAL slides, got {len(slides)}"
        assert driver.find_elements(By.CSS_SELECTOR, "[data-slide-id='pasqal-front']")
        assert driver.find_elements(By.CSS_SELECTOR, "[data-slide-id='pasqal-agenda']")
        assert driver.find_elements(By.CSS_SELECTOR, "[data-slide-id='pasqal-closing']")
        assert not driver.find_elements(By.ID, "qf-local-print"), "Preview print dead-path is exposed"
        page_text = driver.find_element(By.TAG_NAME, "body").text
        assert "{#pasqal-content-2" not in page_text, "PASQAL slide metadata leaked into visible subtitle text"

        print(
            f"BUILDER_V1_7_SMOKE=PASS slides={len(slides)} "
            "slide_ids=normalized nested_heading=preserved preview_guard=ok"
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
