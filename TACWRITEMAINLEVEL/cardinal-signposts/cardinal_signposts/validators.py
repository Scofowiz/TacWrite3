"""Validation utilities for cardinal signposts."""

import os
from pathlib import Path
from typing import List, Tuple


def validate_signposts(root_path: Path) -> bool:
    """Validate all signposts in a project.
    
    Args:
        root_path: Project root directory
        
    Returns:
        True if all signposts are valid, False otherwise
    """
    issues = []
    
    # Check root signpost exists
    root_signpost = root_path / "_CARDINAL_ROOT.txt"
    if not root_signpost.exists():
        issues.append(f"Missing root signpost: {root_signpost}")
        return False
    
    # Validate root signpost content
    root_valid, root_issues = _validate_signpost_content(root_signpost, root_path)
    if not root_valid:
        issues.extend(root_issues)
    
    # Find and validate all signposts
    for dirpath, dirnames, filenames in os.walk(root_path):
        # Skip excluded directories
        dirnames[:] = [
            d for d in dirnames 
            if not d.startswith('.') 
            and d not in ['node_modules', '__pycache__', 'venv', 'env', '.git']
        ]
        
        current_dir = Path(dirpath)
        
        # Skip root (already checked)
        if current_dir == root_path:
            continue
        
        # Find signpost file
        signpost_files = [f for f in filenames if f.startswith("_CARDINAL_") and f.endswith(".txt")]
        
        if not signpost_files:
            # Directory should have a signpost
            issues.append(f"Missing signpost in: {current_dir.relative_to(root_path)}")
            continue
        
        if len(signpost_files) > 1:
            issues.append(f"Multiple signposts in: {current_dir.relative_to(root_path)}")
        
        # Validate content
        signpost_path = current_dir / signpost_files[0]
        valid, content_issues = _validate_signpost_content(signpost_path, root_path)
        if not valid:
            issues.extend(content_issues)
    
    if issues:
        print("Validation issues found:")
        for issue in issues:
            print(f"  ❌ {issue}")
        return False
    
    return True


def _validate_signpost_content(signpost_path: Path, root_path: Path) -> Tuple[bool, List[str]]:
    """Validate the content of a signpost file.
    
    Args:
        signpost_path: Path to signpost file
        root_path: Project root directory
        
    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    issues = []
    
    try:
        content = signpost_path.read_text()
    except Exception as e:
        return False, [f"Cannot read {signpost_path}: {e}"]
    
    # Check for required fields
    required_fields = ["ROOT:", "HERE:", "ROLE:"]
    for field in required_fields:
        if field not in content:
            issues.append(f"Missing '{field}' in {signpost_path.relative_to(root_path)}")
    
    # Validate ROOT path
    lines = content.split('\n')
    root_line = next((l for l in lines if l.startswith("ROOT:")), None)
    if root_line:
        root_value = root_line.split("ROOT:")[1].strip().rstrip('/')
        expected_root = str(root_path)
        if root_value != expected_root:
            issues.append(
                f"Incorrect ROOT in {signpost_path.relative_to(root_path)}: "
                f"expected {expected_root}, got {root_value}"
            )
    
    # Validate HERE path
    here_line = next((l for l in lines if l.startswith("HERE:")), None)
    if here_line:
        here_value = here_line.split("HERE:")[1].strip().rstrip('/')
        expected_here = str(signpost_path.parent)
        if here_value != expected_here:
            issues.append(
                f"Incorrect HERE in {signpost_path.relative_to(root_path)}: "
                f"expected {expected_here}, got {here_value}"
            )
    
    return len(issues) == 0, issues


def check_signpost_coverage(root_path: Path) -> float:
    """Calculate percentage of directories with signposts.
    
    Args:
        root_path: Project root directory
        
    Returns:
        Percentage of directories with signposts (0-100)
    """
    total_dirs = 0
    dirs_with_signposts = 0
    
    for dirpath, dirnames, filenames in os.walk(root_path):
        # Skip excluded directories
        dirnames[:] = [
            d for d in dirnames 
            if not d.startswith('.') 
            and d not in ['node_modules', '__pycache__', 'venv', 'env', '.git']
        ]
        
        total_dirs += 1
        
        # Check if directory has signpost
        has_signpost = any(
            f.startswith("_CARDINAL_") and f.endswith(".txt") 
            for f in filenames
        )
        
        if has_signpost:
            dirs_with_signposts += 1
    
    if total_dirs == 0:
        return 0.0
    
    return (dirs_with_signposts / total_dirs) * 100
