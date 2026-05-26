UPDATE auth.users
SET
  encrypted_password = crypt('MetaSun@2026!Admin', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'renanbarc16@gmail.com';