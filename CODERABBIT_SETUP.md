# 🤖 CodeRabbit Automated Code Review Setup

This document explains how to set up and use CodeRabbit for automated code reviews in SignalsLoop.

## 📋 Overview

CodeRabbit provides AI-powered code reviews that help improve code quality, catch potential issues, and suggest best practices. We've configured it to work with:

- **Local Development**: Pre-commit hooks and npm scripts
- **GitHub Actions**: Automated reviews on PRs and pushes
- **Custom Configuration**: Tailored for Next.js/TypeScript/React

## 🚀 Quick Start

### 1. Install CodeRabbit CLI

```bash
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

### 2. Authenticate

```bash
coderabbit auth login
```

### 3. Run Reviews

```bash
# Full review
npm run review

# Prompt-only review
npm run review:prompt

# Setup pre-commit hook
npm run review:setup
```

## ⚙️ Configuration Files

### `.coderabbit.yaml`
Main configuration file that defines:
- Review settings and triggers
- File inclusion/exclusion patterns
- AI focus areas and instructions
- Project-specific settings

### `.github/workflows/coderabbit-review.yml`
GitHub Actions workflow that:
- Runs on push/PR to main/develop branches
- Installs CodeRabbit CLI
- Performs automated reviews
- Comments on PRs with results

### `scripts/pre-commit-coderabbit.sh`
Pre-commit hook script that:
- Runs CodeRabbit review before commits
- Allows bypassing if needed
- Provides helpful feedback

## 🎯 Review Focus Areas

CodeRabbit is configured to focus on:

- **Code Quality**: TypeScript best practices, React patterns
- **Security**: API security, input validation, authentication
- **Performance**: Optimization opportunities, efficient queries
- **Maintainability**: Clean code, proper error handling
- **Best Practices**: Next.js patterns, API design
- **AI Integration**: OpenAI integration patterns
- **Webhook Reliability**: Webhook system robustness

## 📁 File Coverage

**Included:**
- `src/**/*.ts` - TypeScript files
- `src/**/*.tsx` - React components
- `src/**/*.js` - JavaScript files
- `*.md` - Documentation
- `*.yaml`, `*.yml` - Configuration files

**Excluded:**
- `node_modules/**` - Dependencies
- `.next/**` - Build output
- `dist/**`, `build/**` - Build artifacts
- `*.log` - Log files
- `*.lock` - Lock files

## 🔄 Automated Workflows

### GitHub Actions
- **Trigger**: Push to main/develop, PR creation
- **Action**: Runs CodeRabbit review
- **Output**: Comments on PR with review results
- **Artifacts**: Saves review results for 7 days

### Pre-commit Hook
- **Trigger**: Before each commit
- **Action**: Runs CodeRabbit review
- **Behavior**: Can be bypassed with `--no-verify`
- **Feedback**: Shows issues and allows continuation

## 🛠️ Usage Examples

### Local Development
```bash
# Review current changes
npm run review

# Review with prompts only
npm run review:prompt

# Setup pre-commit hook
npm run review:setup
```

### Manual Review
```bash
# Review specific file
coderabbit review --plain src/lib/enhanced-priority-scoring.ts

# Review with custom config
coderabbit review --plain -c .coderabbit.yaml

# Review uncommitted changes
coderabbit review --plain -t uncommitted
```

### GitHub Integration
- Reviews automatically run on PRs
- Results posted as PR comments
- Workflow artifacts saved for review
- Rate limiting handled automatically

## 🔧 Troubleshooting

### Rate Limiting
- CodeRabbit has rate limits (~7 minutes between reviews)
- GitHub Actions handles this automatically
- Local reviews may need to wait

### Authentication Issues
```bash
# Check status
coderabbit auth status

# Re-authenticate
coderabbit auth login

# Switch organizations
coderabbit auth org
```

### Review Failures
```bash
# Check for uncommitted changes
git status

# Review specific type
coderabbit review --plain -t committed

# Bypass pre-commit hook
git commit --no-verify
```

## 📊 Review Types

CodeRabbit provides several types of feedback:

- **Potential Issue**: Bugs, security issues, performance problems
- **Suggestion**: Code improvements, best practices
- **Question**: Clarifications, alternative approaches
- **Praise**: Good practices, well-written code

## 🎨 Customization

### Modify Focus Areas
Edit `.coderabbit.yaml` to add/remove focus areas:
```yaml
ai:
  focus:
    - "code_quality"
    - "security"
    - "performance"
    - "your_custom_focus"
```

### Add Custom Instructions
Add project-specific guidance:
```yaml
ai:
  instructions: |
    Your custom instructions here...
    Focus on specific patterns or requirements.
```

### Exclude Additional Files
```yaml
review:
  exclude:
    - "your/excluded/path/**"
    - "*.custom"
```

## 📈 Benefits

- **Automated Quality**: Consistent code review process
- **Learning**: AI suggestions help improve coding skills
- **Efficiency**: Catches issues before they reach production
- **Best Practices**: Enforces team coding standards
- **Documentation**: Review history and improvement tracking

## 🔗 Resources

- [CodeRabbit CLI Documentation](https://docs.coderabbit.ai/cli)
- [GitHub Actions Integration](https://docs.coderabbit.ai/github-actions)
- [Configuration Reference](https://docs.coderabbit.ai/configuration)
- [Best Practices Guide](https://docs.coderabbit.ai/best-practices)
