# 🎯 Next Millionaire Game

> An AI-powered web quiz game inspired by "Who Wants to Be a Millionaire?" with intelligent question generation and interactive gameplay.

## 🌟 Overview

Next Millionaire Game is an interactive web-based quiz application that recreates the excitement of the classic TV game show "Who Wants to Be a Millionaire?". Powered by advanced AI technology, the game dynamically generates questions across multiple categories and provides an authentic game show experience with an AI host, lifelines, and progressive prize ladder.

## ✨ Key Features

- **🤖 AI-Powered Question Generation**: Dynamic questions across multiple categories using LLM technology
- **🎙️ Interactive AI Host**: AI host that speaks questions, adds suspense, and guides gameplay
- **🆘 Classic Lifelines**: Three traditional lifelines (50:50, Audience Poll, Switch Question)
- **💰 Progressive Prize Ladder**: Climb from $100 to $1 Million with checkpoint levels
- **⏱️ Timed Challenges**: Time limits for early questions to increase difficulty
- **🎵 Authentic Sound Effects**: Game show sounds and music for immersive experience
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices
- **🏆 Multiple Categories**: Choose from History, Geography, Sports, Science, Movies, Music, and Recent Events

## 🎮 How to Play

1. **Choose Your Categories**: Select 5 categories from the available options
2. **Answer Questions**: Progress through 15 questions of increasing difficulty
3. **Use Lifelines**: Strategically use your three lifelines when stuck
4. **Climb the Ladder**: Earn money for each correct answer
5. **Reach the Million**: Answer all 15 questions to become a millionaire!

### Prize Ladder
- Questions 1-5: $100 - $1,000 (Easy)
- Questions 6-10: $2,000 - $32,000 (Medium) 
- Questions 11-15: $64,000 - $1,000,000 (Hard)

### Lifelines
- **50:50**: Removes two incorrect answers
- **Audience Poll**: Shows simulated audience voting percentages
- **Switch Question**: Replace current question with a new one

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or pnpm
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/mamataparab22/Next-Millionaire-Game.git

# Navigate to project directory
cd Next-Millionaire-Game

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# LLM API Configuration
LLM_API_URL=your_llm_api_url
LLM_API_KEY=your_api_key

# Optional: Custom settings
TIMER_DURATION=30
MAX_QUESTIONS=15
```

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Audio**: Howler.js for sound effects and music
- **Voice**: Web Speech API / TTS for AI host
- **Backend**: Node.js + Express (API proxy)
- **State Management**: React Reducer or XState
- **Real-time**: Socket.IO for live audience poll animations

### Project Structure
```
next-millionaire/
├── apps/
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── state/
│   │   │   └── sfx/
│   │   └── vite.config.ts
│   └── api/                 # Express backend
│       ├── src/
│       │   ├── routes/
│       │   └── llm/
│       └── package.json
└── package.json
```

### Game Flow
```
Start → Category Selection → Question Generation → 
Question Reading → Answer Timer → Evaluation → 
Next Level or Game Over → Results
```

## 🧠 AI Integration

The game leverages several AI capabilities:

- **Question Generation**: Creates contextually appropriate questions using LLM Chat
- **Answer Validation**: Ensures question accuracy with LLM Analyze
- **Current Events**: Uses Ask Web for recent events questions
- **Voice Synthesis**: AI host speaks using TTS technology
- **Content Moderation**: Filters inappropriate content automatically

## 🎯 Game Categories

- **History**: World events, historical figures, and time periods
- **Geography**: Countries, capitals, landmarks, and physical features  
- **Sports**: Athletes, events, records, and sports trivia
- **Science**: Physics, chemistry, biology, and scientific discoveries
- **Movies**: Films, actors, directors, and cinema history
- **Music**: Artists, songs, genres, and music history
- **Recent Events**: Current news and happenings from the last 12 months

## 🛠️ Development

### Running Tests
```bash
npm test
# or
pnpm test
```

### Building for Production
```bash
npm run build
# or
pnpm build
```

### Linting and Formatting
```bash
# Run linter
npm run lint

# Format code
npm run format
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the classic "Who Wants to Be a Millionaire?" game show
- Built with modern web technologies and AI integration
- Thanks to all contributors and the open source community

## 📞 Support

If you have any questions or need help:

- 📧 Create an issue in this repository
- 💬 Start a discussion in the Discussions tab
- 🐛 Report bugs using the issue template

---

**Ready to become the next millionaire? Start playing and test your knowledge!** 🎉
