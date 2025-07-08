# Twilio SMS Dashboard

A modern, real-time messaging dashboard with iMessage-style UI, admin panel, and Supabase authentication.

---

## 🚀 Features

- **Authentication:** Sign up, sign in, logout, email verification, role-based access (admin/user)
- **iMessage-style UI:** Sidebar, thread view, avatars, dark mode, responsive design
- **Real-time updates:** Supabase Realtime for instant message/thread updates
- **Export:** CSV/JSON export for messages
- **Thread Status:** Per-thread status, filtering, real-time updates
- **Admin Panel:** User management (role change, delete), search/filter, beautiful UI
- **Profile:** Users can update their name and password (if implemented)
- **Error handling:** Alerts, loading states, confirmations

---

## 🛠️ Setup

### 1. **Clone the repository**
```bash
git clone https://github.com/your-username/twilio-sms-dashboard.git
cd twilio-sms-dashboard
```

### 2. **Install dependencies**
```bash
npm install
# or
yarn install
```

### 3. **Environment Variables**

Create a `.env.local` file in the root with the following:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these from your [Supabase project settings](https://app.supabase.com/).

### 4. **Supabase Setup**

- Create your Supabase project.
- Run the provided SQL scripts to create the required tables (`my_users`, `threads_table`, `sms_logs`, etc.).
- Enable **Email Confirmations** in Supabase Auth settings for production.

### 5. **Run the app**
```bash
npm run dev
# or
yarn dev
```
Visit [http://localhost:3000](http://localhost:3000)

---

## 🧑‍💻 Usage

- **Sign up** as a new user.  
- **Admin role:**  
  - By default, all users are created as `user`.
  - To make a user admin, update their role in the `my_users` table:
    ```sql
    UPDATE my_users SET role = 'admin' WHERE email = 'admin@example.com';
    ```
- **Admin Panel:**  
  - Only admin users see the Admin Panel link in the Navbar.
  - Manage users: change roles, delete users, search/filter.

---

## 📦 Deployment

- Deploy to [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/), or your preferred platform.
- Set the same environment variables in your deployment dashboard.

---

## 📝 Customization

- **Twilio Integration:**  
  - Add your Twilio credentials in Supabase or as environment variables if you want to send/receive SMS.
- **Avatars:**  
  - Place your avatar images in the `/public` directory.

---

## 🛡️ Security

- Enable email verification in Supabase for production.
- Only admin users can access the admin panel and user management.
- All sensitive actions require confirmation.

---

## 🧩 Tech Stack

- **Next.js** (React)
- **Supabase** (Auth, Database, Realtime)
- **Tailwind CSS** (UI)
- **Twilio** (SMS, optional)
- **TypeScript** (recommended)

---

## 🙏 Credits

- Built by Donia Batool
- Inspired by iMessage, Slack, and modern admin dashboards

---


