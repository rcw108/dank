// Demo sign-in: any email works and the one-time code is always 123456.
// Removed when Supabase Auth sends real codes (step 3).
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_AUTH !== "false";
export const DEMO_CODE = "123456";
