-- Test investor for checking the app before the WordPress sync exists.
-- 1. Log in to the app once with your email (this creates your auth user).
-- 2. Replace YOUR_EMAIL below and run this in Supabase → SQL Editor.
-- Numbers are the dank.capital test investor's.

select public.sync_investor(jsonb_build_object(
  'user_id', (select id from auth.users where email = 'YOUR_EMAIL'),
  'wp_user_id', 113,
  'email', 'YOUR_EMAIL',
  'first_name', 'Test',
  'last_name', 'Investor',
  'appeal', 'Mr.',
  'phone', '+1 305 555 0142',
  'current_capital', 89384.16,
  'capital_as_of', current_date,
  'net_annualized_return', 9.38,
  'interest_received', 44232.16,
  'total_invested', 50500,
  'total_withdrawn', 5348,
  'operations', jsonb_build_array(
    jsonb_build_object('date', '2018-07-11', 'type', 'deposit',    'amount', 10000,   'present_capital', 10016.93, 'muted', true),
    jsonb_build_object('date', '2018-07-18', 'type', 'withdrawal', 'amount', 5000),
    jsonb_build_object('date', '2018-07-18', 'type', 'deposit',    'amount', 5016.93, 'present_capital', 10553.29, 'note', 'Left after withdraw at Jul 18, 2018'),
    jsonb_build_object('date', '2018-08-15', 'type', 'deposit',    'amount', 10000,   'present_capital', 20893.85),
    jsonb_build_object('date', '2018-09-05', 'type', 'deposit',    'amount', 10000,   'present_capital', 20787.48),
    jsonb_build_object('date', '2018-09-11', 'type', 'deposit',    'amount', 10000,   'present_capital', 20756.49),
    jsonb_build_object('date', '2021-06-22', 'type', 'deposit',    'amount', 10000,   'present_capital', 16176.22),
    jsonb_build_object('date', '2022-11-19', 'type', 'deposit',    'amount', 500,     'present_capital', 500.13, 'muted', true),
    jsonb_build_object('date', '2022-11-20', 'type', 'withdrawal', 'amount', 348),
    jsonb_build_object('date', '2022-11-20', 'type', 'deposit',    'amount', 152.13,  'present_capital', 216.83, 'note', 'Left after withdraw at Nov 20, 2022')
  )
));
