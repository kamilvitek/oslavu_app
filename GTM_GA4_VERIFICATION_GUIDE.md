# GTM and GA4 Verification Guide

This guide provides step-by-step instructions for verifying the GTM and GA4 implementation after the code fixes.

## Code Changes Completed

✅ Updated `GTM.tsx` to include all 4 consent types in consent mode default
✅ Updated `CookieConsent.tsx` to include all 4 consent types in consent updates
✅ Updated `GoogleTag.tsx` to include all 4 consent types for consistency

All files now properly manage:
- `analytics_storage`
- `ad_storage`
- `ad_personalization`
- `ad_user_data`

## Manual Verification Steps

### 1. Verify GTM Variable: {{GA4 Measurement ID}}

**Steps:**
1. Log into Google Tag Manager (tagmanager.google.com)
2. Navigate to your container (www.oslavu.com)
3. Go to **Variables** in the left sidebar
4. Look for a variable named `GA4 Measurement ID`
5. If it doesn't exist:
   - Click **New** to create a new variable
   - Variable Type: **Constant**
   - Variable Name: `GA4 Measurement ID`
   - Value: Your GA4 Measurement ID (format: `G-XXXXXXXXXX`)
   - Click **Save**
6. Verify the variable contains a valid GA4 Measurement ID (starts with `G-` followed by alphanumeric characters)

**Expected Result:** Variable exists and contains valid GA4 Measurement ID format (e.g., `G-ABC123XYZ`)

---

### 2. Verify GA4 Configuration Tag in GTM

**Steps:**
1. In GTM, go to **Tags** in the left sidebar
2. Find and open the **GA4 Configuration** tag
3. Verify the following settings:
   - **Tag Type:** Google Tag
   - **Tag ID:** Should use `{{GA4 Measurement ID}}` variable (not hardcoded)
   - **Consent Settings:**
     - Built-In Consent Checks should include: `ad_storage`, `ad_personalization`, `ad_user_data`, `analytics_storage`
     - Additional consent checks: `ad_storage` and `analytics_storage` (as shown in your screenshot)
   - **Firing Triggers:** Should include "Initialization - All Pages"
4. Click **Save** if any changes were made

**Expected Result:** Tag is configured correctly with the variable and proper consent settings

---

### 3. Test Consent Banner Locally

**Steps:**
1. Start your development server: `npm run dev`
2. Open your browser and navigate to `http://localhost:3000`
3. Open browser DevTools (F12) and go to the **Console** tab
4. Clear localStorage: `localStorage.removeItem('cookieConsent')`
5. Refresh the page
6. The consent banner should appear
7. Open DevTools Console and run: `window.dataLayer`
8. Look for the consent default configuration - you should see all 4 consent types set to 'denied'
9. Click **Accept** on the consent banner
10. In the console, run: `window.gtag('consent', 'get', 'analytics_storage')` and verify it returns `'granted'`
11. Check dataLayer for consent update - all 4 types should be 'granted'

**Expected Console Output (after accepting):**
```javascript
// Check consent state
window.gtag('consent', 'get', 'analytics_storage') // Should return 'granted'
window.gtag('consent', 'get', 'ad_storage') // Should return 'granted'
window.gtag('consent', 'get', 'ad_personalization') // Should return 'granted'
window.gtag('consent', 'get', 'ad_user_data') // Should return 'granted'
```

**Expected dataLayer Events:**
- `cookie_consent_granted` event should be pushed
- Consent update should include all 4 types

---

### 4. Test with GTM Preview Mode

**Steps:**
1. In GTM, click **Preview** button (top right)
2. Enter your website URL: `http://localhost:3000` (or your staging URL)
3. Click **Connect**
4. A new tab will open with your site and GTM Preview panel
5. In the GTM Preview panel, verify:
   - **GA4 Configuration** tag appears in the tags list
   - Tag status should show if it fired or was blocked
6. Clear consent: `localStorage.removeItem('cookieConsent')` in console
7. Refresh the page
8. Check tag status - GA4 Configuration should be blocked (consent denied)
9. Click **Accept** on consent banner
10. Check tag status again - GA4 Configuration should now fire (consent granted)
11. Click on the GA4 Configuration tag to see details:
    - Verify it's using the correct Measurement ID from the variable
    - Check that consent checks passed

**Expected Result:** 
- Tag is blocked when consent is denied
- Tag fires when consent is granted
- Tag uses correct Measurement ID from variable

---

### 5. Enable and Test GA4 DebugView

**Steps:**
1. In Google Analytics 4, go to **Admin** → **DebugView**
2. Enable DebugView by adding `?debug_mode=true` to your URL or using the GA Debugger Chrome extension
3. Navigate to your site with debug mode enabled
4. In GA4 DebugView, you should see events appearing in real-time
5. Test consent flow:
   - Clear consent and refresh - events should be limited (consent denied)
   - Accept consent - full events should appear (consent granted)
6. Verify events include proper consent parameters

**Expected Result:**
- Events appear in DebugView
- Consent state is properly reflected in event data
- All 4 consent types are being tracked

---

## Troubleshooting

### Issue: GTM Variable Not Found
- **Solution:** Create the variable as described in step 1
- **Verify:** Variable name must match exactly: `GA4 Measurement ID` (case-sensitive)

### Issue: Tag Not Firing
- **Check:** Consent mode default is set correctly in code
- **Check:** All 4 consent types are being updated when user accepts
- **Check:** GTM tag's consent settings match code implementation
- **Verify:** Trigger is configured correctly (Initialization - All Pages)

### Issue: Consent Not Updating
- **Check:** Browser console for errors
- **Verify:** `window.gtag` function is available
- **Check:** dataLayer is being initialized before consent updates
- **Verify:** All 4 consent types are included in update calls

### Issue: Events Not Appearing in GA4
- **Check:** GA4 Measurement ID is correct
- **Verify:** DebugView is enabled
- **Check:** Consent mode is allowing events (should be 'granted')
- **Verify:** GTM container is published

---

## Verification Checklist

- [ ] GTM Variable `{{GA4 Measurement ID}}` exists and contains valid GA4 Measurement ID
- [ ] GA4 Configuration tag uses the variable correctly
- [ ] GA4 Configuration tag has correct consent settings (all 4 types)
- [ ] Consent banner appears and functions correctly
- [ ] All 4 consent types are set to 'denied' by default (check console)
- [ ] All 4 consent types update to 'granted' when user accepts (check console)
- [ ] GTM Preview mode shows tag is blocked when consent denied
- [ ] GTM Preview mode shows tag fires when consent granted
- [ ] GA4 DebugView receives events correctly
- [ ] Events include proper consent parameters

---

## Additional Notes

- The code now properly manages all 4 consent types required by GTM's built-in consent checks
- Consent mode v2 is fully implemented with proper default and update mechanisms
- All consent types are synchronized between code and GTM tag configuration
- The implementation follows Google's Consent Mode v2 best practices

