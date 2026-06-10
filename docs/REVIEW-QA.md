# Product Reviews — QA Test Plan

## Website (signed-in, approved client)

- [ ] Open PDP — reviews load with rating summary and distribution
- [ ] Open `/products/{slug}?review=1&orderId={deliveredOrderId}` — form opens, scrolls to reviews
- [ ] Open same URL with `&rating=4` — form opens with 4 stars pre-selected
- [ ] Submit review with title, body, photo — success message, pending moderation note
- [ ] Repeat submit for same order — blocked with “already submitted” message
- [ ] Mark review helpful — count increments
- [ ] SEO: view page source — `Product` + `Review` JSON-LD present

## Mobile

- [ ] Order detail → Write review — form opens for delivered line item
- [ ] Submit review — success toast, returns to order
- [ ] Edit existing review (if implemented) — updates pending review
- [ ] Home banner — pending review CTA navigates to WriteReview
- [ ] Push notification from review reminder cron — opens WriteReview screen

## Admin

- [ ] `/admin/product-reviews` — pending list loads
- [ ] Approve review — appears on website PDP
- [ ] Reject review — hidden from public
- [ ] Hide approved review — removed from public

## Automation

- [ ] Cron `GET /api/cron/review-reminders` with `X-Cron-Secret` — `{ ok: true, sent: N }`
- [ ] First reminder ~3 days after delivery; second ~7 days; max 2 per order
- [ ] Email link opens website review form with correct order

## Verified purchase

- [ ] Guest cannot POST `/api/reviews`
- [ ] Client without delivered order for product — eligibility API returns `canReview: false`
- [ ] Approved review shows “Verified purchase” badge on website
