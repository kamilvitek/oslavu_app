<!-- 47dd822a-ca15-4c16-8c39-289b91670849 add27814-8c98-497b-a492-49a84ac507f6 -->
# GTM and GA4 Implementation Review and Debug Plan

## Issues Identified

### 1. **Missing Consent Types in Code Implementation**

- **Problem**: The codebase only manages `analytics_storage` and `ad_storage` consent types
- **GTM Tag Configuration**: Built-in consent checks include 4 types: `ad_storage`, `ad_personalization`, `ad_user_data`, `analytics_storage`
- **Impact**: GTM tag may not fire correctly because `ad_personalization` and `ad_user_data` are not being managed in the consent mode
- **Files affected**: 
- `src/components/analytics/GTM.tsx` (lines 20-24)
- `src/components/analytics/CookieConsent.tsx` (lines 32-35)

### 2. **Consent Mode Default Configuration**

- **Current**: Only sets `analytics_storage` and `ad_storage` to 'denied'
- **Should include**: All 4 consent types that GTM tag checks: `ad_storage`, `ad_personalization`, `ad_user_data`, `analytics_storage`

## Debugging Process

### Phase 1: Code Fixes

1. **Update GTM.tsx consent mode default**

- Add `ad_personalization: 'denied'` and `ad_user_data: 'denied'` to consent default
- Ensure all 4 consent types match GTM tag's built-in consent checks

2. **Update CookieConsent.tsx consent update function**

- Include `ad_personalization` and `ad_user_data` in consent update calls
- Ensure all 4 consent types are updated when user accepts/denies

3. **Update GoogleTag.tsx (for consistency)**

- Add missing consent types to direct GA4 implementation as well

### Phase 2: GTM Configuration Verification

1. **Verify GTM Variable**

- Check if `{{GA4 Measurement ID}}` variable exists in GTM Variables
- Verify it contains valid GA4 Measurement ID (format: G-XXXXXXXXXX)
- If missing, create constant variable with correct value

2. **Verify GTM Tag Configuration**

- Confirm GA4 Configuration tag uses `{{GA4 Measurement ID}}` variable
- Verify consent settings match code implementation
- Check trigger configuration (should fire on "Initialization - All Pages")

3. **Verify Consent Mode Integration**

- Ensure GTM tag's consent checks align with code implementation
- Built-in checks: `ad_storage`, `ad_personalization`, `ad_user_data`, `analytics_storage`
- Additional checks: `ad_storage`, `analytics_storage` (as shown in image)

### Phase 3: Testing and Validation

1. **Local Testing**

- Test consent banner appears and functions correctly
- Verify consent mode updates in browser console
- Check dataLayer events are pushed correctly

2. **GTM Preview Mode Testing**

- Use GTM Preview mode to verify tag fires correctly
- Test with consent granted and denied scenarios
- Verify GA4 Configuration tag receives correct Measurement ID

3. **GA4 DebugView Testing**

- Enable GA4 DebugView
- Verify events are being received in GA4
- Check that consent mode is working correctly

### Phase 4: Documentation

1. **Update code comments**

- Document all 4 consent types and their purpose
- Add notes about GTM variable requirements

2. **Create verification checklist**

- Document steps to verify GTM variable setup
- Include troubleshooting guide for common issues

## Files to Modify

1. `src/components/analytics/GTM.tsx` - Add missing consent types
2. `src/components/analytics/CookieConsent.tsx` - Update consent update function
3. `src/components/analytics/GoogleTag.tsx` - Add missing consent types (for consistency)

## GTM Configuration Checklist

- [ ] Verify `{{GA4 Measurement ID}}` variable exists in GTM
- [ ] Verify variable contains valid GA4 Measurement ID (G-XXXXXXXXXX format)
- [ ] Verify GA4 Configuration tag uses the variable correctly
- [ ] Verify consent settings in GTM tag match code implementation
- [ ] Test tag firing in GTM Preview mode
- [ ] Verify events appear in GA4 DebugView

### To-dos

- [ ] Update GTM.tsx to include all 4 consent types (ad_storage, ad_personalization, ad_user_data, analytics_storage) in consent mode default
- [ ] Update CookieConsent.tsx to include ad_personalization and ad_user_data in consent update calls
- [ ] Update GoogleTag.tsx to include all 4 consent types for consistency
- [ ] Verify {{GA4 Measurement ID}} variable exists in GTM and contains valid GA4 Measurement ID
- [ ] Test consent banner and verify all 4 consent types are updated correctly in browser console
- [ ] Use GTM Preview mode to verify GA4 Configuration tag fires correctly with consent granted/denied
- [ ] Enable GA4 DebugView and verify events are being received correctly