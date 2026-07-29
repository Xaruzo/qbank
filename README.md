# QBANK - CSE Reviewer

A comprehensive Progressive Web App (PWA) for Civil Service Exam preparation, featuring question management, mock exams, and personalized study tools.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://qbank-vr5s.onrender.com/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple)](https://vitejs.dev/)

## 🌟 Features

### Question Bank Management
- **Search & Filter**: Instant search with topic and label filtering
- **Smart Organization**: Categorize questions by topic (Numerical, Verbal, Abstract, Clerical, etc.)
- **Custom Labels**: Tag questions with custom labels for personalized organization
- **Favorites**: Star important questions for quick access
- **Math Support**: Render mathematical expressions using KaTeX
- **Drawing Tools**: Add visual diagrams to questions using Fabric.js canvas

### Mock Exam System
- **Timed Practice**: Simulate real exam conditions with 3h 10min timer
- **170 Questions**: Full-length professional mock exams
- **Auto-Save**: Progress automatically saved during exam sessions
- **Performance Analytics**: Detailed score breakdowns and topic-wise analysis
- **Attempt History**: Review past attempts with complete answer records
- **Resume Capability**: Resume unfinished exams from where you left off

### Study Tips
- **Personal Notes**: Create custom study notes for any question
- **Visual Learning**: Draw diagrams and visual aids using canvas
- **Categorization**: Organize tips by type (Formula, Shortcut, Method, Mnemonic)
- **Mastery Tracking**: Track progress from Learning → Familiar → Mastered

### User Experience
- **Dark/Light Mode**: Toggle themes for comfortable studying in any lighting
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **iOS Compatible**: Full support for iPhone/iPad with safe-area handling
- **PWA Installable**: Install as standalone app on any device
- **Offline Support**: Access questions and take exams without internet
- **Keyboard Shortcuts**: Navigate efficiently with keyboard commands
- **Interactive Tutorial**: Guided tour for first-time users

### Authentication & Sync
- **Google OAuth**: Secure sign-in with Google accounts
- **Cloud Sync**: Questions, favorites, and tips sync across devices
- **Row-Level Security**: Supabase RLS policies protect user data

## 🚀 Tech Stack

- **Frontend**: React 18, Vite 5, JavaScript (JSX)
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Authentication**: Supabase Auth (Google OAuth)
- **Styling**: Custom CSS with dark/light theme system
- **Math Rendering**: KaTeX
- **Drawing**: Fabric.js 5
- **Icons**: Lucide React
- **PWA**: Service Worker with cache-first strategy

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Xaruzo/qbank.git
   cd qbank
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:5173](http://localhost:5173)

## 🔧 Build & Deploy

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Render
The app is configured for deployment on Render with:
- Automatic builds from GitHub
- Keep-alive workflow for free tier
- Static site hosting

## 🗄️ Database Setup

The app uses Supabase with the following schema:

### Tables
- `questions` - Question bank with topics, choices, solutions
- `user_favorites` - User-specific favorites
- `mock_exam_attempts` - Completed exam records
- `tips` - User study notes and drawings

### Storage
- `question-images` - Public bucket for question images

### Migrations
Database migrations are available in `/supabase/migrations/`:
- Row-Level Security policies
- User favorites table
- Mock exam attempts with rate limiting
- Image storage bucket
- Question metadata fields

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modals, exit overlays, or skip tour |
| `Ctrl + K` | Focus search box |
| `←/→` | Navigate between questions |
| `Space` | Scroll down in question detail |
| `Shift + Space` | Scroll up in question detail |
| `Ctrl + Enter` | Submit form when editing |

## 🎨 Project Structure

```
qbank/
├── public/
│   ├── icon.svg              # App icon
│   ├── manifest.webmanifest  # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── constants/            # App constants and symbols
│   ├── controllers/          # State management hooks
│   ├── models/               # Data persistence layer
│   ├── styles/               # CSS stylesheets
│   ├── utils/                # Helper functions
│   ├── views/
│   │   └── components/       # React components
│   ├── App.jsx               # Main app component
│   └── main.jsx              # App entry point
├── supabase/
│   └── migrations/           # Database migrations
└── vite.config.js            # Vite configuration
```

## 🤝 Contributing

This project is maintained by [Xaruzo](https://github.com/Xaruzo) and John Lloyd.

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available for educational purposes.

## 🔗 Links

- **Live Demo**: [https://qbank-vr5s.onrender.com](https://qbank-vr5s.onrender.com)
- **Repository**: [https://github.com/Xaruzo/qbank](https://github.com/Xaruzo/qbank)
- **Original Author**: [Xaruzo](https://github.com/Xaruzo)

## 📞 Support

For questions or issues, please open an issue on GitHub.

---

Made with 💙 for CSE exam takers
