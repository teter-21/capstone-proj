# Patient Reviews

The system now includes patient reviews with 1–5 star ratings and comments.

## How it works

1. A logged-in patient opens **Review Clinic** in the Patient Portal.
2. The patient selects a 1–5 star rating and writes a comment.
3. Each patient has one review that can be updated later.
4. New or updated reviews are marked **Pending**.
5. An administrator opens **Reviews** and can approve, hide, set pending, or delete a review.
6. Only approved reviews are shown publicly in the Home page's **What Our Patients Say** SwiperJS carousel.

## Database

The server automatically creates `patient_reviews` when it starts. The same table definition is also available in:

`database/patient_reviews.sql`

## Frontend dependency

SwiperJS was added to `front-end/package.json` and `front-end/package-lock.json`.

If dependencies have not been installed yet, run:

`cd front-end`

`npm install`

Then start the frontend normally with `npm run dev`.
