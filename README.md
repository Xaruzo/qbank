# QBANK - CSE Reviewer

A comprehensive Progressive Web App (PWA) for Civil Service Exam preparation — featuring question management, mock exams, and personalized study tools.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://qbank-vr5s.onrender.com/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple)](https://vitejs.dev/)

---

## Features

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
- **Mastery Tracking**: Track progress from Learning to Familiar to Mastered

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

## Tech Stack

- **Frontend**: React 18, Vite 5, JavaScript (JSX)
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Authentication**: Supabase Auth (Google OAuth)
- **Styling**: Custom CSS with dark/light theme system
- **Math Rendering**: KaTeX
- **Drawing**: Fabric.js 5
- **Icons**: Lucide React
- **PWA**: Service Worker with cache-first strategy

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modals, exit overlays, or skip tour |
| `Ctrl + K` | Focus search box |
| `←/→` | Navigate between questions |
| `Space` | Scroll down in question detail |
| `Shift + Space` | Scroll up in question detail |
| `Ctrl + Enter` | Submit form when editing |

## Links

- **Live Demo**: [https://qbank-vr5s.onrender.com](https://qbank-vr5s.onrender.com)
- **Repository**: [https://github.com/Xaruzo/qbank](https://github.com/Xaruzo/qbank)
- **Original Author**: [Xaruzo](https://github.com/Xaruzo)

## Support

For questions or issues, please open an issue on GitHub.

---

Made with 💙 for CSE exam takers
