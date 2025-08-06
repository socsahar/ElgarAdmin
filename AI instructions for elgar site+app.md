# 🚨 ELGAR PROJECT - CRITICAL INSTRUCTIONS FOR COPILOT

PLEASE READ AND FOLLOW **EVERY SINGLE POINT BELOW**  
NO SHORTCUTS. NO ASSUMPTIONS. NO EXAMPLES.

---

## 🔐 Step 1: Read this File `AI instructions for elgar site+app.md`

This file defines your limits and behavior throughout the project:

1. ❌ **DO NOT** use fake data, examples, or mockups – EVER.
2. ❌ **DO NOT** create any demos or placeholders.
3. ❌ **DO NOT** create any testing scripts or anything like that - that makes the folder over floated.
4. ✅ Create and use a file called `MEMORY_BANK.md` to track each phase and update it after every major step.  
5. ✅ NEVER skip phases unless I explicitly say so.
6. ✅ After every major file modification – **validate yourself**.
7. ❓ If something is unclear – **ask me** before continuing.
8. 🔍 Scan the entire workspace (files, folders, context) before doing anything. **Know the mission.**
9. 📱 The ENTIRE project must be in **Hebrew** with **Right-To-Left (RTL)** support on both app and web.
10. Update the `database-setup.sql` accordingly to match this whole project and don't create anything unneeded, than tell me when to copy the content to my supabase sql query to install it - after you have confirmed that there is no unnecessary tables/columes.
11. **DATABASE MANAGEMENT RULE**: If the database needs any changes according to our project requirements, update the `database-setup.sql` file and inform the user to reinstall it. Always keep the database schema aligned with project needs.
12. **CRITICAL DATABASE RULE**: If anything we do requires a change or addition to the database, edit the `database-setup.sql` in a way that it won't affect or harm existing tables and content - just adding the data, tables, columns, or rows that are needed. In short, the user wants to be able to just copy the file's content and run it in the Supabase editor without errors or creating extra SQL files. Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE IF EXISTS`, and `INSERT ... ON CONFLICT DO NOTHING` patterns to ensure safe execution.
13. Both the app and the website shoule be ready for work and fully optimized (not a development or demo environment).

---

## 🚫 CRITICAL WORKFLOW RULES - NEVER VIOLATE THESE

### 🔴 Database Operations:
1. **NEVER** modify migration scripts without first verifying the current database state
2. **ALWAYS** test Supabase connection before attempting database operations
3. **ALWAYS** check if tables exist and what schema they have before making changes
4. **NEVER** assume database state - always verify with actual queries
5. **NEVER** update multiple database-related files simultaneously without testing each change

### 🔴 Error Handling:
1. **ALWAYS** run ONE diagnostic command at a time when debugging
2. **NEVER** use background processes (`isBackground: true`) when user needs to see errors immediately
3. **ALWAYS** validate that each fix actually works before moving to the next issue
4. **NEVER** try to fix multiple unrelated errors in parallel
5. **ALWAYS** ask user for confirmation before making major changes to working systems

### 🔴 User Communication:
1. **NEVER** interrupt the user or cancel their actions without explicit permission
2. **ALWAYS** explain what went wrong and what you plan to do to fix it
3. **NEVER** assume user wants you to proceed with fixes - always ask first
4. **ALWAYS** show actual error messages to user before attempting fixes
5. **NEVER** make assumptions about user's technical knowledge

### 🔴 Testing and Validation:
1. **ALWAYS** test server startup after making any server-side changes
2. **ALWAYS** test client startup after making any client-side changes
3. **NEVER** assume code changes work without verification
4. **ALWAYS** check environment variables and credentials before blaming code
5. **NEVER** skip validation steps even if "the change looks simple"

---

## 🧠 Step 2: Create the File `MEMORY_BANK.md`

This file should hold:
- Current development phase
- What was completed
- What is in progress
- What was skipped (if anything)
- What is pending
- What is working as i wanted after i said it'w working perfect/ly
- **CRITICAL**: Any errors encountered and their exact solutions

**You must update it after every step** and refer back to it before continuing.

---

## � DEBUGGING PROTOCOL - MANDATORY STEPS

When encountering errors, follow this EXACT sequence:

### Step 1: Identify the Problem
1. Read the EXACT error message(s)
2. Show the user the complete error output
3. Identify whether it's: Database, API, Network, Code, or Environment issue

### Step 2: Gather Information
1. Check environment variables (.env files)
2. Test basic connections (database, API keys)
3. Verify file existence and permissions
4. Check for any recent changes that might have caused the issue

### Step 3: Create Diagnosis Plan
1. Explain to user what you think the problem is
2. List the steps you want to take to fix it
3. **ASK USER FOR PERMISSION** before proceeding
4. Fix ONE issue at a time, test after each fix

### Step 4: Implement and Validate
1. Make the minimal necessary change
2. Test immediately after the change
3. If fix doesn't work, revert and try different approach
4. **NEVER** assume a fix worked without testing

### Step 5: Document Solution
1. Update MEMORY_BANK.md with what was wrong and how it was fixed
2. Update relevant documentation if needed
3. Inform user that issue is resolved and system is working

---

## �📱 Step 3: Rebuild the Application and Website from Scratch

We are building:
- 📲 A **mobile Android application** for "Elgar" unit (emergency volunteers)
- 🖥️ An **admin website panel** that has **100% control over the app**

Everything must be **fully synced** via the same **Supabase** database.  
(Supabase credentials will be provided when you ask for them.)

---

## 🔑 Roles & Permissions (in Hebrew):

Roles:  
- מפתח (Developer)  
- אדמין (Admin)  
- פיקוד יחידה (Unit Command)  
- מפקד משל"ט (Dispatch Manager)  
- מוקדן (Dispatcher)  
- סייר (Patrol)  

Super-Roles:
- מפתח (Developer)  
- אדמין (Admin)  
- פיקוד יחידה (Unit Command)  

Permissions breakdown:

| Role              | Permissions                                                                                          |
|-------------------|------------------------------------------------------------------------------------------------------|
| מפתח              | All permissions – unrestricted.                                                                      |
| אדמין             | Full system access, same as Developer.                                                               |
| פיקוד יחידה       | Create/Delete/Modify Users & Events, view logs/reports/statistics, respond to events, write reports |
| מפקד משל"ט        | Same as Unit Command but no user management                                                          |
| מוקדן             | Create events, view summaries, respond to events, write reports                                     |
| סייר              | Respond to events, write reports only                                                               |

Users=Volunteers
---

## 📲 Mobile App - Required Features

1. Login page – username + password (no email, no SMS)
2. On first login (default password `123456`) – app locks until user updates password when the app is prompting to
3. Session stays logged-in unless user logs out or uninstalls the app
4. סייר users can only see active events + 5 latest closed events
5. Profile page – user can edit name, phone, and password
6. Live location tracking while user is marked "זמין" (Available)
7. Toggle availability status: זמין / לא זמין  
   - If "לא זמין", disable live location sharing
8. Push notification support
9. Logout button ("התנתק")
10. All user actions must be logged
11. Writing action reports for each event  
    - Once submitted (signed), the report is **locked** and sent for approval by a super-role
    - Action reports must be in that format: Date and time of writting it (current time stamp), Date of the event (user can choose), time of the event (user can choose),Unit Name (יחידה: יחידת אלג"ר) [should be default implemented], ID Number (תעודת זהות), Full name, Full address of the event, Phone number, Role (תפקיד, user can write), name and ID Number of a prtner (check a box if was with someone), a full report section (a box for the user to write down exactly what happend in the event), check a box that says: "בסימון על תיבה זו אני חותם דיגיטלית בשמי ומצהיר כי כל הכתוב בדוח נכון ואמת בלבד".
12. Push notification should be working

---

## 🖥️ Admin Website Panel - Required Features

1. Login page – uses same DB (only privileged roles can log in)
   - סייר trying to log in should see: **"כניסה לבעלי הרשאות בלבד!"**
2. Dashboard:
   - Active events
   - Closed events
   - Available / Unavailable users
   - Pending action reports
   - Average response time (based on יציאה, מקום, סיום)
3. Sidebar menu with:
   - User Management (ניהול משתמשים)
   - Action Reports (דוחות פעולה)
   - Event Management (ניהול אירועים)
   - Response Summary (סיכומים)
   - Logs (לוגים)
   - Statistics (סטטיסטיקות)
   - App Settings (הגדרות אפליקציה)
   - System Messages (הודעות מערכת)
4. RBAC (role-based access control) – show only allowed features
5. Admin user is protected – cannot be deleted or modified
6. User Management Page:
   - 4 Cards: Available / Busy / Unavailable / Avg. response
   - Chart of all users – searchable by name/phone
7. Action Reports Page:
   - Cards: Pending / Approved / Summary
   - Table with filters: date, status, writer name
8. Event Management Page:
   - List of all events (open/closed/writer filters)
   - Create new event
   - Events should be created with theese parameters:
      Title (כותרת)
      Full Address (מיקום האירוע)
      Details (פרטים)
      License Plate Number (לוחית רישוי)
      Car Model (סוג רכב)
      Color (צבע רכב)
      Status of the car (סטטי, בתנועה, זעזועים, פורקה מערכת)
      A Check Box to mark if needed (מערכת איתור): if checked than asks for a URL to the live locatino of the car
   - No Event Type/severity is needed !

   
   - On click: assign event to available/unavailable users
9. Response Summary Page:
   - Events per user
   - Filter by: day, month, year, etc.
10. Logs Page:
    - All logs from app and site
    - Marked by source (App/Web), timestamp, and actor
11. Statistics Page:
    - Show all event/user data with filters
12. App Settings Page:
    - Control app behavior
    - Assign privileges to roles and users
    - Only admin can modify themselves
13. System Messages Page:
    - Send system messages to user(s)
    - Shows in push + in-app messages
    - Shows the message, who sent it and to whom (in Web)

---

## 🔁 SYNC & NOTIFICATIONS RULES

1. Every creation/modification (user, event, message) on the **website** must:
   - Sync in real time with the app
   - Send a push notification
2. On event creation:
   - Calculate 5 closest users (based on GPS)
   - Notify them with **address + title only**
   - Users can respond: "יוצא", "מקום", "לא זמין"
   - Only after selecting "יוצא", the app shows full event details
   - The time of response must be recorded and shown
3. Sync must be **continuous and reliable**

---

## ✅ Final Notes

- Everything must be in Hebrew and RTL
- All user interactions are logged
- Supabase is the shared backend
- No assumptions. Always ask if unsure.
- Follow `AI instructions for elgar site+app.md` and keep `MEMORY_BANK.md` up to date
- After the entire project is completed, you must perform a full self-review:

Check for any:
❌ Bugs
❌ Syntax errors
❌ Logic errors
❌ Mismatches between features and requirements
❌ Performance issues or low efficiency
❌ Misunderstandings or missing features

Then, fix everything to ensure the project is working exactly as requested and perfectly stable.

---

## 🚨 COMMON MISTAKES TO AVOID (LEARNED FROM EXPERIENCE)

### Database Issues:
- ❌ NEVER assume database schema without checking
- ❌ NEVER modify migration scripts without testing current database state
- ❌ NEVER ignore "Invalid API key" errors - they indicate connection problems
- ✅ ALWAYS verify Supabase credentials work before database operations
- ✅ ALWAYS check if user has actually deployed database-setup.sql

### Workflow Issues:
- ❌ NEVER rush to fix multiple things simultaneously
- ❌ NEVER use background processes when debugging errors
- ❌ NEVER update code without verifying the current working state
- ✅ ALWAYS follow the debugging protocol step by step
- ✅ ALWAYS ask user permission before making major changes

### Communication Issues:
- ❌ NEVER assume user understands technical details
- ❌ NEVER proceed with fixes without explaining the plan
- ❌ NEVER cancel user actions without explicit permission
- ✅ ALWAYS explain what went wrong in simple terms
- ✅ ALWAYS show actual error messages before attempting fixes