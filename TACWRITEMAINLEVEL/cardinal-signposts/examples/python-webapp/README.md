# Python Web App Example

This example demonstrates Cardinal Signposts in a typical Python web application structure.

## Directory Structure

```
python-webapp/
├── _CARDINAL_ROOT.txt          # Root signpost with constitutional rules
├── src/
│   ├── _CARDINAL_SRC.txt       # Source code signpost
│   ├── app.py
│   ├── models/
│   │   ├── _CARDINAL_SRC_MODELS.txt
│   │   ├── user.py
│   │   └── post.py
│   ├── routes/
│   │   ├── _CARDINAL_SRC_ROUTES.txt
│   │   ├── auth.py
│   │   └── api.py
│   └── utils/
│       ├── _CARDINAL_SRC_UTILS.txt
│       └── helpers.py
├── tests/
│   ├── _CARDINAL_TESTS.txt
│   └── test_app.py
└── config/
    ├── _CARDINAL_CONFIG.txt
    └── settings.py
```

## Usage

1. Navigate to this directory:
```bash
cd examples/python-webapp
```

2. Initialize signposts:
```bash
cardinal-signpost init
```

3. Verify signposts were created:
```bash
find . -name "_CARDINAL_*.txt"
```

## AI Assistant Integration

When working with an AI assistant in this project, it will:

1. See the signpost file when running `ls`:
```bash
$ ls src/models/
_CARDINAL_SRC_MODELS.txt  user.py  post.py
```

2. Read the signpost to know its location:
```bash
$ cat src/models/_CARDINAL_SRC_MODELS.txt
ROOT: /home/user/python-webapp/
HERE: /home/user/python-webapp/src/models/
ROLE: Data models
```

3. Use absolute paths from the signpost:
```python
# AI will generate imports like this:
from src.models.user import User

# Instead of confusing relative imports:
from ..models.user import User  # ❌ Prone to errors
```

## Benefits Demonstrated

- **No duplicate files**: AI knows exactly where config/, models/, etc. are
- **Correct imports**: Always uses absolute paths from ROOT
- **Clear structure**: ROLE field explains what each directory contains
- **Fast navigation**: Filename itself shows the path (_CARDINAL_SRC_MODELS)

## Try It

Ask an AI assistant to:

1. "Create a new model in the models directory"
   - It will read _CARDINAL_SRC_MODELS.txt
   - Know the exact location
   - Generate file in correct place

2. "Add a new API route"
   - It will read _CARDINAL_SRC_ROUTES.txt
   - Follow the established pattern
   - Use correct imports

3. "Where should I put configuration?"
   - It will find _CARDINAL_CONFIG.txt
   - See that config/ is the single source of truth
   - Not create duplicate configs elsewhere
