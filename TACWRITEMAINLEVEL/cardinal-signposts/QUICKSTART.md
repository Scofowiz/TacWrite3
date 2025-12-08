# Quick Start Guide

Get Cardinal Signposts running in your project in 5 minutes.

## Installation

```bash
pip install cardinal-signposts
```

Or install from source:

```bash
git clone https://github.com/scofowiz/cardinal-signposts.git
cd cardinal-signposts
pip install -e .
```

## Basic Usage

### 1. Initialize Your Project

Navigate to your project root and run:

```bash
cardinal-signpost init
```

This creates signpost files throughout your directory structure.

### 2. Verify Installation

List all created signposts:

```bash
find . -name "_CARDINAL_*.txt" -type f
```

You should see files like:
```
./_CARDINAL_ROOT.txt
./src/_CARDINAL_SRC.txt
./tests/_CARDINAL_TESTS.txt
```

### 3. Read a Signpost

```bash
cat _CARDINAL_ROOT.txt
```

Output:
```
═══════════════════════════════════════
CARDINAL RULES - READ BEFORE ANY OPERATION
═══════════════════════════════════════

ROOT: /home/user/my-project/
HERE: /home/user/my-project/
ROLE: Project root directory

BEFORE GENERATING CODE:
1. pwd && ls -la
2. cat _CARDINAL_*.txt
3. State absolute path
4. Verify file doesn't exist

CONSTITUTIONAL RULES:
- Absolute paths only, no relatives
- ONE config location
- NO new directories without approval
- Generate ONE file, then STOP
- All imports use absolute paths

VIOLATION = HALT IMMEDIATELY
```

## Configure AI Assistants

### Claude

Add to your project's system prompt or chat:

```
NAVIGATION PROTOCOL:
Before any file operation:
1. Run `ls` to see the _CARDINAL_* signpost
2. Run `cat _CARDINAL_*.txt` to read location info
3. Use the absolute ROOT and HERE paths provided
4. Verify you're in the correct directory before creating files
```

### GitHub Copilot

Create `.github/copilot-instructions.md`:

```markdown
# Navigation Rules
- Always check _CARDINAL_* files before file operations
- Use absolute paths from signpost files
- Follow constitutional rules in _CARDINAL_ROOT.txt
- Never create duplicate configuration files
```

### Cursor

Add to `.cursorrules`:

```
Check _CARDINAL_* signpost files for location awareness.
Use absolute imports as specified in signposts.
Follow project constitutional rules.
```

## Example Workflow

### Without Cardinal Signposts ❌

```
User: "Create a new user model"

AI: [Creates duplicate models directories]
    my-project/
    ├── src/models/user.py        # First one
    ├── app/models/user.py        # Duplicate!
    └── models/user.py            # Another duplicate!
```

### With Cardinal Signposts ✅

```
User: "Create a new user model"

AI: 
    $ ls src/
    _CARDINAL_SRC.txt  app.py
    
    $ cat src/_CARDINAL_SRC.txt
    ROOT: /home/user/my-project/
    HERE: /home/user/my-project/src/
    ROLE: Source code
    
    $ ls src/models/
    _CARDINAL_SRC_MODELS.txt  __init__.py
    
    [Creates file in correct location]
    my-project/src/models/user.py
```

## Common Commands

```bash
# Initialize signposts
cardinal-signpost init

# Initialize with directory tree
cardinal-signpost init --include-tree

# Validate existing signposts
cardinal-signpost validate

# Update after structure changes
cardinal-signpost update

# Remove all signposts
cardinal-signpost remove

# Scan and create signposts (interactive)
cardinal-signpost scan --interactive

# Preview changes without creating files
cardinal-signpost scan --dry-run
```

## Advanced Options

### Custom Configuration

Create `cardinal_config.json`:

```json
{
  "root_rules": [
    "All tests use pytest",
    "No relative imports allowed",
    "Configuration in /config only"
  ],
  "directories": {
    "src": "Application source code",
    "tests": "Test suite with pytest",
    "docs": "Project documentation"
  }
}
```

Initialize with custom config:

```bash
cardinal-signpost init --config cardinal_config.json
```

### Python API

```python
from cardinal_signposts import SignpostGenerator

# Create generator
generator = SignpostGenerator(
    root_path="/path/to/project",
    include_tree=True,
    custom_rules={
        "RULE_1": "Description",
        "RULE_2": "Another rule"
    }
)

# Create signposts
signposts = generator.create_signposts()
print(f"Created {len(signposts)} signposts")

# Validate
if generator.validate():
    print("All signposts valid!")
```

## Tips for Success

1. **Run `init` once** at project start
2. **Run `update`** when you reorganize directories
3. **Include in version control** - signposts help all developers
4. **Train your AI** - Add navigation protocol to system prompts
5. **Review generated code** - Ensure AI followed the rules

## Troubleshooting

**Q: Signposts not being created?**
```bash
# Check if you're in the right directory
pwd

# Try with verbose output
cardinal-signpost init --dry-run
```

**Q: AI still creating duplicates?**
- Ensure AI reads the signpost: `cat _CARDINAL_*.txt`
- Add navigation rules to AI's system prompt
- Be explicit: "Check the signpost first"

**Q: Need to reorganize project?**
```bash
# Update signposts after moving directories
cardinal-signpost update
```

## Next Steps

- Read the [full documentation](README.md)
- Check out [examples](examples/)
- Join discussions on [GitHub](https://github.com/scofowiz/cardinal-signposts/discussions)
- Report issues or suggest features

---

**Ready to stop AI code drift?**

`cardinal-signpost init`
