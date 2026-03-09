-- RLS FIX: Disable Row Level Security on orders and notifications tables
-- This allows the app to write to the database without authentication issues
-- Run this SQL in your Supabase SQL editor or database console

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
