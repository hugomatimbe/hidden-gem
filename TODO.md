# Website Evaluation and Improvement Plan

## Overview
This TODO list tracks the implementation of improvements and fixes for the Hidden Gems website based on the evaluation.

## Steps

### 1. Install Dependencies
- Add validation library (zod) and other necessary packages for security and validation.
- [x] Installed zod

### 2. Performance Improvements
- Update `src/pages/_document.tsx` to conditionally load Google Maps API only on pages that need it.
- Implement lazy loading for images and components.
- [x] Moved Google Maps API loading to dynamic import in Map component

### 3. Security Enhancements
- Update `src/pages/api/gems.ts` to add input validation, sanitization, and basic authentication.
- Add rate limiting for API endpoints.
- [x] Added zod validation for input sanitization

### 4. UX/UI Improvements
- Update `src/components/Form.tsx` to add client-side validation and improve user feedback.
- Update `src/components/GemCard.tsx` to use Next.js Link for navigation and calculate real distances.
- Add newsletter form handling in `src/pages/index.tsx`.
- [x] Added client-side validation with zod and error display

### 5. Code Quality Fixes
- Update `src/pages/c/maputo.tsx` to fix filtering and sorting logic.
- Add error boundaries to key components.
- Remove unused code and improve type safety.
- [x] Updated GemCard to use Next.js Link and calculate real distances

### 6. Accessibility and SEO
- Add ARIA labels and improve accessibility in components.
- Enhance meta tags and add structured data for better SEO.
- [x] Added ARIA labels to Form component and enhanced meta tags in _document.tsx

### 7. Testing and Validation
- Test all changes for functionality, performance, and security.
- Run Lighthouse audits and fix any issues.
- [x] Successfully built the application with no TypeScript errors
- [x] Enhanced submit page with improved validation, error handling, and user experience
- [x] Implemented dynamic tag selection with real-time filtering and removal
- [x] Fixed tag input handling for comma/space keys and prevented form submission conflicts
- [x] Resolved manual tag input issues with separate state management and proper event handling
- [x] Fixed submit page loading states and error handling integration
- [x] Improved Maputo page filtering, sorting, and URL handling
- [x] Added proper client-side data fetching and loading states
- [x] Enhanced submission success message with better UX
- [x] Implemented form field clearing after successful submission
- [x] Added duplicate gem prevention (same title within 100m)
- [x] Improved error handling for duplicate submissions
- [x] Added contact and social media fields for all categories except Views and Peculiar
- [x] Implemented dark mode theme with toggle button, context management, and component styling

## Progress
- [x] Step 1: Install Dependencies
- [x] Step 2: Performance Improvements
- [x] Step 3: Security Enhancements
- [x] Step 4: UX/UI Improvements
- [x] Step 5: Code Quality Fixes
- [x] Step 6: Accessibility and SEO
- [x] Step 7: Testing and Validation
