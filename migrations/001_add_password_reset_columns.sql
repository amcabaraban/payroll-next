-- ============================================================
-- Migration 001: Add password reset columns to the users table
--
-- Run this ONCE against your database (local XAMPP/MySQL AND
-- your production/Aiven MySQL database):
--
--   mysql -u root payroll_next < migrations/001_add_password_reset_columns.sql
--
-- Or run the ALTER statements directly in phpMyAdmin /
-- MySQL Workbench / your host's SQL console.
--
-- NOTE: This is NOT idempotent. Importing it twice will fail
-- with "Duplicate column name" - that error is expected and safe;
-- it means the columns already exist.
-- ============================================================

USE payroll_next;

ALTER TABLE users
    ADD COLUMN reset_token VARCHAR(255) NULL AFTER password,
    ADD COLUMN reset_token_expires DATETIME NULL AFTER reset_token;