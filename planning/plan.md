### Stack

- Vue
- Vue Router
- Vuetify + Tailwind 4
- TanStack Query
- TypeScript
- Docker
- Zod
- Node (API)
- Sqlite
- PWA


Web App: PQS - Training Certification


```
table Companies
    id INT
    name VARCHAR(250)

table Users
    id INT
    name VARCHAR(250)
    email VARCHAR(250)
    company_id INT

table Topics
    id INT
    name VARCHAR(250)

table TrainingRecords
    id INT PRIMARY
    user_id INT
    topic_id INT
    awarded_at DATE
    expires_at DATE NULL

table TrainingBookings
    id INT
    user_id INT
    topic_id INT
    commencing_at DATE
    completed_at DATE NULL
```


```
*
    :is_authenticated_from_cookie
        [set_state:AUTH:USER]

shared
    <nav>
        ? "Positioned fixed on mobile at the bottom in the center, add a spacer to ensure no overlapping of content when scrolling to bottom of page"
        > dashboard
        > training
        ---
        > sign_out
            [end_user_session, set_state:GUEST, redirect:/]

/
    <page>
        AUTH:GUEST:
            <>
                ! "Sign In or Register with Email"
                > sign_in
                    :exceeded_5_attempts
                        [feedback:invalid_email_or_password, feedback:wait_15_minutes, log]
                    :wrong_password
                        [feedback:invalid_email_or_password]
                    :default
                        [feedback:success, set_state:USER]
                > register
                    :email_exists
                        [feedback:account_exists]
                    :invalid_password
                        [feedback:invalid_password]
                    :default
                        [create_user, feedback_user_created, set_state:USER]
        AUTH:USER:
            redirect:/dashboard
        
/dashboard
    <page#dashboard>
        AUTH:GUEST:
            redirect:/
        AUTH:USER:
            <nav>
            <company>
                <> = @user.company.name
                > invite_user
                    :invalid_email
                        [feedback:invalid_email]

            <row#user-editor> = @user
                <> = @user.email
                <modal>
                    ! "Edit user details"
                    <input:password> = @user.password EXISTING
                    <input:password> = @user.password NEW
                    > save
                        :wrong_password_existing:
                            [feedback:wrong_password]
                        :invalid_password
                            [feedback:invalid_password]
                        :default
                            [update_user, feedback_user_updated, revoke_other_sessions, modal_close]
                            
            <card#upcoming-training-bookings>
                > view
                    [redirect:/training?type=booking&from=today]

            <card#upcoming-certificate-expirations>
                > view
                    [redirect:/training?type=expiration&from=today]

/training
    <page#training>
        AUTH:GUEST:
            redirect:/
        AUTH:USER:
            <nav>
            <actions>
                > add_booking
                > add_certification
            <filter>
                > filter_by_topic
                > filter_by_type
                > toggle_show_expirations_greater_than_3_months
                > filter_by_date_range
            <filter-tags>
            <table>
                ! "A table that mixes Training Bookings and Training Records split by what is upcoming (expirations)"
                ? "Training Records are selected once for the awarded date (Certification) and once for the expiration date (Expiration)"
                ? "Records are ordered by relevant date, then Expiration, Certification, Booking"
                ? "The table is split into Upcoming and Archive"
                ? "Expirations are not shown > 3 months in the future unless filtered to do so"
                <> = @topic.name
                <> = type
                    :is_booking
                        "Booking"
                    :is_certification
                        "Certification"
                    :is_expiration
                        "Expiration"
                <> = status
                <> = 
                    :is_booking AND booking_completed
                        @trainingBooking.completed_at NICE_DATE_RELATIVE
                    :is_booking
                        @trainingBooking.commencing_at NICE_DATE_RELATIVE
                <> =
                    :is_booking AND booking_completed
                        @trainingBooking.completed_at NICE_DATE_RELATIVE
                    :is_booking AND booking_in_future
                        @trainingBooking.commencing_at NICE_DATE_RELATIVE
                    :is_booking
                        > mark_booking_complete
                            [update_booking_completed_at, prompt_auto_create_certification]
                    :is_certification
                        @trainingRecord.awarded_at NICE_DATE_RELATIVE
                    :is_expiration
                        @trainingRecord.expires_at NICE_DATE_RELATIVE
            <pagination>

```