# Material Portal

A professional material sharing platform where you can upload PDFs and share them with friends.

## Features

### Public Page
- Browse all uploaded materials
- Search by title/description
- Filter by category
- One-click download
- Mobile-friendly design

### Admin Panel
- Secure password-protected access
- Upload PDF files (up to 50MB)
- Add titles, descriptions, and categories
- View download statistics
- Delete materials
- Modern dark theme UI

## Default Admin Password

**Password:** `admin123`

⚠️ **Important:** Change this password in `server.js` before deploying!

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open in browser:
- Public page: http://localhost:3000
- Admin panel: http://localhost:3000/admin

## Deployment on Render.com

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `material-portal`
3. Make it Public
4. Click "Create repository"

### Step 2: Upload Code
1. Click "uploading an existing file"
2. Upload these files:
   - `server.js`
   - `package.json`
   - `public/index.html`
   - `public/admin.html`
3. Click "Commit changes"

### Step 3: Deploy on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: `material-portal`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Click "Create Web Service"

### Step 4: Access Your Site
- Your site will be live at: `https://material-portal.onrender.com`
- Public page: `https://material-portal.onrender.com/`
- Admin panel: `https://material-portal.onrender.com/admin`

## File Structure

```
material-portal/
├── server.js          # Backend server
├── package.json       # Dependencies
├── materials.db       # SQLite database (auto-created)
├── uploads/           # Uploaded PDFs folder (auto-created)
└── public/
    ├── index.html     # Public page
    └── admin.html     # Admin panel
```

## Changing Admin Password

1. Open `server.js`
2. Find this line:
```javascript
const ADMIN_PASSWORD = 'admin123';
```
3. Change `'admin123'` to your desired password
4. Save and redeploy

## Support

For any issues, check the browser console for error messages.
