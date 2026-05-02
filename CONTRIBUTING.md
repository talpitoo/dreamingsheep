# Contributing to 🐏 _dreamingsheep_

Thank you for your interest in contributing! Dreamingsheep is a free dream journal that helps people track and analyze their dreams.

## 🚶 Getting Started

### Prerequisites

- Node.js 18.x
- PostgreSQL 13+
- Yarn

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/dreamingsheep.git
cd dreamingsheep

# Use correct Node version
nvm use 18

# Install dependencies
yarn install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your local database credentials

# Setup database
npx prisma generate
blitz prisma migrate dev
blitz db seed

# Start development server
blitz dev
```

### Project Structure

```
src/
├── auth/          # Authentication (signup, login, password reset)
├── core/          # Shared components, layouts, hooks
├── dreams/        # Dream CRUD, forms, queries
├── symbols/       # Dream symbols management
├── stats/         # Statistics and charts
├── settings/      # User settings, export
└── pages/         # Next.js pages
db/
├── schema.prisma  # Database schema
└── utils/         # Seed scripts
```

## 💾 Pull Request Process

1. **Create an issue first** for non-trivial changes
2. **Fork and branch** - `git checkout -b feature/your-feature`
3. **Follow code style** - We use ESLint and Prettier
4. **Write tests** if adding new functionality
5. **Update documentation** if changing behavior
6. **Submit PR** with clear description

### PR Template

```
## What does this PR do?
Brief description of changes

## Why is this needed?
Link to issue or explain the problem

## How to test?
Steps to verify the changes work

## Screenshots (if UI changes)
Before/after images
```

## 🧑‍💻 Code Guidelines

### TypeScript

- Use strict types, avoid `any`
- Prefer interfaces over types for object shapes

### React

- Functional components with hooks
- Keep components small and focused
- Use Suspense for loading states

### Styling

- Tailwind CSS for utility classes
- Material-UI for complex components
- Mobile-first responsive design

### Database

- All schema changes need migration files
- Explain data model changes in PR description

## 📦 Backend Contributions

The maintainer (@talpitoo) is primarily a frontend developer. Backend PRs require:

1. **Detailed explanation** of what the code does and why
2. **Security considerations** documented
3. **Test coverage** for new endpoints/mutations
4. **Small, focused changes** - break large features into smaller PRs

## 🐛 Reporting Bugs

Use the bug report template and include:

- Steps to reproduce
- Expected vs actual behavior
- Browser/device information
- Screenshots or error messages

## 💬 Questions?

- Open an issue with the `question` label
- Check existing issues and documentation first

## 📜 License

By contributing, you agree to the project's [license terms](LICENSE.txt). Your contributions will be incorporated under the same license.

---

Thank you for helping make dream journaling better for everyone! 🐏✨
