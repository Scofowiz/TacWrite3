"""Core signpost generation functionality."""

import os
from pathlib import Path
from typing import Dict, List, Optional
import json


class SignpostGenerator:
    """Generates Cardinal Signpost navigation files for AI assistants."""
    
    def __init__(
        self,
        root_path: str,
        format: str = "txt",
        include_rules: bool = True,
        include_tree: bool = False,
        custom_rules: Optional[Dict[str, str]] = None
    ):
        """Initialize signpost generator.
        
        Args:
            root_path: Absolute path to project root
            format: Output format (txt, json, yaml, toml)
            include_rules: Include constitutional rules in root signpost
            include_tree: Include directory tree in root signpost
            custom_rules: Custom rules to include in signposts
        """
        self.root_path = Path(root_path).resolve()
        self.format = format
        self.include_rules = include_rules
        self.include_tree = include_tree
        self.custom_rules = custom_rules or {}
        
        if not self.root_path.exists():
            raise ValueError(f"Path does not exist: {self.root_path}")
    
    def create_signposts(self, max_depth: int = 10) -> List[Path]:
        """Create signposts throughout the directory structure.
        
        Args:
            max_depth: Maximum directory depth to traverse
            
        Returns:
            List of created signpost file paths
        """
        created = []
        
        # Create root signpost first
        root_signpost = self._create_root_signpost()
        created.append(root_signpost)
        
        # Traverse and create signposts for each directory
        for dirpath, dirnames, _ in os.walk(self.root_path):
            # Skip hidden directories and common exclusions
            dirnames[:] = [
                d for d in dirnames 
                if not d.startswith('.') 
                and d not in ['node_modules', '__pycache__', 'venv', 'env', '.git']
            ]
            
            current_path = Path(dirpath)
            depth = len(current_path.relative_to(self.root_path).parts)
            
            if depth == 0 or depth > max_depth:
                continue
                
            signpost = self._create_directory_signpost(current_path)
            if signpost:
                created.append(signpost)
        
        return created
    
    def _create_root_signpost(self) -> Path:
        """Create the root signpost with constitutional rules."""
        signpost_path = self.root_path / "_CARDINAL_ROOT.txt"
        
        content = self._generate_root_content()
        
        signpost_path.write_text(content)
        return signpost_path
    
    def _create_directory_signpost(self, dir_path: Path) -> Optional[Path]:
        """Create a signpost for a specific directory."""
        # Generate signpost filename from path
        rel_path = dir_path.relative_to(self.root_path)
        path_parts = [p.upper() for p in rel_path.parts]
        filename = f"_CARDINAL_{'_'.join(path_parts)}.txt"
        
        signpost_path = dir_path / filename
        
        # Determine role/purpose of this directory
        role = self._infer_directory_role(dir_path)
        
        content = self._generate_directory_content(dir_path, role)
        
        signpost_path.write_text(content)
        return signpost_path
    
    def _generate_root_content(self) -> str:
        """Generate content for root signpost."""
        lines = [
            "═" * 60,
            "CARDINAL RULES - READ BEFORE ANY OPERATION",
            "═" * 60,
            "",
            f"ROOT: {self.root_path}/",
            f"HERE: {self.root_path}/",
            f"ROLE: Project root directory",
            ""
        ]
        
        if self.include_rules:
            lines.extend([
                "BEFORE GENERATING CODE:",
                "1. pwd && ls -la",
                "2. cat _CARDINAL_*.txt (signpost in current directory)",
                "3. State absolute path out loud",
                "4. Verify file doesn't already exist",
                "",
                "CONSTITUTIONAL RULES:",
                "- Absolute paths only, never use relative paths",
                "- ONE config location (verify before creating config)",
                "- NO new directories without explicit approval",
                "- Generate ONE file per operation, then STOP",
                "- All imports must use absolute paths",
                "",
                "VIOLATION = HALT IMMEDIATELY",
                ""
            ])
        
        if self.custom_rules:
            lines.append("CUSTOM RULES:")
            for key, value in self.custom_rules.items():
                lines.append(f"- {key}: {value}")
            lines.append("")
        
        if self.include_tree:
            lines.append("DIRECTORY STRUCTURE:")
            lines.extend(self._generate_tree(self.root_path))
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_directory_content(self, dir_path: Path, role: str) -> str:
        """Generate content for a directory signpost."""
        lines = [
            f"ROOT: {self.root_path}/",
            f"HERE: {dir_path}/",
            f"ROLE: {role}"
        ]
        return "\n".join(lines)
    
    def _infer_directory_role(self, dir_path: Path) -> str:
        """Infer the role/purpose of a directory based on its name and contents."""
        dir_name = dir_path.name.lower()
        
        role_map = {
            "src": "Source code",
            "source": "Source code",
            "lib": "Library code",
            "tests": "Test suite",
            "test": "Test suite",
            "docs": "Documentation",
            "documentation": "Documentation",
            "examples": "Example code",
            "scripts": "Utility scripts",
            "config": "Configuration files",
            "data": "Data files",
            "models": "Data models",
            "views": "View templates",
            "controllers": "Controller logic",
            "routes": "Route definitions",
            "middleware": "Middleware components",
            "utils": "Utility functions",
            "helpers": "Helper functions",
            "services": "Service layer",
            "api": "API implementation",
            "static": "Static assets",
            "public": "Public files",
            "assets": "Asset files",
            "components": "UI components",
            "pages": "Page components",
            "layouts": "Layout components",
            "hooks": "Custom hooks",
            "context": "Context providers",
            "store": "State management",
            "types": "Type definitions",
            "interfaces": "Interface definitions",
            "constants": "Constants",
            "enums": "Enumerations",
        }
        
        return role_map.get(dir_name, f"{dir_name.capitalize()} directory")
    
    def _generate_tree(self, root: Path, prefix: str = "", max_depth: int = 3) -> List[str]:
        """Generate ASCII tree representation of directory structure."""
        tree_lines = []
        
        def build_tree(path: Path, prefix: str, depth: int):
            if depth > max_depth:
                return
                
            try:
                items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
                # Filter out hidden and excluded
                items = [
                    i for i in items 
                    if not i.name.startswith('.') 
                    and i.name not in ['node_modules', '__pycache__', 'venv', 'env']
                ]
                
                for i, item in enumerate(items):
                    is_last = i == len(items) - 1
                    current_prefix = "└── " if is_last else "├── "
                    tree_lines.append(f"{prefix}{current_prefix}{item.name}{'/' if item.is_dir() else ''}")
                    
                    if item.is_dir():
                        extension = "    " if is_last else "│   "
                        build_tree(item, prefix + extension, depth + 1)
            except PermissionError:
                pass
        
        tree_lines.append(f"{root.name}/")
        build_tree(root, "", 0)
        return tree_lines
    
    def validate(self) -> bool:
        """Validate all signposts in the project."""
        from .validators import validate_signposts
        return validate_signposts(self.root_path)
    
    def update(self) -> List[Path]:
        """Update existing signposts after structure changes."""
        # Remove old signposts
        self.remove()
        # Create new ones
        return self.create_signposts()
    
    def remove(self) -> int:
        """Remove all cardinal signposts from the project."""
        removed = 0
        for dirpath, _, filenames in os.walk(self.root_path):
            for filename in filenames:
                if filename.startswith("_CARDINAL_") and filename.endswith(".txt"):
                    file_path = Path(dirpath) / filename
                    file_path.unlink()
                    removed += 1
        return removed
