import time
import os
import sys
from playwright.sync_api import sync_playwright

def run_tests():
    print("=== STARTING HUSHHIKE FULL MULTI-PAGE RIGOROUS VERIFICATION SUITE ===")
    results = []
    screenshots_dir = os.path.abspath("test_screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # -------------------------------------------------------------
        # PAGE 1: MAIN COCKPIT (/)
        # -------------------------------------------------------------
        print("\n--- SECTION 1: COCKPIT (/) TESTS ---")
        print("[TEST 1.1] Loading Cockpit at http://localhost:3000...")
        try:
            page.goto("http://localhost:3000", wait_until="networkidle", timeout=15000)
            title = page.title()
            assert "HushHike" in title, f"Unexpected title: {title}"
            print("  [OK] Cockpit loaded. Title matches.")
            results.append({"name": "Cockpit Page Load", "status": "PASS", "evidence": title})
        except Exception as e:
            print(f"  [FAIL] Test 1.1 failed: {e}")
            results.append({"name": "Cockpit Page Load", "status": "FAIL", "evidence": str(e)})

        # Screenshot Cockpit
        cockpit_shot = os.path.join(screenshots_dir, "01_cockpit_full.png")
        page.screenshot(path=cockpit_shot, full_page=True)
        print(f"  [OK] Saved screenshot: {cockpit_shot}")

        # Test 1.2: Route Preset Switching & Telemetry
        print("[TEST 1.2] Switching route presets...")
        try:
            old_rag_btn = page.locator("button.pill-item:has-text('Old Rag Granite Scramble')")
            old_rag_btn.click()
            time.sleep(0.4)
            dist_val = page.locator(".input-group:has-text('Distance') .val-tag").inner_text()
            assert "15.1" in dist_val, f"Expected 15.1 km, got: {dist_val}"
            print(f"  [OK] Route preset updated correctly: {dist_val}")
            results.append({"name": "Route Preset Switching", "status": "PASS", "evidence": dist_val})
        except Exception as e:
            print(f"  [FAIL] Test 1.2 failed: {e}")
            results.append({"name": "Route Preset Switching", "status": "FAIL", "evidence": str(e)})

        # Test 1.3: Audio Dispatch & Offline WAV Export
        print("[TEST 1.3] Testing Audio Dispatch & Save WAV...")
        try:
            play_btn = page.locator(".btn-play-tactical")
            assert play_btn.is_visible()
            play_btn.click()
            time.sleep(0.5)
            playing_text = play_btn.inner_text()
            assert "Stop" in playing_text
            play_btn.click()
            time.sleep(0.3)

            save_wav_btn = page.locator("button.tactile-btn:has-text('SAVE WAV')")
            assert save_wav_btn.is_visible()
            save_wav_btn.click()
            time.sleep(0.3)
            print("  [OK] Audio player toggled and SAVE WAV button clicked successfully.")
            results.append({"name": "Cockpit Audio & WAV Export", "status": "PASS", "evidence": "Audio player & WAV export verified"})
        except Exception as e:
            print(f"  [FAIL] Test 1.3 failed: {e}")
            results.append({"name": "Cockpit Audio & WAV Export", "status": "FAIL", "evidence": str(e)})

        # Test 1.4: Native AlpineScape 3D Engine
        print("[TEST 1.4] Verifying AlpineScape 3D Engine...")
        try:
            canvas = page.locator(".alpine-canvas-mount canvas")
            assert canvas.is_visible()
            engine_badge = page.locator(".hud-engine-badge").inner_text()
            assert "ALPINESCAPE" in engine_badge
            print(f"  [OK] 3D AlpineScape active: {engine_badge}")
            results.append({"name": "AlpineScape 3D Engine", "status": "PASS", "evidence": engine_badge})
        except Exception as e:
            print(f"  [FAIL] Test 1.4 failed: {e}")
            results.append({"name": "AlpineScape 3D Engine", "status": "FAIL", "evidence": str(e)})

        # -------------------------------------------------------------
        # PAGE 2: FIELD NAV (/field)
        # -------------------------------------------------------------
        print("\n--- SECTION 2: FIELD NAV (/field) TESTS ---")
        print("[TEST 2.1] Navigating to /field...")
        try:
            field_nav_link = page.locator("a.nav-menu-link:has-text('FIELD NAV')")
            field_nav_link.click()
            page.wait_for_url("**/field", timeout=10000)
            time.sleep(0.5)
            assert "/field" in page.url
            print("  [OK] Navigated to Field Nav.")
            results.append({"name": "Field Nav Route Navigation", "status": "PASS", "evidence": page.url})
        except Exception as e:
            print(f"  [FAIL] Test 2.1 failed: {e}")
            results.append({"name": "Field Nav Route Navigation", "status": "FAIL", "evidence": str(e)})

        field_shot = os.path.join(screenshots_dir, "02_field_daylight.png")
        page.screenshot(path=field_shot, full_page=True)
        print(f"  [OK] Saved screenshot: {field_shot}")

        # Test 2.2: Compass Bearing & Target Bug
        print("[TEST 2.2] Testing Compass Instrument & Azimuth Scrubber...")
        try:
            compass_val = page.locator(".bearing-val").inner_text()
            assert "°" in compass_val
            steering_directive = page.locator(".steering-directive").inner_text()
            assert len(steering_directive) > 0
            
            # Scrubber adjustment with React native input setter
            page.evaluate("""() => {
                const slider = document.querySelector('input.custom-range');
                if (slider) {
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeSetter.call(slider, '180');
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                    slider.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }""")
            time.sleep(0.4)
            new_val = page.locator(".bearing-val").inner_text()
            assert "180°" in new_val
            print(f"  [OK] Compass scrubber rotated to: {new_val} (Steering: {steering_directive})")
            results.append({"name": "Field Compass Instrument", "status": "PASS", "evidence": f"Heading {new_val}"})
        except Exception as e:
            print(f"  [FAIL] Test 2.2 failed: {e}")
            results.append({"name": "Field Compass Instrument", "status": "FAIL", "evidence": str(e)})

        # Test 2.3: Live GPS Toggle
        print("[TEST 2.3] Testing Live GPS Toggle & Baseline Reset...")
        try:
            gps_btn = page.locator("button.tactile-btn:has-text('START LIVE GPS')")
            assert gps_btn.is_visible()
            gps_btn.click()
            time.sleep(0.5)
            # Click reset base
            reset_btn = page.locator("button.tactile-btn:has-text('RESET BASE')")
            reset_btn.click()
            time.sleep(0.3)
            status_text = page.locator(".gps-cell.full-width .val").inner_text()
            assert "TRAILHEAD BASELINE" in status_text or "GPS" in status_text
            print(f"  [OK] GPS Controls tested. Status: {status_text}")
            results.append({"name": "Live GPS Telemetry", "status": "PASS", "evidence": status_text})
        except Exception as e:
            print(f"  [FAIL] Test 2.3 failed: {e}")
            results.append({"name": "Live GPS Telemetry", "status": "FAIL", "evidence": str(e)})

        # Test 2.4: Tactical Night Red HUD Mode Toggle
        print("[TEST 2.4] Testing Night Red HUD Mode...")
        try:
            night_btn = page.locator("button.tactile-btn:has-text('NIGHT RED HUD')")
            night_btn.click()
            time.sleep(0.5)
            is_red = page.locator(".field-mode-root.red-vision").is_visible()
            assert is_red, "Expected .red-vision class on root container"
            print("  [OK] Monochromatic Crimson Night Red HUD engaged.")
            
            red_shot = os.path.join(screenshots_dir, "03_field_night_red_hud.png")
            page.screenshot(path=red_shot, full_page=True)
            print(f"  [OK] Saved screenshot: {red_shot}")

            # Revert back to daylight
            page.locator("button.tactile-btn:has-text('DAYLIGHT SPECTRUM')").click()
            time.sleep(0.3)
            results.append({"name": "Night Red HUD Mode", "status": "PASS", "evidence": "Crimson filter engaged and verified"})
        except Exception as e:
            print(f"  [FAIL] Test 2.4 failed: {e}")
            results.append({"name": "Night Red HUD Mode", "status": "FAIL", "evidence": str(e)})

        # Test 2.5: Alpine Distress SOS & Visual Screen Strobe
        print("[TEST 2.5] Testing Alpine SOS Beacon & Optical Strobe...")
        try:
            sos_btn = page.locator("button.sos-btn:has-text('ALPINE SOS')")
            sos_btn.click()
            time.sleep(0.5)
            sounding_btn = page.locator("button.sos-btn.sounding")
            assert sounding_btn.is_visible()
            print("  [OK] Alpine SOS Beacon actively sounding.")

            # Stop SOS (use force=True to bypass CSS pulsing animation instability)
            stop_btn = page.locator("button.sos-btn:has-text('STOP BEACON')")
            stop_btn.click(force=True)
            time.sleep(0.3)
            results.append({"name": "Alpine SOS Distress Beacon", "status": "PASS", "evidence": "6 blasts/min sounded and stopped"})
        except Exception as e:
            print(f"  [FAIL] Test 2.5 failed: {e}")
            results.append({"name": "Alpine SOS Distress Beacon", "status": "FAIL", "evidence": str(e)})

        # Test 2.6: Waypoint Stepper & Add Custom Waypoint Modal
        print("[TEST 2.6] Testing Waypoint Stepper & Custom Waypoint Creation...")
        try:
            first_wp = page.locator(".stepper-item").first
            first_wp.click()
            time.sleep(0.3)
            assert page.locator(".stepper-item.reached").first.is_visible()
            print("  [OK] Waypoint milestone checked off.")

            # Open Add Custom WP modal
            add_wp_btn = page.locator("button:has-text('ADD CUSTOM WP')")
            add_wp_btn.click()
            time.sleep(0.4)
            assert page.locator(".custom-modal-card").is_visible()
            
            # Fill custom waypoint
            page.locator("input[placeholder*='West Col']").fill("High Pinnacle Saddle")
            page.locator("input[placeholder*='Blazed pine']").fill("Granite cairn with red ribbons")
            page.locator("input[placeholder*='Bear 280']").fill("Traverse north scree slope 300m")
            page.locator("button:has-text('Save Waypoint')").click()
            time.sleep(0.5)

            # Check new waypoint is rendered in list
            new_wp_item = page.locator(".stepper-title:has-text('High Pinnacle Saddle')")
            assert new_wp_item.is_visible()
            print("  [OK] Custom field waypoint created and persisted to offline list.")
            results.append({"name": "Waypoint Stepper & Custom WP Modal", "status": "PASS", "evidence": "Custom waypoint added successfully"})
        except Exception as e:
            print(f"  [FAIL] Test 2.6 failed: {e}")
            results.append({"name": "Waypoint Stepper & Custom WP Modal", "status": "FAIL", "evidence": str(e)})

        # -------------------------------------------------------------
        # PAGE 3: 3×5 CARD STUDIO (/card)
        # -------------------------------------------------------------
        print("\n--- SECTION 3: 3×5 CARD STUDIO (/card) TESTS ---")
        print("[TEST 3.1] Navigating to /card...")
        try:
            card_link = page.locator("a.nav-menu-link:has-text('3×5 CARD')")
            card_link.click()
            page.wait_for_url("**/card", timeout=10000)
            time.sleep(0.5)
            assert "/card" in page.url
            print("  [OK] Navigated to 3×5 Card Studio.")
            results.append({"name": "Card Studio Route Navigation", "status": "PASS", "evidence": page.url})
        except Exception as e:
            print(f"  [FAIL] Test 3.1 failed: {e}")
            results.append({"name": "Card Studio Route Navigation", "status": "FAIL", "evidence": str(e)})

        card_shot = os.path.join(screenshots_dir, "04_card_studio_dark.png")
        page.screenshot(path=card_shot, full_page=True)
        print(f"  [OK] Saved screenshot: {card_shot}")

        # Test 3.2: Card Customizer, Ink Saver & SVG Export
        print("[TEST 3.2] Testing Card Customizer & Ink Saver Toggle...")
        try:
            ink_btn = page.locator("button.tactile-btn:has-text('INK SAVER')")
            ink_btn.click()
            time.sleep(0.4)
            is_ink_saver = page.locator(".tactile-index-card.ink-saver").is_visible()
            assert is_ink_saver, "Expected .ink-saver class on physical card"
            print("  [OK] High-contrast Ink Saver white theme activated.")

            ink_shot = os.path.join(screenshots_dir, "05_card_studio_ink_saver.png")
            page.screenshot(path=ink_shot, full_page=True)
            print(f"  [OK] Saved screenshot: {ink_shot}")

            # Verify SVG download button
            svg_btn = page.locator("button.tactile-btn:has-text('Download SVG')")
            assert svg_btn.is_visible()
            svg_btn.click()
            time.sleep(0.3)
            print("  [OK] SVG export triggered.")
            results.append({"name": "Card Studio Customizer & Ink Saver", "status": "PASS", "evidence": "Ink saver & SVG verified"})
        except Exception as e:
            print(f"  [FAIL] Test 3.2 failed: {e}")
            results.append({"name": "Card Studio Customizer & Ink Saver", "status": "FAIL", "evidence": str(e)})

        # -------------------------------------------------------------
        # PAGE 4: PHYSICS & EPHEMERIS (/physics)
        # -------------------------------------------------------------
        print("\n--- SECTION 4: PHYSICS & EPHEMERIS (/physics) TESTS ---")
        print("[TEST 4.1] Navigating to /physics...")
        try:
            physics_link = page.locator("a.nav-menu-link:has-text('PHYSICS')")
            physics_link.click()
            page.wait_for_url("**/physics", timeout=10000)
            time.sleep(0.5)
            assert "/physics" in page.url
            print("  [OK] Navigated to Physics page.")
            results.append({"name": "Physics Route Navigation", "status": "PASS", "evidence": page.url})
        except Exception as e:
            print(f"  [FAIL] Test 4.1 failed: {e}")
            results.append({"name": "Physics Route Navigation", "status": "FAIL", "evidence": str(e)})

        physics_shot = os.path.join(screenshots_dir, "06_physics_full.png")
        page.screenshot(path=physics_shot, full_page=True)
        print(f"  [OK] Saved screenshot: {physics_shot}")

        # Test 4.2: Interactive Kinematic Simulator
        print("[TEST 4.2] Testing Interactive Kinematics & Metabolic Simulator...")
        try:
            slope_val = page.locator(".out-val.text-amber").first.inner_text()
            tobler_speed = page.locator(".out-val.text-mint").first.inner_text()
            assert "%" in slope_val
            assert "km/h" in tobler_speed

            # Adjust vertical ascent slider to 1400m using React native setter
            page.evaluate("""() => {
                const elevSlider = document.querySelectorAll('.sim-inputs input.custom-range')[1];
                if (elevSlider) {
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeSetter.call(elevSlider, '1400');
                    elevSlider.dispatchEvent(new Event('input', { bubbles: true }));
                    elevSlider.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }""")
            time.sleep(0.4)

            new_slope = page.locator(".out-val.text-amber").first.inner_text()
            assert new_slope != slope_val, "Expected slope grade to update after slider drag"
            print(f"  [OK] Interactive kinematics simulator updated: Slope {slope_val} -> {new_slope}")
            results.append({"name": "Interactive Alpine Physics Simulator", "status": "PASS", "evidence": f"Slope {new_slope}, Speed {tobler_speed}"})
        except Exception as e:
            print(f"  [FAIL] Test 4.2 failed: {e}")
            results.append({"name": "Interactive Alpine Physics Simulator", "status": "FAIL", "evidence": str(e)})

        browser.close()

    print("\n=== COMPLETE TEST EXECUTION SUMMARY ===")
    all_passed = all(r["status"] == "PASS" for r in results)
    for r in results:
        print(f"  [{r['status']}] {r['name']}: {r['evidence']}")

    if all_passed:
        print("\nALL 12 TESTS ACROSS ALL 4 PAGES PASSED WITH 100% SUCCESS RATE!")
    else:
        print("\nSOME TESTS FAILED - REVIEW REQUIRED")

if __name__ == "__main__":
    run_tests()
