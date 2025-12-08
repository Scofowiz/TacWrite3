# Contributing to Cardinal Signposts

First off, thank you for considering contributing to Cardinal Signposts! It's people like you that make this tool better for everyone.

## Code of Conduct

Be kind, be honest, be respectful. We're all here to make AI-assisted development better.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Use this template:**

```
**Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Run command X
2. See error Y

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Environment:**
- OS: [e.g., macOS 14.1]
- Python version: [e.g., 3.11.5]
- Cardinal Signposts version: [e.g., 1.0.0]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear use case**: Why is this enhancement needed?
- **Proposed solution**: How would it work?
- **Alternatives considered**: What other approaches did you think about?
- **Examples**: Show how it would be used

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the coding style**:
   - Use type hints for Python code
   - Follow PEP 8 style guide
   - Write docstrings for functions and classes
   - Keep functions focused and small

3. **Add tests** for new functionality
4. **Update documentation** if you change behavior
5. **Ensure tests pass**: `pytest`
6. **Write clear commit messages**:
   ```
   Add feature X to support Y
   
   - Implemented Z
   - Added tests for W
   - Updated docs
   ```

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/cardinal-signposts.git
cd cardinal-signposts

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run linter
flake8 cardinal_signposts/

# Type checking
mypy cardinal_signposts/
```

## Project Structure

```
cardinal-signposts/
├── cardinal_signposts/      # Main package
│   ├── __init__.py
│   ├── generator.py         # Core signpost generation
│   ├── cli.py              # Command-line interface
│   ├── templates/          # Project templates
│   └── validators.py       # Signpost validation
├── tests/                  # Test suite
├── examples/               # Example projects
└── docs/                   # Documentation
```

## Testing Guidelines

- Write tests for new features
- Maintain or improve code coverage
- Test edge cases
- Use descriptive test names:

```python
def test_signpost_creation_in_nested_directory():
    """Signpost should correctly identify its location in nested dirs"""
    # Test implementation
```

## Documentation Guidelines

- Update README.md for significant changes
- Add docstrings to new functions/classes
- Include examples in docstrings:

```python
def create_signpost(path: str, role: str) -> None:
    """Create a cardinal signpost at the specified path.
    
    Args:
        path: Absolute path to directory
        role: Purpose/description of directory
        
    Example:
        >>> create_signpost("/home/user/project/src", "Source code")
        
    Raises:
        ValueError: If path doesn't exist
    """
```

## Style Guide

### Python

- Use type hints
- Follow PEP 8
- Maximum line length: 88 characters (Black formatter)
- Use f-strings for formatting
- Prefer pathlib over os.path

### Markdown

- Use clear section headers
- Include code examples with proper syntax highlighting
- Keep lines under 100 characters where possible

## What We're Looking For

High priority contributions:

1. **New project templates** (React, Rust, Go, etc.)
2. **IDE integrations** (VS Code extension, JetBrains plugin)
3. **Documentation improvements**
4. **Bug fixes**
5. **Performance optimizations**

## Recognition

Contributors are recognized in:
- README.md Contributors section
- Release notes
- GitHub contributors page

## Questions?

Open a [Discussion](https://github.com/scofowiz/cardinal-signposts/discussions) or reach out via GitHub issues.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
