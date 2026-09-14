import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import pg from 'pg';
import { normalizeSyrianMobile } from '../modules/auth/core/phone-normalizer.js';
const {Pool}=pg;
const databaseUrl=process.env.DATABASE_URL;const fullName=process.env.ADMIN_NAME;const phoneRaw=process.env.ADMIN_PHONE;const password=process.env.ADMIN_PASSWORD;const provinceName=process.env.ADMIN_PROVINCE_NAME??'الرقة';
if(!databaseUrl||!fullName||!phoneRaw||!password)throw new Error('DATABASE_URL, ADMIN_NAME, ADMIN_PHONE and ADMIN_PASSWORD are required.');
if(password.length<12)throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
const phone=normalizeSyrianMobile(phoneRaw);const pool=new Pool({connectionString:databaseUrl});
try{
 const province=await pool.query<{id:string}>(`SELECT id FROM provinces WHERE name_ar=$1 LIMIT 1`,[provinceName]);if(!province.rows[0])throw new Error(`Governorate not found: ${provinceName}`);
 const existing=await pool.query<{id:string;systemRole:string}>(`SELECT id,system_role AS "systemRole" FROM users WHERE phone=$1 AND deleted_at IS NULL`,[phone]);
 if(existing.rows[0]){if(existing.rows[0].systemRole==='ADMIN'){process.stdout.write('Admin already exists for this phone.\n');process.exitCode=0;}else{throw new Error('A non-admin user already exists with this phone.');}}
 else{const hash=await argon2.hash(password,{type:argon2.argon2id});await pool.query(`INSERT INTO users(id,full_name,phone,password_hash,province_id,status,system_role) VALUES($1,$2,$3,$4,$5,'ACTIVE','ADMIN')`,[randomUUID(),fullName.trim(),phone,hash,province.rows[0].id]);process.stdout.write('Initial admin created.\n');}
}finally{await pool.end();}
